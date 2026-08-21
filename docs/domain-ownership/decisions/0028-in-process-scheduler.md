---
feature: domain-ownership
type: adr
id: ADR-0028
title: The scheduler is in-process, not a durable-workflow vendor
status: Accepted
date: 2026-08-21
decided-by: Matheus
relates-to: [ADR-0011, ADR-0012, ADR-0014, ADR-0027]
---

# ADR-0028 — The scheduler is in-process, not a durable-workflow vendor

## Status

Accepted.

## Context

[ADR-0012](0012-pending-hibernates-never-expires.md) promises an email arrives with the tab closed,
and the pending screen promises "next check in 22s". Both need per-domain scheduling with
second-level granularity — finer than a cron tick.

A durable-workflow vendor (Inngest and equivalents) answers this directly with a per-domain
`step.sleep`, and was the leading option while the API was assumed to be serverless: on serverless, a
fixed cron tick is the floor, so buying scheduling as a service is the only way to get below it.

That assumption did not survive. [ADR-0014](0014-infrastructure-deferred-to-tech-design.md) already
required a long-running process for two independent reasons — UDP/53 egress to authoritative
nameservers, and no spin-down for a reviewer arriving at an arbitrary hour.

## Decision

No scheduling vendor. `next_check_at` in Postgres is the queue, dequeued atomically with
`SELECT … FOR UPDATE SKIP LOCKED`, and the long-running process keeps an in-memory timer pointing at
the next due domain, re-hydrating from the database on boot. A 60s tick runs underneath as a safety
net, not as the primary mechanism.

## Consequences

- Second-level granularity with no vendor: once the process is long-running for reasons it already
  had, an in-memory timer is strictly cheaper than an external clock.
- **One clock per domain** falls out of the dequeue itself — `SKIP LOCKED` means two workers never
  take the same row, and the row *is* the clock. A vendor would have enforced the same invariant with
  a concurrency key, which is a configuration line that can silently be wrong.
- Job state and domain state live in the same transaction, so the dual write that
  [ADR-0011](0011-check-cadence.md) rejected Redis over never appears here either.
- Pausing and archiving take effect on the next wake-up: the worker re-reads the domain at the top of
  every pass and exits. The UI reflects the new state immediately regardless, because it reads the
  database, not the scheduler.
- **Accepted cost:** a crash between dequeue and write loses at most one check, recovered by the 60s
  safety tick. A durable workflow would have replayed it. For a check that is idempotent and
  re-runnable, that guarantee is not worth a vendor.
- **What would change this:** more than one API instance, or checks that stop being idempotent. The
  README says so, alongside the Redis threshold.
