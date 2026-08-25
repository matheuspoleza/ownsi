---
feature: domain-ownership
phase: prd
updated: 2026-08-24
---

# PRD — Ownsi

Context: the Resend "Product engineer" take-home. The brief: *"Build a product experience that helps
a user prove ownership of a domain, understand the verification process, when it fails, and recover
from mistakes."*

---

## 1. The product

**Ownsi is a hosted product where a person proves they control a domain's DNS zone.** They add a
domain, write one TXT record, and get a dated attestation they can share.

**The proof is point in time.** It says *"on 12 March, this account demonstrated control of
`acme.com`'s zone"* — a fact about a moment, not a claim about the present. Once granted it never
decays and is never revoked. The TXT record is consumable: write it, prove it, remove it whenever
you like.

**Nothing is unlocked by it.** No capability sits behind the proof; the attestation is the product.

**What problem it solves.** Proving ownership is a three-minute task that routinely eats days — not
because it is hard, but because the failure is silent. "Not verified yet" is the same sentence for:
you typed the wrong host, your provider has not published the zone yet, a 24-hour negative cache is
holding, you created the record on `www`, or your panel wrapped the token in quotes. Five problems,
five fixes, one useless message. Ownsi names which one is yours and what to do about it.

**Who it is for.** Anyone who controls (or believes they control) a domain's DNS zone. Two shapes of
the same person: the one who runs `dig` and wants the raw evidence, and the one who has the
registrar panel open and has never heard of a TXT record. The product serves both from one screen —
an instruction in the provider's vocabulary on top, raw evidence reachable underneath.

Secondary actor: the **already-proved owner**, who asked for nothing and is notified when another
account proves the same domain.

**Constraints.** One week, one developer. TypeScript. Frontend and backend publicly live — the
reviewer opens the link at an arbitrary hour, so a 50s cold start is the first impression. Final
deliverable includes a 3–5 minute video, so the product must demo as a continuous flow with no
"here I would wait two days".

---

## 2. Requirements

### In scope

**Identity**

- One account per person. Sign in by magic link (sent through the Resend API) or Google, from one
  self-hosted better-auth configuration.
- A claim belongs to a user directly (`userId`).

**Reading the zone, before sign-in**

- The landing flow accepts a domain and reads its zone with no account: nameservers, detected
  provider, SOA. It shows the setup instruction for that provider immediately.
- **No token is issued before sign-in.** Nothing is written to DNS until there is an account to
  bind the claim to, so no DNS work can be invalidated later.

**Claiming**

- Adding a domain generates a token and a target record `TXT _ownsi-challenge.<domain>`. The token
  is stable for the life of that claim and changes for no reason while the claim is open.
- **A claim is an episode, and it only runs forwards.** It ends `proved`, `expired` or `canceled`,
  and an ended claim is history: it takes no action, is never re-checked, and its token stops being
  accepted. Trying again means a new claim, with a new token.
- An account may hold many claims on the same name over time, one open at a time. Together they are
  the record of what was attempted and what came of it.
- Input normalised on entry: `HTTP://WWW.Acme.com/path` becomes `acme.com`. Punycode/IDN, trailing
  dot, uppercase, port, path. A public suffix (`co.uk`) raises a warning, not a block.
- Each name is independent. Proving `acme.com` grants nothing over `app.acme.com`.

**Setup instruction**

- The provider is detected from the NS records, and the instruction speaks that panel's vocabulary:
  its real field names, and the host value in the format it expects (some want `_ownsi-challenge`,
  others the FQDN). About 6 providers mapped plus a generic fallback. No deep links into panels —
  they break.

**Verification**

- Three public recursive resolvers over DoH (Google, Cloudflare, Quad9), majority of three. That is
  what the world sees. Three independent operators from one region — the map in the UI illustrates
  anycast, not our own geographic spread.
- Every check has three outcomes, never two: `found` / `absent` / `unresolvable`. The third is our
  failure; it counts against the user nowhere and notifies nobody.
- Exactly one `found` of three is information, not an error: "published, still spreading".

**Diagnosis when it fails**

- On a negative result the authoritative nameservers are queried directly over UDP/53. That
  separates *"your provider has not published it"* from *"it is negative cache, ~N minutes left"* —
  the second quantified from the SOA MINIMUM.
