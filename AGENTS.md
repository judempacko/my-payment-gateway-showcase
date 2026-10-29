# AGENTS.md

## Mission

Passerelle de paiement de démonstration : Stripe (cartes), PawaPay (mobile money)
et Mock (démo sans clé). Le Mock est le chemin par défaut. Le projet doit rester
lançable avec `docker compose up` sans aucun secret externe.

## Stack

- Monorepo pnpm + Turborepo, Node 24, TypeScript strict.
- API : NestJS, Drizzle ORM, PostgreSQL 18, BullMQ + Redis, Swagger.
- Web : Next.js App Router, React 19, Tailwind 4, TanStack Query.
- Tests : Vitest, Testcontainers (intégration), Playwright (E2E).

## Commandes

- Installer : `pnpm install`
- Infra locale : `docker compose up -d postgres redis`
- Dev complet : `pnpm dev`
- Build : `pnpm build`
- Lint : `pnpm lint`
- Types : `pnpm typecheck`
- Tests : `pnpm test`
- E2E : `pnpm --filter @pay/web test:e2e` (API + web lancés)
- Validation complète : `pnpm verify`
- Migrations : `pnpm db:generate` puis `pnpm db:migrate`
- Seed : `pnpm db:seed`
- Concurrence webhooks : `pnpm test:race` (API lancée)
- Swagger : http://localhost:3001/docs

## Carte du repo

- `apps/api/src/modules/payments` : cas d'usage, repository, state machine.
- `apps/api/src/modules/providers` : contrat provider + adaptateurs.
- `apps/api/src/modules/webhooks` : inbox brute et ingestion.
- `apps/api/src/workers` : processors BullMQ, sweeper, réconciliation.
- `apps/api/src/infra/db` : schéma Drizzle et accès base.
- `apps/web/src/app/[locale]` : landing, boutique, produit, checkout, dashboard.
- `apps/web/src/components/checkout-form.tsx` : tunnel acheteur, validation, idempotency.
- `apps/web/src/components/payment-status-panel.tsx` : résultat, reçu, drawer technique.
- `apps/web/messages` : traductions FR/EN.
- `packages/contracts` : types, enums, machine à états partagés.
- `docs` : produit, architecture, design, ADR, runbooks.
- `skills/checkout-ux` : lois UX, scorecard, microcopy, edge cases.
- `skills` : procédures détaillées pour les tâches récurrentes.

## Invariants

- L'argent est un entier en unités mineures + devise. Jamais de float.
- Seul le service de state machine écrit `payments.status`.
- Tout webhook est vérifié, puis persisté dans `webhook_events` avant la queue.
- Aucune logique métier dans le handler HTTP de webhook.
- Aucun appel provider à l'intérieur d'une transaction PostgreSQL.
- Aucune donnée carte ne transite par l'API. Stripe Checkout/Payment Element only.
- Le montant est calculé depuis le catalogue serveur, jamais depuis le client.
- Aucun secret dans le repo. Ne jamais lire `.env`.
- Stripe et PawaPay ne sont enregistrés que si leurs credentials sont présents.
- PawaPay ne notifie qu'aux statuts finaux : la réconciliation est obligatoire.
- Les migrations Drizzle sont générées, relues, jamais éditées à la main.
- Swagger doit rester à jour : tout endpoint ou DTO modifié doit être documenté.

## Definition of Done

- `pnpm verify` vert.
- Test unitaire ajouté pour toute transition ou règle métier.
- Test d'intégration ajouté si webhook, concurrence ou state machine.
- Spec Playwright si parcours UI modifié.
- `docs/ARCHITECTURE.md` ou ADR mis à jour si décision architecturale.
- Swagger vérifié si contrat public modifié.

## Lecture contextuelle

- State machine, webhooks, providers : `docs/ARCHITECTURE.md`.
- Checkout, résultat, moyens de paiement : `skills/checkout-ux/SKILL.md`.
- UI, tokens, composants : `docs/DESIGN.md`.
- Périmètre, critères d'acceptation : `docs/PRODUCT.md`.
- Nouveau provider : `skills/add-payment-provider/SKILL.md`.
- Incident webhook : `skills/debug-webhook/SKILL.md`.
- Migration : `skills/db-migration/SKILL.md`.

## Interdits

- Modifier `pnpm-lock.yaml` à la main.
- Éditer `dist/`, `.next/`, `drizzle/` généré.
- Ajouter un provider sans suite de contrat.
- Exposer une clé secrète côté navigateur.
- Utiliser un montant fourni par le client.
