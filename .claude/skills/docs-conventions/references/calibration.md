# Calibration — before and after

Referenced from [the docs conventions](../SKILL.md). Every pair below is a real rewrite from the
August 2026 audit of the sixteen hand-written pages. If a draft looks like the **Before** column,
it is the finding, not the style.

The audit found thirteen defects across ten pages: nine of fact, three of voice, one of component
choice. That ratio is the shape of the problem here. These pages are written well and drift
factually, because the code moves and the sentence does not. Read the source before trusting a
sentence about behaviour, including one already published.

---

## The API does not do that

The most expensive kind, because a reader builds on it. Every one of these passed
`apps/docs/test/routes.test.ts`, which checks that a route named in prose is a route the API
serves — a promise about a **header**, a **verb** or a **guarantee** is not a route, so nothing
caught them.

### An entire feature that does not exist

`api-reference/authentication.mdx` carried a `## Idempotency` section. `Idempotency-Key` appears
nowhere in `apps/api/src`, and the OpenAPI document declares no parameters on `POST /api/domains`.

| | |
|---|---|
| **Before** | "`POST` requests accept an `Idempotency-Key` header. Retrying with the same key returns the original response rather than issuing a second token or a second claim. … Use it on anything a user can double-click." |
| **After** | "There is no `Idempotency-Key` header. The two `POST` requests a person can double-click are idempotent on their own terms instead: `POST /api/domains` finds or creates … `POST /api/claims` answers `already_claimed` while a claim is open on the name." |

The real mechanism was better than the invented one and was already documented two pages away.
Check whether the truth is worth writing before writing around it. `sdk/http.mdx` carried
`-H "Idempotency-Key: $(uuidgen)"` in a `curl` a reader would paste; it went with it.

### A verb with no endpoint behind it

Three pages promised that a domain could be reactivated or restored. The API serves
`POST /api/domains/:id/archive` and `DELETE /api/domains/:id`, and nothing else. `@ownsi/sdk`
agrees: a `Domain` has `.archive()` and `.delete()`, no `.restore()`.

| | |
|---|---|
| **Before** (`index.mdx`) | "**The token survives the lifecycle.** Archiving, restoring and rechecking all preserve it. A record still in the zone verifies without the owner reopening their DNS panel." |
| **After** | "**A token never changes under you.** It is issued once per claim and rechecking preserves it. When a later claim issues a new one, the record already in the zone is named [`expired_token`](/diagnostics/catalogue#expired_token) — one edit, not a new record." |

| | |
|---|---|
| **Before** (`concepts/challenge-record.mdx`) | "The token is immutable for the life of the claim. Rechecking, archiving and reactivating all preserve it. A record you left in the zone a year ago verifies again the moment you reactivate, without opening your DNS panel." |
| **After** | "The token is immutable for the life of the claim. Rechecking never rotates it … It does not outlive the claim. Cancelling, expiring and archiving all end the claim, and an ended claim's token stops being accepted." |

| | |
|---|---|
| **Before** (`guides/claim-a-domain.mdx`) | "A later claim on the same name proves in one run because the record is already there … and the token survives archiving and reactivation — a domain reactivated a year later verifies without anyone opening a DNS panel." |
| **After** | "A later claim on the same name issues a new token, so the record already in the zone comes back as [`expired_token`](/diagnostics/catalogue#expired_token) rather than as nothing found: the person edits one value instead of working out where the record goes again." |

The false version was *the same claim* the lifecycle page spends a section refuting: a proof means
something only if the demonstration was recent, so an ended claim's token is inert by design. One
page had been rewritten to the current model and three had not.

The tell is a sentence that makes the product sound more forgiving than its own reasoning allows.
When the prose is kinder than the design, the prose is usually the stale one.

### A shape that is right in one language and wrong in the other

Over HTTP a claim carries `records`, an array, empty once the claim has ended. `@ownsi/sdk`
narrows it to `record`, one object or `null`. `concepts/challenge-record.mdx` showed the SDK's
shape under a JSON heading.

