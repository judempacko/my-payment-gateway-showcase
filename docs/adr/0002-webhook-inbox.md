# ADR 0002 — Inbox PostgreSQL avant BullMQ

## Statut

Accepté.

## Contexte

Répondre 200 avant de persister un webhook perd l'événement si Redis tombe.
Traiter le webhook dans la requête HTTP expose à des timeouts provider.

## Décision

1. Vérifier la signature sur le corps brut.
2. Insérer dans `webhook_events` avec unicité `(provider, provider_event_id)`.
3. Enfiler un job BullMQ avec `jobId = webhook_events.id`.
4. Répondre 200.
5. Un sweeper ré-enfile les lignes non traitées.

## Conséquences

- Aucune perte silencieuse.
- Le doublon est absorbé par la contrainte SQL, pas seulement par BullMQ.
- Le handler HTTP reste trivial et testable.
- Le worker doit être idempotent.
