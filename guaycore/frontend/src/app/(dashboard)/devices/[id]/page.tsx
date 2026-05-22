'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import {
  ArrowLeft,
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Save,
  AlertCircle,
} from 'lucide-react';
import { devicesApi, telemetryApi } from '@/lib/api';
import type { Device, TelemetryPoint } from '@/lib/api';
import { subscribeToDevice } from '@/lib/socket';
import { StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TelemetryChart, TelemetryDataPoint } from '@/components/telemetry-chart';

function timeAgo(ts?: string) {
  if (!ts) return 'Never';
  try {
    return formatDistanceToNow(parseISO(ts), { addSuffix: true });
  } catch {
    return ts;
  }
}

function formatTs(ts: string) {
  try {
    return format(parseISO(ts), 'yyyy-MM-dd HH:mm:ss');
  } catch {
    return ts;
  }
}

export default function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [device, setDevice] = useState<Device | null>(null);
  const [latestTelemetry, setLatestTelemetry] = useState<TelemetryPoint | null>(null);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryDataPoint[]>([]);
  const [chartField, setChartField] = useState<string>('');
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config editor
  const [configJson, setConfigJson] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  const MAX_POINTS = 50;
  const unsubRef = useRef<(() => void) | null>(null);

  const fetchDevice = useCallback(async () => {
    setLoadingDevice(true);
    setError(null);
    try {
      const [deviceRes, latestRes, historyRes] = await Promise.all([
        devicesApi.get(id),
        telemetryApi.latest(id).catch(() => ({ data: null })),
        telemetryApi.history(id, MAX_POINTS).catch(() => ({ data: [] })),
      ]);

      setDevice(deviceRes.data);
      setConfigJson(JSON.stringify(deviceRes.data.config ?? {}, null, 2));

      if (latestRes.data) {
        setLatestTelemetry(latestRes.data);
      }

      const history = (historyRes.data ?? []) as TelemetryPoint[];
      const mapped: TelemetryDataPoint[] = history
        .slice()
        .reverse()
        .map((p) => ({ timestamp: p.timestamp, data: p.data }));
      setTelemetryHistory(mapped);

      if (mapped.length > 0) {
        const fields = Object.keys(mapped[0].data).filter(
          (k) => typeof mapped[0].data[k] === 'number'
        );
        if (fields.length > 0) setChartField(fields[0]);
      }
    } catch (err) {
      setError('Failed to load device. It may not exist or you lack access.');
      console.error(err);
    } finally {
      setLoadingDevice(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  // WebSocket subscription
  useEffect(() => {
    if (!id) return;

    const unsub = subscribeToDevice(id, (raw) => {
      const point: TelemetryDataPoint = {
        timestamp: (raw.timestamp as string) ?? new Date().toISOString(),
        data: raw.data as Record<string, number | string | boolean>,
      };

      setTelemetryHistory((prev) => {
        const updated = [...prev, point];
        return updated.length > MAX_POINTS
          ? updated.slice(updated.length - MAX_POINTS)
          : updated;
      });

      // Update latest
      setLatestTelemetry((prev) =>
        prev
          ? { ...prev, data: point.data, timestamp: point.timestamp }
          : null
      );
    });

    unsubRef.current = unsub;
    return () => {
      unsub();
      unsubRef.current = null;
    };
  }, [id]);

  async function handleSaveConfig() {
    setConfigError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(configJson);
    } catch {
      setConfigError('Invalid JSON. Please fix syntax errors.');
      return;
    }

    setSavingConfig(true);
    try {
      const { data } = await devicesApi.updateConfig(id, parsed);
      setDevice(data);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    } catch (err) {
      setConfigError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Failed to save config.'
      );
    } finally {
      setSavingConfig(false);
    }
  }

  const numericFields = latestTelemetry
    ? Object.keys(latestTelemetry.data).filter(
        (k) => typeof latestTelemetry.data[k] === 'number'
      )
    : [];

  if (loadingDevice) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-40 bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-slate-300 text-lg font-medium">Device not found</p>
        <p className="text-slate-500 text-sm">{error}</p>
        <button
          onClick={() => router.push('/devices')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/devices')}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{device.name}</h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{device.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={device.status} />
          <button
            onClick={fetchDevice}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Device info */}
      <Card title="Device Info">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Type', value: device.type },
            { label: 'Firmware', value: device.firmwareVersion ?? '—' },
            { label: 'Last Seen', value: timeAgo(device.lastSeenAt) },
            {
              label: 'Registered',
              value: formatTs(device.createdAt),
            },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs text-slate-500 uppercase tracking-wider">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex items-center gap-2">
          {device.status === 'online' ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-600" />
          )}
          <span
            className={`text-sm font-medium ${
              device.status === 'online' ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {device.status === 'online' ? 'Device is online and streaming' : 'Device is offline'}
          </span>
        </div>
      </Card>

      {/* Telemetry chart */}
      <Card
        title="Real-time Telemetry"
        headerAction={
          numericFields.length > 1 ? (
            <select
              value={chartField}
              onChange={(e) => setChartField(e.target.value)}
              className="text-xs bg-slate-700 border border-slate-600 text-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {numericFields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          ) : null
        }
      >
        {telemetryHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Cpu className="w-8 h-8 text-slate-600" />
            <p className="text-slate-500 text-sm">
              Waiting for telemetry data…
            </p>
          </div>
        ) : (
          <TelemetryChart
            data={telemetryHistory}
            field={chartField}
            label={chartField}
          />
        )}
        <p className="mt-2 text-xs text-slate-500 text-right">
          {telemetryHistory.length} points · live via WebSocket
        </p>
      </Card>

      {/* Latest values */}
      {latestTelemetry && (
        <Card title="Latest Values">
          <div className="text-xs text-slate-500 mb-3">
            As of {formatTs(latestTelemetry.timestamp)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Field
                  </th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="text-right pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {Object.entries(latestTelemetry.data).map(([key, val]) => (
                  <tr key={key}>
                    <td className="py-2.5 text-slate-300 font-mono">{key}</td>
                    <td className="py-2.5 text-right text-slate-100 font-mono font-bold">
                      {String(val)}
                    </td>
                    <td className="py-2.5 text-right text-slate-500 text-xs">
                      {typeof val}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Remote config editor */}
      <Card title="Remote Configuration">
        <p className="text-xs text-slate-500 mb-3">
          Edit the device configuration JSON. Changes will be pushed to the device
          on next connection.
        </p>

        {configError && (
          <div className="mb-3 bg-red-900/40 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
            {configError}
          </div>
        )}
        {configSaved && (
          <div className="mb-3 bg-emerald-900/40 border border-emerald-700 rounded-lg px-3 py-2 text-emerald-400 text-xs">
            Configuration saved successfully.
          </div>
        )}

        <textarea
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          rows={12}
          spellCheck={false}
          className="w-full px-4 py-3 rounded-lg text-sm font-mono bg-slate-900 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />

        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {savingConfig ? 'Saving…' : 'Save Config'}
          </button>
        </div>
      </Card>
    </div>
  );
}
