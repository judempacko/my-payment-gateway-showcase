import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { API_DOCS_URL, API_URL } from '@/lib/api';

const healthUrl = `${API_URL}/health`;

function FooterHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 text-[16px] leading-[21px] font-[480] text-ink-black sm:mb-3 md:mb-4">
      {children}
    </p>
  );
}

function FooterLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  const className =
    'text-[16px] leading-normal text-slate-gray underline-offset-4 transition-all duration-200 hover:text-ink-black hover:underline';

  return (
    <div className="pb-2.5 sm:pb-3 md:pb-4">
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className={className}>
          {children}
          <ArrowUpRight className="ml-1 inline-block size-4 -translate-y-px opacity-50" />
        </a>
      ) : (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    </div>
  );
}

function Logo() {
  const t = useTranslations('common');

  return (
    <Link href="/" className="inline-flex items-baseline gap-1.5">
      <span className="text-2xl font-medium text-ink-black">{t('brand')}</span>
      <span className="text-xs text-slate-gray">{t('showcase')}</span>
    </Link>
  );
}

export function SiteFooter() {
  const t = useTranslations();

  return (
    <footer className="bg-[#F7F7F8]">
      <div className="mx-auto w-full max-w-[1360px] px-6 py-10 min-[480px]:px-8 min-[480px]:py-12 md:px-12 md:py-10 lg:px-20 lg:py-20 xl:py-24">
        <div className="mx-auto grid w-full max-w-[1200px] grid-cols-2 gap-6 md:grid-cols-5">
          <div className="mb-4 hidden md:mb-6 md:block">
            <Logo />
          </div>

          <div>
            <FooterHeading>{t('nav.overview')}</FooterHeading>
            <FooterLink href="/">{t('nav.overview')}</FooterLink>
            <FooterLink href="/shop">{t('nav.store')}</FooterLink>
            <FooterLink href="/checkout">{t('nav.checkout')}</FooterLink>
            <FooterLink href="/dashboard">{t('nav.dashboard')}</FooterLink>
          </div>

          <div>
            <FooterHeading>{t('footer.resources')}</FooterHeading>
            <FooterLink href={API_DOCS_URL} external>
              {t('nav.apiDocs')}
            </FooterLink>
            <FooterLink href={healthUrl} external>
              {t('footer.healthCheck')}
            </FooterLink>
          </div>

          <div>
            <FooterHeading>{t('footer.rails')}</FooterHeading>
            <div className="pb-2.5 text-[16px] leading-normal text-slate-gray sm:pb-3 md:pb-4">
              {t('footer.stripeCards')}
            </div>
            <div className="pb-2.5 text-[16px] leading-normal text-slate-gray sm:pb-3 md:pb-4">
              {t('footer.pawapayMobileMoney')}
            </div>
            <div className="pb-2.5 text-[16px] leading-normal text-slate-gray sm:pb-3 md:pb-4">
              {t('footer.mockZeroKeys')}
            </div>
          </div>

          <div>
            <FooterHeading>{t('footer.thisDemo')}</FooterHeading>
            <p className="max-w-xs pb-2.5 text-[16px] leading-normal text-slate-gray sm:pb-3 md:pb-4">
              {t('footer.disclaimer')}
            </p>
          </div>

          <div className="col-span-2 h-px border-t border-border md:col-span-5" />

          <div className="col-span-2 md:hidden">
            <Logo />
          </div>

          <div className="flex items-center gap-4">
            <a
              href={API_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={t('nav.apiDocs')}
              className="text-slate-gray transition-colors hover:text-ink-black"
            >
              <ArrowUpRight className="size-4" />
            </a>
          </div>

          <div className="text-[15px] text-slate-gray">© 2026 pay/ showcase</div>
          <div className="text-[15px] text-slate-gray">{t('common.demoStore')}</div>
          <div className="text-[15px] text-slate-gray">{t('common.demo')}</div>
        </div>
      </div>
    </footer>
  );
}
