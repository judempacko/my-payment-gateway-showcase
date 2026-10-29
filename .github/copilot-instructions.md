# Copilot instructions

This repository uses `AGENTS.md` as the single source of truth. Follow it, plus
the nearest `AGENTS.md` in `apps/api` or `apps/web`.

Key invariants: money in minor units, no float, no card data in the API, only the
payment state service writes `payments.status`, and every webhook is persisted
in `webhook_events` before being queued.
