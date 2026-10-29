---
name: add-payment-provider
description: Ajouter une passerelle de paiement (adapter, registry, webhooks, suite de contrat, documentation, Swagger). Utiliser dès qu'on intègre Stripe, PawaPay, KoraPay ou un nouveau provider.
---

# Ajouter un provider

## Prérequis

- Lire `docs/ARCHITECTURE.md` (sections Providers, Webhooks, Sécurité).
- Lire le contrat `apps/api/src/modules/providers/payment-provider.interface.ts`.
- Vérifier la documentation officielle du provider (auth, statuts, signatures,
  idempotence, devises, refunds).

## Procédure

1. Créer `apps/api/src/modules/providers/<provider>/`.
2. Implémenter `PaymentProvider` :
   - `capabilities` ;
   - `initializePayment` ;
   - `getPayment` (obligatoire pour la réconciliation) ;
   - `refund` ;
   - `verifyWebhook` et `parseWebhook`.
3. Normaliser les statuts vers `PaymentStatus` de `@pay/contracts`.
4. Mapper les erreurs provider vers des erreurs domaine.
5. Enregistrer l'adaptateur dans `ProviderRegistry`.
6. Ajouter l'entrée d'environnement dans `config/env.ts` et `.env.example`.
7. Ajouter les fixtures et la suite de contrat.
8. Documenter l'endpoint webhook dans Swagger.
9. Mettre à jour `docs/ARCHITECTURE.md` et le README.

## Règles

- Aucun appel provider dans une transaction DB.
- Montants en unités mineures, jamais de float.
- Signature vérifiée sur le corps brut, comparaison en temps constant.
- Le provider ne décide jamais du statut : il émet un événement normalisé.
- Un provider non configuré doit échouer clairement, pas silencieusement.

## Validation

```bash
pnpm --filter @pay/api test
pnpm --filter @pay/api typecheck
pnpm verify
```

## Pièges

- PawaPay ne notifie qu'aux statuts finaux.
- Stripe peut livrer les événements dans le désordre.
- Les devises XOF/XAF n'ont pas de décimales.
- Derrière un proxy, vérifier `@authority` et `@path` RFC 9421.
