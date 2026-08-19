---
feature: domain-ownership
phase: prd
updated: 2026-08-19
---

# Decision records — domain ownership

What this folder is: the decision log for the domain-ownership feature, one Architecture Decision
Record per file. Each ADR states the context that forced the decision, the decision itself, and the
consequences that follow — including the alternatives rejected and why.

These records are the **source of truth**. `../prd.md` is the consequence of them; when the two
disagree, the ADR wins.

Numbering is stable and permanent. An ADR is never edited to say something different — it is
superseded or amended by a later one, and both stay in the folder.

## Status vocabulary

| Status | Meaning |
|---|---|
| Accepted | in force |
| Accepted, revised by ADR-nnnn | still in force, with part of it changed by a later ADR |
| Accepted — resolved in the tech design | a deliberate deferral that has since been closed elsewhere |

## Index

| ADR | Title | Status | Decided by |
|---|---|---|---|
| [0001](0001-generic-ownership-not-sending-domain.md) | Generic ownership proof, not sending-domain verification | Accepted | Matheus |
| [0002](0002-ownership-unlocks-nothing.md) | Verified ownership unlocks nothing — it is the product | Accepted | Matheus |
| [0003](0003-dns-only-proof-method.md) | DNS is the only proof method | Accepted | Matheus |
| [0004](0004-txt-record-on-underscore-host.md) | TXT record on an underscore host, with a stable token | Accepted | Matheus |
| [0005](0005-two-level-identity.md) | Two-level identity — API key for the app, opaque owner for the end user | Accepted, revised by [0020](0020-pluggable-product-not-hosted-app.md) | Matheus |
| [0006](0006-events-checks-and-three-valued-outcome.md) | Two history tables, and a three-valued check outcome | Accepted | Matheus |
| [0007](0007-coexistence-of-multiple-owners.md) | Two accounts proving the same domain coexist, and existing owners are notified | Accepted | Matheus |
| [0008](0008-contest-by-eviction-instructions.md) | "That wasn't me" gives eviction instructions, not arbitration | Accepted | Matheus |
| [0009](0009-recursive-decides-authoritative-explains.md) | Recursive resolvers decide, authoritative nameservers explain | Accepted | Matheus |
| [0010](0010-name-scope-is-flat.md) | Each name is independent — no scope inheritance | Accepted | Claude (unopposed) |
| [0011](0011-check-cadence.md) | Check cadence — `next_check_at` as policy, plus a client fast lane | Accepted | Matheus |
| [0012](0012-pending-hibernates-never-expires.md) | Pending hibernates, never expires | Accepted | Matheus |
| [0013](0013-revocation-with-reversible-grace.md) | Revocation through a 72-hour reversible grace window | Accepted | Matheus |
| [0014](0014-infrastructure-deferred-to-tech-design.md) | Infrastructure deferred to the tech design | Accepted — resolved in `../prd.md` §3.8 | Matheus |
| [0015](0015-provider-specific-setup-instructions.md) | Detect the DNS provider and speak its vocabulary | Accepted | Matheus |
| [0016](0016-active-diagnosis-probe-catalogue.md) | Active diagnosis — probe where the record usually ends up by mistake | Accepted | Matheus |
| [0017](0017-masked-email-disclosure.md) | Show the other account as a masked local part with a visible domain | Accepted | Matheus |
| [0018](0018-archive-and-reclaim.md) | Removal archives, and the add-domain field is the recovery point | Accepted | Matheus |
| [0019](0019-notification-policy.md) | Notify on state change only, never on repetition | Accepted, amended by [0021](0021-webhook-primary-email-optional.md) | Claude (unopposed) |
| [0020](0020-pluggable-product-not-hosted-app.md) | A pluggable product, not a hosted app | Accepted | Matheus |
| [0021](0021-webhook-primary-email-optional.md) | Webhook is the primary notification channel, managed email is optional | Accepted | Claude (unopposed) |
| [0022](0022-resolver-quorum.md) | Resolver quorum — majority of three | Accepted | Claude (unopposed) |
| [0023](0023-day-one-abstraction-is-code-not-infra.md) | Day-one abstraction is code, not infrastructure | Accepted | Matheus |

## Reading order

Reading them in order works, but three clusters carry most of the weight:

- **What the product is:** [0001](0001-generic-ownership-not-sending-domain.md),
  [0002](0002-ownership-unlocks-nothing.md), [0003](0003-dns-only-proof-method.md),
  [0020](0020-pluggable-product-not-hosted-app.md)
- **What happens when it fails:** [0006](0006-events-checks-and-three-valued-outcome.md),
  [0009](0009-recursive-decides-authoritative-explains.md),
  [0012](0012-pending-hibernates-never-expires.md),
  [0013](0013-revocation-with-reversible-grace.md),
  [0016](0016-active-diagnosis-probe-catalogue.md),
  [0022](0022-resolver-quorum.md)
- **Two owners, and undoing mistakes:** [0007](0007-coexistence-of-multiple-owners.md),
  [0008](0008-contest-by-eviction-instructions.md), [0017](0017-masked-email-disclosure.md),
  [0018](0018-archive-and-reclaim.md)

## History

ADR-0001 through ADR-0023 were originally a single decision log file (entries D1–D23)
written in Portuguese during a grilling session on 19 August 2026. They were translated and split one
file per decision on the same date; the identifier `Dn` maps to `ADR-000n` throughout.
