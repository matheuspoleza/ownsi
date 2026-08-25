---
phase: prd
updated: 2026-08-24
---

# Docs

Documentation is organised as `docs/{feature}/`. Each feature folder holds its own PRD and research;
nothing in here assumes you were part of an earlier conversation.

**This folder is internal.** The public documentation site is [`apps/docs/`](../apps/docs/README.md)
— a Mintlify project whose API reference and diagnostics catalogue are generated from `apps/api`.
Product decisions land here first; what a user needs to read lands there.

| File | What it is |
|---|---|
| [`backend-architecture.md`](backend-architecture.md) | How `apps/api` is put together, and why — layers, tagged unions, dependencies without a container, Elysia |
| [`frontend-architecture.md`](frontend-architecture.md) | How `apps/web` is put together, and why — feature folders, file naming, hooks, why there is no `.css.ts` |

| Folder | What is in it |
|---|---|
| [`domain-ownership/`](domain-ownership/) | The product: proving ownership of a domain via a DNS TXT record — PRD and UI reference research |
| [`branding/`](branding/) | The **ownsi** brand reference: mark, palette, typography, usage rules |

## domain-ownership

| File | What it is |
|---|---|
| [`prd.md`](domain-ownership/prd.md) | **The source of truth**: the product, what is in and out of scope, the tech design, the milestones |
| [`references/README.md`](domain-ownership/references/README.md) | How 30 real products design domain verification, synthesised by dimension (instruction, waiting, failure, success, recovery, conflict) |
| [`references/claim-patterns.md`](domain-ownership/references/claim-patterns.md) | A deeper look at claiming a resource that already has an owner, and at contesting it |
| [`references/screenshots/`](domain-ownership/references/screenshots/) | The 55 reference screenshots, named `{nn}-{dimension}-{app}-{what-it-shows}.webp` |
| [`diagrams/`](domain-ownership/diagrams/) | `system-design.png` (topology) and `context-map.png` (strategic DDD), exported from the `Engineering` layer of `designs.pen` |

## Where to start

- **New to the product?** `domain-ownership/prd.md`, Sections 1 and 2.
- **Building it?** `domain-ownership/prd.md`, Section 3 — domain model, data model, API, engine,
  architecture, infrastructure.
- **Designing a screen?** `domain-ownership/references/README.md`, Section 1, gets you to the right
  screenshots in 30 seconds.
- **Writing code?** `backend-architecture.md` or `frontend-architecture.md` for the reasoning;
  `CLAUDE.md` at the repo root for the rules themselves.
