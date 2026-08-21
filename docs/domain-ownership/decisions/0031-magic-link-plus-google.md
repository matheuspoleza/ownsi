---
feature: domain-ownership
type: adr
id: ADR-0031
title: Magic link and Google, from one self-hosted auth configuration
status: Accepted
date: 2026-08-21
decided-by: Claude (unopposed)
amends: [ADR-0005]
relates-to: [ADR-0020]
---

# ADR-0031 — Magic link and Google, from one self-hosted auth configuration

## Status

Accepted. Amends [ADR-0005](0005-two-level-identity.md) on the hosted app's sign-in, not on the
tenancy model.

## Context

[ADR-0005](0005-two-level-identity.md) settled on magic link for `apps/ownsi`'s own users. The sign-in
wireframe shows both magic link and Google, and a self-hosted auth library delivers both from the same
configuration.

There is also a delivery risk: magic link depends on a verified sending domain on the Resend account
(`../prd.md` §3.16). If that is not in place, magic link alone means nobody gets in.

## Decision

`apps/ownsi` authenticates by magic link (sent through the Resend API) **and** Google OAuth, from one
self-hosted better-auth configuration.

## Consequences

- Removes friction for a reviewer who opens the link at 11pm and does not want to wait for an email.
- Gives the sending-domain risk a second path: if the Resend domain is not verified on day 1, Google
  still gets the reviewer in, and notifications degrade to webhooks
  ([ADR-0021](0021-webhook-primary-email-optional.md)).
- **None of this reaches the core.** These are `apps/ownsi`'s users; the core still knows only an
  opaque `owner` ([ADR-0020](0020-pluggable-product-not-hosted-app.md)). The auth library's schema
  lives behind an anticorruption layer for the same reason
  ([ADR-0026](0026-core-domain-is-diagnosis-and-recovery.md)).
- Self-hosted rather than a managed offering because sending the magic link through the Resend API is
  a product decision in a Resend take-home, not an implementation detail to delegate.
- **Reversal cost:** dropping Google removes a set of Google Console credentials, about an hour of
  setup.
