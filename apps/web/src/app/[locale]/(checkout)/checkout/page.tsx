import type { Product, ProviderInfo } from '@pay/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { CheckoutForm } from '@/components/checkout-form';
import { Alert } from '@/components/ui/alert';
import { getProductsServer, getProvidersServer } from '@/lib/api-server';
import { productsForRegion } from '@/lib/catalog-presentation';
import { getRegion } from '@/lib/region';
import { regionConfig } from '@/lib/region-config';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { product: productSlug } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations('checkout');
  const region = await getRegion();
  const config = regionConfig(region);

  let products: Product[] = [];
  let providers: ProviderInfo[] = [];
  let failed = false;

  try {
    [products, providers] = await Promise.all([getProductsServer(), getProvidersServer()]);
  } catch {
    failed = true;
  }

  const visible = productsForRegion(products, config.currency);
  const initial = visible.find((item) => item.slug === productSlug) ?? visible[0];

  return (
    <div className="page-shell py-8 sm:py-12">
      <div className="max-w-3xl">
        <p className="text-sm text-ash-gray">{t('eyebrow')}</p>
        <h1 className="mt-3 font-w480 text-heading tracking-heading text-ink-black">
          {t('title')}
        </h1>
        <p className="mt-3 max-w-2xl text-body text-slate-gray">{t('subtitle')}</p>
      </div>

      <div className="mt-8">
        {failed ? (
          <Alert variant="destructive">
            <p className="font-medium">{t('unavailable')}</p>
            <p className="mt-1 text-sm text-slate-gray">{t('unavailableBody')}</p>
          </Alert>
        ) : !initial ? (
          <Alert>
            <p>{t('noProduct')}</p>
          </Alert>
        ) : (
          <CheckoutForm
            products={visible}
            providers={providers}
            initialProductId={initial.id}
            region={region}
            locale={locale}
          />
        )}
      </div>
    </div>
  );
}
