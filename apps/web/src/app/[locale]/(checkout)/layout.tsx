import { CheckoutFooter } from '@/components/checkout-footer';
import { CheckoutHeader } from '@/components/checkout-header';

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-fog-white">
      <CheckoutHeader />
      <main className="flex-1">{children}</main>
      <CheckoutFooter />
    </div>
  );
}
