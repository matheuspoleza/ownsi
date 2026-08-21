---
feature: domain-ownership
phase: prd
updated: 2026-08-21
---

# PRD — Domain ownership proof

Context: the Resend "Product engineer" take-home. The brief: *"Build a product experience that helps a user prove ownership of a domain, understand the verification process, when it fails, and recover from mistakes."*

The full decision log, with the *why* behind each call, lives in `docs/domain-ownership/decisions/` (ADR-0001 to ADR-0031). This PRD is the consequence of it; when the two disagree, the ADRs win.

---

## 1. Coverage checklist

**Who it is for.** Anyone who controls (or believes they control) a domain's DNS zone and has to prove it to a third-party service. Two shapes of the same person:

- the one who can run `dig` and wants the raw evidence;
- the one who has the registrar panel open, has never heard of a TXT record, and will copy and paste whatever they are told.

The product serves both from the same screen: an instruction in the provider's vocabulary on top, raw evidence reachable underneath.

Secondary actor: **the already-proved owner**, who asked for nothing and gets notified when another account proves the same domain.

Third actor, introduced in [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md): **the integrating developer**. Ownership proof ships as a pluggable product — API, server SDK and React component — and the hosted app is the first consumer of that SDK, not a parallel product. The developer never writes DNS; they install the package and get the whole flow, failure states included. Detail in Section 3.

**What problem it solves.** Proving ownership is a three-minute task that routinely consumes days. Not because it is hard — because the failure is silent. "Not verified yet" is the same sentence for: you typed the wrong host, your provider has not published the zone yet, a 24-hour negative cache is holding, you created the record on `www`, or your panel wrapped your token in quotes. Five different problems, five different fixes, one useless message. The user responds to the vacuum the only way they know: wait, fiddle again, break what was already right.

**What success looks like.** Three observable outcomes:

1. The happy path finishes in minutes, and the product says *how many* minutes are left instead of "this may take up to 72 hours".
2. When it fails, the screen names the specific cause and the exact fix — it does not show a log and wish you luck.
3. No user mistake costs redoing the DNS work. Deleted, archived, gone: it comes back with one click, same token.

**What is explicitly out.** Sending domains (DKIM/SPF/DMARC), proof by role-address email or HTML file, any capability unlocked by ownership, arbitrating who the legitimate owner is, scope inheritance between `acme.com` and `app.acme.com`. Every cut has its reason recorded in Section 2.

**New or existing surface.** Entirely greenfield — frontend, backend, database, deploy, plus the publishable packages (server SDK and React component) and the docs site.

**Constraints.** One week, one developer. TypeScript required. Frontend and backend have to be publicly live (the reviewer opens it at an arbitrary hour: a 50s cold start is the first impression). The final deliverable includes a 3–5 minute video, so the product has to be demonstrable as a continuous flow, with no "here I would wait two days".

---

## 2. Product requirements

**Goal.** A user proves ownership of a domain by writing a TXT record into the zone; when that does not happen, the product says which of the known causes is theirs and what to do about it.

**Target users.**

- **Claimant** (primary) — adds the domain, receives the instruction, writes the DNS record, waits, and is the one who fails. Has no account in this product: whoever identifies them is the app that integrated it ([ADR-0005](decisions/0005-two-level-identity.md), [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md)).
- **Already-proved owner** (secondary) — gets notified when another account proves the same domain, and has a path to contest it.
- **Integrating developer** (third) — installs `@ownsi/node` and `@ownsi/react`, creates the claim on their own server and renders the component. They are who carries the API key and who reads the webhooks ([ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md)).

### In scope

**Identity and claim**

- Two levels of identity: the **API key** identifies the integrating app; the `owner` field, an opaque string chosen by the app, identifies the end user. The end user has no sign-up here. ([ADR-0005](decisions/0005-two-level-identity.md), [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md))
- `apps/ownsi` authenticates its own users by magic link (Resend API) and Google OAuth, and passes `owner: user.id` to the core — as any integrator would. The core has no users. ([ADR-0005](decisions/0005-two-level-identity.md), [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md), [ADR-0031](decisions/0031-magic-link-plus-google.md))
- The component runs in the browser with a **client token** per claim (30 min, read and recheck only), issued by the app's server. The secret key never leaves the server. ([ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md), Section 3.2)
- Adding a domain generates a stable token per (app, `owner`, domain) and a target record `TXT _<app>-challenge.<domain>`, with the prefix configurable per app. The token never changes: not on recheck, not on revocation, not on reactivation. ([ADR-0004](decisions/0004-txt-record-on-underscore-host.md), [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md))
- Input normalised on entry: `HTTP://WWW.Acme.com/path` becomes `acme.com`. Punycode/IDN, trailing dot, uppercase, port, path. A public suffix (`co.uk`) raises a warning, not a block. ([ADR-0010](decisions/0010-name-scope-is-flat.md))

**Setup instruction**

- At claim time the product queries the domain's NS records, identifies the provider, and shows the instruction adapted to that panel: the real field names, and the host value in the format that provider expects (some want `_app-challenge`, others the FQDN). About 6 providers mapped plus a generic fallback. No deep link into the panel. ([ADR-0015](decisions/0015-provider-specific-setup-instructions.md))

**Verification**

- Verification through multiple public resolvers over DoH — that is what the world sees. ([ADR-0009](decisions/0009-recursive-decides-authoritative-explains.md))
- Every check has three outcomes, never two: `found`, `absent`, `unresolvable`. The third is our failure and counts against the user nowhere in the system. ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md))
- Cadence driven by `next_check_at`, derived from (state, claim age, observed SOA MINIMUM, consecutive failures), drained by the service's own timer, with a 60s tick underneath only as a safety net. With the tab open, the client gets a fast lane rate limited per account+domain. ([ADR-0011](decisions/0011-check-cadence.md), [ADR-0028](decisions/0028-in-process-scheduler.md))

**Diagnosis when it fails**

- On a negative result the product queries the authoritative nameservers and separates "you did not create it" from "it has not propagated" — and, in the second case, quantifies the wait from the SOA MINIMUM. ([ADR-0009](decisions/0009-recursive-decides-authoritative-explains.md), [ADR-0012](decisions/0012-pending-hibernates-never-expires.md))
- Active probes at the places where the record usually ends up by mistake: double append (`_x.acme.com.acme.com`), token at the apex, another account's token, quotes/whitespace, N TXT records none matching, conflicting CNAME, NXDOMAIN vs NODATA, confusion with `www`, authoritative missing the record, SERVFAIL, lame delegation. Each becomes one sentence of cause plus one of fix. ([ADR-0016](decisions/0016-active-diagnosis-probe-catalogue.md))

**Waiting**

- Pending is the product's primary state, not an edge: a dedicated screen showing what is already known (does the authoritative have it? is there a negative cache? how long is left?), not a spinner.
- Pending never expires. Seven days of active checking with a decreasing interval, nudges on D+1 and D+3, then dormancy with a [Resume] that revives it instantly. Token preserved. ([ADR-0012](decisions/0012-pending-hibernates-never-expires.md))

