---
feature: domain-ownership
type: adr
id: ADR-0011
title: Check cadence — next_check_at as policy, plus a client fast lane
status: Accepted, extended by ADR-0028
date: 2026-08-19
decided-by: Matheus
relates-to: [ADR-0012, ADR-0014]
---

# ADR-0011 — Check cadence: `next_check_at` as policy, plus a client fast lane

## Status

Accepted. [ADR-0028](0028-in-process-scheduler.md) later settled *what holds the clock* — an
in-process timer over this same `next_check_at`, with no scheduling vendor.

## Context

Pending claims must be rechecked on some schedule. Two axes are in play: how the backend paces
itself with the tab closed, and how fast the UI can react with the tab open.

## Decision

`next_check_at` as the central policy, plus a fast lane on the client.

- **Policy:** a `next_check_at` column derived from (state, claim age, observed TTL / SOA MINIMUM,
  consecutive failures), drained by a fixed-tick cron. The cron has no variable interval — the tick
  is only the floor of the resolution.
- **Primary signal:** the SOA MINIMUM field (RFC 2308) states exactly how long a "does not exist"
  stays in negative cache. `next_check_at = now() + SOA.minimum` is derived, not guessed — and turns
  into a UI sentence ("resolvers forget the 'does not exist' in about 5 min").
- **Fast lane:** with the tab open, the client calls the check endpoint directly (backoff guided by
  the same SOA), rate limited per account+domain. The cron handles background health.

## Consequences

- **Why a client fast lane rather than pushing `next_check_at` forward:** pushing the date requires a
  fine-grained cron (on Vercel Hobby the tick is daily, which kills the option) and *adds* an async
  layer on the client to receive the result, instead of removing one.
- The genuine win of the alternative is a smaller abuse surface (one idempotent UPDATE vs N DNS
  queries), which would matter in production under hostile traffic — here rate limiting solves it at
  the level required.
