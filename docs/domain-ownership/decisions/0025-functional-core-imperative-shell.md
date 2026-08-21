---
feature: domain-ownership
type: adr
id: ADR-0025
title: Functional core, imperative shell
status: Accepted
date: 2026-08-21
decided-by: Matheus
relates-to: [ADR-0006, ADR-0016, ADR-0023]
---

# ADR-0025 — Functional core, imperative shell

## Status

Accepted. Complements [ADR-0023](0023-day-one-abstraction-is-code-not-infra.md), which draws the
boundary *between* modules; this one draws it *inside* the core.

## Context

Nine tables do not justify full clean architecture. But the dependency rule has one obvious place to
apply here: the diagnosis engine is the product, and the success criteria of `../prd.md` §2 are
statements about it — "a resolver outage sends zero emails", "each of the 12 probes names its cause".
Those are only cheap to assert if the engine has no I/O.

## Decision

A pure core with an imperative shell around it.

- `packages/core/model/` — `Domain`, the 12 probes, `diagnose`, `transition`, `schedule`. No HTTP
  framework, no ORM, no `node:dns`, no clock of its own.
- `packages/core/use-cases/` — receive their ports as a parameter. No DI container: `Deps` is an
  argument.
- Adapters (DoH, authoritative UDP/53, the recorded fake, the ORM repository, Resend) live in the
  shell.
- **The core returns effects as data; the shell executes them.** `transition` returns the new state,
  the events, `nextCheckIn` and an `effects[]` array.

## Consequences

- "A resolver outage sends zero emails" becomes an assertion over an array, with no SMTP mock.
- Each of the 12 probes of [ADR-0016](0016-active-diagnosis-probe-catalogue.md) becomes a fixture
  test over a recorded `DnsObservation` — which is what gets demonstrated in the video.
- The "Check again" button, the scheduler and the public proof page all call the same use case. The
  scheduler is an adapter, not an orchestrator.
- **Accepted cost:** one transaction writes three aggregates (`domains`, `dns_checks`,
  `domain_events`). The invariant of [ADR-0006](0006-events-checks-and-three-valued-outcome.md) —
  evidence and state never diverge — is worth more than "one transaction per aggregate". The
  orthodox alternative is event sourcing, which does not pay for itself in a week.
- Enforced by a test that fails if anything under `model/` imports an adapter, in CI from day 2.
  Without the guard the discipline degrades under deadline pressure, and the value is all-or-nothing.
