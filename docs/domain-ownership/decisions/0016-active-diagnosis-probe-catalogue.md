---
feature: domain-ownership
type: adr
id: ADR-0016
title: Active diagnosis — probe where the record usually ends up by mistake
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0009, ADR-0015]
---

# ADR-0016 — Active diagnosis: probe where the record usually ends up by mistake

## Status

Accepted.

## Context

When the record is not found at the expected host, most products stop at "not found" and hand the
user the raw evidence. Raw evidence requires the user to read DNS — which is precisely the user who
is *not* stuck.

## Decision

On not finding the record at the expected host, fire queries at the places where it usually ends up
by mistake, and name the specific cause with the exact fix.

## Consequences

- Each classic error has a different explanation and a different repair. These are a handful of
  extra queries — the best return per line of code in the project.
- Every probe returns `{ code, cause, fix, observed }`. The `code` is stable and enumerable, and is
  the same contract the headless hook and the public API expose.

### Probe catalogue

| Probe | What it means | The fix the product gives |
|---|---|---|
| `_acme-challenge.acme.com.acme.com` | the registrar auto-appended the domain | "use only `_acme-challenge` in the Host field" |
| TXT at the apex `acme.com` carrying the token | pasted in the wrong place | "move it to the `_acme-challenge` subhost" |
| Right host, old token / another account's token | leftover from a previous claim | "that token is not yours; replace it with…" |
| Token with quotes / whitespace / a prefix | the panel added formatting | shows the exact value expected vs received |
| N TXT records, none matching | created alongside the existing ones, wrongly | lists what was found, points at the difference |
| CNAME on the challenge host | conflicts with TXT (RFC 1034) | "remove the CNAME; one name cannot hold both" |
| **NXDOMAIN vs NODATA** | the name does not exist vs exists without TXT | "nothing was created" vs "you created a different record type" |
| `_acme-challenge.www.acme.com` | confusion with `www` | "the record goes on the domain, not on www" |
| Authoritative does not have it | the provider has not published the zone | "this is not propagation — did you actually save?" |
| Authoritative has it, public resolvers do not | negative caching | quantified from SOA MINIMUM ([ADR-0009](0009-recursive-decides-authoritative-explains.md) / [ADR-0012](0012-pending-hibernates-never-expires.md)) |
| SERVFAIL | DNSSEC failure or broken zone | distinguish it from "does not exist" |
| Nameservers do not answer | lame delegation | a problem at their provider, not with the record |

**Note:** NXDOMAIN vs NODATA is the distinction almost no product surfaces, and one of the most
useful — it separates "you created nothing" from "you created the wrong record".
