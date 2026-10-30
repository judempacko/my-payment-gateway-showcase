'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { WebhookPipeline } from '@/components/dashboard/webhook-pipeline';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getHealth, getPaymentStats } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

export default function DashboardPipelinePage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const statsQuery = useQuery({
    queryKey: queryKeys.stats(7),
    queryFn: () => getPaymentStats(7),
    refetchInterval: 5_000,
    placeholderData: keepPreviousData,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    refetchInterval: 5_000,
    placeholderData: keepPreviousData,
  });

  const lastUpdatedAt = healthQuery.dataUpdatedAt
    ? new Date(healthQuery.dataUpdatedAt).toISOString()
    : null;

  async function refresh() {
    setManualRefreshing(true);

    try {
      await Promise.all([statsQuery.refetch(), healthQuery.refetch()]);
    } finally {
      setManualRefreshing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-8 sm:py-8 xl:px-10">
      <header>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 className="font-w480 text-[32px] leading-none tracking-heading text-ink-black sm:text-[36px]">
              {t('nav.pipeline')}
            </h1>
            <p className="mt-3 max-w-xl text-body text-slate-gray">{t('pipelineSubtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <p
              className="inline-flex items-center gap-2 rounded-full border border-border bg-paper-white px-3 py-2 text-sm text-slate-gray"
              aria-live="off"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  healthQuery.isError
                    ? 'bg-status-danger'
                    : healthQuery.isPending
                      ? 'bg-slate-gray'
                      : 'bg-status-success',
                )}
                aria-hidden="true"
              />
              {healthQuery.isError
                ? t('connectionLost')
                : lastUpdatedAt
                  ? t('updatedAt', { time: formatTime(lastUpdatedAt, locale) })
                  : t('connecting')}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={manualRefreshing}
              aria-label={t('refreshAria')}
            >
              <RefreshCw
                className={cn('size-4', manualRefreshing && 'animate-spin')}
                aria-hidden="true"
              />
              {t('refresh')}
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6 max-w-[720px]">
        {statsQuery.isError ? (
          <div className="mb-3">
            <Alert variant="destructive">
              <CircleAlert className="size-4" aria-hidden="true" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{t('stats.error')}</p>
                <Button variant="outline" size="sm" onClick={() => void statsQuery.refetch()}>
                  {t('retry')}
                </Button>
              </div>
            </Alert>
          </div>
        ) : null}

        <WebhookPipeline
          webhooks={statsQuery.data?.webhooks}
          health={healthQuery.data}
          healthPending={healthQuery.isPending}
          healthError={healthQuery.isError}
          locale={locale}
        />
      </div>
    </div>
  );
}
