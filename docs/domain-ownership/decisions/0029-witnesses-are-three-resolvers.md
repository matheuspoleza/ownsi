---
feature: domain-ownership
type: adr
id: ADR-0029
title: Witnesses are three independent resolvers, not six continents
status: Accepted
date: 2026-08-21
decided-by: Claude (unopposed)
amends: [ADR-0022]
relates-to: [ADR-0009]
---

# ADR-0029 — Witnesses are three independent resolvers, not six continents

## Status

Accepted. Amends [ADR-0022](0022-resolver-quorum.md) on copy, not on mechanism.

## Context

The wireframes show a world map and the phrase "resolvers across six continents". The quorum decided
in [ADR-0022](0022-resolver-quorum.md) is three public resolvers — Google, Cloudflare and Quad9 —
queried over DoH from a single region.

Those two are not the same claim. DoH from one server is not a multi-continent measurement, whatever
the anycast network behind the resolver does.

## Decision

Keep the mechanism of [ADR-0022](0022-resolver-quorum.md): three independent resolvers, majority
rule, from one region. Rewrite the copy. The world map illustrates anycast — one address answered by
many locations — not our own geographic distribution.

## Consequences

- The product stops asserting something its architecture does not deliver. That is exactly the kind of
  detail a technical reviewer checks.
- What the three resolvers genuinely provide stays true and is worth saying: three **independent
  operators**, so one poisoned or lagging view cannot decide the outcome on its own.
- **Reversal cost:** real fan-out across three regions with aggregation is roughly one day, and it
  would make the original copy accurate. Nothing about the quorum rule would change.