- Thirteen probes fire at the places the record usually ends up by mistake. Each returns
  `{ code, cause, fix, observed }`, and `code` is stable and enumerable.

| Probe | What it means | The fix |
|---|---|---|
| `_ownsi-challenge.acme.com.acme.com` | registrar auto-appended the domain | "use only `_ownsi-challenge` in the Host field" |
| Token in a TXT at the apex | pasted in the wrong place | "move it to the `_ownsi-challenge` subhost" |
| Right host, another token | someone else's, or another name's | "that token is not yours; replace it with…" |
| Right host, your own expired token | the previous claim's record is still there | "this one is from your last claim; change the value, not the record" |
| Quotes / whitespace / prefix | the panel added formatting | shows exact value expected vs received |
| N TXT records, none matching | created alongside the existing ones | lists what was found, points at the difference |
| CNAME on the challenge host | conflicts with TXT (RFC 1034) | "remove the CNAME; one name cannot hold both" |
| NXDOMAIN vs NODATA | name absent vs present without TXT | "nothing was created" vs "you created another type" |
| `_ownsi-challenge.www.acme.com` | confusion with `www` | "the record goes on the domain, not on www" |
| Authoritative does not have it | the provider has not published | "this is not propagation — did you save?" |
| Authoritative has it, resolvers do not | negative caching | quantified from SOA MINIMUM |
| SERVFAIL | DNSSEC failure or broken zone | distinguished from "does not exist" |
| Nameservers silent | lame delegation | a problem at their provider, not with the record |

**Waiting**

- Pending is the product's primary screen, not an edge case. It shows what is already known — does
  the authoritative have it, is there a negative cache, how long is left — not a spinner.
- A claim is open for seven days, checked on a decreasing interval, with email nudges on D+1 and
  D+3 and a warning on D+6 that the window closes tomorrow. Then it expires.
- **Expiring is not an accusation.** Not proving is never evidence against the person: it can be a
  holiday, a broken provider, or our own failure. The screen says the window closed and that
  starting again takes one click. It never says the domain may not be theirs.

**Why a claim expires**

The proof reads *"on 15 June, this account demonstrated control"*. That sentence is only true if the
demonstration was recent. A token accepted forever breaks it: a record written in January and never
cleaned up would keep minting fresh proofs long after control had passed to someone else. Bounding
the token's life is what keeps the date honest.

Everything follows from that one sentence:

- An ended claim's token stops being accepted. The record left in the zone is inert.
- There is no *check again*. A new date needs a new demonstration, which means a new claim, a new
  token, and one edit in the DNS panel. Re-checking and re-claiming are the same act.
- Seven days is chosen so nobody who did the work correctly loses it: negative caching rarely
  exceeds a day and provider publishing is minutes to hours.
- When the next claim runs and finds the previous claim's token still sitting on the challenge
  host, that is not "nothing found" — it is the thirteenth probe, and it turns starting over into
  a one-line edit.

**After the proof**

- Nothing re-checks a proved claim, on a timer or otherwise. The record may be removed the moment
  it is found.
- The verified screen dates its confirmation (`Confirmed 12 Mar`) rather than asserting present-tense
  truth. The date never moves, because the moment it describes does not.
- Wanting a fresher date is wanting a fresh demonstration: claim the domain again. The earlier proof
  stays true and stays in the history beside it.

**Sharing the proof**

- A proved claim can issue a public proof link on demand. Its own slug — never the DNS token —
  valid for 7 days.
- The page renders the stored attestation. It runs no DNS query when opened.

**Coexistence**

- Several accounts can prove the same domain and all of them stay true — they are statements about
  different moments, and legitimate cases are common (agency/client, staging/prod).
- Existing owners are notified when a new account proves their domain, with the date and the other
  account's email as `m•••@acme.com`: local part masked, domain visible, because the domain is the
  recognition signal.
- **"That wasn't me" is a security advisory, not a remedy.** It says: someone demonstrated control
  of your zone on that date; if it was not you, treat your DNS as compromised, and here is what to
  check. Ownsi changes nothing about the other account's proof.

**Recovering from mistakes**

- Getting a claim wrong is cheap: cancel it and claim again. The wrong attempt stays in the history
  saying what went wrong, which is the point of keeping it.
