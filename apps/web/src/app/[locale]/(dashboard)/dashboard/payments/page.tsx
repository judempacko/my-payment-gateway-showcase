import { Plus } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { PaymentsPanel } from '@/components/dashboard/payments-panel';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

export default async function DashboardPaymentsPage() {
  const t = await getTranslations('dashboard');

  return (
    <div className="mx-auto w-full max-w-[1480px] px-5 py-6 sm:px-8 sm:py-8 xl:px-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="font-w480 text-[32px] leading-none tracking-heading text-ink-black sm:text-[36px]">
            {t('payments')}
          </h1>
          <p className="mt-3 max-w-xl text-body text-slate-gray">{t('paymentsSubtitle')}</p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/checkout">
            <Plus className="size-4" aria-hidden="true" />
            {t('newPayment')}
          </Link>
        </Button>
      </header>

      <div className="mt-6">
        <PaymentsPanel />
      </div>
    </div>
  );
}
