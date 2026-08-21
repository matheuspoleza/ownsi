---
feature: domain-ownership
type: adr
id: ADR-0026
title: The core domain is diagnosis and recovery, not the proof
status: Accepted
date: 2026-08-21
decided-by: Matheus
relates-to: [ADR-0001, ADR-0016, ADR-0018, ADR-0025]
---

# ADR-0026 — The core domain is diagnosis and recovery, not the proof

## Status

Accepted.

## Context

Deciding what the core domain is decides where the modelling effort goes. Proving ownership is close
to commodity: generate a token, have it written as TXT, read it back. The brief asks for two further
things — understand the failure, and recover from mistakes — and that is where the differentiation
lives.

## Decision

The core domain is **diagnosis and recovery**.

| Context | Kind |
|---|---|
| `claims`, `dns` | core |
| `providers`, `attestation` | supporting |
| `identity`, `notifications`, `scheduling` | generic |

`Domain` is the shared kernel. `claims` → `dns` is Customer–Supplier with a published language
(`DnsObservation`, `Diagnosis`); `dns` → `providers` is an Open Host Service; `claims` → `identity`
is an anticorruption layer — our model never knows the auth library's `User`, because the library
versions its own schema.

**Naming:** `Domain`, not `DomainName`, despite the collision with DDD's own vocabulary. The brief
says "claim a domain" and "prove ownership of a domain", and the brief is the ubiquitous language.
What yields is the folder — `model/` instead of `domain/`. "Claim" survives as a verb
(`claimDomain`), not as a noun.

**Use cases are named after the brief's verbs:** `claimDomain`, `verifyDomain`, `diagnose`,
`recoverDomain`.

## Consequences

- A rich model and exhaustive tests in `Diagnosis`; the bare minimum in claim CRUD. The effort
  follows the differentiation.
- `recoverDomain` unifies [ADR-0012](0012-pending-hibernates-never-expires.md) (hibernation) and
  [ADR-0018](0018-archive-and-reclaim.md) (archiving), which are today two mechanisms with the same
  outcome. One use case, one set of tests.
- **Coexistence did not become a context.** It is a query crossing accounts, not an aggregate, so it
  stays a domain service inside `claims`. Splitting it would produce a prettier map and worse code.
- Value objects carry rules that would otherwise leak into views: `Domain.parse` returns the list of
  normalisations it applied, because the "Add domain" modal shows what was stripped; `MaskedEmail`
  encodes the privacy rule of [ADR-0017](0017-masked-email-disclosure.md) rather than formatting a
  string in a component.
