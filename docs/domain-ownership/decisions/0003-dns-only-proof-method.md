---
feature: domain-ownership
type: adr
id: ADR-0003
title: DNS is the only proof method
status: Accepted
date: 2026-08-19
decided-by: Matheus
supersedes: []
relates-to: [ADR-0002]
---

# ADR-0003 — DNS is the only proof method

## Status

Accepted. Follows from [ADR-0002](0002-ownership-unlocks-nothing.md).

## Context

Three proof methods are common in the market: a DNS record, an email to a role address
(`admin@`, `postmaster@`), and an HTML file served from the domain. Offering several is usually
framed as flexibility.

## Decision

DNS only. Role-address email and HTML file are documented non-goals.

## Consequences

- Writing to the DNS zone is the root of control. Email proves the MX and a file proves the web
  server — both are *delegations the zone owner can fabricate*, never the other way round.
- With no capability behind the proof ([ADR-0002](0002-ownership-unlocks-nothing.md)), there is no
  scope that would justify a weaker proof, so the correct default is the strongest one and only it.
- Supporting evidence: Let's Encrypt never implemented email validation (only DNS-01 and HTTP-01),
  and the CA/B Forum has progressively restricted the email method.
- **Derived principle:** the strength of a proof has to match what it unlocks.
