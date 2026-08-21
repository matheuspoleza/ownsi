---
feature: domain-ownership
type: adr
id: ADR-0010
title: Each name is independent — no scope inheritance
status: Accepted
date: 2026-08-19
decided-by: Claude (unopposed)
relates-to: [ADR-0002]
---

# ADR-0010 — Each name is independent — no scope inheritance

## Status

Accepted. Decided by Claude, unopposed.

## Context

Many products treat proof of `acme.com` as covering `app.acme.com`. That inheritance is only
meaningful if something is scoped to the name.

## Decision

Each name is independent. Proving `acme.com` grants nothing over `app.acme.com`.

## Consequences

- Follows from [ADR-0002](0002-ownership-unlocks-nothing.md): with no coupled capability, inheritance
  has no payoff, so it would only add an assertion without consequence. If a scoped capability ever
  exists, inheritance returns to the table.
- **Input guards:** normalise the input (punycode/IDN, trailing dot, uppercase, a pasted `http://`,
  `www.`, path, port) and **warn — never block** on public suffixes via the Public Suffix List
  ("`co.uk` is a public suffix; you probably meant something.co.uk").
- The warning is not a security control: the proof protects itself, because nobody can write a TXT
  record in the zone of `github.io`.
