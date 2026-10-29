import type { Metadata } from 'next';
import { CheckCircle2, Lock, ShieldCheck, Truck } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { Money } from '@/components/money';
import { ProductVisual } from '@/components/store/product-visual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { getProductsServer } from '@/lib/api-server';
import { getProductPresentation, localized } from '@/lib/catalog-presentation';
import { getRegion } from '@/lib/region';
import { regionConfig } from '@/lib/region-config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const presentation = getProductPresentation(slug);
  const t = await getTranslations({ locale, namespace: 'store' });

  return {
    title: presentation ? `${presentation.brand} — ${slug}` : t('productTitle'),
    description: presentation ? localized(presentation.description, locale) : undefined,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await getTranslations('store');
  const common = await getTranslations('common');
  const region = await getRegion();
  const config = regionConfig(region);

  const products = await getProductsServer().catch(() => []);
  const product = products.find((item) => item.slug === slug);
  const presentation = getProductPresentation(slug);

  if (!product || !presentation || product.currency !== config.currency) {
    return (
      <div className="page-shell py-16">
        <div className="max-w-xl rounded-3xl bg-paper-white p-8 shadow-subtle-3">
          <p className="text-sm text-ash-gray">{t('notFound')}</p>
          <h1 className="mt-3 font-serif text-heading tracking-heading text-ink-black">
            {t('notFound')}
          </h1>
          <p className="mt-3 text-body text-slate-gray">{t('notFoundBody')}</p>
          <Button asChild className="mt-6">
            <Link href="/shop">{t('backToShop')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-8 sm:py-12">
      <nav className="text-sm text-slate-gray" aria-label={t('breadcrumb')}>
        <Link href="/shop" className="hover:text-ink-black">
          {t('shopAll')}
        </Link>
        <span className="px-2">/</span>
        <span className="text-ink-black">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <ProductVisual presentation={presentation} locale={locale} priority />
          <p className="mt-3 text-center text-sm text-ash-gray">{t('demoBadge')}</p>
        </div>

        <div>
          <p className="text-sm text-ash-gray">{presentation.brand}</p>
          <h1 className="mt-2 font-serif text-heading tracking-heading text-ink-black">
            {product.name}
          </h1>
          <p className="mt-3 max-w-xl text-body text-slate-gray">
            {localized(presentation.description, locale)}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Money
              amountMinor={product.amountMinor}
              currency={product.currency}
              locale={locale}
              className="text-heading-sm text-ink-black"
            />
            {presentation.badge ? (
              <Badge variant="accent">{localized(presentation.badge, locale)}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-gray">{common('taxesIncluded')}</p>

          <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
            <Link href={`/checkout?product=${product.slug}`}>{t('buyNow')}</Link>
          </Button>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl bg-paper-white p-4">
              <Truck className="mt-0.5 size-4 shrink-0 text-ink-black" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-black">{t('deliveryEta')}</p>
                <p className="text-sm text-slate-gray">{t('deliveryEtaValue')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-paper-white p-4">
              <Lock className="mt-0.5 size-4 shrink-0 text-ink-black" aria-hidden="true" />
              <div>
                <p className="text-sm text-ink-black">{common('taxesIncluded')}</p>
                <p className="text-sm text-slate-gray">{common('secureCheckout')}</p>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-body-lg font-medium text-ink-black">{t('highlights')}</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {presentation.highlights.map((highlight) => (
                <li key={highlight.fr} className="flex items-start gap-2 text-sm text-slate-gray">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-ink-black"
                    aria-hidden="true"
                  />
                  {localized(highlight, locale)}
                </li>
              ))}
            </ul>
          </div>

          <Card className="mt-8 bg-paper-white">
            <CardHeader>
              <CardTitle>{t('specs')}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {presentation.specs.map((spec) => (
                  <div key={spec.label.fr} className="rounded-2xl bg-fog-white p-3">
                    <dt className="text-sm text-slate-gray">{localized(spec.label, locale)}</dt>
                    <dd className="mt-1 text-sm text-ink-black">{localized(spec.value, locale)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-blush-peach p-4 text-sienna-brown">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-sm">
              {locale === 'en'
                ? 'Server-side pricing. The amount is resolved from the catalog, never sent by the browser.'
                : 'Prix calculé côté serveur. Le montant vient du catalogue, jamais du navigateur.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
