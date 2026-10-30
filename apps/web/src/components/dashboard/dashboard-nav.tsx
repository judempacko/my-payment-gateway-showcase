'use client';

import {
  ArrowUpRight,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  ShoppingBag,
  Webhook,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { API_DOCS_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

const itemClass =
  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25';

export function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('dashboard.nav');
  const pathname = usePathname();

  const sectionItems = [
    { href: '/dashboard' as const, label: t('overview'), icon: LayoutDashboard },
    { href: '/dashboard/payments' as const, label: t('payments'), icon: CreditCard },
    { href: '/dashboard/pipeline' as const, label: t('pipeline'), icon: Webhook },
  ];

  return (
    <nav aria-label={t('aria')} className="flex flex-1 flex-col">
      <p className="px-3 text-[11px] font-medium tracking-[0.12em] text-ash-gray uppercase">
        {t('console')}
      </p>
      <ul className="mt-2 space-y-1">
        {sectionItems.map((item) => {
          const Icon = item.icon;
          const current =
            item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  itemClass,
                  current
                    ? 'bg-blush-peach font-medium text-sienna-brown'
                    : 'text-slate-gray hover:bg-paper-white hover:text-ink-black',
                )}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 space-y-1 border-t border-border pt-4">
        <Link
          href="/shop"
          onClick={onNavigate}
          className={cn(itemClass, 'text-slate-gray hover:bg-paper-white hover:text-ink-black')}
        >
          <ShoppingBag className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {t('store')}
        </Link>
        <a
          href={API_DOCS_URL}
          target="_blank"
          rel="noreferrer"
          onClick={onNavigate}
          className={cn(itemClass, 'text-slate-gray hover:bg-paper-white hover:text-ink-black')}
        >
          <BookOpen className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {t('docs')}
          <ArrowUpRight className="ml-auto size-3.5" aria-hidden="true" />
        </a>
      </div>

      <div className="mt-auto hidden pt-8 lg:block">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-paper-white px-3 py-2.5 text-xs text-slate-gray">
          <ShieldCheck className="size-4 shrink-0 text-status-success" aria-hidden="true" />
          {t('demoNote')}
        </div>
      </div>
    </nav>
  );
}
