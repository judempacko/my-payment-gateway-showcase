'use client';

import type { Payment } from '@pay/contracts';
import { Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PaymentActions } from '@/components/payment-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function PaymentNextAction({ payment }: { payment: Payment }) {
  const t = useTranslations('nextAction');
  const action = payment.nextAction;

  if (!action || action.type === 'none') {
    return <PaymentActions payment={payment} />;
  }

  if (action.type === 'redirect') {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-gray">{t('redirectDescription')}</p>
        <Button asChild>
          <a href={action.url}>{t('continueOnStripe')}</a>
        </Button>
        <p className="text-sm text-slate-gray">{t('cardStays')}</p>
      </div>
    );
  }

  if (action.type === 'ussd') {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <Smartphone className="size-4" aria-hidden="true" />
          <p className="text-sm">{t('waitingMobile')}</p>
          <p className="text-sm text-slate-gray">{action.instructions}</p>
        </Alert>
        <p className="text-sm text-slate-gray">{t('ussdDescription')}</p>
      </div>
    );
  }

  if (action.type === 'client_secret') {
    return (
      <p className="rounded-lg bg-fog-white px-4 py-3 text-sm text-slate-gray">
        {t('clientSecret')}
      </p>
    );
  }

  return <PaymentActions payment={payment} />;
}
