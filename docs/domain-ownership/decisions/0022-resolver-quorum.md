---
feature: domain-ownership
type: adr
id: ADR-0022
title: Resolver quorum — majority of three
status: Accepted
date: 2026-08-19
decided-by: Claude (unopposed)
relates-to: [ADR-0009]
---

# ADR-0022 — Resolver quorum: majority of three

## Status

Accepted. Decided by Claude, unopposed. Closes a gap left by
[ADR-0009](0009-recursive-decides-authoritative-explains.md).

## Context

[ADR-0009](0009-recursive-decides-authoritative-explains.md) defined *which* resolvers to query, not
*how many have to agree*. The options are any-of, majority, or unanimity.

## Decision

Majority of three (Google, Cloudflare, Quad9).

| Result | Effect |
|---|---|
| ≥2 of 3 `found` | grant the proof |
| exactly 1 `found` | stays pending, and the UI says "published, still spreading" |
| ≥2 of 3 `absent` | open the grace clock ([ADR-0013](0013-revocation-with-reversible-grace.md)) |
| ≥2 of 3 fail | `unresolvable` — counts against nobody, notifies nobody, advances no clock ([ADR-0006](0006-events-checks-and-three-valued-outcome.md)) |

## Consequences

- Unanimity would delay someone who has already published, because of cache skew that is normal and
  expected.
- "Any one will do" would accept the view of a single, possibly poisoned resolver, against the
  multi-perspective corroboration the CA/B Forum moved to require
  ([ADR-0009](0009-recursive-decides-authoritative-explains.md)).
- The 1-of-3 case is information, not an error: it is propagation happening, and it becomes a UI
  state instead of a blind wait.
