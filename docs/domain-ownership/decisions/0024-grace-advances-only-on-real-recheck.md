---
feature: domain-ownership
type: adr
id: ADR-0024
title: The grace clock advances only on a check that actually ran
status: Accepted
date: 2026-08-21
decided-by: Matheus
amends: [ADR-0013]
relates-to: [ADR-0006, ADR-0011, ADR-0019]
---

# ADR-0024 — The grace clock advances only on a check that actually ran

## Status

Accepted. Amends [ADR-0013](0013-revocation-with-reversible-grace.md), which stays in force in every
other respect.

## Context

[ADR-0013](0013-revocation-with-reversible-grace.md) designed a 72-hour reversible grace window for a
proof whose TXT record disappears. Implementing it as written requires continuous monitoring: a cron
sweeping every verified domain, retention for the results, a restoration path, and an anti-spam
ceiling on the two emails it generates.

The brief asks for four things — prove ownership, understand the verification, understand the
failure, recover from mistakes. None of the four requires re-checking a domain that has already been
proved. The cost of continuous monitoring is real and none of it demonstrates any of the four verbs.

The opposite extreme is worse: never revoking would leave a 2024 proof standing on a record that
vanished 18 months ago, which is the misleading outcome ADR-0013 exists to prevent.

## Decision

The grace window of [ADR-0013](0013-revocation-with-reversible-grace.md) exists and behaves exactly
as designed — but the clock only advances when a check **actually runs**: a manual recheck, or a
check triggered by someone opening the public proof page
([ADR-0030](0030-public-proof-page.md)).

| | |
|---|---|
| **Stays** | Polling while a claim is pending ([ADR-0011](0011-check-cadence.md), [ADR-0012](0012-pending-hibernates-never-expires.md)). That is the single verification happening, not monitoring: DNS is not instantaneous |
| **Stays** | Manual recheck in any state, verified included. Same code path, zero marginal cost, and it answers "is this still true?" without a cron |
| **Stays** | The `Record disappeared` and `Proof expired` screens, and the `at_risk` derived status |
| **Goes** | Any timer over verified domains, and the two emails that only a timer could send ([ADR-0019](0019-notification-policy.md)) |

## Consequences

- The product does not revoke on its own. It tells the truth whenever it is asked.
- **Accepted cost:** an old proof whose record was removed keeps showing as proved until somebody asks
  for a recheck. The mitigation is language, not mechanism: the verified screen dates the
  confirmation (`Confirmed 12 Mar`) instead of asserting that it is true right now.
- Removing the timer removes the failure mode ADR-0013 was most exposed to — a policy applied by a
  clock nobody is watching. What remains is the same policy applied to evidence that was just
  gathered.
- **Invariant, testable:** no code path advances `grace_started_at` without a `dns_checks` row written
  in the same transaction.
- **Reversal cost:** restoring continuous monitoring is roughly one day — a cron over verified
  domains, the retention it implies, and two new emails with their anti-spam ceiling. Nothing in
  ADR-0013 is invalidated by this amendment; it is deferred, not rejected.
- The specific calibration here — grace exists, but only real checks move it — was assumed without
  confirmation. It is listed in `../prd.md` §3.17 with its reversal cost for that reason.
