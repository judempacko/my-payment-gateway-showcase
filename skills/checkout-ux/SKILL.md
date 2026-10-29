---
name: checkout-ux
description: Concevoir, auditer et durcir un checkout de paiement de classe mondiale (produit, checkout, moyen de paiement, review, redirection, pending, succès/échec, accessibilité, mobile, analytics). Utiliser dès qu'on touche au parcours d'achat ou à l'écran de résultat.
---

# Checkout UX

## Mission

Un checkout n'est pas un formulaire : c'est une promesse de confiance. Le client
doit répondre en quelques secondes à quatre questions : qu'est-ce que j'achète,
combien je paie, que se passe-t-il ensuite, puis-je faire confiance à ce
marchand ? Si une seule réponse manque, on perd la vente.

La cible n'est pas « joli ». La cible est un parcours qui convertit, rassure,
récupère les erreurs et ne ment jamais sur l'état d'un paiement.

## Quand utiliser ce skill

- Création ou refonte d'un tunnel d'achat.
- Audit de conversion, de friction ou de confiance.
- Ajout d'un moyen de paiement, d'une devise ou d'un pays.
- Refonte d'une page de résultat, d'attente ou d'échec.
- Revue accessibilité ou mobile d'un parcours de paiement.
- Démonstration d'une API de paiement qui doit rester invisible pour l'acheteur.

Ne pas l'utiliser pour une règle métier de state machine : voir
`payment-state-machine`. Ne pas l'utiliser pour un webhook : voir
`debug-webhook`.

## Les 12 lois

1. **Une décision par écran.** Un objectif, une action primaire, un chemin de
   sortie.
2. **Le prix est toujours visible.** Total, devise, livraison et prochaine étape
   ne doivent jamais être hors écran sur mobile.
3. **Un seul sélecteur de moyen de paiement.** Le provider est une décision
   technique, pas un choix acheteur.
4. **Guest par défaut.** Le compte est une option après l'achat, jamais un
   péage avant le paiement.
5. **Chaque champ est justifié.** Email d'abord, livraison ensuite, paiement
   enfin. Aucun champ « au cas où ».
6. **Chaque erreur a une action.** Message clair, champ concerné, focus, reprise.
   Aucun cul-de-sac.
7. **Pending est un état de première classe.** On explique, on donne une durée,
   on permet de vérifier. Jamais de faux succès.
8. **Mobile-first.** CTA dans le pouce, résumé accessible, une colonne, clavier
   numérique, cibles de 44 px.
9. **Accessibilité AA par défaut.** Sémantique, focus, contraste, lecteur
   d'écran, 200 % zoom, reduced motion.
10. **Le technique est une récompense.** API, webhooks et state machine vivent
    dans un drawer « Under the hood », pas dans le parcours.
11. **Pas de dark patterns.** Pas de fausse urgence, pas de consentement
    pré-coché, pas de frais cachés.
12. **On mesure, on ne devine pas.** Funnel, erreurs, latence provider, retries,
    drop-off, sans PII.

## Benchmarks

| Référence       | Signature à emprunter                                         | À ne pas copier                             |
| --------------- | ------------------------------------------------------------- | ------------------------------------------- |
| Stripe Checkout | Minimalisme, trust, wallets, localisation, erreurs précises   | Le côté « développeur » exposé à l'acheteur |
| Shopify         | Accordéon progressif, express checkout, résumé sticky, mobile | Le trop-plein d'options de livraison        |
| Amazon          | Adresse et paiement par défaut, total explicite, rapidité     | La densité et les upsells agressifs         |
| Apple           | Confidentialité, sheet natif, confirmation biométrique        | L'absence de fallback non-Apple             |
| Booking.com     | Confiance, moyens locaux, clarté du prix                      | La fausse rareté                            |
| Adyen / Mollie  | Moyens locaux, sélection d'émetteur, QR/USSD                  | La complexité exposée                       |
| Klarna          | Messaging BNPL clair, coût total                              | L'incitation au crédit                      |
| Wise            | Transparence des frais, conversion                            | La surcharge d'informations                 |

## Parcours canoniques

### Produit physique

```text
Produit → Buy now → Contact → Livraison → Paiement → Review → Payer
→ Redirection / attente → Succès | Pending | Échec | Expiré
```

### Abonnement

```text
Plan → Période → Contact → Paiement → Review → Confirmation
```

Ne pas afficher « abonnement » si le backend ne gère pas le récurrent. Un plan
annuel payé une fois est un produit one-time, pas un abonnement.

### Digital

```text
Produit → Contact → Paiement → Confirmation → Accès
```

## Spécifications écran par écran

### Produit

- Image principale, galerie, variante réelle, prix, disponibilité, ETA.
- Un seul CTA primaire : « Acheter » / « Buy now ».
- Les variantes changent le SKU et le prix ; jamais de variante décorative.
- Si une seule variante existe, ne pas afficher de sélecteur.

### Checkout — Contact

- Email en premier : reçu, support, updates.
- Nom complet.
- Téléphone uniquement si le moyen de paiement l'exige.
- Consentement marketing décoché, séparé des CGV.

