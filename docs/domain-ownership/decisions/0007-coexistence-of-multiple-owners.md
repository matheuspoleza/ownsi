---
feature: domain-ownership
type: adr
id: ADR-0007
title: Two accounts proving the same domain coexist, and existing owners are notified
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0004, ADR-0008, ADR-0017]
---

# ADR-0007 — Two accounts proving the same domain coexist, and existing owners are notified

## Status

Accepted.

## Context

Once a domain is proved by one account, a second account may prove the same domain. The options are:
transfer (one wins, the other loses), approval (the existing owner must consent), or coexistence.

## Decision

They coexist. Existing owners are notified when a new account proves the same domain — with the
date, the new account's masked email, the method, and a path to "that wasn't me".

## Consequences

- With a token per account ([ADR-0004](0004-txt-record-on-underscore-host.md)), coexistence falls
  out of the mechanism: both accounts prove independent and true facts, and legitimate cases are
  common (agency/client, staging/prod).
- Approval by the existing owner would block those cases behind someone who may never answer — and
  the "existing owner" could be precisely whoever proved first, hostilely.
- The notification is cheap and covers the scenario that matters: compromised DNS, an expired and
  re-registered domain, a former employee.
- Requires a dispute path ([ADR-0008](0008-contest-by-eviction-instructions.md)) and a disclosure
  policy ([ADR-0017](0017-masked-email-disclosure.md)).
