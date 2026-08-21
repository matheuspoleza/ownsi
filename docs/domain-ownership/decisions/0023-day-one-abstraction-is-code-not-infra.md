---
feature: domain-ownership
type: adr
id: ADR-0023
title: Day-one abstraction is code, not infrastructure
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0014, ADR-0020]
---

# ADR-0023 — Day-one abstraction is code, not infrastructure

## Status

Accepted. Full record with per-item retrofit cost: `../prd.md` §3.10. The discipline *inside* the
core is [ADR-0025](0025-functional-core-imperative-shell.md).

## Context

[ADR-0020](0020-pluggable-product-not-hosted-app.md) made the product pluggable, which raises the
question of how far to physically separate the core from the app: separate deploys, separate
hostnames, per-schema database roles, HTTP transport between them.

## Decision

The separation between core and app is **code design** — separation of concerns, a named port, API
design. One service, one deploy, one process. Per-schema database roles, separate hostnames, HTTP
transport and independent deploys are recorded as a known path, **not built**.

## Consequences

- All of those abstractions are nice to have and none is day one. The rule is the same one that
  discarded Redis in [ADR-0014](0014-infrastructure-deferred-to-tech-design.md) — unnecessary
  infrastructure is the classic tell of over-engineering.
- The evaluation criterion is "thoughtful tradeoffs and scope": **not separating while knowing
  exactly what it would cost demonstrates more judgement than separating.** Separating proves you can
  operate two things; this proves you know when you do not have to.
- **What is day one anyway**, because it costs nothing now and is expensive to retrofit:
  unidirectional dependency (`core` never imports `apps/ownsi`), a named port carrying the signatures
  `@ownsi/node` would have, `owner_ref` as an opaque string with no FK to `app.users`, a core
  ignorant of users and email, and stable public shapes (`diagnosis.code`, error codes, event names).
- **The condition holding it all up:** the direction of dependency. If it holds, every deferred item
  becomes a mechanical change later — a `GRANT`, a DNS record, one file implementing the port with
  `fetch`. If it breaks, none of them is cheap. That is why it is the only one worth a test guarding
  it (`../prd.md` §3.15).
- **Rejected — two deploys from day one:** the argument I had used in favour was CORS, and it does not
  support the separation: what genuinely exercises cross-origin is the example page on another
  origin, which exists either way. What remains as a benefit is a physical boundary, and database
  grants would deliver that later with a single `GRANT`.
