import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

const CONTENT = {
  terms: {
    fr: {
      title: 'Conditions générales de vente',
      body: 'Cette boutique est une démonstration. Aucun paiement réel n’est traité. Les prix, stocks et délais sont fictifs et servent uniquement à illustrer un parcours de paiement.',
    },
    en: {
      title: 'Terms of sale',
      body: 'This storefront is a demonstration. No real payment is processed. Prices, stock and delivery times are fictional and only exist to illustrate a checkout journey.',
    },
  },
  privacy: {
    fr: {
      title: 'Confidentialité',
      body: 'Les données saisies dans la démo servent uniquement à créer un paiement de test. Aucune donnée de carte ne transite par notre API. Les données sont visibles dans le dashboard de démonstration.',
    },
    en: {
      title: 'Privacy',
      body: 'Data entered in the demo is only used to create a test payment. No card data touches our API. Data is visible in the demo dashboard.',
    },
  },
  returns: {
    fr: {
      title: 'Retours',
      body: 'Les retours sont fictifs. Dans une vraie boutique, cette page décrirait la fenêtre de retour, l’état du produit et le remboursement.',
    },
    en: {
      title: 'Returns',
      body: 'Returns are fictional. In a real store, this page would describe the return window, product condition and refund process.',
    },
  },
  contact: {
    fr: {
      title: 'Contact',
      body: 'Pour cette démonstration, le support est simulé. En production, cette page afficherait un email, un formulaire et des horaires.',
    },
    en: {
      title: 'Contact',
      body: 'Support is simulated for this demo. In production, this page would show an email, a form and support hours.',
    },
  },
} as const;

type Slug = keyof typeof CONTENT;

function isSlug(value: string): value is Slug {
  return value in CONTENT;
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const common = await getTranslations('common');

  if (!isSlug(slug)) {
    notFound();
  }

  const content = locale === 'en' ? CONTENT[slug].en : CONTENT[slug].fr;

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="mx-auto max-w-2xl rounded-3xl bg-paper-white p-6 shadow-subtle-3 sm:p-10">
        <p className="text-sm text-ash-gray">Orbit · {common('demo')}</p>
        <h1 className="mt-3 font-w480 text-[32px] leading-[1.15] tracking-[-0.5px] text-ink-black">
          {content.title}
        </h1>
        <p className="mt-5 text-body text-slate-gray">{content.body}</p>
      </div>
    </div>
  );
}
