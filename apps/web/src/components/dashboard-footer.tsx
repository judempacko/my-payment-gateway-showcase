import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { API_DOCS_URL, API_URL } from '@/lib/api';

export async function DashboardFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();
  const healthUrl = `${API_URL}/health`;

  return (
    <footer className="border-t border-border bg-paper-white">
      <div className="page-shell flex flex-col gap-2 py-4 text-sm text-slate-gray sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {t('common.brand')} {t('common.showcase')} · {t('common.demoStore')}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/shop" className="transition-colors hover:text-ink-black">
            {t('nav.store')}
          </Link>
          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink-black"
          >
            {t('nav.apiDocs')}
          </a>
          <a
            href={healthUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-ink-black"
          >
            {t('footer.healthCheck')}
          </a>
        </div>
      </div>
    </footer>
  );
}
