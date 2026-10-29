import type { Product } from '@pay/contracts';
import { getTranslations } from 'next-intl/server';
import { ArrowUpRight } from 'lucide-react';
import { Money } from '@/components/money';
import { ProductVisual } from '@/components/store/product-visual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getProductPresentation, localized } from '@/lib/catalog-presentation';

export async function ProductCard({
  product,
  locale,
  priority = false,
}: {
  product: Product;
  locale: string;
  priority?: boolean;
}) {
  const t = await getTranslations('store');
  const presentation = getProductPresentation(product.slug);

  if (!presentation) {
    return null;
  }

  return (
    <Card className="gap-4 bg-paper-white">
      <Link href={`/product/${product.slug}`} className="block px-5">
        <ProductVisual presentation={presentation} locale={locale} priority={priority} />
        <span className="sr-only">{product.name}</span>
      </Link>

      <CardHeader className="gap-2 px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-ash-gray">{presentation.brand}</p>
            <CardTitle className="mt-1 text-body-lg text-ink-black">{product.name}</CardTitle>
          </div>
          {presentation.badge ? (
            <Badge variant="neutral">{localized(presentation.badge, locale)}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-slate-gray">{localized(presentation.tagline, locale)}</p>
      </CardHeader>

      <CardContent className="mt-auto flex items-end justify-between gap-4 px-5">
        <div>
          <p className="text-sm text-ash-gray">{t('from')}</p>
          <Money
            amountMinor={product.amountMinor}
            currency={product.currency}
            locale={locale}
            className="text-subheading text-ink-black"
          />
        </div>
        <Button asChild size="sm">
          <Link href={`/product/${product.slug}`}>
            {t('buyNow')}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
