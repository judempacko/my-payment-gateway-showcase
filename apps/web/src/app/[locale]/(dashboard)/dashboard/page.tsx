'use client';

import {
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  currencyExponent,
  type Payment,
  type PaymentProvider,
  type PaymentStatus,
} from '@pay/contracts';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  Inbox,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Money } from '@/components/money';
import { PaymentDetail } from '@/components/payment-detail';
import { StatusBadge } from '@/components/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getHealth, getPayments } from '@/lib/api';
import { formatDateTime, formatRelative, formatTime, shortId } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type StatusFilter = PaymentStatus | 'ALL';
type ProviderFilter = PaymentProvider | 'ALL';
type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';
type PeriodFilter = 'all' | 'last24h' | 'last7d' | 'last30d';

const DEFAULT_SORT: SortOption = 'newest';
const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'amount_desc', 'amount_asc'];
const PERIOD_OPTIONS: PeriodFilter[] = ['all', 'last24h', 'last7d', 'last30d'];
const PERIOD_MS: Record<Exclude<PeriodFilter, 'all'>, number> = {
  last24h: 24 * 60 * 60 * 1_000,
  last7d: 7 * 24 * 60 * 60 * 1_000,
  last30d: 30 * 24 * 60 * 60 * 1_000,
};
const SUCCESS_STATUSES: PaymentStatus[] = [
  'SUCCEEDED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
];
const IN_FLIGHT_STATUSES: PaymentStatus[] = ['CREATED', 'PENDING', 'REQUIRES_ACTION', 'PROCESSING'];
const FAILED_STATUSES: PaymentStatus[] = ['FAILED', 'EXPIRED', 'CANCELED'];

function matchesPeriod(payment: Payment, period: PeriodFilter): boolean {
  if (period === 'all') {
    return true;
  }

  return new Date(payment.createdAt).getTime() >= Date.now() - PERIOD_MS[period];
}