- **Archiving is about a domain, not a claim.** It says "stop involving me with this name": the
  domain leaves the main list, an open claim on it ends, and the account stops being told when
  someone else proves it. It is a preference, and claiming the name again lifts it.
- **Archiving does not un-prove anything.** A proof already granted stays true, keeps its date, and
  its proof links keep resolving. Ownsi has no way to retract a fact about a past moment and does
  not pretend to.
- The add-domain field autocompletes over every name the account has ever claimed, archived ones
  included. Finding one shows what happened last time — `Proved 12 Mar`, `Expired 3 Apr` — and the
  action is to claim it again.
- "Delete permanently" exists for whoever wants to genuinely disappear. It is the only thing that
  removes history.

**History**

- A per-domain timeline: every claim the account made on that name, in order, each with how it
  ended. Kept permanently.
- Within a claim, a timeline of semantic events. Also permanent.
- Raw evidence for every attempt in a separate append-only log, 30-day retention.
- An ended claim is read-only. It offers no button, and nothing recomputes it.

**Notification**

- Email only, through the Resend API. On state change, never on repetition.

| Event | Email |
|---|---|
| Sign-in magic link | yes |
| Proof granted | yes |
| Pending, unresolved | nudge on D+1 and D+3, nothing more |
| Claim about to expire | one warning on D+6, naming the fix that is outstanding |
| Claim expired | no — D+6 already said it, and a second email would only scold |
| Another account proved your domain | yes |
| `unresolvable` | no — it is our failure |

- Ceiling of one email per claim per event type per 24 hours.

### Out of scope

| Cut | Why |
|---|---|
| Sending domains: DKIM, SPF, DMARC, MX | The brief says "prove ownership of a domain", not "verify a sending domain" |
| Proof by role-address email or HTML file | Both prove *delegations* the zone owner can fabricate. The zone is the root |
| Any capability behind ownership | The attestation is the product |
| Revocation, grace windows, `at_risk` | The proof is point in time; nothing decays, so nothing needs taking back |
| Continuous monitoring of proved claims | Nothing sweeps a proof once granted |
| Requiring the TXT record to persist | Consumable by design — one visit to the DNS panel per claim, and none at all once it is proved |
| Arbitration: approval, transfer, freezing, eviction | Every account demonstrated real zone control. With no exclusive resource to allocate, picking a winner would be a judgement Ownsi has no standing to make |
| Scope inheritance (`acme.com` → `app.acme.com`) | Nothing is scoped to a name, so inheritance would assert nothing |
| Blocking public suffixes | The proof protects itself — nobody writes a TXT in the zone of `github.io` |
| Webhooks | One channel, email, for a hosted product with its users' addresses |
| Publishable packages, API keys, multi-tenancy | Ownsi is a hosted product. The SDK shape is shown in the docs as a design, not shipped as a distribution |
| Teams, roles, invitations | One account, one person |
| A dedicated queue (Redis/BullMQ) | `next_check_at` in Postgres plus Inngest already covers it |
| Separate deploys, two hostnames, per-schema roles | One service, one deploy |

### Success criteria

- A domain with the correct TXT goes from claimed to proved with no intervention, and the screen
  shows an estimate derived from the SOA instead of a generic "up to 72h".
- Each of the 13 probes, on a test domain built to reproduce it, produces one sentence of cause and
  one of fix — not a log dump.
- A simulated resolver outage produces `unresolvable` at scale without sending a single email.
- Archiving a proved domain and finding it again through the autocomplete shows the proof still
  dated and still true, with no DNS panel involved and nothing re-checked.
- A claim that expires with the token still in the zone: the next claim names that exact record and
  asks for one value to be changed, rather than reporting that nothing was found.
- Removing the TXT record after the proof changes nothing.
- A second account proving the same domain: both stay proved, and the first gets an email with the
  second's masked address.
- The reviewer opens the public URL at any hour and the first screen paints with no perceptible cold
  start.

---

## 3. Tech design

*Diagrams: `diagrams/system-design.png` (topology) and `diagrams/context-map.png`. Editable source
in the `Engineering` layer of `designs.pen`.*

### 3.1 Domain model

`Domain` is a name, and nothing more. `Claim` is an account's attempt on that name, and it is where
every lifecycle lives. Verification attempts are append-only and referenced, not carried as
children. The proof is not a separate entity — it is the pair of dates on the claim.