**Revocation**

- A vanished record (`absent`) fires an immediate email and opens 72 hours of grace: the domain stays valid, with a visible warning. After the deadline the proof stops counting. It returns to valid on its own if the record reappears, with no new token. ([ADR-0013](decisions/0013-revocation-with-reversible-grace.md))
- Only `absent` advances the clock. `unresolvable` never does. ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md), [ADR-0013](decisions/0013-revocation-with-reversible-grace.md))
- And only a check that **actually ran** advances it: a manual recheck, or one triggered by someone opening the public proof link. No timer sweeps verified domains, so the verified screen dates its confirmation instead of asserting present-tense truth. ([ADR-0024](decisions/0024-grace-advances-only-on-real-recheck.md))

**Sharing the proof**

- A verified domain can issue a public proof link on demand: its own slug — never the DNS token — valid for 7 days, rechecked when opened with a 60s cache and a rate limit. Ownership unlocks nothing, so the proof itself has to be shareable. ([ADR-0002](decisions/0002-ownership-unlocks-nothing.md), [ADR-0030](decisions/0030-public-proof-page.md))

**Coexistence and contestation**

- Two accounts prove the same domain and both stay valid; existing owners are notified with the date, the method, and the new account's email as `m•••@acme.com` — local part masked, domain visible, because the domain is the recognition signal. ([ADR-0007](decisions/0007-coexistence-of-multiple-owners.md), [ADR-0017](decisions/0017-masked-email-disclosure.md))
- "That wasn't me" shows which TXT record to remove from your own zone to bring down the other account's proof — with the other token **unmasked**, since it is publicly queryable via `dig` — plus an immediate recheck. The dispute enters the timeline on both sides. ([ADR-0008](decisions/0008-contest-by-eviction-instructions.md))
- If the contester cannot remove the record, the product says explicitly that someone else controls their DNS, and that this is the urgent problem.

**Recovering from mistakes**

- Removing a domain archives it: it leaves the main list, token and history are preserved, it stops being checked, it stops counting as coexistence. ([ADR-0018](decisions/0018-archive-and-reclaim.md))
- The add-domain field autocompletes over archived domains; find one and the action is "Reactivate and recheck". If the TXT is still in the zone it verifies immediately and the user never touches DNS. ([ADR-0018](decisions/0018-archive-and-reclaim.md))
- "Delete permanently" exists for whoever wants to genuinely disappear.

**History**

- A per-domain timeline built from semantic product events, permanent. Raw evidence for each check in a separate append-only log, with short retention. ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md))
- The event "proved on 12 Mar" stays forever. What expires is the current validity, not the record that it happened. ([ADR-0013](decisions/0013-revocation-with-reversible-grace.md))

**Notification**

- **Webhook is the primary delivery**: the integrating app receives `domain.verified`, `domain.record_missing`, `domain.revoked`, `domain.claimed_by_other` and decides what to do. ([ADR-0021](decisions/0021-webhook-primary-email-optional.md))
- Managed email is optional and enabled per app: if the app passes `ownerEmail` on the claim, the product sends through the Resend API on their behalf. ([ADR-0021](decisions/0021-webhook-primary-email-optional.md))
- On either channel: only on state change, never on repetition. `unresolvable` never notifies. Ceiling of one email per domain per event type per 24 hours. ([ADR-0019](decisions/0019-notification-policy.md))

### Explicitly out of scope

| Cut | Why |
|---|---|
| Sending domains: DKIM, SPF, DMARC, MX | The brief says "prove ownership of a domain", not "verify a sending domain", and never references Resend's product. Depth comes from methods and failure states, not from more records. ([ADR-0001](decisions/0001-generic-ownership-not-sending-domain.md)) |
| Proof by role-address email (`admin@`, `postmaster@`) | It proves the MX, which is a *delegation* the zone owner can fabricate. Let's Encrypt never implemented it and the CA/B Forum kept restricting it. ([ADR-0003](decisions/0003-dns-only-proof-method.md)) |
| Proof by HTML file | It proves the web server — the same inversion. With no capability unlocked, there is no scope justifying a weaker proof. ([ADR-0003](decisions/0003-dns-only-proof-method.md)) |
| Any capability behind ownership | Verified ownership is the product. Coupling a capability would force inventing a surrounding product just to justify the flow. ([ADR-0002](decisions/0002-ownership-unlocks-nothing.md)) |
| Ownership arbitration: approval, transfer, freezing | The product cannot decide who the legitimate owner is — both accounts proved control of the zone. Approval would give a veto to whoever proved first, an attacker included. The remedy lives at the same root of trust as the proof: whoever controls the zone now deletes the other's TXT. ([ADR-0007](decisions/0007-coexistence-of-multiple-owners.md), [ADR-0008](decisions/0008-contest-by-eviction-instructions.md)) |
| Scope inheritance (`acme.com` → `app.acme.com`) | A consequence of having no coupled capability: inheritance would be an assertion without consequence. ([ADR-0010](decisions/0010-name-scope-is-flat.md)) |
| Blocking public suffixes | The proof protects itself — nobody writes a TXT record in the zone of `github.io`. A warning is enough. ([ADR-0010](decisions/0010-name-scope-is-flat.md)) |
| Teams, roles, member invitations | One app = one developer = one email. The tenancy that matters (app → end user) already exists in [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md); multi-member inside an app is not what the brief tests. |
| Proof portable across apps (signed attestation, "Link for domains") | Each app is its own issuer, using shared code. A trust network would require third parties to accept an external issuer's assertion at a privilege-escalation boundary — a problem the pluggable shape dissolves rather than solves. ([ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md)) |
| Publishing to npm, API key rotation, distributed rate limiting | The package's contract has to be real and demonstrable; operating it does not. Documented as a conscious cut. ([ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md)) |
| Separate deploys, per-schema database roles, two hostnames | Day one is code abstraction: separation of concerns, a named port, API design. The rest is a known and cheap retrofit — recorded in §3.10. ([ADR-0023](decisions/0023-day-one-abstraction-is-code-not-infra.md)) |
| A dedicated queue (Redis/BullMQ) | `next_check_at` in Postgres already is a queue, and it keeps the job state in the same transaction as the domain state. The dual write Redis introduces does not exist here. ([ADR-0014](decisions/0014-infrastructure-deferred-to-tech-design.md)) |
| Continuous monitoring of verified domains | None of the brief's four verbs needs perpetual re-checking of a domain already proved. The grace window stays, but its clock only moves on a check that actually ran — which removes a cron, a retention policy and two emails, and with them the failure mode of a policy applied by a clock nobody watches. ([ADR-0024](decisions/0024-grace-advances-only-on-real-recheck.md)) |

### Success criteria

