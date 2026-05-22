import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';

type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    direction: TrendDirection;
    label: string;
  };
  iconClassName?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  iconClassName,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'bg-slate-800 border border-slate-700 rounded-xl shadow-card p-5 flex items-start gap-4',
        className
      )}
    >
      <div
        className={clsx(
          'flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-lg',
          iconClassName ?? 'bg-blue-900/50 text-blue-400'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-400 truncate">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
          {value}
        </p>
        {trend && (
          <p
            className={clsx('mt-1 text-xs', {
              'text-emerald-400': trend.direction === 'up',
              'text-red-400': trend.direction === 'down',
              'text-slate-400': trend.direction === 'neutral',
            })}
          >
            {trend.direction === 'up' && '↑ '}
            {trend.direction === 'down' && '↓ '}
            {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
