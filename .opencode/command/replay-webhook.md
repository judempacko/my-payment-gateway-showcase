---
description: Rejoue un webhook depuis l'inbox locale.
agent: build
---

Rejoue le webhook `$ARGUMENTS`.

Procédure :

1. Inspecte la ligne `webhook_events` correspondante.
2. Vérifie que la signature et le paiement associé sont cohérents.
3. Remets `processed_at` à null si nécessaire, puis ré-enqueue le job.
4. Vérifie la transition appliquée et l'événement `payment_events`.
5. Rapporte le résultat sans exposer de secret.
