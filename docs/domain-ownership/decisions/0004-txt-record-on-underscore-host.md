---
feature: domain-ownership
type: adr
id: ADR-0004
title: TXT record on an underscore host, with a stable token
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0007]
---

# ADR-0004 — TXT record on an underscore host, with a stable token

## Status

Accepted.

## Context

Given DNS-only proof ([ADR-0003](0003-dns-only-proof-method.md)), the record type is still open.
CNAME and TXT are both used in the market. CNAME allows the issuer to rotate the target
server-side; TXT carries the token inline.

## Decision

A **TXT** record on an underscore host (`_<app>-challenge.<domain>`), carrying a token that is
stable per (account, domain).

## Consequences

- Proof strength is identical either way: both require a write to the zone, and both detect
  revocation when the record disappears.
- **Coexistence decides it.** RFC 1034 allows a single CNAME per name and forbids a CNAME
  coexisting with other types, while TXT accepts N records on the same host — which is exactly the
  shape of several accounts proving the same domain
  ([ADR-0007](0007-coexistence-of-multiple-owners.md)).
- CNAME's advantage (server-side rotation) only pays off with short-lived tokens, which is not the
  case here.
- **Robustness:** this holds either way. If coexistence were ruled out, CNAME would become possible
  again — but TXT would still be valid. TXT serves both scenarios.
