---
description: Lance la validation complète du monorepo.
agent: build
---

Lance `pnpm verify`, puis `pnpm build`.

Si une étape échoue, corrige la cause racine sans désactiver de règle ni de test.
Termine par un résumé des commandes exécutées et de leur résultat.
