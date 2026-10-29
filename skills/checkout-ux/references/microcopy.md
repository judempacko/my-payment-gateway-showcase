# Microcopy

## Primary calls to action

| Context            | FR                      | EN                 |
| ------------------ | ----------------------- | ------------------ |
| Product            | Acheter                 | Buy now            |
| Continue           | Continuer               | Continue           |
| Pay                | Payer 969,00 €          | Pay €969.00        |
| Retry              | Réessayer               | Try again          |
| Check again        | Vérifier à nouveau      | Check again        |
| Use another method | Utiliser un autre moyen | Use another method |
| Back to shop       | Retour à la boutique    | Back to shop       |
| View receipt       | Voir le reçu            | View receipt       |

## Status copy

| Internal        | FR                      | EN                      |
| --------------- | ----------------------- | ----------------------- |
| CREATED         | Préparation du paiement | Preparing your payment  |
| PENDING         | Confirmation en cours   | Confirming your payment |
| REQUIRES_ACTION | Action requise          | Action needed           |
| PROCESSING      | Traitement en cours     | Processing              |
| SUCCEEDED       | Paiement confirmé       | Payment confirmed       |
| FAILED          | Paiement échoué         | Payment failed          |
| EXPIRED         | Checkout expiré         | Checkout expired        |
| CANCELED        | Paiement annulé         | Payment canceled        |
| REFUND_PENDING  | Remboursement en cours  | Refund in progress      |
| REFUNDED        | Remboursé               | Refunded                |

## Errors

Write what happened, why, and what to do.

- FR: « Le paiement n'a pas abouti. Aucun montant n'a été débité. Réessayez ou choisissez un autre moyen. »
- EN: "The payment did not go through. You were not charged. Try again or use another method."
- FR: « La connexion a été interrompue. Nous vérifions le paiement avant de réessayer. »
- EN: "The connection was interrupted. We are checking the payment before retrying."

## Security

- FR: « Les données de carte sont traitées par Stripe. Nous ne voyons jamais votre numéro de carte. »
- EN: "Card details are processed by Stripe. We never see your card number."
- Demo: « Mode démo — aucun débit réel. » / "Demo mode — no real charge."

## Forbidden in buyer UI

`rail`, `provider`, `webhook`, `idempotency`, `HMAC`, `SSE`, `state machine`,
`PENDING`, `REQUIRES_ACTION`, `Create payment`, `Submit`.
