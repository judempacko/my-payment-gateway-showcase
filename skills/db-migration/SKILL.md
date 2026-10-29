---
name: db-migration
description: Créer, relire et appliquer une migration Drizzle sans casser les données ni les déploiements. Utiliser dès qu'un schéma PostgreSQL change.
---

# Migration Drizzle

## Procédure

1. Modifier `apps/api/src/infra/db/schema.ts`.
2. Générer : `pnpm db:generate`.
3. Relire le SQL dans `apps/api/drizzle/`.
4. Vérifier :
   - index et contraintes uniques ;
   - clés étrangères et `ON DELETE` ;
   - colonnes `NOT NULL` sans défaut ;
   - `DROP` / `ALTER COLUMN` destructifs.
5. Pour un changement destructif, appliquer expand/contract :
   - ajouter la nouvelle colonne nullable ;
   - backfill ;
   - basculer le code ;
   - supprimer l'ancienne colonne dans une migration ultérieure.
6. Appliquer en local : `pnpm db:migrate`.
7. Mettre à jour le seed si nécessaire.
8. Vérifier `pnpm verify`.

## Règles

- Ne jamais éditer `drizzle/` à la main.
- Ne jamais modifier `pnpm-lock.yaml` à la main.
- Une migration doit être réversible ou accompagnée d'un runbook.
- Pas de `db:migrate` automatique au boot de l'API en production.
- Les montants restent en `bigint` d'unités mineures.

## Validation

```bash
pnpm db:generate
pnpm db:migrate
pnpm verify
```
