---
feature: domain-ownership
type: adr
id: ADR-0014
title: Infrastructure deferred to the tech design
status: Accepted — resolved in the tech design
date: 2026-08-19
decided-by: Matheus
resolved-in: ../prd.md §3.8 (Railway + Bun + Postgres)
---

# ADR-0014 — Infrastructure deferred to the tech design

## Status

Accepted, and now **resolved**: the tech design closed it as **Railway + Bun + Postgres, one
service, one deploy** — see `../prd.md` §3.8. The survey below is kept so the work is not repeated.

## Context

Hosting and stack were pressing for a decision while product decisions were still open. Picking
infrastructure first would have let the runtime dictate the product.

## Decision

Do not close stack/hosting at decision-log time. Product decisions come first; infrastructure
returns in a technical design.

## Consequences

### Constraints that fell out of the product decisions

- Egress for authoritative DNS queries
  ([ADR-0009](0009-recursive-decides-authoritative-explains.md)). UDP/53 ideally; TCP/53 works
  (RFC 7766 makes TCP mandatory on authoritative servers).
- Scheduling with ~15 min granularity or better
  ([ADR-0012](0012-pending-hibernates-never-expires.md) promises an email when propagation lands,
  with the tab closed).
- No spin-down: the reviewer opens the link at an arbitrary hour, and a free tier that hibernates
  returns ~50s of blank screen as a first impression.

### Option map

| | Setup | Native Bun | `node:dns` ([ADR-0009](0009-recursive-decides-authoritative-explains.md)) | Cron ~15 min | Cold start | Providers |
|---|---|---|---|---|---|---|
| Railway | minutes | yes | direct | first-class, ~$5 | no | 2 |
| Vercel | minutes | yes | direct | free external cron, or $20 | Fluid, low | 1 |
| Cloud Run | ~1h | yes | direct | Scheduler, free | no, `min-instances=1` | 2 |
| CF Containers | medium | yes | direct | DO alarm | yes, configurable | 1 |
| Elysia on Workers | minutes | no | hand-rolled TCP (~half a day) | DO alarm | no | 1 |
| AWS Lambda | hours | custom layer | direct | EventBridge | with provisioned | 2 |

### Facts established

- Workers runs workerd (V8), not Bun (JavaScriptCore). `nodejs_compat` gives Node APIs, not Bun's.
  Elysia on Workers = a Web Standard adapter, with no Bun underneath.
- Cloudflare Containers sits *under* Workers, not beside it: the Worker is a mandatory entry point →
  a Durable Object controls the lifecycle → the container runs. It is the only arrangement with a DO
  alarm plus native Bun.
- Vercel runs native Bun in Functions; Elysia enters through the `fetch` handler. Cron on Hobby is
  daily.
- Cloud Run: `gcloud run deploy --source .`, and `--min-instances=1` kills the cold start. Pair it
  with Neon/Supabase — Cloud SQL is too expensive for this scope.

### Leaning recorded (not closed at the time)

Railway. A long-running process gives precise per-claim scheduling — the elegance of a DO alarm
without depending on Durable Objects. Serverless always has the tick as its floor.

### Queue: Postgres, not Redis

`next_check_at` in Postgres already is a queue; `FOR UPDATE SKIP LOCKED` gives atomic dequeue, and
the job state lives in the same transaction as the domain state — the dual write that Redis+Postgres
creates simply does not exist here. An in-memory timer becomes a precision optimisation, not a
dependency (a 60s tick catches the worst case; it re-hydrates from the database on boot).

Redis would win with high volume, rich retry semantics, or cross-instance rate limiting — none of
which apply. Document in the README *why not*, and from what scale it would change: "thoughtful
tradeoffs and scope" is an evaluation criterion, and unnecessary infrastructure is the classic tell
of over-engineering.
