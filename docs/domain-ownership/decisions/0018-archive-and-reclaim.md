---
feature: domain-ownership
type: adr
id: ADR-0018
title: Removal archives, and the add-domain field is the recovery point
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0007, ADR-0012, ADR-0017]
---

# ADR-0018 — Removal archives, and the add-domain field is the recovery point

## Status

Accepted.

## Context

The brief explicitly asks the product to help users *recover from mistakes*. The most common mistake
is deleting a domain by accident, and the standard designs — hard delete, or a soft delete behind an
"Archived" section — either destroy the work or require the user to know the archive exists.

## Decision

Removal takes the domain out of the main list and moves it to a separate archived list, with the
token and history preserved.

- **Recovery point:** the add-domain field autocompletes over archived domains. Find one and the
  action is **"Reactivate and recheck"**, not a new claim.
- **Effect:** because the token is the same, if the TXT is still in the zone the verification is
  instantaneous — the user never touches DNS.
- An archived domain stops being checked and stops counting as coexistence for other accounts
  ([ADR-0007](0007-coexistence-of-multiple-owners.md) /
  [ADR-0017](0017-masked-email-disclosure.md)).
- "Delete permanently" exists for whoever genuinely wants to disappear.

## Consequences

- Turns the most common mistake ("I deleted it by accident") into a non-event, which is literally
  what the brief asks for under *recover from mistakes*.
- Putting the recovery in the add-domain autocomplete beats an archived section, because it does not
  require the user to know an archive exists — the recovery appears at the moment of intent.
- **Unifies with [ADR-0012](0012-pending-hibernates-never-expires.md):** two ways for a claim to stop
  being checked — archived by the user, or hibernated through inactivity. Same state machinery, two
  triggers, both one click away from coming back.
