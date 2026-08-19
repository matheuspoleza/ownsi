---
feature: domain-ownership
type: adr
id: ADR-0006
title: Two history tables, and a three-valued check outcome
status: Accepted
date: 2026-08-19
decided-by: Matheus
---

# ADR-0006 — Two history tables, and a three-valued check outcome

## Status

Accepted. The three-valued outcome is an invariant relied on by
[ADR-0013](0013-revocation-with-reversible-grace.md), [ADR-0019](0019-notification-policy.md) and
[ADR-0022](0022-resolver-quorum.md).

## Context

History could be modelled as state columns on the domain row, as a single log of check runs, or as
separate streams. The product needs both a human-readable timeline and raw evidence for debugging.

## Decision

Two tables, not state columns.

- **`domain_events`** — semantic product events (claimed, proof granted, record disappeared, proof
  revoked, recheck requested, owner notified, another account claimed). Low volume, human-readable,
  retained permanently, feeds the UI timeline.
- **`dns_checks`** — append-only log of every check with raw evidence (what was queried, what came
  back, which resolver, latency, TTL). High volume, 30–90 day retention, the material for debugging
  and diagnosis.

## Consequences

- The product timeline is not merely "DNS state over time" — it holds events that are not checks
  (notification sent, manual recheck, competing claim). Collapsing check runs would model only the
  DNS axis. Different audiences, volumes and retention justify the split.
- **Sub-decision (taken by Claude, unopposed):** semantic events (`proof.revoked`) instead of
  `from → to` transitions — they carry more information, render directly as a timeline, and allow
  events that change no state.
- **Critical invariant:** a check outcome has THREE values — `found` / `absent` / `unresolvable`.
  Collapsing `unresolvable` into `absent` makes *our* infrastructure outage revoke domains of users
  who did nothing. The grace clock only advances on `absent`.
- **Known risk:** drift between the two tables. Mitigation: the event is emitted in the same
  transaction as the check write path; `dns_checks` is the source of truth if they diverge.
