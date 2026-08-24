---
feature: branding
phase: prd
updated: 2026-08-19
---

# Branding — ownsi

What this file is: the visual reference for the **ownsi** brand, the domain ownership proof product
specified in `docs/domain-ownership/prd.md`. Use these values in any UI, doc or presentation for the
product — do not invent a colour, typeface or logo variation outside this file.

Canonical image: `docs/branding/ownsi-brand-reference.png` (the full brand sheet).

---

## Brand

- **Name:** ownsi
- **Tagline:** *Prove what's yours.*
- **Short signature:** *Own it. See it. Prove it.* (footer variant: *See it. Prove it. Own it.*)
- **Domain:** ownsi.dev
- **Pitch:** ownsi helps you prove ownership of any digital resource through DNS verifications that
  are simple, transparent and reliable. Quick to integrate, easy to trust.

## Symbol

A standing meerkat (a sentinel) plus the idea of watching. It stands for vigilance, curiosity and
reliability — the posture of someone who pays attention and takes responsibility for what is theirs.

Variations:

| Variation | When to use it |
|---|---|
| **Primary** (horizontal: symbol + wordmark) | Default use in materials, site, presentations |
| **Stacked** (symbol above the wordmark) | Narrow or vertical spaces |
| **Verified seal** (meerkat inside a shield) | Inside the product, to indicate completed verification / trust |

Usage rules:

- **Clear space:** always keep a minimum breathing area around the mark.
- **Minimum size:** 16px for the icon on its own (favicon, avatar); 120px for the full logo in
  digital use.

## Logo files

All logo files live in `docs/branding/assets/`. Black artwork on a transparent canvas — for a dark
surface, invert the whole asset rather than recolouring parts of it.

| File | What it is | When to use it |
|---|---|---|
| `assets/ownsi-logo-horizontal.svg` | Meerkat symbol + `ownsi` wordmark, side by side | Primary logo — default for site, docs, presentations |
| `assets/ownsi-symbol.svg` | Standing meerkat on its own | Icon-only contexts: favicon, avatar, app icon |
| `assets/ownsi-logo-seal-horizontal.svg` | Meerkat-in-shield seal + `ownsi` wordmark | Trust-heavy contexts where the verified seal carries the message |
| `assets/ownsi-seal.svg` | Meerkat-in-shield seal on its own | Verified state inside the product — a completed verification |

These SVGs wrap a high-resolution raster export, so they render cleanly at and below their native
1448×1086 but do not scale infinitely like true vector paths. Do not stretch them past that size.

## Essence

| Pillar | Meaning |
|---|---|
| **Observe** | Vigilant and attentive — always watching the signals that prove what is yours |
| **Verify** | Transparent and reliable — simple verifications the user understands and trusts |
| **Own** | Secure and yours — prove ownership and take control |

## Attributes

- **Reliable** — accuracy and consistency in every verification.
- **Simple** — easy to integrate, easy to understand.
- **Secure** — privacy and security first.
- **Friendly** — technology that feels human and approachable.

## Palette

| Token | Hex | Use |
|---|---|---|
| Black | `#000000` | Primary ink: logo, text, inverted surfaces |
| White | `#FFFFFF` | Background, logo on a dark surface |

The brand is strictly monochrome. Any state colour (success, error, pending) is a product UI
decision and is not part of the brand palette — if you need one, add it as a product token in
`packages/ui`.

## Typography

**Inter** — modern, legible and neutral. It conveys clarity and confidence.

## Expected applications

The mark on a black background (inverted), on a white background, the icon in a black circle, and the
verified seal on a white card — all shown on the brand sheet.
