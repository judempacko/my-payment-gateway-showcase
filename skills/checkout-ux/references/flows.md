# Checkout flows

## Physical product

```text
Product
→ Buy now
→ Contact (email, name)
→ Delivery (address, method, ETA)
→ Payment (method, prerequisites)
→ Review (total, terms)
→ Pay
→ Redirect | Awaiting action
→ Success | Pending | Failed | Expired
```

## Zero-key demo

```text
Product
→ Checkout
→ Demo method
→ Demo approval sheet
→ Mock webhook
→ Result
```

The demo method must be labeled. It must never look like a real charge.

## Card with hosted checkout

```text
Checkout
→ "You will be redirected to Stripe"
→ Stripe Checkout
→ Return
→ "Confirming with Stripe"
→ Poll / SSE
→ Result
```

Never trust `?stripe=success`. Only the payment status decides.

## Mobile money

```text
Checkout
→ Country + phone
→ Provider prompt
→ "Approve on your phone"
→ Pending
→ Reconcile / callback
→ Result
```

If resend is not supported by the provider, do not show a resend button. Offer
"Check again" and support.

## Subscription

Only if recurring billing exists in the backend. Otherwise model a one-time
plan and never use the word subscription in the confirmation.

## Review checklist

- Can the user answer: what, how much, when, how, and can I trust it?
- Is there exactly one primary action?
- Is the total visible without scrolling on mobile?
- Does every state have a next action?
- Does refresh/back preserve the checkout?
- Is the technical detail out of the main path?
