---
feature: domain-ownership
type: adr
id: ADR-0005
title: Two-level identity — API key for the app, opaque owner for the end user
status: Accepted, revised by ADR-0020, amended by ADR-0031
date: 2026-08-19
decided-by: Matheus
amended-by: [ADR-0020]
---

# ADR-0005 — Two-level identity — API key for the app, opaque owner for the end user

## Status

Accepted, **revised** by [ADR-0020](0020-pluggable-product-not-hosted-app.md), and **amended** by
[ADR-0031](0031-magic-link-plus-google.md) on how `apps/ownsi` signs its own users in. The superseded
version is recorded at the bottom of this ADR.

## Context

The original decision was: "magic link by email; the email is the account identity." When
[ADR-0020](0020-pluggable-product-not-hosted-app.md) turned the product into something integrators
embed, that put a second sign-up in the end user's path — the app already knows who they are.

## Decision

Identity has two levels.

- The **API key** (`sk_live_…`) identifies the integrating app. That is the account of the product.
- The **`owner`** field, an opaque string chosen by the app (their own user id), identifies the end
  user. The end user has **no sign-up** here: no password, no magic link, no session.
- The **magic link via the Resend API** survives inside `apps/ownsi`, where the person signing in is
  the developer.
- The browser component carries a **client token per claim** (signed JWT, 30 minutes, scoped to
  read + recheck a single claim). The secret key never leaves the app's server.

## Consequences

- **Why the revision.** With the integrating app identifying its own user, a sign-up of ours in the
  end user's path would be a second identity for the same person — pure friction, and a step
  neither Clerk nor Resend asks for. The change *removes* a sign-up from the critical path instead
  of adding one.
- **Why a client token per claim rather than a publishable key.** A global publishable key would
  later force us to invent a notion of session, to know *which* claim a given browser may read. The
  per-claim token already is that answer with one primitive fewer — it is born from `create`,
  carries the `domain_id`, permits two operations, and is verified without a database round trip.
- **Where the magic link lives:** in `apps/ownsi`, not in the core. Ownsi is a real product with
  returning users, so it authenticates its own users by magic link and passes `owner: user.id` to
  the core, exactly as any integrator would. It is one account: you sign in to the product by magic
  link, and anyone who wants to embed picks up an API key in settings. **The core still has no
  users.**
- **What survived from the previous version:** the Resend sending pipe is still required (coexistence
  notifications, [ADR-0007](0007-coexistence-of-multiple-owners.md) /
  [ADR-0019](0019-notification-policy.md)) and is still what authenticates the Ownsi user. So is the
  prerequisite: it needs a verified domain of our own on the Resend account, because
  `onboarding@resend.dev` only delivers to the account owner. **Confirm on day 1 — it blocks console
  login and every notification.**
- **Superseded version, recorded so it is not lost:** *"Magic link by email; the email is the
  account identity."* The reviewer isolation it gave on the public deploy survives intact — each
  reviewer signs in to `apps/ownsi` and becomes a distinct `owner`. What changed is the layer where
  that happens.
