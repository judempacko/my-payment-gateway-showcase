import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { API_DOCS_URL } from '@/lib/api';

export async function DashboardHeader() {
  const t = await getTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper-white/90 backdrop-blur-lg">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
            <span className="text-subheading font-medium text-ink-black">{t('common.brand')}</span>
            <span className="text-xs text-slate-gray">{t('common.showcase')}</span>
          </Link>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <span className="hidden truncate text-sm text-slate-gray sm:block">
            {t('dashboard.eyebrow')}
          </span>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3" aria-label={t('nav.primary')}>
          <Link
            href="/shop"
            className="hidden items-center gap-2 text-sm text-slate-gray transition-colors hover:text-ink-black sm:flex"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            {t('nav.store')}
          </Link>
          <Link
            href="/shop"
            aria-label={t('nav.store')}
            className="inline-flex size-9 items-center justify-center rounded-full text-slate-gray transition-colors hover:bg-fog-white hover:text-ink-black sm:hidden"
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
          </Link>
          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 text-sm text-slate-gray transition-colors hover:text-ink-black md:flex"
          >
            {t('nav.apiDocs')}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
