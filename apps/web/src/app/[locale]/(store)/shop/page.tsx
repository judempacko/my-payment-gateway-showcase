import type { Product } from '@pay/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { ProductCard } from '@/components/store/product-card';
import { Alert } from '@/components/ui/alert';
import { getProductsServer } from '@/lib/api-server';
import { productsForRegion } from '@/lib/catalog-presentation';
import { getRegion } from '@/lib/region';
import { regionConfig } from '@/lib/region-config';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const locale = await getLocale();
  const t = await getTranslations('store');
  const region = await getRegion();
  const config = regionConfig(region);

  let products: Product[] = [];
  let failed = false;

  try {
    products = await getProductsServer();
  } catch {
    failed = true;
  }

  const visible = productsForRegion(products, config.currency);

  return (
    <div className="page-shell py-10 sm:py-16">
      <div className="max-w-3xl">
        <p className="text-sm text-ash-gray">{t('eyebrow')}</p>
        <h1 className="mt-4 font-serif text-heading tracking-heading text-ink-black sm:text-heading-lg sm:tracking-heading-lg">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-2xl text-body text-slate-gray">{t('subtitle')}</p>
        <p className="mt-2 text-sm text-ash-gray">{t('regionNote')}</p>
      </div>

      {failed ? (
        <Alert className="mt-8" variant="destructive">
          <p className="font-medium">{t('unavailable')}</p>
          <p className="mt-1 text-sm text-slate-gray">{t('unavailableBody')}</p>
        </Alert>
      ) : visible.length === 0 ? (
        <Alert className="mt-8">
          <p>{t('notFoundBody')}</p>
        </Alert>
      ) : (
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              priority={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
