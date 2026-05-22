'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Cpu,
  Wifi,
  WifiOff,
  Bell,
  BookOpen,
  RefreshCw,
} from 'lucide-react';
import { statsApi, alertsApi, devicesApi } from '@/lib/api';
import type { DashboardStats, Alert, Device } from '@/lib/api';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardGrid } from '@/components/ui/card';
import { SeverityBadge, AlertStatusBadge, StatusBadge } from '@/components/ui/badge';

function timeAgo(ts: string) {
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [onlineDevices, setOnlineDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, alertsRes, devicesRes] = await Promise.all([
        statsApi.dashboard(),
        alertsApi.list({ status: 'open', limit: 5 }),
        devicesApi.list(),
      ]);
      setStats(statsRes.data);
      setRecentAlerts(alertsRes.data);
      setOnlineDevices(
        devicesRes.data.filter((d) => d.status === 'online').slice(0, 8)
      );
      setLastRefreshed(new Date());
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          {lastRefreshed && (
            <p className="mt-0.5 text-xs text-slate-500">
              Last updated {timeAgo(lastRefreshed.toISOString())}
            </p>
          )}
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <CardGrid cols={4}>
        <StatCard
          icon={Cpu}
          label="Total Devices"
          value={loading ? '—' : (stats?.totalDevices ?? 0)}
          iconClassName="bg-slate-700 text-slate-300"
        />
        <StatCard
          icon={Wifi}
          label="Online"
          value={loading ? '—' : (stats?.onlineDevices ?? 0)}
          iconClassName="bg-emerald-900/50 text-emerald-400"
          trend={
            stats
              ? {
                  direction: 'neutral',
                  label: `${stats.offlineDevices} offline`,
                }
              : undefined
          }
        />
        <StatCard
          icon={Bell}
          label="Open Alerts"
          value={loading ? '—' : (stats?.openAlerts ?? 0)}
          iconClassName="bg-red-900/50 text-red-400"
        />
        <StatCard
          icon={BookOpen}
          label="Active Rules"
          value={loading ? '—' : (stats?.rulesCount ?? 0)}
          iconClassName="bg-blue-900/50 text-blue-400"
        />
      </CardGrid>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent alerts */}
        <Card
          title="Recent Alerts"
          headerAction={
            <Link
              href="/alerts"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-700/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : recentAlerts.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-6">
              No open alerts
            </p>
          ) : (
            <ul className="divide-y divide-slate-700/50">
              {recentAlerts.map((alert) => (
                <li key={alert.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <SeverityBadge severity={alert.severity} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        {alert.message}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {timeAgo(alert.triggeredAt)}
                      </p>
                    </div>
                    <AlertStatusBadge status={alert.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Online devices */}
        <Card
          title="Online Devices"
          headerAction={
            <Link
              href="/devices"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              View all
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-700/50 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : onlineDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <WifiOff className="w-8 h-8 text-slate-600" />
              <p className="text-slate-500 text-sm">No devices online</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/50">
              {onlineDevices.map((device) => (
                <li key={device.id} className="py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/devices/${device.id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Cpu className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {device.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {device.type}
                        {device.lastSeenAt &&
                          ` · ${timeAgo(device.lastSeenAt)}`}
                      </p>
                    </div>
                    <StatusBadge status={device.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
