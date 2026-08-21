---
feature: domain-ownership
type: adr
id: ADR-0002
title: Verified ownership unlocks nothing — it is the product
status: Accepted
date: 2026-08-19
decided-by: Matheus
---

# ADR-0002 — Verified ownership unlocks nothing — it is the product

## Status

Accepted.

## Context

Ownership proof is normally a gate in front of a capability: send email from this domain, serve a
site on it, claim users at it. Picking such a capability would give the flow a reason to exist.

## Decision

Nothing sits behind the proof. Verified ownership **is** the product; no capability is coupled to it.

## Consequences

- This is what the brief literally asks for. Attaching a capability would force us to invent a
  surrounding product just to justify the flow, and would dilute focus on what the brief
  emphasises: understanding the process, failing, and recovering.
- Downstream: no scope inheritance between names ([ADR-0010](0010-name-scope-is-flat.md)), and no
  reason to accept a weaker proof method ([ADR-0003](0003-dns-only-proof-method.md)).
- Success screens have no "next step" to sell, which changes their design.
