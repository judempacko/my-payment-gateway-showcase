import type { Product } from '@pay/contracts';

export type LocalizedText = {
  fr: string;
  en: string;
};

export type ProductPresentation = {
  slug: string;
  brand: string;
  category: 'phone' | 'audio';
  tagline: LocalizedText;
  description: LocalizedText;
  highlights: LocalizedText[];
  specs: Array<{ label: LocalizedText; value: LocalizedText }>;
  images: Array<{ src: string; alt: LocalizedText }>;
  badge?: LocalizedText;
};

export function localized(value: LocalizedText, locale: string): string {
  return locale === 'en' ? value.en : value.fr;
}

const PRESENTATIONS: Record<string, ProductPresentation> = {
  'iphone-16-128-eur': {
    slug: 'iphone-16-128-eur',
    brand: 'Apple',
    category: 'phone',
    tagline: {
      fr: 'Puissance, photo et autonomie. Le quotidien, sans compromis.',
      en: 'Power, camera and battery life. Everyday, without compromise.',
    },
    description: {
      fr: 'Un iPhone 16 de 128 Go, pensé pour durer. Livraison standard offerte.',
      en: 'A 128 GB iPhone 16 built to last. Free standard delivery.',
    },
    highlights: [
      { fr: 'Puce A18', en: 'A18 chip' },
      { fr: 'Écran Super Retina XDR 6,1″', en: '6.1″ Super Retina XDR display' },
      { fr: 'Double appareil photo 48 Mpx', en: '48 MP dual camera' },
      { fr: 'USB-C et MagSafe', en: 'USB-C and MagSafe' },
    ],
    specs: [
      { label: { fr: 'Stockage', en: 'Storage' }, value: { fr: '128 Go', en: '128 GB' } },
      { label: { fr: 'Écran', en: 'Display' }, value: { fr: '6,1 pouces', en: '6.1 inches' } },
      { label: { fr: 'Couleur', en: 'Color' }, value: { fr: 'Noir', en: 'Black' } },
      { label: { fr: 'Garantie', en: 'Warranty' }, value: { fr: '2 ans', en: '2 years' } },
    ],
    images: [],
    badge: { fr: 'Nouveau', en: 'New' },
  },
  'galaxy-s25-256-eur': {
    slug: 'galaxy-s25-256-eur',
    brand: 'Samsung',
    category: 'phone',
    tagline: {
      fr: 'L’IA Galaxy au service de votre journée.',
      en: 'Galaxy AI for the way you work and live.',
    },
    description: {
      fr: 'Samsung Galaxy S25, 256 Go, coloris Bleu marine. Livraison standard offerte.',
      en: 'Samsung Galaxy S25, 256 GB, Navy Blue. Free standard delivery.',
    },
    highlights: [
      { fr: 'Galaxy AI', en: 'Galaxy AI' },
      { fr: 'Écran Dynamic AMOLED 2X 6,2″', en: '6.2″ Dynamic AMOLED 2X display' },
      { fr: 'Triple appareil photo 50 Mpx', en: '50 MP triple camera' },
      { fr: 'Sept ans de mises à jour', en: 'Seven years of updates' },
    ],
    specs: [
      { label: { fr: 'Stockage', en: 'Storage' }, value: { fr: '256 Go', en: '256 GB' } },
      { label: { fr: 'Écran', en: 'Display' }, value: { fr: '6,2 pouces', en: '6.2 inches' } },
      { label: { fr: 'Couleur', en: 'Color' }, value: { fr: 'Bleu marine', en: 'Navy Blue' } },
      { label: { fr: 'Garantie', en: 'Warranty' }, value: { fr: '2 ans', en: '2 years' } },
    ],
    images: [],
    badge: { fr: 'IA Galaxy', en: 'Galaxy AI' },
  },
  'airpods-pro-2-eur': {
    slug: 'airpods-pro-2-eur',
    brand: 'Apple',
    category: 'audio',
    tagline: {
      fr: 'Le silence, sur commande.',
      en: 'Silence, on demand.',
    },
    description: {
      fr: 'AirPods Pro 2 avec réduction active du bruit et boîtier de charge USB-C.',
      en: 'AirPods Pro 2 with active noise cancellation and USB-C charging case.',
    },
    highlights: [
      { fr: 'Réduction active du bruit', en: 'Active noise cancellation' },
      { fr: 'Audio spatial personnalisé', en: 'Personalized Spatial Audio' },
      { fr: 'Jusqu’à 6 h d’écoute', en: 'Up to 6 hours of listening' },
      { fr: 'Boîtier USB-C', en: 'USB-C case' },
    ],
    specs: [
      { label: { fr: 'Type', en: 'Type' }, value: { fr: 'Intra-auriculaire', en: 'In-ear' } },
      {
        label: { fr: 'Connexion', en: 'Connection' },
        value: { fr: 'Bluetooth 5.3', en: 'Bluetooth 5.3' },
      },
      { label: { fr: 'Couleur', en: 'Color' }, value: { fr: 'Blanc', en: 'White' } },
      { label: { fr: 'Garantie', en: 'Warranty' }, value: { fr: '1 an', en: '1 year' } },
    ],
    images: [],
  },
  'galaxy-a16-128-xof': {
    slug: 'galaxy-a16-128-xof',
    brand: 'Samsung',
    category: 'phone',
    tagline: {
      fr: 'L’essentiel, avec une autonomie qui tient la journée.',
      en: 'The essentials, with battery life that lasts the day.',
    },
    description: {
      fr: 'Samsung Galaxy A16, 128 Go. Pensé pour le mobile money en Afrique de l’Ouest.',
      en: 'Samsung Galaxy A16, 128 GB. Built for mobile money in West Africa.',
    },
    highlights: [
      { fr: 'Écran Super AMOLED 6,7″', en: '6.7″ Super AMOLED display' },
      { fr: 'Batterie 5 000 mAh', en: '5,000 mAh battery' },
      { fr: 'Triple appareil photo 50 Mpx', en: '50 MP triple camera' },
      { fr: 'Mises à jour jusqu’en 2030', en: 'Updates until 2030' },
    ],
    specs: [
      { label: { fr: 'Stockage', en: 'Storage' }, value: { fr: '128 Go', en: '128 GB' } },
      { label: { fr: 'Écran', en: 'Display' }, value: { fr: '6,7 pouces', en: '6.7 inches' } },
      { label: { fr: 'Couleur', en: 'Color' }, value: { fr: 'Noir', en: 'Black' } },
      { label: { fr: 'Garantie', en: 'Warranty' }, value: { fr: '2 ans', en: '2 years' } },
    ],
    images: [],
    badge: { fr: 'Mobile money', en: 'Mobile money' },
  },
};

export function getProductPresentation(slug: string): ProductPresentation | undefined {
  return PRESENTATIONS[slug];
}

export function productsForRegion(products: Product[], currency: string): Product[] {
  return products.filter((product) => product.currency === currency);
}

export function productRoute(product: Product): string {
  return `/product/${product.slug}`;
}
