import Image from 'next/image';
import type { ProductPresentation } from '@/lib/catalog-presentation';
import { localized } from '@/lib/catalog-presentation';
import { cn } from '@/lib/utils';

export function ProductVisual({
  presentation,
  locale,
  className,
  priority = false,
}: {
  presentation: ProductPresentation;
  locale: string;
  className?: string;
  priority?: boolean;
}) {
  const cover = presentation.images[0];

  return (
    <div
      className={cn(
        'relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-mist-gray via-fog-white to-blush-peach/40',
        className,
      )}
    >
      {cover ? (
        <Image
          src={cover.src}
          alt={localized(cover.alt, locale)}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain p-8"
        />
      ) : (
        <>
          <div
            className="absolute inset-8 rounded-xl border border-ink-black/8 bg-paper-white/70 shadow-subtle-3"
            aria-hidden="true"
          />
          <div className="relative px-8 text-center">
            <p className="text-sm text-ash-gray">{presentation.brand}</p>
            <p className="mt-2 font-serif text-heading-sm tracking-heading-sm text-ink-black">
              {localized(presentation.tagline, locale)}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
