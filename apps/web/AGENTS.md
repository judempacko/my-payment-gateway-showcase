# Web — instructions locales

## Conventions

- App Router : Server Components par défaut, `'use client'` uniquement si nécessaire.
- Aucun appel direct aux providers de paiement depuis le navigateur.
- Toute mutation passe par `src/lib/api.ts` et la clé de démo.
- Les montants sont formatés depuis `amountMinor` + devise, jamais recalculés en float.
- TanStack Query pour le fetch et le cache ; SSE pour le détail d'un paiement.
- Les composants UI suivent `docs/DESIGN.md`, les tokens de `globals.css` et `skills/checkout-ux/SKILL.md`.
- Toute copie acheteur passe par `messages/fr.json` et `messages/en.json`. Aucun texte codé en dur dans le checkout.
- Les montants et dates sont formatés avec la locale (`formatMoney`, `formatDateTime`).
- Le provider est résolu depuis la méthode, jamais choisi par l'acheteur.
- Les primitives UI sont celles de shadcn/ui (`src/components/ui`, style `new-york`). Ne pas recréer un bouton, une carte, un champ ou un select à la main : composer ou personnaliser le composant shadcn existant.
- Les tokens d'espacement Steep restent dans `:root`, pas dans `@theme` : les y remettre écraserait l'échelle Tailwind (`p-4` deviendrait 4px au lieu de 16px).
- Toute nouvelle route doit avoir ses états loading, empty, error et success.

## Validation ciblée

- `pnpm --filter @pay/web lint`
- `pnpm --filter @pay/web typecheck`
- `pnpm --filter @pay/web build`
- `pnpm --filter @pay/web test`
- `pnpm --filter @pay/web test:e2e` (API + web lancés)
- E2E (Phase 4) : Playwright sera ajouté avec les parcours checkout.

## Pièges

- Ne jamais mettre une clé secrète dans `NEXT_PUBLIC_*`.
- Ne pas afficher un statut terminal comme « en cours ».
- Toujours arrêter le polling/SSE sur un statut réglé.
- `nextAction` peut être `redirect` (Stripe), `ussd` (PawaPay) ou
  `mock_approval` (Mock) : ne pas supposer que tous les rails sont mock.
- Filtrer les produits par devise selon les capabilities du provider.
- Vérifier le contraste et la navigation clavier.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
