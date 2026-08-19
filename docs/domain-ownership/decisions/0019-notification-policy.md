---
feature: domain-ownership
type: adr
id: ADR-0019
title: Notify on state change only, never on repetition
status: Accepted
date: 2026-08-19
decided-by: Claude (unopposed)
amended-by: [ADR-0021]
---

# ADR-0019 — Notify on state change only, never on repetition

## Status

Accepted. [ADR-0021](0021-webhook-primary-email-optional.md) later added the webhook as the primary
channel; the policy below applies to both channels.

## Context

A verification product has many opportunities to email: every check, every failure, every day a claim
stays pending. Most of them are noise, and some of them are actively wrong.

## Decision

Notify on state change only, never on repetition.

| Event | Notify |
|---|---|
| Console magic link ([ADR-0005](0005-two-level-identity.md)) | yes |
| Proof granted | yes |
| Record disappeared (`absent`) | yes, immediately ([ADR-0013](0013-revocation-with-reversible-grace.md)) |
| Proof revoked after grace | yes |
| Pending, unresolved | nudge on D+1 and D+3, and nothing more ([ADR-0012](0012-pending-hibernates-never-expires.md)) |
| A new account proved your domain | yes ([ADR-0007](0007-coexistence-of-multiple-owners.md)) |
| `unresolvable` | **no** — it is our failure, not theirs ([ADR-0006](0006-events-checks-and-three-valued-outcome.md)) |

## Consequences

- **Anti-spam rule:** at most one email per domain per event type per 24 hours, and no recurring
  "still broken" messages. The grace clock already communicates urgency without repeating itself.
- `unresolvable` never notifies, which keeps our own outages invisible to users who did nothing.
