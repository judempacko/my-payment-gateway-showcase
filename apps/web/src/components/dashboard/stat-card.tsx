import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'mist',
  progress,
  className,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: LucideIcon;
  tone?: 'ink' | 'mist';
  progress?: number;
  className?: string;
}) {
  const dark = tone === 'ink';

  return (
    <div
      className={cn(
        'min-w-0 rounded-2xl p-5',
        dark ? 'bg-ink-black text-paper-white' : 'bg-mist-gray text-ink-black',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            'min-h-10 text-sm sm:min-h-0',
            dark ? 'text-paper-white/70' : 'text-slate-gray',
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
            dark ? 'bg-paper-white/10 text-blush-peach' : 'bg-paper-white text-ink-black',
          )}
          aria-hidden="true"
        >
          <Icon className="size-[18px]" strokeWidth={1.75} />
        </span>
      </div>
      <div className="mt-4 flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1">{value}</div>
      {progress === undefined ? null : (
        <div
          className={cn(
            'mt-4 h-1 overflow-hidden rounded-full',
            dark ? 'bg-paper-white/15' : 'bg-paper-white',
          )}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-status-success transition-[width] duration-500"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      <div className={cn('mt-3 text-sm', dark ? 'text-paper-white/65' : 'text-slate-gray')}>
        {detail}
      </div>
    </div>
  );
}
