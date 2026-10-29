import type { Product } from '@pay/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { PaymentStatusPanel } from '@/components/payment-status-panel';
import { Alert } from '@/components/ui/alert';
import { getPaymentServer, getProductsServer } from '@/lib/api-server';
import { getProductPresentation } from '@/lib/catalog-presentation';

export const dynamic = 'force-dynamic';

export default async function CheckoutPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stripe?: string }>;
}) {
  const { id } = await params;
  const { stripe } = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations('checkout');

  try {
    const [payment, products] = await Promise.all([
      getPaymentServer(id),
      getProductsServer().catch((): Product[] => []),
    ]);
    const product = products.find((item) => item.id === payment.productId);
    const presentation = product ? getProductPresentation(product.slug) : undefined;

    return (
      <PaymentStatusPanel
        initialPayment={payment}
        product={product}
        presentation={presentation}
        locale={locale}
        stripeState={stripe === 'success' || stripe === 'cancel' ? stripe : undefined}
      />
    );
  } catch {
    return (
      <div className="page-shell py-16">
        <Alert variant="destructive">
          <p className="font-medium">{t('unavailable')}</p>
          <p className="mt-1 text-sm text-slate-gray">{t('unavailableBody')}</p>
        </Alert>
      </div>
    );
  }
}