- A domain with the correct TXT moves from claimed to proved with no manual intervention, and the screen shows an estimate derived from the SOA instead of a generic "up to 72h".
- Each of the 12 probes in the catalogue ([ADR-0016](decisions/0016-active-diagnosis-probe-catalogue.md)) produces, on a test domain built to reproduce it, one sentence of cause and one of fix — not a log dump.
- A simulated resolver outage produces `unresolvable` at scale **without** sending a single email and **without** advancing a single grace clock.
- Deleting a proved domain and reactivating it through the autocomplete returns the proof without the user opening their DNS panel.
- A second account proving the same domain: both stay valid, the first receives an email with the second's masked address, and the "that wasn't me" flow shows the other's full token plus a recheck button.
- A new app goes from zero to a created claim following only the quickstart: a server call, a component on the client, nothing else to read.
- `apps/ownsi` and the cross-origin example render the **same** `<DomainVerification />`, from the same package a customer would install.
- The headless hook exposes a stable `diagnosis.code` for the 12 probes, so an integrator can write their own copy without losing the diagnosis.
- The reviewer opens the public URL at any hour and the first screen paints with no perceptible cold start.

---

## 3. Tech design

*Closes [ADR-0014](decisions/0014-infrastructure-deferred-to-tech-design.md) (deferred infrastructure) and assumes the pluggable shape decided in [ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md).*

*Diagrams: `diagrams/system-design.png` (topology) and `diagrams/context-map.png` (strategic DDD). Editable source in the `Engineering` layer of `designs.pen`.*

The product is called **Ownsi**. The hosted app is `apps/ownsi`; the packages are `@ownsi/node` and `@ownsi/react`.

### 3.1 Product shape

One experience, two distributions: hosted (`apps/ownsi`) and embedded (`@ownsi/react`). The package is not an SDK with a sample app — it is the product packaged to fit somewhere else.

| Artefact | What it is |
|---|---|
| **HTTP API** | The public surface. Everything else talks to it |
| **`@ownsi/node`** | Server SDK. Creates claims, reads state, forces rechecks, issues client tokens |
| **`@ownsi/react`** | `<DomainVerification />` (drop-in) and `useDomainVerification()` (headless). The component is built *on top of* the hook — not two implementations |
| **`apps/ownsi`** | **The product.** Where the reviewer lands and where the brief's experience happens. Not a demo, not a console: the hosted app, which happens to also be the first consumer of its own SDK |

```
apps/ownsi (or customer app) ─sk_live_─▶ API ──DoH────────▶ public resolvers (verifies)
        │                              │
   clientToken                         ├──UDP/53────────▶ authoritative NS (explains)
        │                              │
        ▼                              ├──webhook───────▶ customer app's server
  end user's browser                   │
  <DomainVerification />               └──Resend────────▶ end user's email (optional, ADR-0021)
```

### 3.2 Tenancy and authentication

Two levels of identity, three credentials. ([ADR-0005](decisions/0005-two-level-identity.md), as revised)

| Credential | Who carries it | Scope | Lifetime |
|---|---|---|---|
| `sk_live_…` | the customer app's server | everything for that app | until revoked |
| `clientToken` | the end user's browser | **one** claim: read state + request recheck | 30 min, renewable by the app's server |
| magic link or Google | a user of `apps/ownsi` | that app's session | link 15 min, session 30 days |

**Why a client token per claim rather than a publishable key.** The component runs in the browser and cannot carry the secret key. A global publishable key would later require inventing a session concept to know *which* claim that browser may read. The per-claim token already is that answer, with one primitive fewer: it is born from `create`, carries the `domain_id` in its payload, and permits only two operations. No table — a JWT signed with the app's key, verified without a database round trip.

**The core has no users.** Whoever integrates identifies their own user through `owner`, an opaque string. There is no sign-up, password or session in the core.

**`apps/ownsi` has users, as any integrator would.** It authenticates by magic link (Resend) **and Google OAuth**, both from one self-hosted better-auth configuration ([ADR-0031](decisions/0031-magic-link-plus-google.md)), and passes `owner: user.id` to the core — exactly what a customer would do. It is one account: you enter the product by magic link, and whoever wants to embed it picks up an API key in settings. Developer mode is a tab, not a second product.

**Ownsi is not privileged.** It has a row in `apps` like any other, carries an `sk_live_` produced by the same generator, and goes through the same auth middleware. **Invariant: no `if (app.isFirstParty)` in the core** — the minute one exists, there is a path only Ownsi exercises and another only the customer exercises, and the second breaks in production. Worth a test guarding it.

**Anonymous claim.** The zone-reading screen runs before sign-in, so a claim can be born without a user: it is bound to the session cookie, and the magic link carries the `domain_id` so that signing in binds it to the account. If that account already has a claim on the same domain, the two merge and the **older token wins** — the invariant that keeps a pre-login detour from invalidating DNS work already done.

### 3.3 Data model

```sql
apps                id, name, slug, challenge_prefix, created_at
                    -- challenge_prefix default '_<slug>-challenge', configurable
api_keys            id, app_id, key_hash, key_prefix, last_used_at, revoked_at
-- schema `app` (a module of apps/ownsi, not of the core)
users               id, email, created_at
sessions            id, user_id, expires_at

domains             id, app_id, owner_ref, owner_email NULL, domain_ascii, domain_unicode,
                    token, state, next_check_at, consecutive_failures,
                    last_diagnosis_code, soa_minimum, ns_provider,
                    verified_at, grace_started_at, dormant_at, archived_at,
                    created_at
                    UNIQUE (app_id, owner_ref, domain_ascii)
                    INDEX (app_id, domain_ascii)      -- coexistence, ADR-0007
                    INDEX (state, next_check_at)      -- the queue, §3.8

domain_events       id, domain_id, type, payload jsonb, created_at   -- ADR-0006, permanent
dns_checks          id, domain_id, outcome, resolver, query,
                    response jsonb, latency_ms, ttl, created_at      -- ADR-0006, 30d retention

proof_links         slug, domain_id, issued_at, expires_at, revoked_at,
                    last_recheck_at, last_recheck_outcome             -- ADR-0030

webhook_endpoints   id, app_id, url, secret, events text[], disabled_at
webhook_deliveries  id, endpoint_id, event_id, attempts, next_attempt_at,
                    response_code, delivered_at
```

**Ownsi's row in `apps` is created by migration**, with the same slug format, a `challenge_prefix` derived from the slug, and a key hashed like any signup's. Looking at the table you cannot tell which one is first-party. `apps/ownsi` reads its key from the environment.

