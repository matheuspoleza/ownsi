---
feature: domain-ownership
type: adr
id: ADR-0013
title: Revocation through a 72-hour reversible grace window
status: Accepted, amended by ADR-0024
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0006, ADR-0012]
---

# ADR-0013 — Revocation through a 72-hour reversible grace window

## Status

Accepted, **amended** by [ADR-0024](0024-grace-advances-only-on-real-recheck.md): the window below
stands as designed, but its clock only advances on a check that actually ran.

## Context

Once a domain is proved, the TXT record may disappear. Revoking on the first negative check, or
never revoking at all, are the two extremes.

## Decision

A 72-hour reversible grace window. An `absent` result sends an email immediately and opens 72 hours
during which the domain remains valid but carries a visible warning; after the deadline the proof
stops counting. It returns to valid on its own if the record reappears, at any time, with no new
token.

## Consequences

- Symmetric to the pending side ([ADR-0012](0012-pending-hibernates-never-expires.md)) and tolerant
  of transient failure, which is the majority case.
- Revoking on the first check would turn any instability into a revocation — exactly the failure mode
  that the `absent` vs `unresolvable` distinction
  ([ADR-0006](0006-events-checks-and-three-valued-outcome.md)) exists to prevent.
- Never revoking would mislead: a 2024 proof whose record vanished 18 months ago should not still
  stand, because domains change hands.
- **Invariant:** only `absent` advances the grace clock. `unresolvable` never does.
- **Consistency with [ADR-0006](0006-events-checks-and-three-valued-outcome.md):** the historical
  event "proved on 12 Mar" stays in the log forever. What expires is the *current validity* of the
  proof, not the record that it happened.
