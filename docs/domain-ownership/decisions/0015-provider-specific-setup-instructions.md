---
feature: domain-ownership
type: adr
id: ADR-0015
title: Detect the DNS provider and speak its vocabulary
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0016]
---

# ADR-0015 — Detect the DNS provider and speak its vocabulary

## Status

Accepted.

## Context

Generic instructions ("create a TXT record") hand the user the exact translation step where they
fail: mapping our field names onto their provider's panel.

## Decision

Detect the DNS provider from the NS records at claim time and show instructions adapted to that
panel — the provider's real field names, and the host value already in the format it expects.
About 6 providers covered plus a generic fallback.

## Consequences

- The number one DNS verification error is not conceptual, it is field naming and domain
  auto-appending. Cloudflare calls it "Name", GoDaddy "Host", Route53 "Record name"; some expect
  `_acme-challenge`, others the FQDN — which is where the classic
  `_acme-challenge.acme.com.acme.com` comes from.
- `dig NS` hands us this information for free, before the user types anything.
- **Rejected:** deep links into the provider's panel — URLs change without notice, several require a
  zone id we do not have, and a broken link at setup time is worse than no link at all.
- **Directly addresses:** "make complex setup feel simple" (the brief) and "communicate technical
  setup clearly" (evaluation criterion).