**Token per `(app_id, owner_ref, domain_ascii)`** — that is [ADR-0004](decisions/0004-txt-record-on-underscore-host.md) read through this tenancy. The original "account" became the pair (app, app's user).

**`challenge_prefix` per app** is what makes cross-app coexistence a non-problem: each app writes to its own host (`_acme-challenge` vs `_ownsi-challenge`), so zones do not mix. Within an app, the coexistence of [ADR-0007](decisions/0007-coexistence-of-multiple-owners.md) still holds for the usual reason: TXT accepts N records on one name.

**`last_diagnosis_code` is deliberate denormalisation:** the dashboard list renders a "Next step" column without running DNS.

**Internal state vs exposed state.** The `state` column holds `pending | verified | revoked | archived`. The API derives what the consumer reads:

| `state` + timestamps | `status` in the API |
|---|---|
| `pending` | `pending` (with `dormant: true` if `dormant_at` is set — [ADR-0012](decisions/0012-pending-hibernates-never-expires.md)) |
| `verified`, `grace_started_at` null | `verified` |
| `verified`, `grace_started_at` set | `at_risk` (+ `graceEndsAt` — [ADR-0013](decisions/0013-revocation-with-reversible-grace.md), [ADR-0024](decisions/0024-grace-advances-only-on-real-recheck.md)) |
| `revoked` | `revoked` |
| `archived` | `archived` ([ADR-0018](decisions/0018-archive-and-reclaim.md)) |

Deriving instead of multiplying the enum keeps every new rule from ADR-0012/ADR-0013 from becoming a new state in a migration. "Propagating" and "At risk" are labels on the screen, not rows in an enum: both fall out of (`state`, `last_diagnosis_code`, `grace_started_at`).

**Invariants, all testable:**

1. `token` is immutable per `(app_id, owner_ref, domain_ascii)` — recheck, archive and reactivation preserve it ([ADR-0004](decisions/0004-txt-record-on-underscore-host.md), [ADR-0018](decisions/0018-archive-and-reclaim.md))
2. `outcome` has three values, and only `absent` advances the grace clock ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md), [ADR-0013](decisions/0013-revocation-with-reversible-grace.md))
3. `archived` stops being checked **and** stops counting towards coexistence ([ADR-0018](decisions/0018-archive-and-reclaim.md))
4. Binding an anonymous claim to an account merges with any existing claim on the same domain and keeps the **older token** (§3.2)
5. At most one email per domain per event type every 24h ([ADR-0019](decisions/0019-notification-policy.md))
6. The grace clock only advances on a check that actually ran ([ADR-0024](decisions/0024-grace-advances-only-on-real-recheck.md))

**Semantic events** ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md)): `DomainClaimed` · `RecordFound` · `ProofGranted` · `CheckFailed(code)` · `PropagationDetected` · `ClaimDormant` · `ClaimResumed` · `ClaimArchived` · `ClaimReactivated` · `RecordDisappeared` · `ProofExpired` · `OtherAccountProved` · `ContestOpened` · `ProofLinkIssued`.

**Two rules broken on purpose.** One transaction writes `domains` + `dns_checks` + `domain_events` — the invariant "evidence and state never diverge" ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md)) is worth more than "one transaction per aggregate", and the orthodox alternative is event sourcing, which does not pay for itself in a week. And coexistence stays a domain service rather than its own bounded context: it is a query crossing accounts, and splitting it would produce a prettier map and worse code.

### 3.4 HTTP API

The vocabulary **mirrors Resend's own API** (`POST /domains`, `GET /domains/:id`, `POST /domains/:id/verify`). Anyone already using Resend does not learn a second dialect — and that is deliberate, not a coincidence.

```
POST   /v1/domains                    { domain, owner, ownerEmail? }
GET    /v1/domains/:id
GET    /v1/domains?owner=&status=
POST   /v1/domains/:id/verify         forces a recheck (rate limited)
POST   /v1/domains/:id/archive        ADR-0018
POST   /v1/domains/:id/restore        ADR-0018 — "reactivate and recheck"
DELETE /v1/domains/:id                delete permanently
GET    /v1/domains/:id/events         semantic timeline (ADR-0006)
POST   /v1/domains/:id/client_tokens  issues the browser token
POST   /v1/domains/:id/proof_links    issues a public proof link (ADR-0030)
GET    /p/:slug                       the public proof page, server-rendered
```

Every route declares `body` / `params` / `query` **and `response`**. Declaring the response is not optional, for three reasons that pay off together: it pins the exact type on the frontend (no `as Foo[]`), it stops an ORM object from serialising an internal field by accident, and it fills in the OpenAPI document.

Response of `POST /v1/domains`:

```json
{
  "id": "dom_2xK9…",
  "domain": "acme.com",
  "owner": "user_123",
  "status": "pending",
  "record": {
    "type": "TXT",
    "name": "_ownsi-challenge.acme.com",
    "value": "ownsi_v1_9f3a…"
  },
  "provider": { "id": "cloudflare", "name": "Cloudflare" },
  "clientToken": "ct_…",
  "nextCheckAt": "2026-08-19T14:03:00Z"
}
```

`GET /v1/domains/:id` adds, when it exists, the block that is the heart of the product:

```json
"diagnosis": {
  "code": "record_at_apex",
  "cause": "The token is on acme.com, not on _ownsi-challenge.acme.com.",
  "fix": "Move the record to the _ownsi-challenge host.",
  "observed": { "name": "acme.com", "value": "ownsi_v1_9f3a…" }
},
"waitEstimate": { "reason": "negative_cache", "secondsRemaining": 240 }
```

`code` is stable and enumerable (the 12 probes of [ADR-0016](decisions/0016-active-diagnosis-probe-catalogue.md)); `cause` and `fix` are text ready to render. Whoever wants their own copy uses the `code`; whoever does not, renders the sentences. That is the same contract the headless hook exposes.

**What a check returns is not `found` / `absent`.** `POST /v1/domains/:id/verify` answers `{ stages[], diagnosis, resolvers[], nextCheckAt }` — the three stages of the wireframe diagram (Nameservers → Record → Token) plus per-resolver evidence. The screen renders the disagreement between resolvers, because that disagreement *is* the propagation information ([ADR-0022](decisions/0022-resolver-quorum.md)).

**Conventions.** `Idempotency-Key` on every POST; errors shaped as `{ error: { code, message, docsUrl } }` with a stable `code`; cursor pagination; rate limiting per `app_id` and per `domain_id` separately (the fast lane of [ADR-0011](decisions/0011-check-cadence.md) is limited on the second).

### 3.5 SDK

```ts
import { Ownsi } from '@ownsi/node'
const ownsi = new Ownsi(process.env.OWNSI_API_KEY)

const claim = await ownsi.domains.create({ domain: 'acme.com', owner: user.id })
await ownsi.domains.verify(claim.id)
await ownsi.domains.list({ owner: user.id })
```

```tsx
import { DomainVerification, useDomainVerification } from '@ownsi/react'

// drop-in — covers provider instructions, pending, diagnosis and recovery
<DomainVerification clientToken={token} onVerified={handleVerified} />

// headless — same engine, your own UI
const { status, record, provider, diagnosis, waitEstimate, recheck, isChecking }
  = useDomainVerification({ clientToken })
```

Having both is deliberate: whoever wants five lines gets five lines, whoever has their own design system is not forced to fight ours. The component imports the hook — one implementation, two surfaces.

### 3.6 Webhooks

Public events, a stable subset of the internal semantic events of [ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md):

`domain.pending` · `domain.verified` · `domain.record_missing` · `domain.revoked` · `domain.claimed_by_other`