| | |
|---|---|
| **Before** | ` ```json The record block on every claim ` followed by a bare `{ host, name, type, value }` |
| **After** | ` ```json The records block on an open claim ` wrapping it in `"records": [ … ]`, then: "`records` is an array carrying exactly one entry today, and it is empty on an ended claim … `@ownsi/sdk` narrows it to `claim.record`." |

A code fence labelled `json` is a promise about the wire. If the shape shown is the SDK's, say so
in the sentence under it.

---

## Counting

Four pages disagreed with themselves or with the generated catalogue. Each is one word.

| Page | Before | After | Why |
|---|---|---|---|
| `concepts/verification.mdx` | "Twelve probes pattern-match" | "Thirteen probes pattern-match" | `diagnosis.ts` defines thirteen codes |
| `diagnostics/overview.mdx` | "Twelve codes, each matching one specific shape of wrongness." | "Thirteen codes, …" | the same page says "thirteen" three times below it |
| `concepts/challenge-record.mdx` | "Two consequences worth designing around:" | "Three consequences worth designing around:" | three bullets follow |
| `guides/read-a-zone.mdx` | "Three, and only one of them is worth a retry button." | "Four, and only one …" | four rows follow |

A count in prose is an assertion about the list under it, and it is the first thing to go stale when
the list grows. `guides/claim-a-domain.mdx` had the same bug in a different form: its "Fix it"
group listed seven codes where `diagnostics/overview.mdx` lists eight, silently dropping
`expired_token` — the one code the page's own last section is about.

When you write a number in front of a list, count the list.

---

## Cross-page consistency

| | |
|---|---|
| **Before** (`quickstart.mdx` card) | "What the six statuses mean, and what archiving does to the token." |
| **After** | "The claim's four states, the verification's six, and what archiving does not destroy." |

The page it links to had been rewritten to four claim states and six verification statuses. A card
description is a claim about another page, and nothing tests it.

---

## Voice

Small, and the only prose findings in the audit.

| Page | Before | After | Rule |
|---|---|---|---|
| `quickstart.mdx` | "nothing is wrong, DNS just has not caught up" | "nothing is wrong, DNS has not caught up yet" | `just` is a minimiser; `yet` carries the actual meaning |
| `concepts/challenge-record.mdx` | "The record is there; it just does not say what you meant it to say." | "The record is there; it does not say what you meant it to say." | the sentence was already doing the work |
| `concepts/challenge-record.mdx` | "the TXT record silently will not exist" | "the TXT record will silently not exist" | the adverb belongs to *not exist*, not to *will* |

### Where `just` stays

`diagnostics/overview.mdx` titles a card **Just wait**, and it should keep it. There the word means
*only* — do nothing but wait — which is the card's entire point, and the body under it opens
"Nothing to do." The ban is on `just` as an apology for difficulty ("just add a TXT record"), not
on the word.

`concepts/verification.mdx` has "The claim was just created", which is temporal. Also fine.

The rule is about what the word is doing in the sentence. A grep cannot tell, which is why the hook
does not check this one and a reader does.

---

## Components that assert something untrue

`index.mdx` listed three independent guarantees inside `<Steps>`, which numbers them 1, 2, 3 and
tells the reader they happen in that order. They do not; they are three properties that hold at
once. It became a `<CardGroup cols={3}>`.

`Steps` means sequence. `CardGroup` means a set. `Note` means a caveat and `Warning` means hard to
undo. Picking one for its looks makes the page state something the prose does not.

---

## What this audit says about the guards

Two things the tests already catch, and did: no page linked a route the API stopped serving, and
no navigation entry pointed at a missing file.

Everything above got through, and the pattern is worth keeping in mind. The guards assert
**relations** — a route exists, a page is navigated, a link resolves, a generated file matches its
source. Every finding here was an assertion about **behaviour**: a header is honoured, an act is
possible, a count is right, a token is still accepted. Nothing can test that but reading the code
the sentence is about.

So when a page describes what the product does rather than what it exposes, open the source.
`apps/api/src/**/api/*.response.ts` for shapes, `*.routes.ts` for acts, `diagnosis.ts` for the
vocabulary, and `packages/sdk/src` for what the TypeScript reader actually holds.
