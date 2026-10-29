# API — instructions locales

## Conventions

- Module NestJS par domaine ; pas de logique métier dans les controllers.
- Injection par token pour la DB (`DB`) et la queue (`WEBHOOK_QUEUE`).
- DTO d'entrée en classes `class-validator`, documentés avec `@ApiProperty`.
- Réponses Swagger explicites : `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiBadRequestResponse`.
- Erreurs métier via exceptions Nest ; pas de `throw new Error` nu.
- Transactions courtes : jamais d'appel HTTP provider dans `db.transaction`.
- Les processors BullMQ sont idempotents et relançables.

## Validation ciblée

- Un fichier : `pnpm --filter @pay/api test -- src/...spec.ts`
- Intégration : `pnpm --filter @pay/api test:integration`
- Avant de terminer : `pnpm --filter @pay/api lint && pnpm --filter @pay/api typecheck && pnpm --filter @pay/api test`
- Migration : `pnpm --filter @pay/api db:generate`, relire le SQL, puis `db:migrate`.

## Pièges

- Le webhook Stripe/PawaPay exige le corps brut : ne pas parser avant vérification.
- Un webhook peut arriver deux fois, dans le désordre, ou après un crash.
- `SELECT … FOR UPDATE` sur `payments` avant toute transition.
- Stripe vérifie `Stripe-Signature` via le SDK ; PawaPay vérifie RFC 9421.
- Un provider non configuré n'est pas enregistré dans le registry (503 sinon).
- `PAWAPAY_ALLOW_UNSIGNED_CALLBACKS=true` est réservé au sandbox local.
- Les appels provider restent hors transaction ; la réconciliation passe par
  `PaymentStateService.applyProviderSnapshot`.
- Ne pas logger les numéros de téléphone, emails ou secrets en clair.
