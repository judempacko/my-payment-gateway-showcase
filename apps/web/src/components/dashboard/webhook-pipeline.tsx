import type { PaymentStatsWebhooks } from '@pay/contracts';
import { Webhook } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatDateTime, formatRelative } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HealthSnapshot } from '@/lib/api';

export function WebhookPipeline({
  webhooks,
  health,
  healthPending,
  healthError,
  locale,
}: {
  webhooks: PaymentStatsWebhooks | undefined;
  health: HealthSnapshot | undefined;
  healthPending: boolean;
  healthError: boolean;
  locale: string;
}) {
  const t = useTranslations('dashboard.pipeline');
  const systemT = useTranslations('dashboard.system');
  const inboxFailed = webhooks?.failed ?? 0;
  const queueFailed = health?.queue.failed ?? 0;
  const databaseDown = healthError || (health !== undefined && health.database === 'down');
  const degraded = databaseDown || inboxFailed > 0 || queueFailed > 0;

  const databaseLabel = healthPending
    ? systemT('databaseChecking')
    : databaseDown
      ? systemT('connectionLost')
      : health?.database === 'up'
        ? systemT('databaseUp')
        : systemT('databaseChecking');

  return (
    <section id="pipeline" className="scroll-mt-24 rounded-2xl bg-mist-gray p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-body-lg font-medium text-ink-black">{t('title')}</h2>
          <p className="mt-1 text-sm text-slate-gray">{t('description')}</p>
        </div>
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-paper-white text-ink-black"
          aria-hidden="true"
        >
          <Webhook className="size-[18px]" strokeWidth={1.75} />
        </span>
      </div>

      <div className="mt-5">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'size-1.5 rounded-full',
              degraded ? 'bg-status-warning' : 'bg-status-success',
            )}
            aria-hidden="true"
          />
          <p className="text-xs font-medium tracking-[0.08em] text-ash-gray uppercase">
            {t('inbox')}
          </p>
        </div>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-slate-gray">{t('pending')}</dt>
            <dd className="tabular-nums mt-1 text-body-lg text-ink-black">
              {webhooks?.pending ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-gray">{t('failed')}</dt>
            <dd
              className={cn(
                'tabular-nums mt-1 text-body-lg',
                inboxFailed > 0 ? 'text-status-danger' : 'text-ink-black',
              )}
            >
              {webhooks?.failed ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-gray">{t('processed')}</dt>
            <dd className="tabular-nums mt-1 text-body-lg text-ink-black">
              {webhooks?.processed ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs font-medium tracking-[0.08em] text-ash-gray uppercase">
          {t('queue')}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs text-slate-gray">{systemT('waiting')}</dt>
            <dd className="tabular-nums mt-1 text-body-lg text-ink-black">
              {health?.queue.waiting ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-gray">{systemT('active')}</dt>
            <dd className="tabular-nums mt-1 text-body-lg text-ink-black">
              {health?.queue.active ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-gray">{systemT('failed')}</dt>
            <dd
              className={cn(
                'tabular-nums mt-1 text-body-lg',
                queueFailed > 0 ? 'text-status-danger' : 'text-ink-black',
              )}
            >
              {health?.queue.failed ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-slate-gray">
        {webhooks?.lastReceivedAt ? (
          <p>
            {t('lastReceived')}{' '}
            <time
              dateTime={webhooks.lastReceivedAt}
              title={formatDateTime(webhooks.lastReceivedAt, locale)}
            >
              {formatRelative(webhooks.lastReceivedAt, locale)}
            </time>
          </p>
        ) : (
          <p>{t('noWebhook')}</p>
        )}
        {webhooks?.lastErrorAt ? (
          <p className="text-status-danger">
            {t('lastError')}{' '}
            <time
              dateTime={webhooks.lastErrorAt}
              title={formatDateTime(webhooks.lastErrorAt, locale)}
            >
              {formatRelative(webhooks.lastErrorAt, locale)}
            </time>
          </p>
        ) : null}
        <p className="flex items-center gap-2">
          <span
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              healthPending
                ? 'bg-slate-gray'
                : databaseDown
                  ? 'bg-status-danger'
                  : 'bg-status-success',
            )}
            aria-hidden="true"
          />
          <span>{databaseLabel}</span>
          {health ? (
            <span className="tabular-nums">· {systemT('latency', { ms: health.latencyMs })}</span>
          ) : null}
        </p>
      </div>

      <p className="mt-4 text-xs text-slate-gray">{t('replayHint')}</p>
    </section>
  );
}
