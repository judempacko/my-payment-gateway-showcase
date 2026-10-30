import { DashboardFooter } from '@/components/dashboard-footer';
import { DashboardMobileNav } from '@/components/dashboard/dashboard-mobile-nav';
import { DashboardSidebar } from '@/components/dashboard/dashboard-sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper-white">
      <DashboardSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardMobileNav />
        <main className="flex-1">{children}</main>
        <DashboardFooter />
      </div>
    </div>
  );
}
