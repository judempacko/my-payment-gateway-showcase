'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { REGIONS, type Region } from '@/lib/region-config';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const REGION_CODES: Region[] = ['FR', 'SN'];

export function RegionSwitcher({ region, className }: { region: Region; className?: string }) {
  const router = useRouter();
  const t = useTranslations();

  function changeRegion(next: Region) {
    if (next === region) {
      return;
    }

    document.cookie = `region=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-paper-white p-1',
        className,
      )}
      role="group"
      aria-label={t('common.region')}
    >
      {REGION_CODES.map((code) => (
        <Button
          key={code}
          type="button"
          variant="ghost"
          size="xs"
          className={cn(
            'h-7 rounded-full px-3 text-sm',
            region === code && 'bg-ink-black text-paper-white hover:bg-ink-black/90',
          )}
          aria-pressed={region === code}
          onClick={() => changeRegion(code)}
        >
          {t(REGIONS[code].labelKey)}
        </Button>
      ))}
    </div>
  );
}
