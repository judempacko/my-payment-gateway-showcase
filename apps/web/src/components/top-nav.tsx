'use client';

import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Link, usePathname } from '@/i18n/navigation';
import { API_DOCS_URL } from '@/lib/api';
import { cn } from '@/lib/utils';

const links = [
  { href: '/', labelKey: 'nav.overview' },
  { href: '/shop', labelKey: 'nav.store' },
  { href: '/checkout', labelKey: 'nav.checkout' },
  { href: '/dashboard', labelKey: 'nav.dashboard' },
] as const;

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

export function TopNav() {
  const pathname = usePathname();
  const t = useTranslations();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);

    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 h-20 transition-all duration-500 sm:h-auto',
        scrolled ? 'bg-[#FFFFFFCC] backdrop-blur-lg' : 'bg-transparent',
      )}
    >
      <div className="page-shell grid h-20 grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Link href="/" className="flex items-baseline gap-2 justify-self-start">
          <span className="text-subheading font-medium text-ink-black">{t('common.brand')}</span>
          <span className="text-sm text-slate-gray">{t('common.showcase')}</span>
        </Link>

        <nav
          className="hidden items-center justify-center gap-6 justify-self-center sm:flex"
          aria-label={t('nav.primary')}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={cn(
                'py-0.5 text-base text-slate-gray transition-colors hover:text-ink-black',
                isActive(pathname, link.href) && 'text-ink-black',
              )}
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-3 justify-self-end">
          <LanguageSwitcher className="hidden sm:inline-flex" />
          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="group hidden items-center gap-2 text-base text-ink-black underline-offset-4 hover:underline lg:inline-flex"
          >
            {t('nav.apiDocs')} →
          </a>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/shop">{t('nav.buyNow')}</Link>
          </Button>
          <Button asChild size="sm" className="sm:hidden">
            <Link href="/shop">{t('nav.store')}</Link>
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-label={t('common.menu')}
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle className="text-subheading font-w450 text-ink-black">
                  {t('common.brand')} {t('common.showcase')}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label={t('nav.mobile')}>
                {links.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      className={cn(
                        'rounded-lg px-3 py-3 text-base text-ink-black transition-colors hover:bg-fog-white',
                        isActive(pathname, link.href) && 'bg-blush-peach text-sienna-brown',
                      )}
                    >
                      {t(link.labelKey)}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <a
                    href={API_DOCS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-2 rounded-lg px-3 py-3 text-base text-ink-black transition-colors hover:bg-fog-white"
                  >
                    {t('nav.apiDocs')} →
                  </a>
                </SheetClose>
              </nav>
              <div className="mt-auto p-4">
                <LanguageSwitcher />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
