import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  headerAction?: React.ReactNode;
}

export function Card({ children, title, className, headerAction }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-slate-800 border border-slate-700 rounded-xl shadow-card',
        className
      )}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            {title}
          </h3>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function CardGrid({
  children,
  cols = 3,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[cols];

  return (
    <div className={clsx('grid gap-4', colClass, className)}>{children}</div>
  );
}
