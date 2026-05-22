'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Cpu, RefreshCw, Search, ChevronRight } from 'lucide-react';
import { devicesApi } from '@/lib/api';
import type { Device } from '@/lib/api';
import { StatusBadge } from '@/components/ui/badge';

function timeAgo(ts?: string) {
  if (!ts) return 'Never';
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

type FilterStatus = 'all' | 'online' | 'offline' | 'provisioning';

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filtered, setFiltered] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await devicesApi.list();
      setDevices(data);
    } catch (err) {
      setError('Failed to load devices.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    let result = devices;
    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [devices, search, statusFilter]);

  const counts = {
    all: devices.length,
    online: devices.filter((d) => d.status === 'online').length,
    offline: devices.filter((d) => d.status === 'offline').length,
    provisioning: devices.filter((d) => d.status === 'provisioning').length,
  };

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'online', label: `Online (${counts.online})` },
    { key: 'offline', label: `Offline (${counts.offline})` },
    { key: 'provisioning', label: `Provisioning (${counts.provisioning})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Devices</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {devices.length} device{devices.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={fetchDevices}
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

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, type or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status tabs */}
        <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 gap-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.key
                  ? 'bg-slate-700 text-slate-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-card">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-700/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Cpu className="w-10 h-10 text-slate-600" />
            <p className="text-slate-500 text-sm">No devices found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Type
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Firmware
                </th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  Last Seen
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filtered.map((device) => (
                <tr
                  key={device.id}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/devices/${device.id}`}
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <Cpu className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                          {device.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono truncate">
                          {device.id}
                        </p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 hidden sm:table-cell">
                    <span className="text-sm text-slate-300">{device.type}</span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={device.status} />
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="text-sm text-slate-400 font-mono">
                      {device.firmwareVersion ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <span className="text-sm text-slate-400">
                      {timeAgo(device.lastSeenAt)}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <Link href={`/devices/${device.id}`}>
                      <ChevronRight className="w-4 h-4 text-slate-600 hover:text-slate-300 transition-colors" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
