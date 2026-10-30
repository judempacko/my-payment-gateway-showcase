'use client';

import {
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  currencyExponent,
  type Payment,
  type PaymentProvider,
  type PaymentStatus,
} from '@pay/contracts';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  CircleAlert,
  Hash,
  Inbox,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Money } from '@/components/money';
import { PaymentDetail } from '@/components/payment-detail';
import { StatusBadge } from '@/components/status-badge';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { getPayments } from '@/lib/api';
import { formatDateTime, formatRelative, shortId } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';

type StatusFilter = PaymentStatus | 'ALL';
type ProviderFilter = PaymentProvider | 'ALL';
type SortOption = 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';
type PeriodFilter = 'all' | 'last24h' | 'last7d' | 'last30d';

const DEFAULT_SORT: SortOption = 'newest';
const PAGE_SIZE_OPTIONS = [10, 15, 25] as const;
const SORT_OPTIONS: SortOption[] = ['newest', 'oldest', 'amount_desc', 'amount_asc'];
const PERIOD_OPTIONS: PeriodFilter[] = ['all', 'last24h', 'last7d', 'last30d'];
const PERIOD_MS: Record<Exclude<PeriodFilter, 'all'>, number> = {
  last24h: 24 * 60 * 60 * 1_000,
  last7d: 7 * 24 * 60 * 60 * 1_000,
  last30d: 30 * 24 * 60 * 60 * 1_000,
};

function matchesPeriod(payment: Payment, period: PeriodFilter): boolean {
  if (period === 'all') {
    return true;
  }

  return new Date(payment.createdAt).getTime() >= Date.now() - PERIOD_MS[period];
}

function matchesPaymentId(payment: Payment, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return payment.id.toLowerCase().includes(needle);
}

function matchesCustomer(payment: Payment, query: string): boolean {
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return true;
  }

  return [payment.customer.name, payment.customer.email].join(' ').toLowerCase().includes(needle);
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