`unresolvable` **produces no event** — it is our failure, not the user's ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md), [ADR-0019](decisions/0019-notification-policy.md)). HMAC-SHA256 signature in the header (`t=` timestamp, `v1=` signature) to block replay. Retry with exponential backoff in `webhook_deliveries`, the same queue mechanics as `next_check_at`.

### 3.7 Verification engine

A check is four steps, and only the first one is allowed to decide.

1. **The recursive resolvers decide.** TXT query against Google, Cloudflare and Quad9 over DoH, in parallel (`Promise.allSettled`).
2. **The authoritative nameservers explain.** Only on a negative result: walk the labels up to the real authoritative zone, query its NS directly over UDP/53 and read the SOA. This is where "your provider has not published it" separates from "it is negative cache, ~N minutes left" ([ADR-0009](decisions/0009-recursive-decides-authoritative-explains.md)).
3. **The probes run.** The 12 probes of [ADR-0016](decisions/0016-active-diagnosis-probe-catalogue.md) pattern-match over the `DnsObservation` already collected — no further network. Each returns `{ code, cause, fix, observed }`, and `observed` is what the wireframes' "Evidence" panel renders.
4. **The transition happens.** A pure function turns (domain, diagnosis, now) into the new state, the events, `nextCheckIn`, and the effects to dispatch (§3.9).

**Resolver quorum ([ADR-0022](decisions/0022-resolver-quorum.md)).** The rule is majority, not "any of them":

| Result | Effect |
|---|---|
| ≥2 of 3 `found` | grant the proof |
| exactly 1 `found` | **stays pending**, and the UI says "published, still spreading" — the disagreement between resolvers *is* the information |
| ≥2 of 3 `absent` | open the grace clock ([ADR-0013](decisions/0013-revocation-with-reversible-grace.md)) |
| ≥2 of 3 fail | `unresolvable`: counts against nobody, sends no email, advances no clock ([ADR-0006](decisions/0006-events-checks-and-three-valued-outcome.md)) |

The three resolvers are three independent operators reached from one region, not three continents. The wireframe copy and the world map say anycast, not geography ([ADR-0029](decisions/0029-witnesses-are-three-resolvers.md)).

### 3.8 Scheduling

**`next_check_at` in Postgres is the queue** ([ADR-0011](decisions/0011-check-cadence.md), [ADR-0014](decisions/0014-infrastructure-deferred-to-tech-design.md)). Atomic dequeue with `SELECT … FOR UPDATE SKIP LOCKED`. The long-running process (§3.11) keeps an in-memory timer pointing at the next due domain — second-level precision without depending on a tick — and re-hydrates from the database on boot. A 60s tick runs underneath as a safety net, not as the primary mechanism.

**One clock per domain**, guaranteed by the dequeue itself: `SKIP LOCKED` means two workers never take the same row, and the row is the clock. This is the invariant a durable-workflow vendor would have had to enforce with a concurrency key ([ADR-0028](decisions/0028-in-process-scheduler.md)).

**Pausing and archiving take effect on the next wake-up.** The worker re-reads the domain at the top of every pass and exits if it is `archived` or dormant. The UI shows the new state immediately regardless, because it reads the database, not the scheduler.

**Manual "Check again" calls the same use case inside the request.** A check is idempotent, so racing the scheduler costs one extra DNS query and nothing else.

**No cron over verified domains.** Once a proof is granted, nothing re-checks it on a timer; the grace clock advances only when a check actually runs — a manual recheck, or someone opening the public proof page ([ADR-0024](decisions/0024-grace-advances-only-on-real-recheck.md)). The verified screen therefore dates its confirmation (`Confirmed 12 Mar`) instead of asserting present-tense truth.

**No Redis.** `next_check_at` in Postgres already is a queue, and the job state lives in the same transaction as the domain state — the dual write Redis introduces does not exist here. Document in the README from what scale that changes.

### 3.9 Internal architecture — functional core, imperative shell

Full clean architecture does not pay for itself with nine tables, but the dependency rule has one obvious place here: **the diagnosis engine is the product** ([ADR-0025](decisions/0025-functional-core-imperative-shell.md)). Pure, each of the 12 probes becomes a fixture test — which is what gets demonstrated in the video.

```
packages/core/src/
  model/         ← pure, no I/O
    domain.ts      Domain (value object + aggregate root)
    probes.ts      the 12 probes (ADR-0016)
    diagnose.ts    DnsObservation → Diagnosis
    transition.ts  the state machine (ADR-0006 / ADR-0012 / ADR-0013 / ADR-0024)
    schedule.ts    nextCheckIn(soa, age, failures)
  use-cases/     ← receive ports as parameters
    claim-domain.ts  verify-domain.ts  recover-domain.ts  issue-proof-link.ts
  ports.ts       ← DnsPort · DomainRepo · CheckLog · EventLog · Notifier · Clock
```

Nothing under `model/` imports the HTTP framework, the ORM, or `node:dns`. The adapters — DoH, authoritative UDP/53, a recorded fake, the ORM repository, Resend — live in `apps/api/infra`, and the HTTP layer only validates, calls a use case, and maps the response. No DI container: `Deps` is a parameter.

**The core returns effects as data; the shell executes them.**

```ts
export async function verifyDomain(id: string, d: Deps) {
  const domain = await d.domains.load(id)

  const recursive = await d.dns.resolveTxtQuorum(domain.challengeHost)
  const authoritative = recursive.found ? null
    : await d.dns.queryAuthoritative(domain.name, domain.challengeHost)

  const diagnosis = diagnose({ recursive, authoritative }, domain.token)  // PURE
  const next = transition(domain, diagnosis, d.clock.now())               // PURE

  await d.tx(async t => {
    await t.checks.append(id, { recursive, authoritative, diagnosis })
    await t.domains.apply(id, next.state, next.nextCheckAt, diagnosis.code)
    await t.events.append(id, next.events)
  })

  for (const e of next.effects) await dispatch(e, d)
  return next
}
```

The direct consequence: the success criterion "a resolver outage sends zero emails" (Section 2) becomes an assertion over an array, with no SMTP mock. And the same `verifyDomain` is what the "Check again" button, the scheduler and the public proof page all call — the scheduler is an adapter, not an orchestrator.

**The domain model.** `Domain` is the aggregate root and the shared kernel across the `claims`, `dns` and `attestation` contexts; `CheckRun` is append-only with short retention; `ProofLink` has its own lifecycle. The value objects carry the rules that would otherwise leak into views: `Domain.parse` normalises (punycode, trailing dot, `www`, scheme, port, path), consults the public suffix list and returns **the list of what it applied**, because the "Add domain" modal shows what was stripped; `MaskedEmail` encodes the privacy rule of [ADR-0017](decisions/0017-masked-email-disclosure.md) rather than formatting a string in a component.

**Naming.** `Domain`, not `DomainName`, despite the collision with DDD's own vocabulary — the brief says "claim a domain" and "prove ownership of a domain", and the brief is the ubiquitous language ([ADR-0026](decisions/0026-core-domain-is-diagnosis-and-recovery.md)). What yields is the folder: `model/` instead of `domain/`. "Claim" survives as a verb (`claimDomain`), not as a noun.

