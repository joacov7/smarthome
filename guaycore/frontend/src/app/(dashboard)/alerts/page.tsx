'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Bell, RefreshCw, CheckCheck, X } from 'lucide-react';
import { alertsApi } from '@/lib/api';
import type { Alert } from '@/lib/api';
import { SeverityBadge, AlertStatusBadge } from '@/components/ui/badge';

function timeAgo(ts: string) {
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

type StatusFilter = 'all' | 'open' | 'acked' | 'resolved';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAlerts = useCallback(async () => {
    setError(null);
    try {
      const params =
        statusFilter === 'all' ? {} : { status: statusFilter };
      const { data } = await alertsApi.list({ ...params, limit: 100 });
      setAlerts(data);
    } catch (err) {
      setError('Failed to load alerts.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
    // Auto-refresh every 30s
    intervalRef.current = setInterval(fetchAlerts, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAlerts]);

  async function handleAck(id: string) {
    setActionLoading(id + ':ack');
    try {
      const { data } = await alertsApi.ack(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? data : a)));
    } catch {
      setError('Failed to acknowledge alert.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolve(id: string) {
    setActionLoading(id + ':resolve');
    try {
      const { data } = await alertsApi.resolve(id);
      setAlerts((prev) => prev.map((a) => (a.id === id ? data : a)));
    } catch {
      setError('Failed to resolve alert.');
    } finally {
      setActionLoading(null);
    }
  }

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'acked', label: 'Acknowledged' },
    { key: 'resolved', label: 'Resolved' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Alerts</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Auto-refreshes every 30 seconds
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAlerts(); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 gap-1 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Bell className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500 text-sm">No alerts found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Triggered
                </th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {alerts.map((alert) => {
                const acking = actionLoading === alert.id + ':ack';
                const resolving = actionLoading === alert.id + ':resolve';
                return (
                  <tr
                    key={alert.id}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <SeverityBadge severity={alert.severity} />
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-slate-200">{alert.message}</p>
                      {alert.deviceId && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          Device: {alert.deviceId}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <AlertStatusBadge status={alert.status} />
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <span className="text-sm text-slate-400">
                        {timeAgo(alert.triggeredAt)}
                      </span>
                      {alert.ackedAt && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Acked {timeAgo(alert.ackedAt)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {alert.status === 'open' && (
                          <button
                            onClick={() => handleAck(alert.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-900/40 hover:bg-amber-900/70 text-amber-400 border border-amber-700/50 disabled:opacity-50 transition-colors"
                          >
                            {acking ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCheck className="w-3 h-3" />
                            )}
                            Ack
                          </button>
                        )}
                        {(alert.status === 'open' || alert.status === 'acked') && (
                          <button
                            onClick={() => handleResolve(alert.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-900/40 hover:bg-emerald-900/70 text-emerald-400 border border-emerald-700/50 disabled:opacity-50 transition-colors"
                          >
                            {resolving ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            Resolve
                          </button>
                        )}
                        {alert.status === 'resolved' && (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
