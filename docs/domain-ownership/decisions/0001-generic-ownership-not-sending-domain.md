---
feature: domain-ownership
type: adr
id: ADR-0001
title: Generic ownership proof, not sending-domain verification
status: Accepted
date: 2026-08-19
decided-by: Matheus
---

# ADR-0001 — Generic ownership proof, not sending-domain verification

## Status

Accepted.

## Context

The take-home brief reads: *"Build a product experience that helps a user prove ownership of a
domain, understand the verification process, when it fails, and recover from mistakes."*

Because the brief comes from Resend, the obvious move is to model a sending domain — DKIM, SPF,
DMARC, MX — and reuse the shape of Resend's own product.

## Decision

Build generic ownership proof. Do **not** model a sending domain (DKIM/SPF/DMARC).

## Consequences

- The brief says "prove ownership of a domain", not "verify a sending domain", and it never
  references Resend's product. Modelling DKIM/SPF would solve a problem nobody asked for.
- Depth has to come from somewhere else. Agreed substitute: depth comes from **failure states and
  proof methods**, not from more DNS records — which keeps the scope generic.
- Sending-domain records are listed as an explicit non-goal in the PRD.
