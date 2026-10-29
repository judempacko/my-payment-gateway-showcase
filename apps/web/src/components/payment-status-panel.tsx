'use client';

import type { Payment, PaymentEvent, Product, WebhookRecord } from '@pay/contracts';
import { isSettledStatus } from '@pay/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  ShieldCheck,
  Smartphone,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { JsonViewer } from '@/components/json-viewer';
import { Money } from '@/components/money';
import { PaymentTimeline } from '@/components/payment-timeline';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import { getPaymentTimeline, getPaymentWebhooks, getPayment, simulatePayment } from '@/lib/api';
import { localized, type ProductPresentation } from '@/lib/catalog-presentation';
import { formatDateTime, orderNumber } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { usePaymentStream } from '@/lib/use-payment-stream';
import { cn } from '@/lib/utils';

export function PaymentStatusPanel({
  initialPayment,
  product,
  presentation,
  locale,
  stripeState,
}: {
  initialPayment: Payment;
  product: Product | undefined;
  presentation: ProductPresentation | undefined;
  locale: string;
  stripeState?: 'success' | 'cancel';
}) {
  const t = useTranslations('result');
  const common = useTranslations('common');
  const checkout = useTranslations('checkout');
  const methodT = useTranslations('checkout.payment');
  const statusT = useTranslations('status');
  usePaymentStream(initialPayment.id);

  const paymentQuery = useQuery({
    queryKey: queryKeys.payment(initialPayment.id),
    queryFn: () => getPayment(initialPayment.id),
    initialData: initialPayment,
    refetchInterval: (query) =>
      isSettledStatus(query.state.data?.status ?? initialPayment.status) ? false : 3_000,
  });

  const payment = paymentQuery.data;
  const settled = isSettledStatus(payment.status);
  const canceledByStripe = stripeState === 'cancel' && !settled;
  const methodLabel =
    payment.provider === 'mock' && payment.method === 'card'
      ? methodT('cardDemo')
      : payment.provider === 'mock' && payment.method === 'mobile_money'
        ? methodT('mobileMoneyDemo')
        : payment.method === 'card'
          ? methodT('card')
          : payment.method === 'mobile_money'
            ? methodT('mobileMoney')
            : common('demo');

  const retryHref = product ? `/checkout?product=${product.slug}` : '/shop';
  const address = getShippingAddress(payment.metadata);

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <LocalizedStatus status={payment.status} />
          <DeveloperDrawer
            payment={payment}
            locale={locale}
            settled={settled}
            statusLabel={statusT(payment.status)}
          />
        </div>

        {payment.status === 'SUCCEEDED' ? (
          <SuccessView
            payment={payment}
            product={product}
            presentation={presentation}
            locale={locale}
            methodLabel={methodLabel}
            address={address}
          />
        ) : payment.status === 'FAILED' ? (
          <OutcomeView
            tone="failed"
            title={t('failed.title')}
            subtitle={t('failed.subtitle')}
            badge={t('failed.noCharge')}
            retryHref={retryHref}
            retryLabel={t('failed.tryAgain')}
          />
        ) : payment.status === 'EXPIRED' ? (
          <OutcomeView
            tone="expired"
            title={t('expired.title')}
            subtitle={t('expired.subtitle')}
            retryHref={retryHref}
            retryLabel={t('expired.restart')}
          />
        ) : payment.status === 'CANCELED' || canceledByStripe ? (
          <OutcomeView
            tone="canceled"
            title={t('canceled.title')}
            subtitle={t('canceled.subtitle')}
            retryHref={retryHref}
            retryLabel={t('canceled.restart')}
          />
        ) : (
          <PendingView
            payment={payment}
            product={product}
            locale={locale}
            stripeState={stripeState}
            retryHref={retryHref}
            onCheck={() => void paymentQuery.refetch()}
            checking={paymentQuery.isFetching}
          />
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 print:hidden">
          <Button asChild variant="outline">
            <Link href="/shop">{common('backToShop')}</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/checkout">{checkout('eyebrow')}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuccessView({
  payment,
  product,
  presentation,
  locale,
  methodLabel,
  address,
}: {
  payment: Payment;
  product: Product | undefined;
  presentation: ProductPresentation | undefined;
  locale: string;
  methodLabel: string;
  address: ShippingAddress | null;
}) {
  const t = useTranslations('result.success');
  const checkout = useTranslations('checkout');
  const common = useTranslations('common');

  return (
    <div className="mt-8">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-blush-peach text-sienna-brown">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm text-ash-gray">{checkout('eyebrow')}</p>
        <h1 className="mt-2 font-w480 text-[34px] leading-[1.12] tracking-[-0.5px] text-ink-black">
          {t('title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-body text-slate-gray">{t('subtitle')}</p>
        <p className="mt-4">
          <Money
            amountMinor={payment.amountMinor}
            currency={payment.currency}
            locale={locale}
            className="text-heading-sm text-ink-black"
          />
        </p>
      </div>

      <Card className="mt-8 bg-paper-white">
        <CardHeader>
          <CardTitle>{t('receipt')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-4 rounded-2xl bg-fog-white p-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-mist-gray text-sm text-slate-gray">
              {presentation?.brand ?? 'Orbit'}
            </div>
            <div className="min-w-0">
              <p className="text-base text-ink-black">{product?.name ?? '—'}</p>
              {presentation ? (
                <p className="mt-1 text-sm text-slate-gray">
                  {localized(presentation.tagline, locale)}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-gray">
                {checkout('summary.quantity')} ×{payment.quantity}
              </p>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <ReceiptRow label={t('orderNumber')} value={orderNumber(payment.id)} />
            <ReceiptRow
              label={t('amount')}
              value={
                <Money
                  amountMinor={payment.amountMinor}
                  currency={payment.currency}
                  locale={locale}
                />
              }
            />
            <ReceiptRow label={t('method')} value={methodLabel} />
            <ReceiptRow label={t('date')} value={formatDateTime(payment.createdAt, locale)} />
            <ReceiptRow label={t('eta')} value={checkout('delivery.standardEta')} />
            <ReceiptRow label={checkout('delivery.standard')} value={checkout('delivery.free')} />
          </dl>

          {address ? (
            <div className="rounded-2xl bg-fog-white p-4">
              <p className="text-sm text-slate-gray">{t('deliveryAddress')}</p>
              <p className="mt-1 text-sm text-ink-black">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
              </p>
              <p className="text-sm text-slate-gray">
                {address.postalCode ? `${address.postalCode} ` : ''}
                {address.city}
                {address.country ? `, ${address.country}` : ''}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Button type="button" onClick={() => window.print()}>
              <Printer className="size-4" aria-hidden="true" />
              {t('print')}
            </Button>
            <span className="flex items-center gap-2 text-sm text-slate-gray">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {common('secureCheckout')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingView({
  payment,
  product,
  locale,
  stripeState,
  retryHref,
  onCheck,
  checking,
}: {
  payment: Payment;
  product: Product | undefined;
  locale: string;
  stripeState?: 'success' | 'cancel';
  retryHref: string;
  onCheck: () => void;
  checking: boolean;
}) {
  const t = useTranslations('result');

  return (
    <div className="mt-8">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-fog-white text-ink-black">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
        </div>
        <h1 className="mt-5 font-w480 text-[34px] leading-[1.12] tracking-[-0.5px] text-ink-black">
          {t('pending.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-body text-slate-gray">{t('pending.subtitle')}</p>
        {stripeState === 'success' ? (
          <p className="mt-2 text-sm text-ash-gray">{t('redirect.title')}</p>
        ) : null}
      </div>

      <Card className="mt-8 bg-paper-white">
        <CardHeader>
          <CardTitle>{t('eyebrow')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Progress current={payment.status} />
          <Separator />
          <NextActionPanel
            payment={payment}
            product={product}
            onCheck={onCheck}
            checking={checking}
          />
        </CardContent>
      </Card>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={onCheck} disabled={checking}>
          <RefreshCw className={cn('size-4', checking && 'animate-spin')} aria-hidden="true" />
          {t('pending.checkAgain')}
        </Button>
        <Button asChild variant="outline">
          <Link href={retryHref}>{t('pending.useAnotherMethod')}</Link>
        </Button>
      </div>
      <p className="mt-3 text-center text-sm text-ash-gray">
        {t('pending.lastUpdated')} · {formatDateTime(payment.updatedAt, locale)}
      </p>
    </div>
  );
}

function NextActionPanel({
  payment,
  product,
  onCheck,
  checking,
}: {
  payment: Payment;
  product: Product | undefined;
  onCheck: () => void;
  checking: boolean;
}) {
  const t = useTranslations('result');
  const queryClient = useQueryClient();
  const action = payment.nextAction;

  const mutation = useMutation({
    mutationFn: (outcome: 'succeeded' | 'failed' | 'expired') =>
      simulatePayment(payment.id, outcome),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payment(payment.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline(payment.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.webhooks(payment.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments({}) }),
      ]);
    },
  });

  if (action?.type === 'mock_approval') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-blush-peach p-4 text-sienna-brown">
          <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{t('demo.title')}</p>
            <p className="mt-1 text-sm">{t('demo.description')}</p>
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full"
          onClick={() => mutation.mutate('succeeded')}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {t('demo.sending')}
            </>
          ) : (
            t('demo.approve')
          )}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => mutation.mutate('failed')}
            disabled={mutation.isPending}
          >
            {t('demo.fail')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => mutation.mutate('expired')}
            disabled={mutation.isPending}
          >
            {t('demo.expire')}
          </Button>
        </div>
        <p className="text-sm text-slate-gray">{t('demo.note')}</p>
        {mutation.isError ? (
          <Alert variant="destructive">
            <p>{t('failed.subtitle')}</p>
          </Alert>
        ) : null}
      </div>
    );
  }

  if (action?.type === 'ussd') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl bg-fog-white p-4">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-ink-black" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-ink-black">{t('ussd.title')}</p>
            <p className="mt-1 text-sm text-slate-gray">
              {t('ussd.description', { phone: payment.customer.phone ?? '—' })}
            </p>
            <p className="mt-1 text-sm text-slate-gray">{t('ussd.hint')}</p>
          </div>
        </div>
        <Button type="button" onClick={onCheck} disabled={checking}>
          <RefreshCw className={cn('size-4', checking && 'animate-spin')} aria-hidden="true" />
          {t('ussd.check')}
        </Button>
      </div>
    );
  }

  if (action?.type === 'redirect') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-gray">{t('redirect.description')}</p>
        <Button asChild size="lg" className="w-full">
          <a href={action.url} rel="noreferrer">
            {t('redirect.continue')}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-gray">{product ? product.name : t('pending.waiting')}</p>
      <Button type="button" onClick={onCheck} disabled={checking}>
        <RefreshCw className={cn('size-4', checking && 'animate-spin')} aria-hidden="true" />
        {t('pending.checkAgain')}
      </Button>
    </div>
  );
}

function Progress({ current }: { current: Payment['status'] }) {
  const t = useTranslations('result.pending');
  const steps = [
    { key: 'created', label: t('stepCheckout') },
    { key: 'provider', label: t('stepProvider') },
    { key: 'confirmed', label: t('stepConfirmation') },
  ];
  const active =
    current === 'PROCESSING' ? 1 : current === 'REQUIRES_ACTION' || current === 'PENDING' ? 1 : 0;

  return (
    <ol className="grid gap-3 sm:grid-cols-3" aria-label={t('title')}>
      {steps.map((step, index) => (
        <li
          key={step.key}
          className={cn(
            'rounded-2xl border p-3 text-sm',
            index <= active
              ? 'border-ink-black/15 bg-paper-white text-ink-black'
              : 'border-border bg-fog-white text-slate-gray',
          )}
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'flex size-5 items-center justify-center rounded-full border text-[11px]',
                index < active && 'border-ink-black bg-ink-black text-paper-white',
                index === active && 'border-ink-black',
              )}
            >
              {index < active ? <Check className="size-3" aria-hidden="true" /> : index + 1}
            </span>
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function OutcomeView({
  tone,
  title,
  subtitle,
  badge,
  retryHref,
  retryLabel,
}: {
  tone: 'failed' | 'expired' | 'canceled';
  title: string;
  subtitle: string;
  badge?: string;
  retryHref: string;
  retryLabel: string;
}) {
  const common = useTranslations('common');
  const Icon = tone === 'failed' ? AlertCircle : CheckCircle2;

  return (
    <div className="mt-8 text-center">
      <div
        className={cn(
          'mx-auto flex size-14 items-center justify-center rounded-full',
          tone === 'failed' ? 'bg-ink-black text-paper-white' : 'bg-fog-white text-ink-black',
        )}
      >
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <h1 className="mt-5 font-w480 text-[34px] leading-[1.12] tracking-[-0.5px] text-ink-black">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-body text-slate-gray">{subtitle}</p>
      {badge ? (
        <div className="mt-3">
          <Badge variant="neutral">{badge}</Badge>
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={retryHref}>{retryLabel}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/shop">{common('backToShop')}</Link>
        </Button>
      </div>
    </div>
  );
}

function LocalizedStatus({ status }: { status: Payment['status'] }) {
  const t = useTranslations('status');

  return (
    <Badge
      variant={
        status === 'SUCCEEDED' || status === 'REFUNDED'
          ? 'success'
          : status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELED'
            ? 'danger'
            : 'info'
      }
    >
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {t(status)}
    </Badge>
  );
}

function ReceiptRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-slate-gray">{label}</dt>
      <dd className="mt-1 text-sm text-ink-black">{value}</dd>
    </div>
  );
}

type ShippingAddress = {
  line1: string;
  line2?: string;
  city: string;
  postalCode?: string;
  country?: string;
};

function getShippingAddress(metadata: Record<string, unknown>): ShippingAddress | null {
  const value = metadata.shippingAddress;

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const line1 = typeof record.line1 === 'string' ? record.line1 : '';
  const city = typeof record.city === 'string' ? record.city : '';

  if (!line1 && !city) {
    return null;
  }

  return {
    line1,
    line2: typeof record.line2 === 'string' ? record.line2 : undefined,
    city,
    postalCode: typeof record.postalCode === 'string' ? record.postalCode : undefined,
    country: typeof record.country === 'string' ? record.country : undefined,
  };
}

function DeveloperDrawer({
  payment,
  locale,
  settled,
  statusLabel,
}: {
  payment: Payment;
  locale: string;
  settled: boolean;
  statusLabel: string;
}) {
  const t = useTranslations('result.drawer');
  const common = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const timelineQuery = useQuery({
    queryKey: queryKeys.timeline(payment.id),
    queryFn: () => getPaymentTimeline(payment.id),
    enabled: open,
    refetchInterval: open && !settled ? 3_000 : false,
  });

  const webhooksQuery = useQuery({
    queryKey: queryKeys.webhooks(payment.id),
    queryFn: () => getPaymentWebhooks(payment.id),
    enabled: open,
    refetchInterval: open && !settled ? 5_000 : false,
  });

  async function copyPaymentId() {
    try {
      await navigator.clipboard.writeText(payment.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Code2 className="size-4" aria-hidden="true" />
          {t('title')}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t('title')}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-8">
          <div className="rounded-2xl bg-fog-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-gray">{t('paymentId')}</p>
                <p className="tabular-nums mt-1 break-all text-sm text-ink-black">{payment.id}</p>
              </div>
              <Button type="button" variant="ghost" size="xs" onClick={copyPaymentId}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <DrawerRow label={t('provider')} value={payment.provider} />
            <DrawerRow label={t('method')} value={payment.method} />
            <DrawerRow label={t('status')} value={statusLabel} />
            <DrawerRow label={t('created')} value={formatDateTime(payment.createdAt, locale)} />
            <DrawerRow
              label={t('reference')}
              value={payment.providerRef ?? '—'}
              className="col-span-2"
            />
          </dl>

          <Separator />

          <section>
            <h3 className="text-sm font-medium text-ink-black">{t('events')}</h3>
            <div className="mt-3">
              {timelineQuery.isPending ? (
                <p className="text-sm text-slate-gray">{common('loading')}</p>
              ) : timelineQuery.data && timelineQuery.data.length > 0 ? (
                <PaymentTimeline events={timelineQuery.data as PaymentEvent[]} showPayload />
              ) : (
                <p className="rounded-2xl bg-fog-white p-4 text-sm text-slate-gray">
                  {t('eventsEmpty')}
                </p>
              )}
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-sm font-medium text-ink-black">{t('webhooks')}</h3>
            <div className="mt-3 space-y-3">
              {webhooksQuery.isPending ? (
                <p className="text-sm text-slate-gray">{common('loading')}</p>
              ) : webhooksQuery.data && webhooksQuery.data.length > 0 ? (
                webhooksQuery.data.map((webhook: WebhookRecord) => (
                  <div key={webhook.id} className="rounded-2xl bg-fog-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tabular-nums text-sm text-ink-black">
                        {webhook.eventType}
                      </span>
                      <span className="text-sm text-slate-gray">
                        {formatDateTime(webhook.receivedAt, locale)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-gray">
                      <span>
                        {t('signature')} {webhook.signatureValid ? t('valid') : t('invalid')}
                      </span>
                      <span>
                        {webhook.processedAt
                          ? `${t('processed')} ${formatDateTime(webhook.processedAt, locale)}`
                          : t('pending')}
                      </span>
                      <span>
                        {t('attempts')} {webhook.attempts}
                      </span>
                    </div>
                    {webhook.processingError ? (
                      <p className="mt-2 rounded-xl bg-blush-peach px-3 py-2 text-sm text-sienna-brown">
                        {webhook.processingError}
                      </p>
                    ) : null}
                    <JsonViewer value={webhook.payload} label={t('webhooks')} className="mt-2" />
                  </div>
                ))
              ) : (
                <p className="rounded-2xl bg-fog-white p-4 text-sm text-slate-gray">
                  {t('webhooksEmpty')}
                </p>
              )}
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-2xl bg-blush-peach p-4 text-sm text-sienna-brown">
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{common('demoMode')}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DrawerRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn('rounded-2xl bg-fog-white p-3', className)}>
      <dt className="text-slate-gray">{label}</dt>
      <dd className="mt-1 break-all text-ink-black">{value}</dd>
    </div>
  );
}
