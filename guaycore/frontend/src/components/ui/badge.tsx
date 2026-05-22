import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-700 text-slate-200 border-slate-600',
  secondary: 'bg-slate-800 text-slate-400 border-slate-700',
  success: 'bg-emerald-900/60 text-emerald-400 border-emerald-700',
  warning: 'bg-amber-900/60 text-amber-400 border-amber-700',
  danger: 'bg-red-900/60 text-red-400 border-red-700',
  info: 'bg-blue-900/60 text-blue-400 border-blue-700',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// Convenience helpers for common domain values
export function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    online: 'success',
    offline: 'secondary',
    provisioning: 'warning',
  };
  return <Badge variant={variantMap[status] ?? 'default'}>{status}</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    critical: 'danger',
    error: 'danger',
    warning: 'warning',
    info: 'info',
  };
  return <Badge variant={variantMap[severity] ?? 'default'}>{severity}</Badge>;
}

export function AlertStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, BadgeVariant> = {
    open: 'danger',
    acked: 'warning',
    resolved: 'success',
  };
  return <Badge variant={variantMap[status] ?? 'default'}>{status}</Badge>;
}
