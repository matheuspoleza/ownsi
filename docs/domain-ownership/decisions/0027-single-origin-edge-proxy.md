---
feature: domain-ownership
type: adr
id: ADR-0027
title: Single origin — the edge serves the SPA and proxies the API
status: Accepted
date: 2026-08-21
decided-by: Matheus
relates-to: [ADR-0014, ADR-0020, ADR-0023, ADR-0030]
---

# ADR-0027 — Single origin — the edge serves the SPA and proxies the API

## Status

Accepted.

## Context

Frontend and backend are separate codebases: a Vite SPA and a Bun service. The obvious deployment is
two hostnames — `ownsi.dev` and `api.ownsi.dev` — which immediately costs CORS preflights,
`SameSite=None` cookies, a third-party cookie story that browsers keep tightening, and a managed
certificate on the API subdomain.

There is also the public proof page ([ADR-0030](0030-public-proof-page.md)), which needs real OG tags
to be worth sharing. A pure SPA cannot produce them, and adopting a fullstack framework to solve one
route is not proportionate.

## Decision

One origin. A Cloudflare Worker with Static Assets serves the built SPA **and** reverse-proxies
`/api/*`, `/client/*` and `/p/*` to the service.

## Consequences

- The browser never talks to two hosts, so the session cookie is first-party: no CORS, no
  `SameSite=None`, no API subdomain, no managed certificate.
- `/p/:slug` is rendered by the API and proxied through, so the proof page has real OG tags with no
  fullstack framework and no second rendering stack.
- Static assets are served from the edge, so first paint has no cold start regardless of what the
  origin is doing.
- **This does not move the module boundary.** The Worker is a CDN and reverse proxy, not a third
  module: both server-side modules still ship in the same deploy, exactly as
  [ADR-0023](0023-day-one-abstraction-is-code-not-infra.md) requires.
- **Accepted cost:** one extra network hop on every API call. Measured on day 1 against the origin
  (`../prd.md` §3.16); if it is material, the fallback is separate hostnames and paying the CORS cost.
- CORS still gets exercised for real — by the cross-origin example page of `../prd.md` §3.14, which is
  the only place it should be exercised, since that is what a customer's integration actually looks
  like.