### Checkout — Livraison

- Adresse, ville, code postal, pays.
- Une seule méthode de livraison si le backend ne calcule pas les tarifs.
- ETA claire. Pas de fausse promesse de suivi.
- Adresse conservée en cas d'erreur.

### Checkout — Paiement

- Une liste de moyens, pas de « rail ».
- Chaque option affiche : libellé, icône, délai, frais éventuels, prérequis.
- L'option sélectionnée s'ouvre inline.
- Carte : champs hébergés ou redirection. Aucun PAN dans notre UI/API.
- Mobile money : pays, opérateur, téléphone, instructions USSD, pending.
- Demo : libellé explicite « Demo mode — no real charge ».

### Review

- Produit, quantité, adresse, moyen de paiement, total.
- Liens « Modifier » par section.
- CGV obligatoires, consentement marketing optionnel.
- CTA avec le montant : « Payer 969,00 € ».

### Redirection

- Prévenir avant de quitter : montant, provider, retour.
- Conserver l'état.
- Au retour, afficher « Vérification avec le provider » et interroger le statut.
- Ne jamais déduire un succès d'un paramètre d'URL.

### Résultat

- **Succès** : montant, numéro de commande, reçu, ETA, retour boutique.
- **Pending** : progression, durée estimée, instructions, vérifier à nouveau,
  moyen alternatif, support.
- **Échec** : raison compréhensible, aucun débit, réessayer, autre moyen, support.
- **Expiré/annulé** : sélection conservée, relancer.
- **Détails techniques** : repliés dans « Under the hood ».

## Matrice de routage des moyens de paiement

| Méthode acheteur | Provider si configuré | Fallback zéro clé    | UI                               |
| ---------------- | --------------------- | -------------------- | -------------------------------- |
| Carte            | Stripe                | Mock, étiquette demo | Redirection Stripe ou sheet demo |
| Mobile money     | PawaPay               | Mock, étiquette demo | Instructions USSD ou sheet demo  |
| Demo             | Mock                  | Toujours             | Sheet d'approbation explicite    |

Règles :

- Filtrer les méthodes par devise, pays et capabilities.
- Ne jamais afficher un bouton mort. Si un provider manque, masquer l'option ou
  proposer le fallback demo clairement.
- Un produit = une devise avec l'API actuelle. Utiliser des catalogues par
  région plutôt que des conversions inventées.
- Un changement de moyen de paiement ne doit pas changer silencieusement le
  produit.

## Machine à états UX

```text
idle
→ validating
→ creating
→ awaiting_action
→ redirecting
→ processing
→ succeeded | failed | expired | canceled
```

Pour chaque état :

- copy acheteur ;
- action primaire ;
- action secondaire ;
- ce qui est désactivé ;
- ce qui est annoncé via `aria-live` ;
- ce qui est journalisé.

## Microcopy

### CTA

- « Payer 969,00 € » / « Pay €969.00 »
- « Continuer vers le paiement »
- « Réessayer »
- « Vérifier à nouveau »
- « Utiliser un autre moyen »

### Interdits dans l'UI acheteur

`rail`, `provider`, `webhook`, `idempotency`, `HMAC`, `SSE`, `state machine`,
`PENDING`, `REQUIRES_ACTION`, `Create payment`.

### Erreurs

Format : ce qui s'est passé + pourquoi + quoi faire.

- « Le paiement n'a pas abouti. Aucun montant n'a été débité. Réessayez ou
  choisissez un autre moyen. »
- « La connexion a été interrompue. Nous vérifions le paiement avant de
  réessayer. »

### Statuts acheteur

| Statut interne    | Copy                    |
| ----------------- | ----------------------- |
| `CREATED`         | Préparation du paiement |
| `PENDING`         | Confirmation en cours   |
| `REQUIRES_ACTION` | Action requise          |
| `PROCESSING`      | Traitement en cours     |
| `SUCCEEDED`       | Paiement confirmé       |
| `FAILED`          | Paiement échoué         |
| `EXPIRED`         | Checkout expiré         |
| `CANCELED`        | Paiement annulé         |
| `REFUND_*`        | Remboursement           |

## Accessibilité

- `fieldset`/`legend` pour chaque groupe de radios.
- `label` explicite pour chaque champ.
- `aria-invalid`, `aria-describedby` et message d'erreur lié.
- Résumé d'erreurs avec liens vers les champs.
- Focus sur le premier champ invalide.
- `aria-busy` sur le submit, `aria-live="polite"` pour les statuts.
- Contraste AA, cibles 44 px, focus visible.
- 200 % zoom, clavier complet, lecteur d'écran.
- `prefers-reduced-motion` respecté.
- Aucune information portée par la couleur seule.

## Mobile

- Résumé accessible en haut ou en accordéon.
- Barre sticky en bas : total + action.
- Une colonne, inputs 16 px, clavier numérique pour téléphone/OTP.
- Safe-area inset.
- Pas de navigation marketing dans le checkout.
- Tester 320 px, 375 px et 200 % zoom.

## Performance

