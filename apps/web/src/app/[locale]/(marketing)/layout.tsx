import { SiteFooter } from '@/components/site-footer';
import { TopNav } from '@/components/top-nav';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="pt-20 pb-24">{children}</main>
      <SiteFooter />
    </>
  );
}
