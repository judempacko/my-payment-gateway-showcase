import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';

export async function CheckoutHeader() {
  const t = await getTranslations();

  return (
    <header className="border-b border-border bg-paper-white print:hidden">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/shop" className="flex items-baseline gap-1.5">
          <span className="text-subheading font-medium text-ink-black">orbit</span>
          <span className="text-xs text-slate-gray">{t('common.demo')}</span>
        </Link>

        <div className="flex items-center gap-3 text-sm text-slate-gray">
          <span className="flex items-center gap-2">
            <Lock className="size-4" aria-hidden="true" />
            {t('common.secureCheckout')}
          </span>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
