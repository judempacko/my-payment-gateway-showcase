# ADR 0001 — Monorepo pnpm + Turborepo

## Statut

Accepté.

## Contexte

Deux applications et un package de contrats partagés. Le projet doit rester
simple, rapide à installer et agréable pour un agent de code.

## Décision

- pnpm workspaces pour les dépendances et le protocole `workspace:*`.
- Turborepo minimal pour le graphe de tâches, le cache et `pnpm verify`.
- Pas de Nx.

## Conséquences

- `pnpm verify` sert de Definition of Done.
- Les builds de `@pay/contracts` précèdent ceux des apps.
- Le cache Turborepo accélère la CI.
