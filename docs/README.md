---
phase: prd
updated: 2026-08-21
---

# Docs

Documentation is organised as `docs/{feature}/`. Each feature folder holds its own PRD, decision
records and research; nothing in here assumes you were part of an earlier conversation.

| Folder | What is in it |
|---|---|
| [`domain-ownership/`](domain-ownership/) | The product: proving ownership of a domain via a DNS TXT record — PRD, ADRs, UI reference research |
| [`branding/`](branding/) | The **ownsi** brand reference: mark, palette, typography, usage rules |

## domain-ownership

| File | What it is |
|---|---|
| [`prd.md`](domain-ownership/prd.md) | The progressive PRD: problem, product requirements, tech design, milestones |
| [`decisions/`](domain-ownership/decisions/) | ADR-0001 to ADR-0031 — one decision per file, with the alternatives rejected and why. **The source of truth**: when the PRD and an ADR disagree, the ADR wins |
| [`references/README.md`](domain-ownership/references/README.md) | How 30 real products design domain verification, synthesised by dimension (instruction, waiting, failure, success, recovery, conflict) |
| [`references/claim-patterns.md`](domain-ownership/references/claim-patterns.md) | A deeper look at claiming a resource that already has an owner, and at contesting it |
| [`references/screenshots/`](domain-ownership/references/screenshots/) | The 55 reference screenshots, named `{nn}-{dimension}-{app}-{what-it-shows}.webp` |
| [`diagrams/`](domain-ownership/diagrams/) | `system-design.png` (topology) and `context-map.png` (strategic DDD), exported from the `Engineering` layer of `designs.pen` |

## Where to start

- **New to the product?** `domain-ownership/prd.md`, Sections 1 and 2.
- **Want to know why something is the way it is?** `domain-ownership/decisions/README.md` — the index
  has a reading order by theme.
- **Designing a screen?** `domain-ownership/references/README.md`, Section 1, gets you to the right
  screenshots in 30 seconds.
