---
feature: domain-ownership
type: adr
id: ADR-0008
title: "\"That wasn't me\" gives eviction instructions, not arbitration"
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0007]
---

# ADR-0008 — "That wasn't me" gives eviction instructions, not arbitration

## Status

Accepted.

## Context

Given coexistence ([ADR-0007](0007-coexistence-of-multiple-owners.md)), an owner who did not
recognise the new account needs a remedy. Candidates: automatically freeze the new proof, arbitrate
who the legitimate owner is, or tell the contester how to remove the other proof themselves.

## Decision

Eviction instructions. The product shows which TXT record to delete from your own zone to bring down
the other account's proof, triggers an immediate recheck, and records the dispute on the timeline of
both sides.

## Consequences

- The product cannot arbitrate ownership — both accounts demonstrated control of the zone, and no UI
  changes that. But whoever controls the zone *right now* can delete the other's TXT, so the remedy
  lives at the same root of trust as the proof. It is the only option that resolves through the real
  mechanism instead of inventing an authority.
- Automatic freezing would hand a veto to whoever claimed first (including an attacker) and would
  punish the legitimate case.
- **UI detail:** show the other account's token in FULL, unmasked. It is already publicly queryable
  in the contester's own zone via `dig`, so masking protects nothing and only makes it harder to
  identify which record to delete.
- **Edge message:** if the contester cannot remove the record, someone else controls their DNS — and
  that is the urgent problem, not the app. The product says so explicitly.
