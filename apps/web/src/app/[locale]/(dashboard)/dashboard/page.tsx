'use client';

import { type PaymentStatsDays } from '@pay/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CheckCheck, CircleAlert, Clock3, RefreshCw, Wallet } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { PaymentTrendChart } from '@/components/dashboard/payment-trend-chart';
import { ProviderMix } from '@/components/dashboard/provider-mix';
import { StatCard } from '@/components/dashboard/stat-card';
import { Money } from '@/components/money';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getPaymentStats } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const [chartDays, setChartDays] = useState<PaymentStatsDays>(7);
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const statsQuery = useQuery({
    queryKey: queryKeys.stats(chartDays),
    queryFn: () => getPaymentStats(chartDays),
    refetchInterval: 5_000,
    placeholderData: keepPreviousData,
  });

  const lastUpdatedAt = statsQuery.dataUpdatedAt
    ? new Date(statsQuery.dataUpdatedAt).toISOString()
    : null;
  const totals = statsQuery.data?.totals;
  const statsPending = statsQuery.isPending;

  async function refresh() {
    setManualRefreshing(true);

    try {
      await statsQuery.refetch();
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
              {t('heading')}
            </h1>
            <p className="mt-3 max-w-xl text-body text-slate-gray">{t('subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <p
              className="inline-flex items-center gap-2 rounded-full border border-border bg-paper-white px-3 py-2 text-sm text-slate-gray"
              aria-live="off"
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  statsQuery.isError
                    ? 'bg-status-danger'
                    : statsQuery.isPending
                      ? 'bg-slate-gray'
                      : 'bg-status-success',
                )}
                aria-hidden="true"
              />
              {statsQuery.isError
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
            <Button asChild size="sm" className="w-full sm:w-auto">
              <Link href="/checkout">{t('newPayment')}</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:col-start-1 xl:row-start-1">
          <StatCard
            tone="ink"
            className="col-span-2 sm:col-span-1"
            label={t('stats.volume')}
            icon={Wallet}
            value={
              statsPending ? (
                <Skeleton className="mt-1 h-8 w-32 bg-paper-white/15" />
              ) : totals && totals.volume.length > 0 ? (
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  {totals.volume.map((total) => (
                    <Money
                      key={total.currency}
                      amountMinor={total.amountMinor}
                      currency={total.currency}
                      locale={locale}
                      className="font-w430 text-[30px] leading-none tracking-heading"
                    />
                  ))}
                </span>
              ) : (
                <span className="text-[32px] leading-none">—</span>
              )
            }
            detail={
              totals ? t('stats.volumeDetail', { count: totals.succeeded }) : t('stats.unavailable')
            }
          />

          <StatCard
            label={t('stats.successRate')}
            icon={CheckCheck}
            value={
              statsPending ? (
                <Skeleton className="h-8 w-16" />
              ) : totals?.successRate === null || totals?.successRate === undefined ? (
                <span className="text-[32px] leading-none text-ink-black">—</span>
              ) : (
                <span className="text-[32px] leading-none text-ink-black">
                  {totals.successRate}%
                </span>
              )
            }
            detail={
              totals
                ? t('stats.successRateDetail', {
                    succeeded: totals.succeeded,
                    settled: totals.settled,
                  })
                : t('stats.unavailable')
            }
            progress={totals?.successRate ?? undefined}
          />

          <StatCard
            label={t('stats.inFlight')}
            icon={Clock3}
            value={
              statsPending ? (
                <Skeleton className="h-8 w-10" />
              ) : (
                <span
                  className={cn(
                    'text-[32px] leading-none',
                    (totals?.inFlight ?? 0) > 0 ? 'text-status-warning' : 'text-ink-black',
                  )}
                >
                  {totals?.inFlight ?? '—'}
                </span>
              )
            }
            detail={
              totals ? (
                <>
                  <span className="block">
                    {t('stats.inFlightDetail', { count: totals.inFlight })}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block',
                      totals.failed > 0 ? 'text-status-danger' : 'text-slate-gray',
                    )}
                  >
                    {t('stats.failedInline', { count: totals.failed })}
                  </span>
                </>
              ) : (
                t('stats.unavailable')
              )
            }
          />
        </div>

        <section
          className="min-w-0 rounded-2xl border border-border bg-paper-white p-5 sm:p-6 xl:col-start-1 xl:row-start-2"
          aria-labelledby="trend-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 id="trend-title" className="text-body-lg font-medium text-ink-black">
                {t('trend.title')}
              </h2>
              <p className="mt-1 text-sm text-slate-gray">{t('trend.description')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
              <div className="flex items-center gap-4 text-sm text-slate-gray">
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-success" aria-hidden="true" />
                  {t('trend.succeeded')}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="size-2 rounded-full bg-status-danger" aria-hidden="true" />
                  {t('trend.failed')}
                </span>
              </div>
              <Select
                value={String(chartDays)}
                onValueChange={(value) => setChartDays(Number(value) as PaymentStatsDays)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-auto"
                  aria-label={t('trend.rangeAria')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{t('trend.range7')}</SelectItem>
                  <SelectItem value="30">{t('trend.range30')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {statsQuery.isError ? (
            <div className="mt-6">
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
          ) : statsPending ? (
            <Skeleton className="mt-6 h-[280px] w-full rounded-2xl" />
          ) : (
            <PaymentTrendChart
              series={statsQuery.data?.window.series ?? []}
              locale={locale}
              labels={{
                chartAria: t('trend.chartAria'),
                empty: t('trend.empty'),
                date: t('trend.date'),
                succeeded: t('trend.succeeded'),
                failed: t('trend.failed'),
                caption: t('trend.caption'),
              }}
            />
          )}
        </section>

        <aside
          className="space-y-6 xl:col-start-2 xl:row-span-2 xl:row-start-1"
          aria-label={t('asideAria')}
        >
          <ProviderMix providers={statsQuery.data?.providers ?? []} />
        </aside>
      </div>
    </div>
  );
}
