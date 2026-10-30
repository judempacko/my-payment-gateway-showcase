'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { DashboardNav } from '@/components/dashboard/dashboard-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';

export function DashboardMobileNav() {
  const [open, setOpen] = useState(false);
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-border bg-paper-white/90 px-5 backdrop-blur-lg lg:hidden">
      <Link href="/" className="flex min-w-0 items-baseline gap-1.5">
        <span className="text-body-lg font-medium text-ink-black">{t('common.brand')}</span>
        <span className="truncate text-xs text-slate-gray">{t('common.showcase')}</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('common.menu')}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Button>
        <SheetContent side="left" className="w-[300px] gap-0 p-0">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="flex items-baseline gap-1.5">
              <span className="text-body-lg font-medium text-ink-black">{t('common.brand')}</span>
              <span className="text-xs font-normal text-slate-gray">{t('common.showcase')}</span>
            </SheetTitle>
            <SheetDescription className="sr-only">{t('dashboard.nav.aria')}</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-5">
            <DashboardNav onNavigate={() => setOpen(false)} />
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-xs text-slate-gray">{t('common.language')}</span>
              <LanguageSwitcher />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
