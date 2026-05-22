'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Activity, RefreshCw, Cpu } from 'lucide-react';
import { devicesApi, telemetryApi } from '@/lib/api';
import type { Device, TelemetryPoint } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { TelemetryChart, TelemetryDataPoint } from '@/components/telemetry-chart';

interface DeviceWithLatest {
  device: Device;
  latest: TelemetryPoint | null;
}

export default function TelemetryPage() {
  const [items, setItems] = useState<DeviceWithLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [history, setHistory] = useState<TelemetryDataPoint[]>([]);
  const [chartField, setChartField] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: devices } = await devicesApi.list();
      const results = await Promise.all(
        devices.map(async (device) => {
          try {
            const { data: latest } = await telemetryApi.latest(device.id);
            return { device, latest };
          } catch {
            return { device, latest: null };
          }
        })
      );
      setItems(results);
      if (results.length > 0 && !selectedDevice) {
        setSelectedDevice(results[0].device.id);
      }
    } catch (err) {
      setError('Failed to load telemetry.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;
    setLoadingHistory(true);
    telemetryApi
      .history(selectedDevice, 50)
      .then(({ data }) => {
        const mapped: TelemetryDataPoint[] = (data as TelemetryPoint[])
          .slice()
          .reverse()
          .map((p) => ({ timestamp: p.timestamp, data: p.data }));
        setHistory(mapped);
        if (mapped.length > 0) {
          const fields = Object.keys(mapped[0].data).filter(
            (k) => typeof mapped[0].data[k] === 'number'
          );
          setChartField(fields[0] ?? '');
        }
      })
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, [selectedDevice]);

  const selectedItem = items.find((i) => i.device.id === selectedDevice);
  const numericFields = selectedItem?.latest
    ? Object.keys(selectedItem.latest.data).filter(
        (k) => typeof selectedItem.latest!.data[k] === 'number'
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Telemetry</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Historical data across all devices
          </p>
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

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Device list sidebar */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-card">
          <div className="px-4 py-3 border-b border-slate-700">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Devices
            </p>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No devices
            </div>
          ) : (
            <ul className="divide-y divide-slate-700/50">
              {items.map(({ device, latest }) => (
                <li key={device.id}>
                  <button
                    onClick={() => setSelectedDevice(device.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      selectedDevice === device.id
                        ? 'bg-blue-600/20 border-l-2 border-blue-500'
                        : 'hover:bg-slate-700/40'
                    }`}
                  >
                    <Cpu className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        {device.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {latest
                          ? `${Object.keys(latest.data).length} fields`
                          : 'No data'}
                      </p>
                    </div>
                    <StatusBadge status={device.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Chart area */}
        <div className="lg:col-span-3 space-y-4">
          {selectedItem ? (
            <>
              <Card
                title={`${selectedItem.device.name} — Telemetry Chart`}
                headerAction={
                  numericFields.length > 1 ? (
                    <select
                      value={chartField}
                      onChange={(e) => setChartField(e.target.value)}
                      className="text-xs bg-slate-700 border border-slate-600 text-slate-200 rounded-md px-2 py-1 focus:outline-none"
                    >
                      {numericFields.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Link
                      href={`/devices/${selectedItem.device.id}`}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Device detail →
                    </Link>
                  )
                }
              >
                {loadingHistory ? (
                  <div className="h-48 bg-slate-700/50 rounded-lg animate-pulse" />
                ) : (
                  <TelemetryChart
                    data={history}
                    field={chartField}
                    label={chartField}
                  />
                )}
              </Card>

              {/* Latest values */}
              {selectedItem.latest && (
                <Card title="Latest Values">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Object.entries(selectedItem.latest.data).map(
                      ([key, val]) => (
                        <div
                          key={key}
                          className="bg-slate-900 rounded-lg p-3 border border-slate-700"
                        >
                          <p className="text-xs text-slate-500 truncate">
                            {key}
                          </p>
                          <p className="text-lg font-bold text-slate-100 font-mono mt-1">
                            {String(val)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </Card>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Activity className="w-10 h-10 text-slate-600" />
              <p className="text-slate-500 text-sm">
                Select a device to view telemetry
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
