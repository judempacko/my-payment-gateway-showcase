import { Lock, ShoppingBag } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { RegionSwitcher } from '@/components/region-switcher';
import { Link } from '@/i18n/navigation';
import type { Region } from '@/lib/region-config';

export async function StoreHeader({ region }: { region: Region }) {
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper-white/90 backdrop-blur-lg">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-baseline gap-1.5">
            <span className="text-subheading font-medium text-ink-black">orbit</span>
            <span className="text-xs text-slate-gray">{t('common.demo')}</span>
          </Link>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-sm text-slate-gray transition-colors hover:text-ink-black sm:flex"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            {t('nav.store')}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 text-sm text-slate-gray lg:flex">
            <Lock className="size-4" aria-hidden="true" />
            {t('common.secureCheckout')}
          </span>
          <RegionSwitcher region={region} />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
