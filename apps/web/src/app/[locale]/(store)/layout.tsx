import { SiteFooter } from '@/components/site-footer';
import { StoreHeader } from '@/components/store-header';
import { getRegion } from '@/lib/region';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const region = await getRegion();

  return (
    <>
      <StoreHeader region={region} />
      <main className="pb-24">{children}</main>
      <SiteFooter />
    </>
  );
}
