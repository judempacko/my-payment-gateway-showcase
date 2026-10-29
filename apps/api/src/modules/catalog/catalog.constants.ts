import type { Product } from '@pay/contracts';

export const LEGACY_DEMO_SLUGS = ['portfolio-pro', 'api-credits', 'mobile-money-demo'];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: '00000000-0000-7000-8000-000000000101',
    slug: 'iphone-16-128-eur',
    name: 'iPhone 16 128 Go',
    description: 'Apple iPhone 16, 128 Go, couleur Noir. Livraison standard offerte.',
    amountMinor: '96900',
    currency: 'EUR',
  },
  {
    id: '00000000-0000-7000-8000-000000000102',
    slug: 'galaxy-s25-256-eur',
    name: 'Samsung Galaxy S25 256 Go',
    description: 'Samsung Galaxy S25, 256 Go, coloris Bleu marine. Livraison standard offerte.',
    amountMinor: '95900',
    currency: 'EUR',
  },
  {
    id: '00000000-0000-7000-8000-000000000103',
    slug: 'airpods-pro-2-eur',
    name: 'AirPods Pro 2',
    description: 'Apple AirPods Pro 2 avec réduction active du bruit. Livraison standard offerte.',
    amountMinor: '27900',
    currency: 'EUR',
  },
  {
    id: '00000000-0000-7000-8000-000000000104',
    slug: 'galaxy-a16-128-xof',
    name: 'Samsung Galaxy A16 128 Go',
    description: 'Samsung Galaxy A16, 128 Go, pensé pour le mobile money en Afrique de l’Ouest.',
    amountMinor: '129900',
    currency: 'XOF',
  },
];