| Object | Kind | What it is |
|---|---|---|
| `Domain` | entity | a name, once, for everyone: `id`, `nameAscii`, `nameUnicode`. **No owner and no status.** What claims and history hang from |
| `Claim` | aggregate root | one open per (user, domain), many over time. Token, state, dates. `claim()`, `cancel()`, `expire()`, `applyAttempt()` |
| `DomainName` | value object | parse, normalise, punycode, public suffix list, and the list of normalisations applied |
| `Zone` | aggregate root | one per name: nameservers, provider, SOA MINIMUM, `observedAt`. Read before sign-in, shared across claims |
| `VerificationAttempt` | aggregate root | append-only: trigger, outcome, resolver observations, diagnosis |
| `PublicProofLink` | aggregate root | slug, claim, expiry |
| `Diagnosis`, `ResolverObservation`, `MaskedEmail` | value objects | produced by domain services, never entities |

**`Domain` has no owner, and that is the whole point.** Resend's equivalent does: claiming a domain
there transfers it and revokes the other team's access, which is correct for them, because a sending
domain is genuinely exclusive — two teams cannot both hold DKIM for one name. An attestation is not
exclusive. Two true sentences about the same name do not conflict, so there is nothing to allocate
and no winner to pick. A `Domain` row is a name every account can point at.

**`Domain` is not `Zone`.** A zone is keyed by the zone that *answers* — `app.acme.com` is served by
`acme.com` — and holds DNS facts with a cache lifetime. It is machinery for reading DNS and belongs
to that context alone; nothing else should key off it. `Domain` is identity, and it is what makes
"every claim this account ever made on this name" a relationship instead of a string comparison.

A `Domain` row is created on the first claim, never on a zone read: the pre-login read accepts
whatever anyone types, and writing a row there would make the table a log of typos.

Coexistence is a query across claims on the same `Domain`, not an aggregate — there is no invariant
linking two accounts' claims, deliberately.

### 3.2 Data model

```sql
users                  id, email, name, created_at            -- better-auth
sessions               id, user_id, expires_at                -- better-auth

zones                  name PK, nameservers text[], provider_id,
                       soa_minimum, observed_at

domains                id, name_ascii UNIQUE, name_unicode, created_at
                                                     -- a name, once, for everyone

domain_archives        user_id, domain_id, archived_at
                       PRIMARY KEY (user_id, domain_id)
                       -- "stop involving me with this name". A preference,
                       -- not a claim state, so it survives every claim and
                       -- retracts none of them

claims                 id, user_id FK, domain_id FK, token,
                       state, expires_at, next_check_at, consecutive_failures,
                       last_diagnosis_code,
                       ended_at, created_at
                                                     -- a proved claim's ended_at
                                                     -- is the date of its proof
                       UNIQUE (user_id, domain_id) WHERE state = 'pending'
                       INDEX (domain_id)             -- coexistence
                       INDEX (state, next_check_at)  -- the queue

verification_attempts  id, claim_id, trigger, outcome, resolvers jsonb,
                       authoritative jsonb, diagnosis_code, latency_ms,
                       created_at                    -- 30d retention

claim_events           id, claim_id, type, payload jsonb, created_at
                                                     -- permanent

proof_links            slug PK, claim_id, issued_at, expires_at, revoked_at
```

**Internal state vs exposed status.** `state` holds `pending | proved | expired | canceled`, and
only `pending` is live — the other three are terminal and never move again. Everything the screen
says is derived, so a new rule never becomes a migration:

| `state` + timestamps | `status` |
|---|---|
| `pending` | `pending` |
| `pending`, authoritative has the record | `propagating` |
| `pending`, diagnosis is a user error | `needs_attention` |
| `proved` | `proved`, dated by `ended_at` |
| `expired` | `expired` |
| `canceled` | `canceled` |

`archived` is deliberately absent from that table. It is a fact about a (user, domain) pair, not
about any claim, so it filters the list rather than describing a state.

`last_diagnosis_code` is deliberate denormalisation: the dashboard renders a "next step" column with
no DNS query.

**Invariants, all testable:**

1. `token` is immutable for the life of a claim, and is accepted only while that claim is `pending`.
   A terminal claim's token proves nothing, which is what keeps a proof's date honest.
