---
feature: domain-ownership
type: adr
id: ADR-0012
title: Pending hibernates, never expires
status: Accepted
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0009, ADR-0011, ADR-0013, ADR-0018]
---

# ADR-0012 — Pending hibernates, never expires

## Status

Accepted.

## Context

A claim that is never completed has to stop consuming resources at some point. The usual answer is
expiry after 72 hours, which forces a new token — and therefore another trip to the DNS panel.

## Decision

Pending never expires, but it hibernates. Active checking with a decreasing interval for 7 days plus
email nudges on D+1 and D+3; after that it is marked dormant and checking stops, with a [Resume]
action that revives it instantly. The token is preserved.

## Consequences

- The wait can legitimately last days, so expiring at 72 hours would punish exactly the person who
  was right and merely slow — and would force a new token, i.e. another DNS edit.
- Hibernating preserves the state without burning resources indefinitely, and leaves the decision to
  give up with the user.
- Unifies with [ADR-0018](0018-archive-and-reclaim.md): two ways for a claim to stop being checked
  (archived by the user, or hibernated through inactivity), same state machinery, two triggers, both
  one click away from coming back.

## Propagation context (the evidence behind this ADR and [ADR-0011](0011-check-cadence.md))

The "24–72h" number comes from nameserver changes and glue updates at the registrar. Adding a TXT
record to a zone that already exists is a different problem: the delay is bounded by the negative
cache (SOA MINIMUM), typically 300–3600s. **Real median: minutes.**

The long tail is real and has three nameable causes:

1. providers that publish the zone in batches rather than on save;
2. an absurd SOA MINIMUM (86400 = 24h of negative caching);
3. resolvers that ignore TTL.

**The feature:** the authoritative query ([ADR-0009](0009-recursive-decides-authoritative-explains.md))
says which case the user is in.

- authoritative does NOT have it → their provider has not published yet. This is not propagation.
- authoritative HAS it, public resolvers do not → it is negative caching, and we can say how many
  minutes are left.

Fear of the 72 hours is unquantified anxiety. The product quantifies it — and the wait is the
PRIMARY state of the product, not an edge case.
