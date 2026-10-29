'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const LOCALES = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
] as const;

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('common');

  function changeLocale(next: 'fr' | 'en') {
    if (next === locale) {
      return;
    }

    const query = searchParams.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { locale: next });
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-paper-white p-1',
        className,
      )}
      role="group"
      aria-label={t('language')}
    >
      {LOCALES.map((item) => (
        <Button
          key={item.code}
          type="button"
          variant="ghost"
          size="xs"
          className={cn(
            'h-7 min-w-9 rounded-full px-2 text-sm',
            locale === item.code && 'bg-ink-black text-paper-white hover:bg-ink-black/90',
          )}
          aria-pressed={locale === item.code}
          onClick={() => changeLocale(item.code)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
