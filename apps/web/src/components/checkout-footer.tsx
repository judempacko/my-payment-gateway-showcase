import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function CheckoutFooter() {
  const t = await getTranslations();

  return (
    <footer className="border-t border-border bg-paper-white print:hidden">
      <div className="page-shell flex flex-col gap-3 py-6 text-sm text-slate-gray sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl">{t('footer.disclaimer')}</p>
        <nav className="flex flex-wrap items-center gap-4" aria-label={t('footer.legal')}>
          <Link href="/legal/terms" className="hover:text-ink-black">
            {t('footer.terms')}
          </Link>
          <Link href="/legal/privacy" className="hover:text-ink-black">
            {t('footer.privacy')}
          </Link>
          <Link href="/legal/returns" className="hover:text-ink-black">
            {t('footer.returns')}
          </Link>
          <Link href="/legal/contact" className="hover:text-ink-black">
            {t('footer.contact')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