export function PaymentsPanel() {
  const t = useTranslations('dashboard');
  const commonT = useTranslations('common');
  const statusT = useTranslations('status');
  const providersT = useTranslations('providers');
  const locale = useLocale();

  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [provider, setProvider] = useState<ProviderFilter>('ALL');
  const [paymentIdQuery, setPaymentIdQuery] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [urlReady, setUrlReady] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deferredPaymentId = useDeferredValue(paymentIdQuery);
  const deferredCustomer = useDeferredValue(customerQuery);

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

    setPaymentIdQuery(params.get('id') ?? '');
    setCustomerQuery(params.get('customer') ?? '');
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

    if (paymentIdQuery.trim()) {
      params.set('id', paymentIdQuery.trim());
    }

    if (customerQuery.trim()) {
      params.set('customer', customerQuery.trim());
    }

    if (sort !== DEFAULT_SORT) {
      params.set('sort', sort);
    }

    if (period !== 'all') {
      params.set('period', period);
    }

    const query = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, [customerQuery, paymentIdQuery, period, provider, sort, status, urlReady]);

  useEffect(() => {
    setPageIndex(0);
  }, [customerQuery, paymentIdQuery, period, provider, status, pageSize]);

  const filters = {
    status: status === 'ALL' ? undefined : status,
    provider: provider === 'ALL' ? undefined : provider,
  };

  const paymentsQuery = useQuery({
    queryKey: [...queryKeys.payments(filters), pageIndex + 1, pageSize],
    queryFn: () => getPayments({ ...filters, limit: pageSize, page: pageIndex + 1 }),
    refetchInterval: selectedId ? false : 3_000,
    placeholderData: keepPreviousData,
  });

  const items = useMemo(() => paymentsQuery.data?.items ?? [], [paymentsQuery.data]);

  const pageCount = paymentsQuery.data?.pageCount ?? 0;
  const hasNextPage = pageIndex + 1 < pageCount;

  const visiblePages = useMemo(() => {
    const count = Math.min(3, Math.max(pageCount, 1));
    let start = Math.max(1, pageIndex + 1 - Math.floor(count / 2));
    const end = Math.min(pageCount || 1, start + count - 1);
    start = Math.max(1, end - count + 1);

    return Array.from({ length: count }, (_, index) => start + index);
  }, [pageCount, pageIndex]);

  const filtered = useMemo(
    () =>
      sortPayments(
        items.filter(
          (payment) =>
            matchesPeriod(payment, period) &&
            matchesPaymentId(payment, deferredPaymentId) &&
            matchesCustomer(payment, deferredCustomer),
        ),
        sort,
      ),
    [deferredCustomer, deferredPaymentId, items, period, sort],
  );

  const activeFilters: Array<{ key: string; label: string; clear: () => void }> = [];

  if (paymentIdQuery.trim()) {
    activeFilters.push({
      key: 'paymentId',
      label: `${t('table.payment')} : ${paymentIdQuery.trim()}`,
      clear: () => setPaymentIdQuery(''),
    });
  }

  if (customerQuery.trim()) {
    activeFilters.push({
      key: 'customer',
      label: `${t('table.customer')} : ${customerQuery.trim()}`,
      clear: () => setCustomerQuery(''),
    });
  }

  if (status !== 'ALL') {
    activeFilters.push({
      key: 'status',
      label: `${t('filterStatusLabel')} : ${statusT(status)}`,
      clear: () => setStatus('ALL'),
    });
  }

  if (provider !== 'ALL') {
    activeFilters.push({
      key: 'provider',
      label: `${t('filterProviderLabel')} : ${providersT(provider)}`,
      clear: () => setProvider('ALL'),
    });
  }

  if (period !== 'all') {
    activeFilters.push({
      key: 'period',
      label: `${t('filterPeriodLabel')} : ${t(`period.${period}`)}`,
      clear: () => setPeriod('all'),
    });
  }

  const activeFilterCount = activeFilters.length;
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setStatus('ALL');
    setProvider('ALL');
    setPeriod('all');
    setPaymentIdQuery('');
    setCustomerQuery('');
    setSelectedId(null);
  }

  function changeSort(value: string) {
    setSort(value as SortOption);
  }

  function goToPage(page: number) {
    if (page < 1 || page > Math.max(pageCount, 1) || page === pageIndex + 1) {
      return;
    }

    setPageIndex(page - 1);
  }

  function goToPreviousPage() {
    goToPage(pageIndex);
  }

  function goToNextPage() {
    goToPage(pageIndex + 2);
  }

  function changePageSize(value: string) {
    setPageSize(Number(value));
    setPageIndex(0);
  }

  return (
    <>
      <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-paper-white">
        <h2 className="sr-only">{t('payments')}</h2>
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
                <Hash
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-gray"
                  aria-hidden="true"
                />
                <Input
                  value={paymentIdQuery}
                  onChange={(event) => setPaymentIdQuery(event.target.value)}
                  placeholder={t('paymentIdPlaceholder')}
                  aria-label={t('paymentIdAria')}
                  className="h-9 pr-9 pl-9 text-sm"
                />
                {paymentIdQuery ? (
                  <button
                    type="button"
                    onClick={() => setPaymentIdQuery('')}
                    aria-label={t('clearPaymentId')}
                    className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-fog-white hover:text-ink-black"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <div className="relative min-w-0">
                <User
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-gray"
                  aria-hidden="true"
                />
                <Input
                  value={customerQuery}
                  onChange={(event) => setCustomerQuery(event.target.value)}
                  placeholder={t('customerPlaceholder')}
                  aria-label={t('customerAria')}
                  className="h-9 pr-9 pl-9 text-sm"
                />
                {customerQuery ? (
                  <button
                    type="button"
                    onClick={() => setCustomerQuery('')}
                    aria-label={t('clearCustomer')}
                    className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-fog-white hover:text-ink-black"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-center sm:w-auto">
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                    {t('filters')}
                    {activeFilterCount > 0 ? (
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-blush-peach text-xs text-sienna-brown tabular-nums">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  aria-label={t('filters')}
                  className="w-[min(20rem,calc(100vw-2rem))]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium text-ink-black">{t('filters')}</h3>
                    {activeFilterCount > 0 ? (
                      <Button variant="ghost" size="xs" onClick={clearFilters}>
                        {t('clearFilters')}
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="status-filter">{t('filterStatusLabel')}</Label>
                      <Select
                        value={status}
                        onValueChange={(value) => setStatus(value as StatusFilter)}
                      >
                        <SelectTrigger
                          id="status-filter"
                          size="sm"
                          className="w-full px-3 text-sm"
                          aria-label={t('filterStatusAria')}
                        >
                          <SelectValue>
                            {status === 'ALL' ? t('allStatuses') : statusT(status)}
                          </SelectValue>
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="provider-filter">{t('filterProviderLabel')}</Label>
                      <Select
                        value={provider}
                        onValueChange={(value) => setProvider(value as ProviderFilter)}
                      >
                        <SelectTrigger
                          id="provider-filter"
                          size="sm"
                          className="w-full px-3 text-sm"
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="period-filter">{t('filterPeriodLabel')}</Label>
                      <Select
                        value={period}
                        onValueChange={(value) => setPeriod(value as PeriodFilter)}
                      >
                        <SelectTrigger
                          id="period-filter"
                          size="sm"
                          className="w-full px-3 text-sm"
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
                  </div>

                  <div className="mt-4 flex justify-end border-t border-border pt-3">
                    <Button variant="outline" size="sm" onClick={() => setFiltersOpen(false)}>
                      {t('closeFilters')}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter.key}
                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-fog-white py-1 pr-1 pl-2.5 text-sm text-slate-gray"
                  >
                    <span className="max-w-[220px] truncate">{filter.label}</span>
                    <button
                      type="button"
                      onClick={filter.clear}
                      aria-label={t('removeFilter', { filter: filter.label })}
                      className="inline-flex size-5 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-paper-white hover:text-ink-black"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
                <Button variant="ghost" size="xs" onClick={clearFilters}>
                  {t('clearFilters')}
                </Button>
              </div>
            ) : null}

            <div className="flex items-center gap-2 md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="size-4" aria-hidden="true" />
                    {t(`sort.${sort}`)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuRadioGroup value={sort} onValueChange={changeSort}>
                    <DropdownMenuRadioItem value="newest">{t('sort.newest')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="oldest">{t('sort.oldest')}</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="amount_desc">
                      {t('sort.amount_desc')}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="amount_asc">
                      {t('sort.amount_asc')}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
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
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t('clearFilters')}
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
                      <div className="inline-flex items-center gap-1">
                        <span>{t('table.amount')}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={t('sortAmountMenu')}
                              className="inline-flex size-6 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-fog-white hover:text-ink-black focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                            >
                              <ChevronDown className="size-4" aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuRadioGroup
                              value={
                                sort === 'amount_asc' || sort === 'amount_desc' ? sort : undefined
                              }
                              onValueChange={changeSort}
                            >
                              <DropdownMenuRadioItem value="amount_desc">
                                {t('sort.amount_desc')}
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="amount_asc">
                                {t('sort.amount_asc')}
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
                      <div className="inline-flex items-center gap-1">
                        <span>{t('table.created')}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={t('sortCreatedMenu')}
                              className="inline-flex size-6 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-fog-white hover:text-ink-black focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
                            >
                              <ChevronDown className="size-4" aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuRadioGroup
                              value={sort === 'newest' || sort === 'oldest' ? sort : undefined}
                              onValueChange={changeSort}
                            >
                              <DropdownMenuRadioItem value="newest">
                                {t('sort.newest')}
                              </DropdownMenuRadioItem>
                              <DropdownMenuRadioItem value="oldest">
                                {t('sort.oldest')}
                              </DropdownMenuRadioItem>
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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

        {!paymentsQuery.isPending &&
        !paymentsQuery.isError &&
        (items.length > 0 || pageIndex > 0) ? (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-gray sm:justify-start">
              <span>{t('pagination.rowsPerPage')}</span>
              <Select value={String(pageSize)} onValueChange={changePageSize}>
                <SelectTrigger
                  size="sm"
                  className="h-8 w-[76px] px-3 text-sm"
                  aria-label={t('pagination.rowsPerPageAria')}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Pagination aria-label={t('pagination.aria')} className="justify-center sm:justify-end">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={goToPreviousPage}
                    disabled={pageIndex === 0 || paymentsQuery.isFetching}
                    aria-label={t('pagination.previous')}
                  >
                    {t('pagination.previous')}
                  </PaginationPrevious>
                </PaginationItem>
                {visiblePages.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      isActive={page === pageIndex + 1}
                      onClick={() => goToPage(page)}
                      aria-label={t('pagination.page', { page })}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={goToNextPage}
                    disabled={!hasNextPage || paymentsQuery.isFetching}
                    aria-label={t('pagination.next')}
                  >
                    {t('pagination.next')}
                  </PaginationNext>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        ) : null}
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
    </>
  );
}
