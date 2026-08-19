---
feature: domain-ownership
type: adr
id: ADR-0021
title: Webhook is the primary notification channel, managed email is optional
status: Accepted
date: 2026-08-19
decided-by: Claude (unopposed)
amends: [ADR-0019]
relates-to: [ADR-0005, ADR-0020]
---

# ADR-0021 — Webhook is the primary notification channel, managed email is optional

## Status

Accepted. Decided by Claude, unopposed, as a consequence of
[ADR-0020](0020-pluggable-product-not-hosted-app.md). Amends
[ADR-0019](0019-notification-policy.md), whose policy still governs both channels.

## Context

[ADR-0019](0019-notification-policy.md) assumed we email the end user directly. After
[ADR-0020](0020-pluggable-product-not-hosted-app.md) and the revision of
[ADR-0005](0005-two-level-identity.md), the end user is the app's customer, not ours — and we may not
even have their address.

## Decision

The primary channel becomes a **webhook to the integrating app** (`domain.verified`,
`domain.record_missing`, `domain.revoked`, `domain.claimed_by_other`). Email straight to the end user
becomes optional: it turns on when the app passes `ownerEmail` on the claim, and goes out through the
Resend API.

## Consequences

- Infrastructure delivers the fact to whoever integrated and leaves the decision to communicate with
  them — the pattern of Clerk and of Resend itself.
- Keeping managed email as an option preserves the whole of
  [ADR-0019](0019-notification-policy.md)'s policy and the case where an app does not want to build
  that piece.
- **Invariant preserved:** `unresolvable` generates neither a webhook nor an email. It is our failure
  ([ADR-0006](0006-events-checks-and-three-valued-outcome.md)).