2. A claim only runs forwards. From `pending` to one of three terminal states, and from a terminal
   state to nowhere. No path re-opens one.
3. `outcome` has three values, and `unresolvable` changes no state and sends no email.
4. Archiving cancels an open claim and stops coexistence notifications, and retracts no proof: a
   granted proof keeps its dates and its links resolve.
5. A proof is dated once, by the `ended_at` of the claim that earned it, and that date never
   moves. A newer proof is a newer claim, so a domain's *first verified* is the earliest proof
   across its claims and its *last confirmed* is the most recent — both derived, neither stored.
   Nothing re-dates a claim, because nothing re-checks one.
6. No path ends a claim as `proved` without a `verification_attempts` row in the same transaction.
7. At most one email per claim per event type every 24h.

**Semantic events:** `DomainClaimed` · `RecordFound` · `ProofGranted` · `CheckFailed(code)` ·
`PropagationDetected` · `ClaimExpiring` · `ClaimExpired` · `ClaimCanceled` · `DomainArchived` ·
`OtherAccountProved` · `ProofLinkIssued`. `CheckFailed` is emitted only when the diagnosis code
changes, so a stuck claim does not flood its own timeline.

One transaction writes `claims` + `verification_attempts` + `claim_events`. Evidence and state never
diverge.

### 3.3 HTTP API

Session-authenticated, same origin. The vocabulary mirrors Resend's own API, so anyone already using
Resend does not learn a second dialect.

```
GET    /api/zones/:name             pre-login zone reading (rate limited per IP)
POST   /api/domains                 { domain } — opens a claim, returns the record to create
GET    /api/domains                 the list, one row per domain, newest claim in front
GET    /api/domains/:id             the domain, its open claim, and every claim before it
POST   /api/domains/:id/verify      forces an attempt on the open claim (rate limited)
POST   /api/domains/:id/cancel      ends the open claim
POST   /api/domains/:id/archive     stop involving me with this name
DELETE /api/domains/:id             delete permanently — the only thing that erases history
GET    /api/domains/:id/events      the timeline, across every claim on this name
POST   /api/domains/:id/proof_links
GET    /p/:slug                     the public proof page, server-rendered
```

The resource is the domain, and claims are its history — which is why `verify` and `cancel` address
the domain rather than a claim id: there is at most one claim to act on, and an ended one takes no
action at all. `restore` is gone with the backwards transition it served; claiming a name again is
`POST /api/domains`, and that is the only way forward there has ever needed to be.

Every route declares `body` / `params` / `query` **and `response`**: it pins the type on the
frontend, stops an ORM object serialising an internal field by accident, and fills the OpenAPI
document.

`GET /api/domains/:id` carries the block that is the heart of the product:

```json
"diagnosis": {
  "code": "record_at_apex",
  "cause": "The token is on acme.com, not on _ownsi-challenge.acme.com.",
  "fix": "Move the record to the _ownsi-challenge host.",
  "observed": { "name": "acme.com", "value": "ownsi_v1_9f3a…" }
},
"waitEstimate": { "reason": "negative_cache", "secondsRemaining": 240 }
```

`POST /api/domains/:id/verify` answers `{ stages[], diagnosis, resolvers[], nextCheckAt }` — the
three stages of the wireframe (Nameservers → Record → Token) plus per-resolver evidence, because the
disagreement between resolvers *is* the propagation information.

Conventions: `Idempotency-Key` on every POST; errors as `{ error: { code, message, docsUrl } }` with
a stable `code`; cursor pagination; rate limiting per user and per claim separately.

### 3.4 Verification engine

A check is four steps, and only the first decides.

1. **Recursive resolvers decide.** TXT against Google, Cloudflare and Quad9 over DoH, in parallel.
   Majority of three.
2. **Authoritative explains.** Only on a negative result: walk the labels up to the real
   authoritative zone, query its NS over UDP/53, read the SOA.
3. **Probes run.** The 13 probes pattern-match over the `DnsObservation` already collected — no
   further network.
4. **Transition.** A pure function turns (claim, diagnosis, now) into the new state, the events,
   `nextCheckIn`, and the effects to dispatch.

### 3.5 Scheduling

