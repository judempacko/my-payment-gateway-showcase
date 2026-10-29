'use client';

import { isSettledStatus, type Payment } from '@pay/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { simulatePayment } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function PaymentActions({ payment }: { payment: Payment }) {
  const t = useTranslations('paymentActions');
  const providersT = useTranslations('providers');
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (outcome: 'succeeded' | 'failed' | 'expired') =>
      simulatePayment(payment.id, outcome),
    onMutate: () => setError(null),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.payment(payment.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.timeline(payment.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.webhooks(payment.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments({}) }),
      ]);
    },
    onError: (cause) => {
      setError(cause instanceof Error ? cause.message : t('simulationFailed'));
    },
  });

  const settled = isSettledStatus(payment.status);

  if (payment.provider !== 'mock') {
    return (
      <p className="rounded-lg bg-fog-white px-4 py-3 text-sm text-slate-gray">
        {t('providerHandled', { provider: providersT(payment.provider) })}
      </p>
    );
  }

  if (settled) {
    return (
      <p className="rounded-lg bg-fog-white px-4 py-3 text-sm text-slate-gray">{t('settled')}</p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-gray">
        {t('approveHintBefore')} <span className="tabular-nums text-sm">HMAC-SHA256</span>{' '}
        {t('approveHintAfter')}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => mutation.mutate('succeeded')}
          disabled={mutation.isPending}
          aria-busy={mutation.isPending}
        >
          {mutation.isPending ? t('sending') : t('approve')}
        </Button>
        <Button
          variant="outline"
          onClick={() => mutation.mutate('failed')}
          disabled={mutation.isPending}
        >
          {t('decline')}
        </Button>
        <Button
          variant="ghost"
          onClick={() => mutation.mutate('expired')}
          disabled={mutation.isPending}
        >
          {t('expire')}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <p>{error}</p>
        </Alert>
      ) : null}
    </div>
  );
}
