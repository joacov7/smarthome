'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

export interface TelemetryDataPoint {
  timestamp: string;
  data: Record<string, number | string | boolean>;
}

interface TelemetryChartProps {
  data: TelemetryDataPoint[];
  field: string;
  label?: string;
  color?: string;
  unit?: string;
}

interface ChartPoint {
  time: string;
  value: number | null;
}

function formatTime(timestamp: string): string {
  try {
    return format(parseISO(timestamp), 'HH:mm:ss');
  } catch {
    return timestamp;
  }
}

function CustomTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; name: string }>;
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-100 font-mono">
          {entry.name}:{' '}
          <span className="text-blue-400 font-bold">
            {entry.value !== null ? `${entry.value}${unit ? ` ${unit}` : ''}` : 'N/A'}
          </span>
        </p>
      ))}
    </div>
  );
}

export function TelemetryChart({
  data,
  field,
  label,
  color = '#3b82f6',
  unit,
}: TelemetryChartProps) {
  const chartData: ChartPoint[] = data.map((point) => ({
    time: formatTime(point.timestamp),
    value:
      typeof point.data[field] === 'number'
        ? (point.data[field] as number)
        : null,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        No telemetry data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={{ stroke: '#475569' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          content={<CustomTooltip unit={unit} />}
          cursor={{ stroke: '#475569', strokeWidth: 1 }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          name={label ?? field}
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
