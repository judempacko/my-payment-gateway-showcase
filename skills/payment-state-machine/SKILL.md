---
name: payment-state-machine
description: Modifier ou auditer la machine à états des paiements (statuts, transitions, événements). Utiliser pour toute règle métier sur le cycle de vie d'un paiement.
---

# State machine

## Source de vérité

`packages/contracts/src/domain.ts` : `PaymentStatus`, `PAYMENT_TRANSITIONS`,
`canTransition`, `isSettledStatus`.

L'API applique les transitions dans `apps/api/src/modules/payments/`.
Aucun autre code n'écrit `payments.status`.

## Règles

- Une transition doit être explicitement autorisée.
- Un état terminal ne se réécrit jamais.
- Un doublon est un no-op, pas une erreur.
- Une transition arrière est ignorée et journalisée.
- Toute transition écrit une ligne `payment_events` avec séquence.
- Le verrou `SELECT … FOR UPDATE` précède la lecture du statut.
- Pas d'appel provider dans la transaction.

## Ajouter un statut

1. Ajouter au const et au type.
2. Ajouter la clé dans `PAYMENT_TRANSITIONS`.
3. Mettre à jour `TERMINAL_STATUSES` / `SETTLED_STATUSES` si nécessaire.
4. Ajouter les tests de transition (valide, invalide, idempotente).
5. Mettre à jour le `pgEnum` Drizzle et générer la migration.
6. Mettre à jour les badges UI et `docs/ARCHITECTURE.md`.
7. Vérifier Swagger si un DTO expose le statut.

## Validation

```bash
pnpm --filter @pay/contracts test
pnpm --filter @pay/api test
pnpm verify
```
