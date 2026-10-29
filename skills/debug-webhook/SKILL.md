---
name: debug-webhook
description: Diagnostiquer un webhook manquant, rejeté, dupliqué, en échec ou appliqué dans le mauvais ordre. Utiliser pour un incident de callback provider.
---

# Débugger un webhook

## Ordre d'investigation

1. Le provider a-t-il reçu un 2xx ? Vérifier ses logs ou son dashboard.
2. La signature est-elle valide ? Vérifier le secret, le corps brut, l'horodatage.
3. La ligne existe-t-elle dans `webhook_events` ?
4. Le job est-il dans BullMQ (`waiting`, `active`, `failed`, `completed`) ?
5. Le worker a-t-il marqué `processed_at` ?
6. La transition a-t-elle été appliquée dans `payment_events` ?
7. Le webhook est-il arrivé avant la création du paiement ?

## Requêtes utiles

```sql
SELECT id, provider, provider_event_id, payment_id, received_at, processed_at,
       processing_error, attempts
FROM webhook_events
ORDER BY received_at DESC
LIMIT 20;
```

```sql
SELECT sequence, type, from_status, to_status, created_at
FROM payment_events
WHERE payment_id = $1
ORDER BY sequence;
```

## Causes fréquentes

- Mauvais secret ou body parsé avant vérification.
- `Content-Digest` / `Signature-Input` reconstruits avec un mauvais host.
- Job en échec permanent à cause d'un ID de paiement absent du payload.
- Transition arrière ignorée : c'est volontaire, vérifier l'ordre des événements.
- Doublon absorbé par la contrainte unique : aucune action.
- Redis indisponible : vérifier que le sweeper a repris la ligne.

## Remédiation

- Corriger la cause, puis rejouer via le dashboard ou `pnpm tsx scripts/replay-webhook.ts <id>`.
- Ne jamais éditer `payments.status` à la main.
- Après correction, ajouter un test de non-régression.
