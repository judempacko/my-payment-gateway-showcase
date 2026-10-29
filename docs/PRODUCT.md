# PRODUCT.md

## Problème

Les intégrations de paiement sont souvent démontrées par des slides. Ce projet
démontre le contraire : un flux réel, observable et rejouable, avec plusieurs
passerelles derrière une interface unique.

## Public

- Recruteurs techniques et tech leads.
- Développeurs qui veulent comprendre un flux webhook fiable.
- Marchands fictifs qui testent un checkout sans compte provider.

## Promesse

`docker compose up` → aucune clé → un paiement mock complet, un dashboard, des
webhooks signés, des événements et des rejets explicites.

## Parcours

### 1. Boutique et checkout

1. Le client ouvre `/shop`, filtré par région (France/EUR ou Sénégal/XOF).
2. Il choisit un produit réel et clique sur « Acheter ».
3. Le checkout demande le contact, la livraison, le moyen de paiement, puis la
   vérification.
4. Le moyen de paiement est présenté comme une liste acheteur : carte, mobile
   money ou démo. Le provider est routé en interne.
5. L'API calcule le montant depuis le catalogue serveur.
6. Le provider retourne une action : redirection, instructions USSD ou
   validation mock.
7. Le client approuve dans le mock ou sur son téléphone.
8. Le webhook signé arrive, est persisté, mis en queue, puis appliqué.
9. Le statut final s'affiche sans rechargement, avec un reçu acheteur et un
   drawer « Under the hood » pour les détails techniques.

Pas de panier multi-produits et pas de calcul de livraison/taxe tant que l'API
actuelle ne les expose pas. La livraison est offerte et les prix sont TTC.

### 2. Dashboard marchand

1. Liste paginée des paiements.
2. Filtres par statut et provider.
3. Détail : montant, client, timeline d'événements, webhooks bruts.
4. Replay d'un webhook en échec.
5. Compteur de jobs en attente / en échec.

## Écrans

- `/:locale` : landing, architecture, accès démo.
- `/:locale/shop` : catalogue réel, filtré par région.
- `/:locale/product/:slug` : fiche produit, specs, achat direct.
- `/:locale/checkout` : tunnel d'achat en étapes.
- `/:locale/checkout/:paymentId` : résultat acheteur et détails techniques.
- `/:locale/dashboard` : transactions et webhooks.
- `/docs` (API) : Swagger.

Langues : `fr` et `en`, préfixe d'URL obligatoire, `fr` par défaut.

## Rails de paiement

- **Mock** : toujours disponible, aucun secret. Affiché comme méthode demo
  explicite.
- **Stripe** : disponible si `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont
  présents. L'acheteur voit « Carte » et est redirigé vers Stripe Checkout.
- **PawaPay** : disponible si `PAWAPAY_API_TOKEN` est présent. L'acheteur voit
  « Mobile money », saisit son téléphone et suit les instructions. Les callbacks
  sont finaux ; la réconciliation reprend les paiements bloqués.
- Le provider n'est jamais un choix acheteur. Il est déduit de la méthode, de la
  devise et des capabilities. Un rail non configuré n'affiche pas de bouton mort.

## Critères d'acceptation

### Création

- **Given** un produit actif et une clé de démo valide,
  **When** je crée un paiement mock,
  **Then** l'API retourne 201, un `paymentId`, un statut `PENDING` et une
  `nextAction` de type `mock_approval`.

- **Given** un montant envoyé par le client,
  **Then** il est ignoré : seul le prix du produit en base est utilisé.

- **Given** la même `Idempotency-Key` et le même corps,
  **Then** la même réponse est retournée, sans doublon.

- **Given** la même `Idempotency-Key` avec un corps différent,
  **Then** l'API retourne 409.

### Webhook

- **Given** un webhook signé valide,
  **Then** il est persisté dans `webhook_events` avant la réponse HTTP.
- **Given** un doublon,
  **Then** une seule ligne existe et une seule transition est appliquée.
- **Given** une signature invalide,
  **Then** l'API retourne 401 et aucune ligne n'est créée.
- **Given** Redis indisponible,
  **Then** le webhook reste en base et le sweeper le reprend.
- **Given** 50 webhooks identiques en parallèle,
  **Then** exactement une transition vers `SUCCEEDED` est enregistrée.

### Providers réels

- **Given** des credentials Stripe valides,
  **When** je crée un paiement Stripe,
  **Then** la réponse contient `REQUIRES_ACTION` et une `nextAction` de type
  `redirect` vers Stripe Checkout.

- **Given** des credentials PawaPay valides et un produit XOF,
  **When** je crée un paiement PawaPay avec un téléphone sénégalais,
  **Then** la réponse contient une `nextAction` de type `ussd` et le paiement
  reste `PENDING` jusqu'au callback final.

- **Given** un callback PawaPay signé RFC 9421,
  **Then** la signature, le digest et la fenêtre temporelle sont vérifiés avant
  toute écriture.

- **Given** un callback perdu,
  **Then** le job de réconciliation interroge le provider et applique la
  transition finale.

### Dashboard

- **Given** un paiement terminal,
  **Then** le polling/SSE s'arrête.
- **Given** un webhook en échec,
  **Then** il est visible avec son erreur et peut être rejoué.

## Non-fonctionnel

- Aucun secret requis pour la démo.
- Aucune donnée carte ne touche l'API.
- Montants en unités mineures, jamais de float.
- Swagger à jour sur chaque endpoint public.
- Accessibilité clavier et contraste AA.
- Bilingue FR/EN, montants et dates localisés.
- Aucun jargon interne dans l'UI acheteur.
- Un seul sélecteur de moyen de paiement.
- Le total et l'action primaire restent visibles sur mobile.
- Aucun succès affiché sans statut serveur `SUCCEEDED`.

## Hors périmètre MVP

- Multi-tenant et comptes marchands réels.
- Ledger double-entry (stretch goal).
- KYC, fraude, 3D Secure custom.
- Payouts et remittances.
- Kafka, Kubernetes, microservices.

## Script de démo

1. `docker compose up`.
2. Ouvrir `/fr/shop`, choisir l'iPhone 16, cliquer sur « Acheter ».
3. Remplir contact et livraison, choisir « Carte — démo », payer.
4. Approuver dans le panneau demo : le reçu s'affiche.
5. Ouvrir « Under the hood » : payment ID, events, webhooks signés.
6. Ouvrir `/fr/dashboard` : transaction visible, timeline et inbox.
7. Rejouer le webhook : aucune double transition.
8. Montrer Swagger `/docs`.
9. Basculer en `/en` et changer de région pour montrer mobile money.
