import { getTranslations } from 'next-intl/server';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';

export async function DashboardSidebar() {
  const t = await getTranslations();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col overflow-y-auto border-r border-border bg-fog-white px-4 py-5 lg:flex">
      <Link
        href="/"
        className="flex shrink-0 items-baseline gap-1.5 px-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
      >
        <span className="text-subheading font-medium text-ink-black">{t('common.brand')}</span>
        <span className="text-xs text-slate-gray">{t('common.showcase')}</span>
      </Link>

      <div className="mt-8 flex flex-1 flex-col">
        <DashboardNav />
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-xs text-slate-gray">{t('common.language')}</span>
        <LanguageSwitcher />
      </div>
    </aside>
  );
}
