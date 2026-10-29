# Edge cases

## Input and navigation

- Double click on Pay.
- Refresh during contact, delivery, or payment.
- Browser back after payment creation.
- Browser back after provider redirect.
- Multi-tab checkout.
- Autofill with a different country.
- Phone number with local prefix or `00`.
- Address with an unsupported country.
- Quantity changed after a failed attempt.

## Network and provider

- Network lost before the request is sent.
- Network lost after the request is sent.
- Provider timeout.
- Provider returns 503.
- Stripe redirect canceled.
- 3DS abandoned.
- Mobile money prompt not received.
- PawaPay callback delayed.
- Duplicate webhook.
- Webhook applied after the user already left.

## Payment state

- Payment succeeds while the user is on the pending screen.
- Payment fails after the user retried.
- Payment expires during checkout.
- Payment is canceled by the provider.
- Refund started after success.
- User reloads the receipt.

## Accessibility

- Keyboard only.
- Screen reader announces status changes.
- 200% zoom.
- Reduced motion.
- High contrast / forced colors.
- Error summary focus.

## Security and trust

- No card data in our UI or API.
- No PII in analytics.
- No raw provider error shown to the buyer.
- No fake urgency or scarcity.
- No pre-checked marketing consent.

## Expected behavior

Every edge case must have:

- a visible state;
- a primary action;
- a recovery path;
- a clear, truthful message;
- an instrumentation event without PII.
