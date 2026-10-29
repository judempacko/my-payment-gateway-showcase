# Checkout scorecard

Note each axis from 0 to 10, then apply the weight.

| Axis                  | Weight | 0–2                                   | 5–6                          | 9–10                                                           |
| --------------------- | -----: | ------------------------------------- | ---------------------------- | -------------------------------------------------------------- |
| Product & value       |      8 | No product clarity, no price          | Product visible, price clear | Image, variant, ETA, value obvious in 3 seconds                |
| Trust, legal, support |      8 | No merchant, no legal, no support     | Merchant and total visible   | Real security, returns, support, legal, no false claims        |
| IA & cognitive load   |      8 | Technical concepts, duplicate choices | Understandable but long      | One decision per step, progressive disclosure                  |
| Payment methods       |     10 | Broken buttons, wrong methods         | List works, no guidance      | Local methods, routing, fallback, zero dead ends               |
| Form                  |     10 | Unlabeled, late errors                | Labels and validation        | Autofill, inline errors, focus, minimal fields                 |
| Errors & recovery     |     10 | Raw errors, dead end                  | Generic error, retry         | Specific, actionable, state preserved                          |
| CTA & momentum        |      8 | Internal label, hidden CTA            | Clear label                  | Amount in CTA, sticky mobile, one primary action               |
| Async & handoff       |      8 | Spinner without meaning               | Status visible               | Pending is explicit, redirect is explained, no fake success    |
| Outcomes              |     10 | Debug page after payment              | Basic confirmation           | Receipt, next steps, retry, alternate method, technical drawer |
| Accessibility         |     10 | Blocking issues                       | Labels and keyboard          | WCAG 2.2 AA, focus, live regions, zoom, screen reader          |
| Mobile                |      4 | Total below form                      | Responsive                   | Sticky total/CTA, thumb zone, numeric keyboard                 |
| Performance           |      3 | Blocking, heavy                       | Acceptable                   | LCP < 2.5s, CLS < 0.1, INP < 200ms                             |
| Instrumentation       |      3 | None                                  | Basic page views             | Funnel, errors, latency, retries, no PII                       |

## Thresholds

- 85+ with no axis below 6: top-5 level.
- 80+ with no axis below 5 and no blocker: shippable.
- Below 80: major work remains.

## Blockers

- False success.
- Card data in our UI or API.
- Client-side total used for payment.
- Duplicate payment possible.
- Error without recovery.
- Blocking accessibility issue.
- Missing merchant identity or legal/support information.
