import type { PaymentStatsProvider } from '@pay/contracts';
import { useTranslations } from 'next-intl';

export function ProviderMix({ providers }: { providers: PaymentStatsProvider[] }) {
  const t = useTranslations('dashboard.providers');
  const providersT = useTranslations('providers');
  const total = providers.reduce((sum, provider) => sum + provider.payments, 0);

  return (
    <section id="providers" className="scroll-mt-24 rounded-2xl bg-mist-gray p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-body-lg font-medium text-ink-black">{t('title')}</h2>
        <span className="tabular-nums text-sm text-slate-gray">{t('total', { count: total })}</span>
      </div>
      <p className="mt-1 text-sm text-slate-gray">{t('description')}</p>

      {providers.length === 0 ? (
        <p className="mt-6 text-sm text-slate-gray">{t('empty')}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {providers.map((provider) => {
            const share = total > 0 ? Math.round((provider.payments / total) * 100) : 0;

            return (
              <li key={provider.provider}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-medium text-ink-black">
                    {providersT(provider.provider)}
                  </span>
                  <span className="tabular-nums text-sm text-slate-gray">{share}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-white">
                  <div
                    className="h-full rounded-full bg-ink-black"
                    style={{ width: `${Math.max(share, 3)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-gray">
                  {t('row', {
                    count: provider.payments,
                    rate: provider.successRate ?? '—',
                  })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