### 3.10 Module boundary — what is day one (ADR-0023)

Two modules, **one service, one deploy**. The separation is code design, not infrastructure.

```
packages/core     state machine, resolvers, probes, events.
                  No HTTP, no React, no user.
apps/api          HTTP adapter over core: /v1/*, /client/*, /p/*, webhooks, scheduler
packages/node     THE PORT. A typed interface — the signatures a customer would use.
                  Two possible implementations, one interface:
                    · direct  → calls core in-process   (what apps/ownsi uses today)
                    · fetch   → calls /v1 over HTTP     (what a customer uses)
packages/react    component + hook, talk to /client/* with a client token
apps/ownsi        the product. Users, magic link, UI. Consumes node + react
```

`apps/api` and `apps/ownsi` are two folders in the **same deploy**. What separates the modules is the direction of imports and the port, not the process. The edge in front of them (§3.11) is a CDN and reverse proxy, not a third module.

The port being the same interface in both modes is what makes a future separation cost one file: today `apps/ownsi` receives the direct implementation, tomorrow it receives the `fetch` one with an `OWNSI_API_URL`, and not a single call site changes.

The component **is not core**. Core is headless: `diagnosis.code` comes out of it, the rendered sentence comes out of React. If React enters the core, the core stops being consumable without React and the boundary blurs.

**Day one — costs nothing now, expensive to retrofit later:**

| Discipline | Why now |
|---|---|
| Unidirectional dependency: `core` never imports `apps/ownsi` | it is the precondition for all the others. If this breaks, none of them stays cheap |
| Named port: the app talks to the core through an interface carrying the signatures `@ownsi/node` would have | swapping the implementation for `fetch` later is one file |
| `owner_ref` as an opaque string, **with no FK** to `app.users` | a foreign key across the boundary is what turns "separate it one day" into a quarter |
| The core reads neither user nor email; `ownerEmail` arrives as a claim parameter | keeps the core ignorant of the app's domain |
| Stable public shapes: `diagnosis.code`, error codes, event names | they are contract. Renaming later breaks consumers |

**Known path, not built:**

| What | Retrofit cost |
|---|---|
| Two database roles with per-schema grants (`ownership` / `app`) | one `GRANT` and a connection string |
| Two hostnames (`ownsi.dev` / `api.ownsi.dev`) | DNS and routing. A different hostname is already a different origin, so it is also what makes CORS real |
| HTTP transport instead of the direct call | implement the port with `fetch` — one file |
| Separate deploys | config |
| Extracting `packages/core` into a published package | move a folder, **if** the dependency direction held |

The README paragraph, which is this decision's deliverable:

> It runs as one service. The two modules share no imports and talk only through a named port. Separating them means implementing that port with `fetch` and changing one environment variable. I did not separate because the scale does not ask for it — and the preparation cost zero infrastructure.

### 3.11 Infrastructure — closes ADR-0014

**One long-running Bun service on Railway, one Postgres on Neon, and Cloudflare in front as a single origin.**

| Constraint from ADR-0014 | How it is resolved |
|---|---|
| UDP/53 egress to authoritative NS ([ADR-0009](decisions/0009-recursive-decides-authoritative-explains.md)) | a normal Bun process on Railway, `node:dns` directly — no serverless egress restriction to spike around |
| Fine-grained scheduling ([ADR-0012](decisions/0012-pending-hibernates-never-expires.md) promises email with the tab closed) | a long-running process with its own timer (§3.8), not a cron tick |
| No spin-down (the reviewer opens the link at any hour) | the container is always up |
| First-party cookie and no CORS on the product's own surface | one origin at the edge |

**Single origin ([ADR-0027](decisions/0027-single-origin-edge-proxy.md)).** A Cloudflare Worker with Static Assets serves the built SPA **and** reverse-proxies `/api/*`, `/client/*` and `/p/*` to the Railway service. The browser never talks to two hosts, so the session cookie is first-party: no CORS, no `SameSite=None`, no API subdomain, no managed certificate. It also gives the public proof page real OG tags without a fullstack framework — `/p/:slug` is rendered by the API and proxied through.

The cross-origin example of §3.14 is what exercises CORS deliberately, on a different origin, which is the only place it should be exercised.

| Layer | Choice | Why |
|---|---|---|
| Monorepo | Bun workspaces (`apps/*`, `packages/*`), Biome | same shape already in production elsewhere |
| API | Bun + Elysia, TypeBox validation | one schema serves runtime validation, the typed client and OpenAPI |
| Contract | Eden Treaty + `@elysiajs/openapi` | end-to-end types with no codegen; `/openapi` is a review artefact |
| Frontend | Vite + React 19 + TanStack Query + Tailwind 4 + shadcn/ui | matches `shadcn.lib.pen` |
| Edge | Cloudflare Worker with Static Assets | single origin, zero cold start on first paint |
| API runtime | Railway | long-running, UDP/53, no spin-down |
| Database | Neon + Prisma 7 (`adapter-pg`, TCP driver) | a database branch per PR; `migrate deploy` in the pipeline |
| Auth | better-auth, self-hosted | magic link and Google in one config ([ADR-0031](decisions/0031-magic-link-plus-google.md)) |
| Email | Resend + React Email | [ADR-0019](decisions/0019-notification-policy.md), [ADR-0021](decisions/0021-webhook-primary-email-optional.md) |

**Rejected, and why.** Next.js — frontend and backend stay separate, and rendering the proof page in the API solves SSR and OG without a fullstack framework. Cloud Run — UDP/53 egress would have been a day-one spike with a real chance of failing, and Railway removes the question. A durable-workflow vendor — see [ADR-0028](decisions/0028-in-process-scheduler.md). Terraform — does not pay for itself in a week. Redis — there is no queue for it to improve (§3.8). Drizzle — Prisma's sharp edges are already documented and better-auth has an adapter.

### 3.12 Security and abuse

| Surface | Mitigation |
|---|---|
| Zone reading before sign-in (the "Reading the zone" wireframe) | rate limit per IP + a cache of (NS, SOA) per domain. Without it, this is an open DNS resolver |
| The public proof page rechecks on open | 60s cache per slug + rate limit; above that it shows the last result ([ADR-0030](decisions/0030-public-proof-page.md)) |
| Token | 128 bits of randomness, per (app, owner, domain), never reused across accounts |
| Another account's email | `MaskedEmail` — masked local part, visible domain ([ADR-0017](decisions/0017-masked-email-disclosure.md)) |
| The other party's token during contestation | shown **in full**, on purpose: it is already publicly queryable with `dig`, and masking it would only make the record harder to find and delete ([ADR-0008](decisions/0008-contest-by-eviction-instructions.md)) |
| Anonymous claim | bound to the session cookie; the magic link carries the `domain_id` and performs the binding (§3.2) |
| Client token | scoped to one domain, two operations, 30 minutes ([ADR-0020](decisions/0020-pluggable-product-not-hosted-app.md)) |

### 3.13 Docs

