import type { PaymentEvent } from '@pay/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { JsonViewer } from '@/components/json-viewer';
import { StatusBadge } from '@/components/status-badge';
import { formatDateTime } from '@/lib/format';

export function PaymentTimeline({
  events,
  showPayload = false,
}: {
  events: PaymentEvent[];
  showPayload?: boolean;
}) {
  const t = useTranslations('timeline');
  const eventT = useTranslations('event');
  const locale = useLocale();

  if (events.length === 0) {
    return <p className="rounded-lg bg-fog-white p-4 text-sm text-slate-gray">{t('empty')}</p>;
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
          {index < events.length - 1 ? (
            <span className="absolute top-6 left-3 h-full w-px bg-border" aria-hidden="true" />
          ) : null}

          <span
            className="tabular-nums relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-fog-white text-sm text-slate-gray"
            aria-hidden="true"
          >
            {event.sequence}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base text-ink-black">{eventT(event.type)}</span>
              {event.toStatus ? <StatusBadge status={event.toStatus} /> : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-gray">
              <span>{formatDateTime(event.createdAt, locale)}</span>
              <span aria-hidden="true">·</span>
              <span>{event.source}</span>
              {event.fromStatus ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums inline-flex items-center gap-1 text-sm">
                    {event.fromStatus}
                    <span aria-hidden="true">→</span>
                    {event.toStatus}
                  </span>
                </>
              ) : null}
            </div>

            {showPayload ? (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-slate-gray transition-colors hover:text-ink-black">
                  {t('eventPayload')}
                </summary>
                <JsonViewer value={event.payload} label={t('eventPayload')} className="mt-2" />
              </details>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
