'use client';

import { isSettledStatus } from '@pay/contracts';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { Inbox, Radio } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { JsonViewer } from '@/components/json-viewer';
import { Money } from '@/components/money';
import { PaymentNextAction } from '@/components/payment-next-action';
import { PaymentTimeline } from '@/components/payment-timeline';
import { StatusBadge } from '@/components/status-badge';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { getPayment, getPaymentTimeline, getPaymentWebhooks } from '@/lib/api';
import { formatDateTime, shortId } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { usePaymentStream } from '@/lib/use-payment-stream';

export function PaymentDetail({
  paymentId,
  showBackLink = false,
}: {
  paymentId: string;
  showBackLink?: boolean;
}) {
  const t = useTranslations('paymentDetail');
  const providersT = useTranslations('providers');
  const methodsT = useTranslations('methods');
  const locale = useLocale();
  const connected = usePaymentStream(paymentId);

  const paymentQuery = useQuery({
    queryKey: queryKeys.payment(paymentId),
    queryFn: () => getPayment(paymentId),
    refetchInterval: (query) => {
      const payment = query.state.data;
      return payment && isSettledStatus(payment.status) ? false : 2_500;
    },
  });

  const settled = paymentQuery.data ? isSettledStatus(paymentQuery.data.status) : false;

  const timelineQuery = useQuery({
    queryKey: queryKeys.timeline(paymentId),
    queryFn: () => getPaymentTimeline(paymentId),
    refetchInterval: settled ? false : 2_500,
  });

  const webhooksQuery = useQuery({
    queryKey: queryKeys.webhooks(paymentId),
    queryFn: () => getPaymentWebhooks(paymentId),
    refetchInterval: settled ? false : 5_000,
  });

  if (paymentQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (paymentQuery.isError || !paymentQuery.data) {
    return (
      <Alert variant="destructive">
        <p>{paymentQuery.error instanceof Error ? paymentQuery.error.message : t('loadError')}</p>
      </Alert>
    );
  }

  const payment = paymentQuery.data;

  return (
    <div className="@container space-y-5">
      {showBackLink ? (
        <Link
          href="/checkout"
          className="inline-flex items-center gap-2 py-5 text-base text-ink-black underline-offset-4 transition-colors hover:underline"
        >
          ← {t('newCheckout')}
        </Link>
      ) : null}

      <Card className="rounded-2xl border border-border bg-paper-white shadow-none">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ash-gray">{t('payment', { id: shortId(payment.id) })}</p>
              <p className="mt-3 text-heading-sm tracking-heading-sm text-ink-black">
                <Money amountMinor={payment.amountMinor} currency={payment.currency} />
              </p>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-gray">
            <span>
              <span className="text-slate-gray">{t('provider')}</span>{' '}
              <span className="text-ink-black">{providersT(payment.provider)}</span>
            </span>
            <span>
              <span className="text-slate-gray">{t('method')}</span>{' '}
              <span className="text-ink-black">{methodsT(payment.method)}</span>
            </span>
            <span>
              <span className="text-slate-gray">{t('created')}</span>{' '}
              <span className="text-ink-black">{formatDateTime(payment.createdAt, locale)}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Separator />

          <div className="grid gap-4 rounded-lg bg-fog-white p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-gray">{t('customer')}</p>
              <p className="mt-1 text-ink-black">{payment.customer.name}</p>
              <p className="text-slate-gray">{payment.customer.email}</p>
              {payment.customer.phone ? (
                <p className="tabular-nums text-sm text-slate-gray">{payment.customer.phone}</p>
              ) : null}
            </div>
            <div>
              <p className="text-sm text-slate-gray">{t('reference')}</p>
              <p className="tabular-nums mt-1 break-all text-sm text-ink-black">
                {payment.providerRef ?? '—'}
              </p>
              <p className="mt-1 text-sm text-slate-gray">
                {t('stream')}{' '}
                <span className={connected ? 'text-ink-black' : 'text-slate-gray'}>
                  {connected ? t('connected') : settled ? t('closed') : t('fallback')}
                </span>
              </p>
            </div>
          </div>

          <PaymentNextAction payment={payment} />
        </CardContent>
      </Card>

      <div className="grid gap-5 @3xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('eventTimeline')}</CardTitle>
            <Radio className="size-4 text-slate-gray" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            {timelineQuery.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <PaymentTimeline events={timelineQuery.data ?? []} showPayload />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t('webhookInbox')}</CardTitle>
            <Inbox className="size-4 text-slate-gray" aria-hidden="true" />
          </CardHeader>
          <CardContent className="space-y-3">
            {webhooksQuery.isPending ? (
              <Skeleton className="h-40 w-full" />
            ) : (webhooksQuery.data?.length ?? 0) === 0 ? (
              <p className="rounded-lg bg-fog-white p-4 text-sm text-slate-gray">
                {t('noWebhook')}
              </p>
            ) : (
              webhooksQuery.data?.map((webhook) => (
                <div key={webhook.id} className="rounded-lg bg-paper-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular-nums text-sm text-ink-black">{webhook.eventType}</span>
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
                    <p className="mt-2 rounded-lg bg-blush-peach px-3 py-2 text-sm text-sienna-brown">
                      {webhook.processingError}
                    </p>
                  ) : null}
                  <JsonViewer
                    value={webhook.payload}
                    label={t('normalizedPayload')}
                    className="mt-2"
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