Docs are an evaluated artefact, not an appendix. A `/docs` route inside `apps/ownsi` itself:

1. **Quickstart** — the server creates the claim, the client renders the component. Has to fit on one screen.
2. **How verification works** — why TXT ([ADR-0004](decisions/0004-txt-record-on-underscore-host.md)), why a recursive resolver ([ADR-0009](decisions/0009-recursive-decides-authoritative-explains.md)), what each status means.
3. **API reference** — endpoints, errors with stable `code`, idempotency.
4. **Component reference** — props, rendered states, the headless hook.
5. **Webhooks** — events, payloads, signature verification.
6. **Diagnostics catalogue** — the 12 codes of [ADR-0016](decisions/0016-active-diagnosis-probe-catalogue.md), each with its cause and fix. This is the page that proves the copy is the product.

### 3.14 What is live

| URL | What it is |
|---|---|
| `ownsi.dev` | **the product** — add a domain, provider instruction, pending, diagnosis, recovery, coexistence, contestation, timeline |
| `ownsi.dev/p/:slug` | the public proof page — shareable artefact, rechecked on open ([ADR-0030](decisions/0030-public-proof-page.md)) |
| `ownsi.dev/docs` | quickstart, API reference, component reference, diagnostics catalogue |
| a live example, **on another origin** | a minimal page embedding `<DomainVerification />`. Proves the embedded distribution and is what genuinely exercises CORS |

The cross-origin example is not a sibling deliverable competing for attention: it is a docs page that runs. It costs hours.

**Scope guard.** The brief asks for *"helps a **user** prove ownership"*. The end user's experience is the primary deliverable — provider instructions, quantified pending, named diagnosis, recovery through autocomplete. The packaging demonstrates the second dimension and must not eat the first.

### 3.15 Testing

`bun test`, with the weight on the pure core:

- **12 probes × 1 fixture each** — a recorded `DnsObservation`, asserting on `diagnosis.code` and on the fix sentence
- **The transition table** — covers ADR-0006 / ADR-0012 / ADR-0013 / ADR-0024: `unresolvable` never advances grace, hibernation at 7 days, reactivation preserves the token, no timer advances a verified domain
- **Notification policy** — the 24h ceiling, and "a mass outage sends zero emails"
- **`Domain.parse`** — punycode, trailing dot, `www`, PSL, and the list of normalisations applied
- **Boundary guards** — a test that fails if `core` imports `apps/ownsi`, and one that fails if `isFirstParty` appears in the core (§3.2, §3.10)
- One end-to-end smoke test on the happy path

`DnsPort` has two implementations: real DoH, and a fake replaying recorded responses. That fake is what makes the demo deterministic — the video cannot depend on live DNS.

### 3.16 Day 1 risks and spikes

| Risk | Spike | Plan B |
|---|---|---|
| `node:dns` with `setServers` under Bun ([ADR-0009](decisions/0009-recursive-decides-authoritative-explains.md)) | 10 lines resolving the authoritative NS of a known domain | `dns-packet` over `Bun.udpSocket()` (~half a day), which also gives per-server timeout control |
| A verified domain on the Resend account for sending ([ADR-0005](decisions/0005-two-level-identity.md)) | confirm before anything else — it blocks magic link and every notification | Google OAuth alone gets the reviewer in ([ADR-0031](decisions/0031-magic-link-plus-google.md)); notifications degrade to webhooks ([ADR-0021](decisions/0021-webhook-primary-email-optional.md)) |
| Reproducing the 12 probes of [ADR-0016](decisions/0016-active-diagnosis-probe-catalogue.md) | build the test zone **early**; without it there is no way to prove the success criterion | — |
| `@ownsi/react` consumed by `apps/ownsi` through the workspace | monorepo with the package linked from day one, not at the end — otherwise dogfooding is just a claim | — |
| The Worker proxy adding a hop the SPA feels (§3.11) | measure `/api/health` through the proxy against the origin on day 1 | separate hostnames and pay the CORS cost |
| The dependency direction degrading under pressure (§3.10) | the boundary guards of §3.15, in CI from day 2 | — |

### 3.17 Open assumptions

Four product calls were made without confirmation. Each is recorded as an ADR, and each names its reversal point.

| Assumption | ADR | If it changes |
|---|---|---|
| "Witnesses" are three independent public resolvers from one region; the map illustrates anycast, not geography | [0029](decisions/0029-witnesses-are-three-resolvers.md) | real fan-out across 3 regions: ~1 day |
| The grace clock exists, but only advances on a check that actually ran. No cron over verified domains | [0024](decisions/0024-grace-advances-only-on-real-recheck.md) | restoring continuous monitoring: ~1 day plus two new emails |
| Public proof as designed: on-demand link, its own slug, 7 days, recheck on open | [0030](decisions/0030-public-proof-page.md) | a permanent link removes the clock; cutting it removes the `04 Public proof` group |
| Magic link (Resend) **and** Google, self-hosted better-auth | [0031](decisions/0031-magic-link-plus-google.md) | magic link alone removes the Google Console credentials (~1h less) |

---

## 4. Milestones

One week, one developer. Every day ends with something demonstrable and live — the deploy is the **first** milestone, not the last, because the reviewer opens the URL at an arbitrary hour.

### D1 — Skeleton live
The spikes of §3.16 (`node:dns` under Bun, the verified Resend domain, the proxy hop). Bun monorepo, Elysia with one route, blank SPA, the Worker proxying, Neon with `migrate deploy` in the pipeline, Railway deploy.
**Done when:** `ownsi.dev` responds and `/api/health` comes back from Railway through the proxy.

### D2 — Pure core
`Domain`, `probes`, `diagnose`, `transition`, `schedule`. Zero infrastructure, zero routes. Fixtures for the 12 probes, and the boundary guards in CI.
**Done when:** `bun test` covers the 12 probes and the transition table, and nothing under `packages/core/model` imports the ORM, Elysia or `node:dns`.

### D3 — Real verification
`DnsPort` with DoH quorum and the authoritative path, `claimDomain`, `verifyDomain`, persistence, the event timeline. Provider registry with ~6 entries ([ADR-0015](decisions/0015-provider-specific-setup-instructions.md)).
**Done when:** a test domain with the right TXT goes from claimed to verified with no intervention, and a domain with a planted mistake names the right cause.

### D4 — Clock and identity
The in-process scheduler (timer + `SKIP LOCKED` + the 60s safety tick), better-auth with magic link and Google, the anonymous claim and its binding, state-change emails with the 24h ceiling.
**Done when:** I close the tab, the record propagates, and the email arrives.

### D5 — The main flow, in the browser
Claim → zone reading → sign-in → record screen with live state → verified. Structured evidence and the three-stage diagram.
**Done when:** the whole happy path runs in the browser, with no Postman.

### D6 — Recovery, coexistence and packaging
`recoverDomain` unifying archive / reactivate / hibernate / resume, autocomplete over archived domains, coexistence with the masked email, contestation with eviction instructions, the public proof page `/p/:slug` with OG tags. `@ownsi/react` extracted into a package and consumed by `apps/ownsi` through the workspace.
**Done when:** I delete a verified domain, type it again, and the proof comes back without me opening a DNS panel — and the screen that does it is the packaged component, not a copy of it.

