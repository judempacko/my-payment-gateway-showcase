import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/sonner';
import { routing } from '@/i18n/routing';
import '../globals.css';

const sohne = localFont({
  src: [
    {
      path: '../../../public/fonts/sohne-vf.b7215353.woff2',
      weight: '200 900',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/sohne-vf-kursiv.2be2eb33.woff2',
      weight: '200 900',
      style: 'italic',
    },
  ],
  variable: '--font-sohne-src',
  display: 'swap',
});

const signifier = localFont({
  src: '../../../public/fonts/signifier-regular.f38fd10d.woff2',
  weight: '400',
  style: 'normal',
  variable: '--font-signifier-src',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isFrench = locale === 'fr';

  return {
    title: isFrench ? 'Orbit — Checkout de démonstration' : 'Orbit — Demo checkout',
    description: isFrench
      ? 'Un checkout multi-provider de démonstration : Stripe, PawaPay et un rail mock sans clé.'
      : 'A multi-provider demo checkout: Stripe, PawaPay and a zero-key mock rail.',
    alternates: {
      languages: {
        fr: '/fr',
        en: '/en',
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${sohne.variable} ${signifier.variable}`}>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Providers>
          <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
          <Toaster position="bottom-center" />
        </Providers>
      </body>
    </html>
  );
}
