---
feature: domain-ownership
type: adr
id: ADR-0009
title: Recursive resolvers decide, authoritative nameservers explain
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0012, ADR-0016, ADR-0022]
---

# ADR-0009 — Recursive resolvers decide, authoritative nameservers explain

## Status

Accepted. [ADR-0022](0022-resolver-quorum.md) closes the "how many must agree" gap left open here.

## Context

A verification service can query the domain's authoritative nameservers directly, or go through
public recursive resolvers. The two answer different questions, and the difference between them is
information in itself.

## Decision

Recursive decides, authoritative explains.

- **Verification:** multiple public resolvers over DoH (Google, Cloudflare, Quad9). This is what the
  world sees.
- **Diagnosis:** a query to the domain's authoritative nameservers, fired only on a negative result,
  to separate "you did not create it" from "it has not propagated".

## Consequences

- Market practice for *verification* is recursive — Let's Encrypt, AWS ACM, Search Console,
  Cloudflare — and the CA/B Forum moved to require corroboration from multiple network perspectives.
  The reason is sound: you want to verify what the world sees, not what the source claims. Approving
  from the authoritative would approve someone who has not propagated yet.
- Direct authoritative queries are the practice of a *diagnostic tool* (`dig +trace`,
  dnschecker.org), not of a verification service — which is exactly where they belong here.
- **Degradation:** if UDP/53 egress is unavailable in the runtime, we lose the explanation layer, not
  the verification layer. The product still stands.
- **Risk to validate on day 1:** a 10-line spike confirming UDP/53 egress on the chosen runtime.
  Cloudflare Workers does not support it (DoH only); Vercel/Lambda generally do; a dedicated Node
  server always does.
- **Known edges:** walking labels up to find the real authoritative zone (delegated subzone), CNAME
  chains, lame delegation, nameservers that only answer over TCP, per-server timeout and retry.