### D7 — Docs and demo
The `/docs` route, the cross-origin example, a real test zone with the 12 failures pre-planted, the recorded DNS fake, a README with the tradeoffs (including why no Redis and at what scale that changes), and the 3–5 minute video.
**Done when:** each of the 12 probes has a domain that reproduces it live, and the quickstart works when pasted into a blank project.

### Cut ladder

If it slips, cut in this order — bottom-up, and what is above is never sacrificed for what is below:

1. Webhooks (email carries the notification alone — [ADR-0021](decisions/0021-webhook-primary-email-optional.md) in reverse)
2. The API keys tab in settings (the key is issued by migration)
3. Publishing `@ownsi/node` (the port stays; only the release goes)
4. Google OAuth (magic link survives)
5. The cross-origin example (the embedded distribution is then shown in docs, not running)
6. The public proof page (the proof becomes the internal screen only)
7. Contestation (the coexistence notification survives)
8. Mapped providers: from 6 to 3 plus a generic fallback
9. Probes: from 12 to the 6 most frequent

**Never cut:** the three-valued outcome, the named diagnosis, the pending screen, and recovery through reactivation. Those are the four the brief asks for by name.

---

## Decisions holding up the rest

A compact table. The full log, with rejected alternatives, is in `docs/domain-ownership/decisions/`.

| Topic | Considered | Chosen | Why |
|---|---|---|---|
| Proof scope ([0001](decisions/0001-generic-ownership-not-sending-domain.md)) | Sending domain (DKIM/SPF/DMARC) vs generic ownership | Generic ownership | The brief asks to "prove ownership", not to "verify a sending domain" |
| Method ([0003](decisions/0003-dns-only-proof-method.md)) | DNS + email + HTML file | DNS only | Email and HTTP prove delegations of the zone; the zone is the root. Proof strength has to match what it unlocks |
| Record ([0004](decisions/0004-txt-record-on-underscore-host.md)) | CNAME vs TXT | TXT on an underscore host | RFC 1034: a single CNAME per name, and CNAME cannot coexist with other types. TXT accepts N — which is the shape of coexistence |
| Check outcome ([0006](decisions/0006-events-checks-and-three-valued-outcome.md)) | Boolean vs three values | `found` / `absent` / `unresolvable` | Collapsing the third makes our own outage revoke domains of users who did nothing |
| Resolution ([0009](decisions/0009-recursive-decides-authoritative-explains.md)) | Authoritative vs recursive | Recursive decides, authoritative explains | Verify what the world sees; the difference between the two *is* the propagation diagnosis |
| Coexistence ([0007](decisions/0007-coexistence-of-multiple-owners.md)) | Transfer vs approval vs coexistence | Coexist + notify | A token per account makes both proofs true and independent facts; legitimate cases (agency/client) are common |
| Contestation ([0008](decisions/0008-contest-by-eviction-instructions.md)) | Freeze vs arbitrate vs instruct eviction | Eviction instructions | The product does not arbitrate ownership, but whoever controls the zone today deletes the other's TXT — the remedy at the same root of trust |
| Revocation ([0013](decisions/0013-revocation-with-reversible-grace.md)) | Immediate vs never vs grace | 72h reversible grace | Tolerates transient failure, which is the majority, without leaving a 2024 proof standing on a record gone for 18 months |
| Pending ([0012](decisions/0012-pending-hibernates-never-expires.md)) | Expires in 72h vs never expires | Hibernates, does not expire | Expiring would punish whoever was right but slow, and force another trip to DNS |
| Removal ([0018](decisions/0018-archive-and-reclaim.md)) | Delete vs soft delete vs archive | Archive + autocomplete | Recovery at the point of intent, without requiring the user to know an archive exists |
| Product shape ([0020](decisions/0020-pluggable-product-not-hosted-app.md)) | Hosted app vs attestation network vs pluggable product | Pluggable: API + SDK + component | A network would need third parties trusting an external issuer; pluggable shares code, not trust — and it is the surface Resend evaluates (docs, API, DX) |
| Tenancy ([0005](decisions/0005-two-level-identity.md), rev.) | Account per end-user email vs API key + opaque `owner` | API key + `owner` | The end user is the app's customer, not ours; it removes a sign-up from the critical path instead of adding one |
| Notification ([0021](decisions/0021-webhook-primary-email-optional.md)) | Email only vs webhook only vs webhook + optional email | Webhook primary, email optional per app | Infrastructure delivers the fact to the app; emailing the end user directly is a convenience not every app wants |
| Resolver quorum ([0022](decisions/0022-resolver-quorum.md)) | Any of them vs majority vs unanimity | Majority of 3 | Unanimity delays whoever already published; "any of them" accepts a poisoned local view. And the 1-of-3 case becomes a UI state, not an error |
| Day-one abstraction ([0023](decisions/0023-day-one-abstraction-is-code-not-infra.md)) | Two deploys vs modules in one service | Modules, one deploy | Separation is code design; roles, hostnames and separate deploys are a cheap retrofit **if** the dependency direction holds. Not separating while knowing the cost shows more judgement than separating |
| Scheduling ([0011](decisions/0011-check-cadence.md)) | Redis queue vs `next_check_at` in Postgres | Postgres | Job state in the same transaction as domain state; no dual write |
| What holds the clock ([0028](decisions/0028-in-process-scheduler.md)) | Durable-workflow vendor vs in-process timer | In-process timer over `next_check_at` | The process is already long-running for UDP/53 and no spin-down; once it is, an in-memory timer beats an external clock at the same granularity |
| Origin ([0027](decisions/0027-single-origin-edge-proxy.md)) | Two hostnames vs one origin | The edge serves the SPA and proxies the API | First-party cookie, no CORS — and the public proof page gets real OG tags without a fullstack framework |
| Internal architecture ([0025](decisions/0025-functional-core-imperative-shell.md)) | Full clean architecture vs a pure core | Functional core, imperative shell | The diagnosis engine is the product; pure, each probe becomes a fixture test and "an outage sends zero emails" becomes an assertion over an array |
| Core domain ([0026](decisions/0026-core-domain-is-diagnosis-and-recovery.md)) | The proof vs the diagnosis | Diagnosis and recovery | Proving ownership is commodity; the brief asks to understand the failure and come back from it |
| Monitoring ([0024](decisions/0024-grace-advances-only-on-real-recheck.md)) | Cron over verified domains vs grace on real checks only | Only a check that ran moves the clock | None of the brief's four verbs needs perpetual re-checking, and a policy applied by an unwatched clock is the failure mode ADR-0006 exists to avoid |
| Public proof ([0030](decisions/0030-public-proof-page.md)) | Permanent link vs on-demand link vs no page | On-demand, own slug, 7 days | If ownership unlocks nothing and *is* the product, it has to be shareable — and the slug is not the zone secret |
