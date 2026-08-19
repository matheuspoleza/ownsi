---
feature: domain-ownership
type: adr
id: ADR-0017
title: Show the other account as a masked local part with a visible domain
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0007]
---

# ADR-0017 — Show the other account as a masked local part with a visible domain

## Status

Accepted.

## Context

Given coexistence ([ADR-0007](0007-coexistence-of-multiple-owners.md)), each account learns that
others exist. How much of the other account's identity to disclose is a privacy/utility trade.

## Decision

An account sees that others exist, with the date of their proof and the email formatted as
`m•••@acme.com` — local part masked, domain revealed.

## Consequences

- The email's domain is exactly the recognition signal (`m•••@acme.com` is your team;
  `r•••@gmail.com` is cause for alarm), and the local part is personal identity that need not leak.
- Masking the domain too (`m•••@•••.com`) would hide the only useful bit.
- Full transparency would hand the real team member's named address to whoever proved first —
  including an attacker, who would gain a phishing target.
