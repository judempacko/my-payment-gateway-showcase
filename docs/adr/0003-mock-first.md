# ADR 0003 — Mock comme chemin par défaut

## Statut

Accepté.

## Contexte

Stripe et PawaPay exigent des comptes, des clés et parfois du KYC. Une démo
portfolio qui ne démarre pas sans secret est une démo ratée.

## Décision

- Le provider `mock` est le défaut du checkout.
- Il signe ses webhooks avec HMAC-SHA256 et emprunte le même chemin que les
  vrais providers : inbox, queue, worker, state machine.
- Stripe et PawaPay sont des adaptateurs supplémentaires, activés par config.

## Conséquences

- `docker compose up` suffit pour une démo complète.
- Le mock n'est pas un raccourci : il exerce la vraie infrastructure.
- Les tests d'intégration peuvent tourner sans réseau.