- Server Components pour le storefront et la coquille.
- Client uniquement pour le formulaire et le suivi.
- Images `next/image`, dimensions explicites, LCP prioritaire.
- Prefetch produits/providers, `staleTime`.
- SSE avec backoff + polling de secours, arrêt sur statut réglé.
- Budgets indicatifs : LCP < 2,5 s, CLS < 0,1, INP < 200 ms.

## Confiance, légal, support

- Identité marchand, logo, « paiement sécurisé ».
- CGV, confidentialité, retours, contact.
- Phrases de sécurité vraies. Pas de faux badge PCI.
- Aucune promesse de reçu email si aucun mailer n'existe.
- Disclaimer si produits ou marques réelles dans une démo.

## Instrumentation

Événements recommandés :

```text
shop_viewed
product_viewed
buy_now_clicked
checkout_started
step_completed
field_error
payment_method_selected
payment_submitted
payment_created
provider_redirected
payment_pending_viewed
payment_succeeded
payment_failed
payment_retried
developer_drawer_opened
language_changed
region_changed
```

Jamais de nom, email, téléphone ou adresse dans les événements.

## Scorecard

Chaque axe est noté de 0 à 10, puis pondéré.

| Axe                       | Poids |
| ------------------------- | ----: |
| Produit & valeur          |     8 |
| Confiance, légal, support |     8 |
| IA & charge cognitive     |     8 |
| Moyens de paiement        |    10 |
| Formulaire                |    10 |
| Erreurs & récupération    |    10 |
| CTA & momentum            |     8 |
| Async & handoff           |     8 |
| Résultats                 |    10 |
| Accessibilité             |    10 |
| Mobile                    |     4 |
| Performance               |     3 |
| Instrumentation           |     3 |

Ancrages :

- 0–2 : absent ou dangereux.
- 3–4 : friction majeure.
- 5–6 : acceptable, pas compétitif.
- 7–8 : fort, top quartile.
- 9–10 : top 1 %, mémorable.

Seuils :

- ≥ 85 : niveau top 5.
- ≥ 80 avec aucun axe < 5 : prêt à ship.
- Tout blocker : échec, quel que soit le score.

Blockers : faux succès, données carte dans notre UI/API, total non serveur,
paiement dupliqué, erreur sans récupération, a11y bloquante, absence de
confiance/légal.

## Procédure d'audit

1. Parcourir le happy path avec 3 personas : guest mobile, acheteur desktop,
   mobile money en faible connectivité.
2. Parcourir 12 edge paths : double clic, refresh, back, réseau lent, provider
   down, pays incompatible, 3DS, webhook en retard, doublon, expiration,
   redirection annulée, lecteur d'écran.
3. Capturer les preuves : écrans, timings, console, réseau.
4. Remplir la scorecard.
5. Produire un friction log avec sévérité et effort.
6. Prioriser impact × confiance / effort.
7. Écrire les specs d'écran et les acceptance criteria.
8. Implémenter, tester avec Playwright et axe, re-scorer.

## Red-team

- Double clic sur Payer.
- Refresh au milieu du formulaire.
- Back après redirection.
- Perte réseau après le submit.
- Webhook en retard ou doublon.
- Mauvais pays / mauvaise devise.
- Provider indisponible.
- Session expirée.
- Carte refusée / 3DS abandonné.
- USSD non reçu.
- Lecteur d'écran + clavier uniquement.
- 200 % zoom.

## Couche showcase

- Un drawer « Under the hood » : Overview, API, Events, Webhooks, State.
- Le dashboard reste la vue technique complète.
- Le parcours acheteur ne montre jamais le provider ni les statuts internes.
- Le récit de démo : acheter → payer → pending/succès → ouvrir le drawer →
  dashboard. Le technique est la récompense, pas le parcours.

## Garde-fous repo

- Montant en unités mineures, jamais de float.
- Montant serveur depuis le catalogue, jamais depuis le client.
- Aucune donnée carte dans l'UI ou l'API.
- `nextAction` peut être `redirect`, `ussd`, `mock_approval`, `client_secret`.
- Arrêter SSE/polling sur statut réglé.
- Filtrer produits par devise et pays.
- Utiliser les tokens Steep et les primitives shadcn.
- Ne pas exposer les statuts internes à l'acheteur.
- Mettre à jour Swagger si un contrat public change.

## Definition of Done

- `pnpm verify` vert.
- Tests unitaires pour validation, routage des méthodes, idempotency.
- Tests composants pour erreurs et a11y.
- Playwright FR/EN, mobile/desktop, succès, pending, échec, retry.
- Axe sur shop, produit, checkout, résultat.
- Budgets perf respectés.
- `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md` à jour.
- Scorecard ≥ 80, aucun axe < 5, aucun blocker.

## Templates

### Audit finding

```text
[P0|P1|P2] Titre
Écran / étape :
Constat :
Impact :
Recommandation :
Effort :
Preuve :
```

### Screen spec

```text
Écran :
Objectif :
Action primaire :
Actions secondaires :
États : loading / empty / error / success / pending / expired
Données :
A11y :
Mobile :
Instrumentation :
Acceptance criteria :
```
