---
feature: domain-ownership
type: adr
id: ADR-0030
title: Public proof is an on-demand link with its own slug
status: Accepted
date: 2026-08-21
decided-by: Claude (unopposed)
relates-to: [ADR-0002, ADR-0004, ADR-0024, ADR-0027]
---

# ADR-0030 — Public proof is an on-demand link with its own slug

## Status

Accepted.

## Context

[ADR-0002](0002-ownership-unlocks-nothing.md) says verified ownership unlocks nothing — it *is* the
product. If that is true, the proof has to be shareable, or it is a fact trapped inside one dashboard.
The wireframes carry a `04 Public proof` group designing exactly that.

## Decision

A public proof page, as designed:

- The link is created **on demand** ("Create a public link"), not minted with every domain.
- Its own `slug` — **not** the DNS token.
- Expires in 7 days.
- Rechecks when opened, with a 60s cache per slug and a rate limit.

## Consequences

- The proof becomes a shareable artefact, which is what [ADR-0002](0002-ownership-unlocks-nothing.md)
  implies the product is for.
- **The slug is separate from the token because they are different things.** One identifies a page;
  the other is the secret published in the zone
  ([ADR-0004](0004-txt-record-on-underscore-host.md)). Overloading the token would leak the zone
  secret into every shared URL and couple page revocation to re-proving the domain.
- Recheck-on-open is also what keeps [ADR-0024](0024-grace-advances-only-on-real-recheck.md) honest:
  a shared proof is checked at the moment somebody looks at it, which is the moment accuracy matters.
- The 60s cache and the rate limit are what stop a shared link from becoming an open DNS resolver
  driven by strangers.
- The page is server-rendered by the API and proxied through the edge, so it carries real OG tags
  ([ADR-0027](0027-single-origin-edge-proxy.md)).
- **Reversal cost:** a permanent link removes the expiry clock (about half a day less work); cutting
  the feature removes the `04 Public proof` group entirely and the proof reverts to an internal screen.