function matchesSearch(payment: Payment, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [payment.id, payment.customer.name, payment.customer.email, payment.providerRef ?? '']
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

function scaledAmount(payment: Payment): bigint {
  const exponent = BigInt(currencyExponent(payment.currency));
  return (BigInt(payment.amountMinor) * 100n) / 10n ** exponent;
}

function sortPayments(payments: Payment[], sort: SortOption): Payment[] {
  return [...payments].sort((left, right) => {
    if (sort === 'oldest') {
      return left.createdAt.localeCompare(right.createdAt);
    }

    if (sort === 'amount_desc') {
      const leftAmount = scaledAmount(left);
      const rightAmount = scaledAmount(right);
      return leftAmount === rightAmount ? 0 : leftAmount > rightAmount ? -1 : 1;
    }

    if (sort === 'amount_asc') {
      const leftAmount = scaledAmount(left);
      const rightAmount = scaledAmount(right);
      return leftAmount === rightAmount ? 0 : leftAmount < rightAmount ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

function SummaryMetric({
  label,
  value,
  detail,
  tone = 'default',
  progress,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'default' | 'warning' | 'danger';
  progress?: number;
}) {
  return (
    <div className="min-w-0 px-5 py-5 sm:px-6">
      <p className="text-sm text-slate-gray">{label}</p>
      <p
        className={cn(
          'tabular-nums mt-3 text-heading-sm tracking-heading-sm',
          tone === 'warning' && 'text-status-warning',
          tone === 'danger' && 'text-status-danger',
          tone === 'default' && 'text-ink-black',
        )}
      >
        {value}
      </p>
      {progress === undefined ? null : (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-mist-gray" aria-hidden="true">
          <div
            className="h-full rounded-full bg-status-success transition-[width] duration-500"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
      <p className="mt-2 text-sm text-slate-gray">{detail}</p>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const commonT = useTranslations('common');
  const statusT = useTranslations('status');
  const providersT = useTranslations('providers');
  const locale = useLocale();

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [provider, setProvider] = useState<ProviderFilter>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');
    const providerParam = params.get('provider');
    const sortParam = params.get('sort');
    const periodParam = params.get('period');

    if (statusParam && PAYMENT_STATUSES.includes(statusParam as PaymentStatus)) {
      setStatus(statusParam as PaymentStatus);
    }

    if (providerParam && PAYMENT_PROVIDERS.includes(providerParam as PaymentProvider)) {
      setProvider(providerParam as PaymentProvider);
    }

    if (sortParam && SORT_OPTIONS.includes(sortParam as SortOption)) {
      setSort(sortParam as SortOption);
    }

    if (periodParam && PERIOD_OPTIONS.includes(periodParam as PeriodFilter)) {
      setPeriod(periodParam as PeriodFilter);
    }

    setSearch(params.get('q') ?? '');
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady) {
      return;
    }

    const params = new URLSearchParams();

    if (status !== 'ALL') {
      params.set('status', status);
    }

    if (provider !== 'ALL') {
      params.set('provider', provider);
    }

    if (search.trim()) {
      params.set('q', search.trim());
    }

    if (sort !== DEFAULT_SORT) {
      params.set('sort', sort);
    }

    if (period !== 'all') {
      params.set('period', period);
    }

    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [period, provider, search, sort, status, urlReady]);

  const filters = {
    status: status === 'ALL' ? undefined : status,
    provider: provider === 'ALL' ? undefined : provider,
  };

  const paymentsQuery = useInfiniteQuery({
    queryKey: queryKeys.payments(filters),
    queryFn: ({ pageParam }) =>
      getPayments({ ...filters, limit: 20, cursor: pageParam || undefined }),
    initialPageParam: '',
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    refetchInterval: selectedId ? false : 3_000,
    placeholderData: keepPreviousData,
  });

  const healthQuery = useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    refetchInterval: 5_000,
    placeholderData: keepPreviousData,
  });

  const items = useMemo(
    () => paymentsQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [paymentsQuery.data],
  );

  const filtered = useMemo(
    () =>
      sortPayments(
        items.filter(
          (payment) => matchesPeriod(payment, period) && matchesSearch(payment, deferredSearch),
        ),
        sort,
      ),
    [deferredSearch, items, period, sort],
  );

  const stats = useMemo(() => {
    const successful = filtered.filter((payment) => SUCCESS_STATUSES.includes(payment.status));
    const inFlight = filtered.filter((payment) => IN_FLIGHT_STATUSES.includes(payment.status));
    const failed = filtered.filter((payment) => FAILED_STATUSES.includes(payment.status));
    const settled = successful.length + failed.length;
    const successRate = settled > 0 ? Math.round((successful.length / settled) * 100) : null;
    const volumes = new Map<string, bigint>();

    for (const payment of successful) {
      volumes.set(
        payment.currency,
        (volumes.get(payment.currency) ?? 0n) + BigInt(payment.amountMinor),
      );
    }

    return {
      successful,
      inFlight,
      failed,
      settled,
      successRate,
      volumes: Array.from(volumes.entries()).sort(([left], [right]) => left.localeCompare(right)),
    };
  }, [filtered]);

  const hasActiveFilters =
    status !== 'ALL' || provider !== 'ALL' || period !== 'all' || search.trim() !== '';
  const hasControls = hasActiveFilters || sort !== DEFAULT_SORT;
  const lastUpdatedAt = paymentsQuery.dataUpdatedAt
    ? new Date(paymentsQuery.dataUpdatedAt).toISOString()
    : null;
  const healthCheckedAt = healthQuery.dataUpdatedAt
    ? new Date(healthQuery.dataUpdatedAt).toISOString()
    : null;
  const healthOk = healthQuery.data?.database === 'up';
  function resetFilters() {
    setStatus('ALL');
    setProvider('ALL');
    setPeriod('all');
    setSearch('');
    setSort(DEFAULT_SORT);
    setSelectedId(null);
  }

  async function refresh() {
    setManualRefreshing(true);

    try {
      await Promise.all([paymentsQuery.refetch(), healthQuery.refetch()]);
    } finally {
      setManualRefreshing(false);
    }
  }

  const databaseDot = healthQuery.isPending
    ? 'bg-slate-gray'
    : healthOk
      ? 'bg-status-success'
      : 'bg-status-danger';

  const databaseLabel = healthQuery.isPending
    ? t('system.databaseChecking')
    : healthQuery.isError
      ? t('system.connectionLost')
      : healthOk
        ? t('system.databaseUp')
        : t('system.databaseDown');

  return (
    <div className="page-shell py-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-sm text-slate-gray">{t('pageEyebrow')}</p>
          <h1 className="mt-3 font-w480 text-[34px] leading-[1.08] tracking-heading text-ink-black sm:text-heading sm:tracking-heading">
            {t('titleLine1')}
            <em>{t('titleEmphasis')}</em>
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
                paymentsQuery.isError
                  ? 'bg-status-danger'
                  : paymentsQuery.isPending
                    ? 'bg-slate-gray'
                    : 'bg-status-success',
              )}
              aria-hidden="true"
            />
            {paymentsQuery.isError
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
          <Button asChild size="sm">
            <Link href="/checkout">{t('newPayment')}</Link>
          </Button>
        </div>
      </div>

      <section
        className="mt-8 overflow-hidden rounded-[24px] border border-border bg-paper-white"
        aria-label={t('summary.aria')}
      >
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="min-w-0 bg-blush-peach px-5 py-6 text-sienna-brown sm:px-6 sm:py-7">
            <p className="text-sm text-sienna-brown/80">{t('summary.volumeLabel')}</p>
            {paymentsQuery.isPending ? (
              <Skeleton className="mt-4 h-11 w-48 bg-sienna-brown/10" />
            ) : (
              <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                {stats.volumes.length === 0 ? (
                  <span className="font-w430 text-heading tracking-heading">—</span>
                ) : (
                  stats.volumes.map(([currency, amount]) => (
                    <Money
                      key={currency}
                      amountMinor={amount.toString()}
                      currency={currency}
                      locale={locale}
                      className="font-w430 text-[34px] leading-none tracking-heading sm:text-[40px]"
                    />
                  ))
                )}
              </div>
            )}
            <p className="mt-4 text-sm text-sienna-brown/80">
              {t('summary.scope', { count: filtered.length, loaded: items.length })}
            </p>
          </div>

          <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <SummaryMetric
              label={t('summary.successRate')}
              value={
                paymentsQuery.isPending ? (
                  <Skeleton className="h-7 w-16" />
                ) : stats.successRate === null ? (
                  '—'
                ) : (
                  `${stats.successRate}%`
                )
              }
              detail={t('summary.successRateDetail', { count: stats.settled })}
              progress={stats.successRate ?? undefined}
            />
            <SummaryMetric
              label={t('summary.inFlight')}
              value={
                paymentsQuery.isPending ? <Skeleton className="h-7 w-10" /> : stats.inFlight.length
              }
              detail={t('summary.inFlightDetail')}
              tone={stats.inFlight.length > 0 ? 'warning' : 'default'}
            />
            <SummaryMetric
              label={t('summary.failed')}
              value={
                paymentsQuery.isPending ? <Skeleton className="h-7 w-10" /> : stats.failed.length
              }
              detail={t('summary.failedDetail')}
              tone={stats.failed.length > 0 ? 'danger' : 'default'}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 min-w-0 overflow-hidden rounded-[24px] border border-border bg-paper-white">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="text-body-lg font-medium text-ink-black">{t('payments')}</h2>
              <p className="mt-1 text-sm text-slate-gray">
                {t('resultCount', { count: filtered.length, loaded: items.length })}
              </p>
            </div>
            {hasControls ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="size-4" aria-hidden="true" />
                {t('reset')}
              </Button>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-gray"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchAria')}
                className="pr-9 pl-9"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label={t('clearSearch')}
                  className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-fog-white hover:text-ink-black"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-auto sm:min-w-36"
                  aria-label={t('filterStatusAria')}
                >
                  <SelectValue>{status === 'ALL' ? t('allStatuses') : statusT(status)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allStatuses')}</SelectItem>
                  {PAYMENT_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {statusT(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as ProviderFilter)}
              >
                <SelectTrigger
                  size="sm"
                  className="w-full sm:w-auto sm:min-w-32"
                  aria-label={t('filterProviderAria')}
                >
                  <SelectValue>
                    {provider === 'ALL' ? t('allProviders') : providersT(provider)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allProviders')}</SelectItem>
                  {PAYMENT_PROVIDERS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {providersT(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div>
                <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
                  <SelectTrigger
                    size="sm"
                    className="w-full sm:w-auto sm:min-w-32"
                    aria-label={t('periodLabel')}
                  >
                    <SelectValue>{t(`period.${period}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`period.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
                  <SelectTrigger
                    size="sm"
                    className="w-full sm:w-auto sm:min-w-40"
                    aria-label={t('sortLabel')}
                  >
                    <SelectValue>{t(`sort.${sort}`)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`sort.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {paymentsQuery.isPending ? (
          <div className="space-y-3 p-5 sm:p-6">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : paymentsQuery.isError ? (
          <div className="p-5 sm:p-6">
            <Alert variant="destructive">
              <CircleAlert className="size-4" aria-hidden="true" />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>{t('error')}</p>
                <Button variant="outline" size="sm" onClick={() => void paymentsQuery.refetch()}>
                  {t('retry')}
                </Button>
              </div>
            </Alert>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Inbox className="size-5 text-slate-gray" aria-hidden="true" />
            <p className="text-body-lg text-ink-black">
              {hasActiveFilters ? t('emptyFilteredTitle') : t('emptyTitle')}
            </p>
            <p className="max-w-sm text-sm text-slate-gray">
              {hasActiveFilters ? t('emptyFilteredBody') : t('emptyBody')}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                {t('reset')}
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/checkout">{t('newPayment')}</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <Table className="min-w-[720px]">
                <TableCaption className="sr-only">{t('table.caption')}</TableCaption>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead scope="col" className="pl-5 text-sm text-slate-gray sm:pl-6">
                      {t('table.payment')}
                    </TableHead>
                    <TableHead scope="col" className="text-sm text-slate-gray">
                      {t('table.customer')}
                    </TableHead>
                    <TableHead
                      scope="col"
                      aria-sort={
                        sort === 'amount_asc'
                          ? 'ascending'
                          : sort === 'amount_desc'
                            ? 'descending'
                            : 'none'
                      }
                      className="text-right text-sm text-slate-gray"
                    >
                      {t('table.amount')}
                    </TableHead>
                    <TableHead scope="col" className="text-sm text-slate-gray">
                      {t('table.status')}
                    </TableHead>
                    <TableHead scope="col" className="text-sm text-slate-gray">
                      {t('table.provider')}
                    </TableHead>
                    <TableHead
                      scope="col"
                      aria-sort={
                        sort === 'oldest' ? 'ascending' : sort === 'newest' ? 'descending' : 'none'
                      }
                      className="text-sm text-slate-gray"
                    >
                      {t('table.created')}
                    </TableHead>
                    <TableHead scope="col" className="pr-5 text-right sm:pr-6">
                      <span className="sr-only">{t('table.open')}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((payment) => (
                    <TableRow
                      key={payment.id}
                      onClick={() => setSelectedId(payment.id)}
                      className="cursor-pointer border-border transition-colors hover:bg-fog-white"
                    >
                      <TableCell className="py-4 pl-5 sm:pl-6">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(payment.id);
                          }}
                          aria-haspopup="dialog"
                          aria-label={t('openAria', { id: shortId(payment.id) })}
                          title={payment.id}
                          className="group inline-flex max-w-full items-center gap-2 text-left"
                        >
                          <span className="font-mono text-sm text-ink-black">
                            {shortId(payment.id)}
                          </span>
                          <ArrowUpRight
                            className="size-3.5 text-slate-gray opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                            aria-hidden="true"
                          />
                        </button>
                      </TableCell>
                      <TableCell className="max-w-56 py-4">
                        <span className="block truncate text-sm text-ink-black">
                          {payment.customer.name}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-slate-gray">
                          {payment.customer.email}
                        </span>
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Money
                          amountMinor={payment.amountMinor}
                          currency={payment.currency}
                          locale={locale}
                          className="text-sm font-medium text-ink-black"
                        />
                      </TableCell>
                      <TableCell className="py-4">
                        <StatusBadge status={payment.status} compact />
                      </TableCell>
                      <TableCell className="py-4 text-sm text-slate-gray">
                        {providersT(payment.provider)}
                      </TableCell>
                      <TableCell className="py-4 text-sm text-slate-gray">
                        <time
                          dateTime={payment.createdAt}
                          title={formatDateTime(payment.createdAt, locale)}
                          className="tabular-nums"
                        >
                          {formatRelative(payment.createdAt, locale)}
                        </time>
                      </TableCell>
                      <TableCell className="py-4 pr-5 text-right sm:pr-6">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(payment.id);
                          }}
                          aria-label={t('openAria', { id: shortId(payment.id) })}
                        >
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <ul className="divide-y divide-border md:hidden">
              {filtered.map((payment) => (
                <li key={payment.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(payment.id)}
                    aria-haspopup="dialog"
                    className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-fog-white focus-visible:bg-fog-white focus-visible:outline-none"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-mono text-sm text-ink-black">
                        {shortId(payment.id)}
                      </span>
                      <StatusBadge status={payment.status} compact />
                    </span>
                    <span className="flex items-end justify-between gap-4">
                      <span className="min-w-0">
                        <span className="block truncate text-base text-ink-black">
                          {payment.customer.name}
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-slate-gray">
                          {payment.customer.email}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Money
                          amountMinor={payment.amountMinor}
                          currency={payment.currency}
                          locale={locale}
                          className="block text-base font-medium text-ink-black"
                        />
                        <span className="mt-0.5 block text-sm text-slate-gray">
                          {providersT(payment.provider)}
                        </span>
                      </span>
                    </span>
                    <span className="flex items-center justify-between gap-3 text-sm text-slate-gray">
                      <time dateTime={payment.createdAt}>
                        {formatRelative(payment.createdAt, locale)}
                      </time>
                      <span className="inline-flex items-center gap-1 text-ink-black">
                        {t('open')}
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {paymentsQuery.hasNextPage ? (
          <div className="flex justify-center border-t border-border p-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void paymentsQuery.fetchNextPage()}
              disabled={paymentsQuery.isFetchingNextPage}
            >
              <ChevronDown className="size-4" aria-hidden="true" />
              {paymentsQuery.isFetchingNextPage ? t('loading') : t('loadMore')}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="mt-6 overflow-hidden rounded-[24px] border border-border bg-paper-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-slate-gray" aria-hidden="true" />
            <h2 className="text-body-lg font-medium text-ink-black">{t('system.title')}</h2>
          </div>
          <p className="text-sm text-slate-gray">
            {healthQuery.isPending
              ? t('system.checking')
              : healthCheckedAt
                ? t('system.checkedAt', { time: formatTime(healthCheckedAt, locale) })
                : t('system.connectionLost')}
          </p>
        </div>
        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="min-w-0 px-5 py-5 sm:px-6">
            <p className="text-sm text-slate-gray">{t('system.database')}</p>
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-black">
              <span className={cn('size-1.5 rounded-full', databaseDot)} aria-hidden="true" />
              {databaseLabel}
            </p>
            <p className="tabular-nums mt-1 text-sm text-slate-gray">
              {healthQuery.data
                ? t('system.latency', { ms: healthQuery.data.latencyMs })
                : t('system.latencyUnknown')}
            </p>
          </div>
          <div className="min-w-0 px-5 py-5 sm:px-6">
            <div className="flex items-center gap-2 text-sm text-slate-gray">
              <Inbox className="size-4" aria-hidden="true" />
              {t('system.queue')}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <p>
                <span className="block text-slate-gray">{t('system.waiting')}</span>
                <span className="tabular-nums text-ink-black">
                  {healthQuery.data?.queue.waiting ?? '—'}
                </span>
              </p>
              <p>
                <span className="block text-slate-gray">{t('system.active')}</span>
                <span className="tabular-nums text-ink-black">
                  {healthQuery.data?.queue.active ?? '—'}
                </span>
              </p>
              <p>
                <span className="block text-slate-gray">{t('system.failed')}</span>
                <span
                  className={cn(
                    'tabular-nums',
                    (healthQuery.data?.queue.failed ?? 0) > 0
                      ? 'text-status-danger'
                      : 'text-ink-black',
                  )}
                >
                  {healthQuery.data?.queue.failed ?? '—'}
                </span>
              </p>
              <p>
                <span className="block text-slate-gray">{t('system.completed')}</span>
                <span className="tabular-nums text-ink-black">
                  {healthQuery.data?.queue.completed ?? '—'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Sheet
        open={selectedId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
          }
        }}
      >
        <SheetContent
          showCloseButton={false}
          className="w-full gap-0 overflow-y-auto sm:max-w-[680px]"
        >
          <SheetHeader className="sticky top-0 z-10 gap-1 border-b border-border bg-paper-white/95 px-6 py-5 pr-14 backdrop-blur">
            <SheetTitle className="text-body-lg font-medium text-ink-black">
              {t('detailTitle')}
            </SheetTitle>
            <SheetDescription className="font-mono text-sm text-slate-gray">
              {selectedId ? t('detailDescription', { id: shortId(selectedId) }) : null}
            </SheetDescription>
            <SheetClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={commonT('close')}
                className="absolute top-3 right-3"
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="flex-1 px-6 py-5">
            {selectedId ? <PaymentDetail paymentId={selectedId} /> : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