Only pending claims are scheduled. Nothing sweeps a terminal one — proved, expired and canceled
claims are history, and history does not need a clock.

`next_check_at` is derived from (claim age, the zone's SOA MINIMUM, consecutive failures) and is the
state; **Inngest is the clock**, with one `step.sleep` per pending claim, which gives second-level
granularity with no cron tick as a floor. With the tab open the client also polls the verify
endpoint directly, rate limited per claim.

`expires_at` is set when the claim opens and needs no sweeper of its own: the scheduled check that
wakes past it ends the claim instead of checking it, and the D+6 warning is one more scheduled step
on the same timeline.

The SOA MINIMUM (RFC 2308) states exactly how long a "does not exist" stays in negative cache, so
`next_check_at = now() + soa.minimum` is derived rather than guessed — and turns into a UI sentence
("resolvers forget the 'does not exist' in about 5 min").

### 3.6 Internal architecture

A pure core with an imperative shell around it. The diagnosis engine is the product, and the success
criteria of Section 2 are statements about it — "a resolver outage sends zero emails", "each of the
13 probes names its cause". Those are only cheap to assert if the engine has no I/O.

One folder per bounded context, each with the same four layers, plus a `shared/` for what more than
one of them needs. Contexts never import each other.

```
apps/api/src/
  zones/         reading a zone: nameservers, provider, SOA, publishing estimate
  domains/       the account's claims on a name: token, state, lifecycle
  verification/  did this token appear at this host, and if not, which failure is it
  proof/         the public proof page and its links
  shared/        DomainName, Result, the clock, auth, the diagnostics vocabulary

  <context>/
    domain/        types, pure functions, port definitions — no I/O
    application/   use cases, as closures over their deps
    api/           Elysia route factories and wire schemas
    infra/         adapters that implement the ports
    <context>.config.ts / .module.ts / .app.ts
```

The names are the concepts, not the machinery: `zones`, not `dns`. Each context is testable at the
line that matters — `zones` answers with no account, `verification` needs only a token and a host,
`domains` is what survives closing the tab.

Nothing under `domain/` imports the HTTP framework, the ORM or `node:dns`. No DI container: deps are
arguments, applied once at composition time. **The pure core returns effects as data; the shell
executes them**, so "a resolver outage sends zero emails" is an assertion over an array with no SMTP
mock.

The same verification runs from the *check now* button and from the scheduler — the scheduler is an
adapter, not an orchestrator.

`test/architecture.test.ts` fails the build when a layer or a context boundary is crossed, and it
has done since day 2.

### 3.7 Infrastructure

One long-running Bun service on Railway, one Postgres on Neon, Cloudflare in front as a single
origin.

A Cloudflare Worker with Static Assets serves the built SPA **and** reverse-proxies `/api/*` and
`/p/*` to the Railway service. The browser never talks to two hosts, so the session cookie is
first-party: no CORS, no `SameSite=None`, no API subdomain, no managed certificate. `/p/:slug` is
rendered by the API and proxied through, so the proof page has real OG tags with no fullstack
framework.

| Layer | Choice |
|---|---|
| Monorepo | Bun workspaces (`apps/*`, `packages/*`), Turborepo, Biome |
| API | Bun + Elysia, TypeBox validation |
| Contract | Eden Treaty + `@elysiajs/openapi` — end-to-end types, no codegen |
| Frontend | Vite + React 19 + TanStack Query + Tailwind 4 + shadcn/ui |
| Edge | Cloudflare Worker with Static Assets |
| API runtime | Railway — long-running, UDP/53 egress, no spin-down |
| Database | Neon + Prisma 7 (`adapter-pg`), a branch per PR |
| Scheduling | Inngest |
| Auth | better-auth, self-hosted: magic link (Resend) + Google |
| Email | Resend + React Email |

The three constraints that pick Railway: UDP/53 egress for authoritative queries, no spin-down for a
reviewer arriving at an arbitrary hour, and a first-party cookie behind one origin.

### 3.8 Security and abuse

| Surface | Mitigation |
|---|---|
| Zone reading before sign-in | rate limit per IP, and `zones.observed_at` is the cache — without it this is an open DNS resolver |
| Token | 128 bits of randomness, per claim, never reused |
| Another account's email | `MaskedEmail` — masked local part, visible domain |
| Public proof page | no DNS query on open; rate limited; expires in 7 days |
| Manual check | rate limited per claim |

### 3.9 Docs

A `/docs` route inside the app: quickstart, how verification works, API reference, and the
**diagnostics catalogue** — the 13 codes with their cause and fix. That last page is the one that
shows the copy *is* the product.

### 3.10 What is live

| URL | What it is |
|---|---|
| `ownsi.dev` | the product — add a domain, provider instruction, pending, diagnosis, recovery, coexistence, timeline |
| `ownsi.dev/p/:slug` | the public proof page |
| `ownsi.dev/docs` | quickstart, API reference, diagnostics catalogue |

### 3.11 Testing

`bun test`, with the weight on the pure core:

- **13 probes × 1 fixture each** — a recorded `DnsObservation`, asserting on `diagnosis.code` and on
  the fix sentence
- **The demo catalogue** — one domain per screen, covering every status, all three outcomes and
  every code, so the fake, the docs page and the video read from one source
- **The transition table** — `unresolvable` changes nothing; expiry at 7 days; a terminal claim
  accepts no attempt and its token verifies nothing; no path re-opens a claim
- **Notification policy** — the 24h ceiling, and "a mass outage sends zero emails"
- **`DomainName.parse`** — punycode, trailing dot, `www`, PSL, and the list of normalisations
- **Boundary guard** — a test that fails when a layer or a context boundary is crossed
- One end-to-end smoke test on the happy path

`DnsPort` has two implementations: real DoH, and a fake replaying recorded responses. The fake is
what makes the demo deterministic — the video cannot depend on live DNS.

### 3.12 Day 1 risks

| Risk | Spike | Plan B |
|---|---|---|
| `node:dns` with `setServers` under Bun | 10 lines resolving the authoritative NS of a known domain | `dns-packet` over `Bun.udpSocket()` (~half a day) |
| A verified domain on the Resend account for sending | confirm before anything else — it blocks magic link and every email | Google OAuth gets the reviewer in |
| Reproducing the 13 probes | build the test zone **early** — without it the success criterion cannot be shown | — |
| The Worker proxy adding a hop the SPA feels | measure `/api/health` through the proxy against the origin | separate hostnames and pay the CORS cost |

---

## 4. Milestones

One week, one developer. Every day ends with something demonstrable and live — the deploy is the
**first** milestone, not the last.

| Day | What | Done when |
|---|---|---|
| **D1** | Skeleton live: spikes, Bun monorepo, Elysia, blank SPA, Worker proxy, Neon, Railway | `ownsi.dev` responds and `/api/health` comes back through the proxy |
| **D2** | Pure core: `DomainName`, `Zone`, probes, `diagnose`, `transition`, `schedule` | `bun test` covers the 13 probes and the transition table, and the boundary guard is in CI |
| **D3** | Real verification: DoH quorum, authoritative path, `claimDomain`, `verifyClaim`, persistence, timeline, ~6 providers | a test domain with the right TXT goes to proved unattended; a planted mistake names the right cause |
| **D4** | Clock and identity: Inngest per-claim scheduling, better-auth with magic link and Google, state-change emails with the 24h ceiling | I close the tab, the record propagates, the email arrives |
| **D5** | The main flow in the browser: zone reading → sign-in → record screen with live state → proved | the whole happy path runs with no Postman |
| **D6** | Recovery and coexistence: expiry with its D+6 warning, cancel, archive, claim history under the autocomplete, coexistence email, "that wasn't me" advisory, `/p/:slug` with OG tags | I archive a proved domain, type it again, and the proof is still there and still dated |
| **D7** | Docs and demo: `/docs`, a real test zone with the 13 failures pre-planted, the recorded DNS fake, README, and the 3–5 minute video | each of the 13 probes has a domain reproducing it live |

**Cut ladder.** If it slips, cut bottom-up; what is above is never sacrificed for what is below.

1. Google OAuth (magic link survives)
2. The public proof page (the proof becomes an internal screen)
3. The "that wasn't me" advisory (the coexistence email survives)
4. Mapped providers: from 6 to 3 plus a generic fallback
5. Probes: from 13 to the 6 most frequent

**Never cut:** the three-valued outcome, the named diagnosis, the pending screen, and starting over
without losing what happened. Those are the four the brief asks for by name.
