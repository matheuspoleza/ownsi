---
feature: domain-ownership
phase: prd
updated: 2026-08-19
---

# Reference research — domain ownership proof

What this file is: a survey of how 30 real products design domain verification, gathered to inform
the product described in `docs/domain-ownership/prd.md` (ownership proof via a TXT record, with
failure diagnosis, waiting, revocation, coexistence and recovery from mistakes).

Source: the Mobbin library (screens + flows, web platform), consulted on 19 Aug 2026. All images
live in `docs/domain-ownership/references/screenshots/`, named
`{nn}-{dimension}-{app}-{what-it-shows}.webp`. Each has its canonical Mobbin link in the table in
Section 5 — open it there to see the screen in the context of its app.

This file covers screenshots `01`–`40`. A second round, aimed at the "claim" pattern (claiming a
resource that already has an owner) and at contestation, lives in
`docs/domain-ownership/references/claim-patterns.md` and covers `41`–`55`.

The dimensions come from the PRD, not from Mobbin: `instruction` (setup instruction), `pending`
(waiting), `failure`, `partial` (partially verified), `success`, `list` (list / aggregate state),
`provider` (per-provider adaptation), `recovery` (delete/restore), `conflict` (two owners), `grace`
(the window before validity is lost), `flow` (the whole journey).

---

## 1. How to read the folder in 30 seconds

| If you are designing… | Start with |
|---|---|
| The TXT instruction card | `01`, `03`, `05`, `06`, `10` |
| The waiting screen | `19`, `21`, `11` — and `18` as a counterexample |
| The failure screen | `15`, `16` — and `13`, `14`, `17` as counterexamples |
| The domain list | `08`, `12`, `09` |
| Provider-adapted instructions | `06`, `29`, `31` |
| Delete / reactivate | `33`, `32`, `39` |
| A second account proving the same domain | `15`, `37`, `38` |
| The 72-hour grace window | `39`, `40` |

---

## 2. Synthesis by dimension

### 2.1 Setup instruction — the TXT record card

The market pattern is stable and dull: a title, a paragraph saying "go to your DNS provider", a
`Type / Name / Value / TTL` table with a copy icon per cell, and a "Verify" button. Nearly everyone
does this (`01`, `02`, `04`, `06`, `10`, `12`, `36`).

Three details separate the good from the average:

- **Name the trap before it happens.** Outseta (`05`) writes it into the body of the instruction:
  *"Many DNS providers will automatically add the `.website-nu-sand-53.vercel.app` domain name to
  the end of the Host field"*. That is the double append (`_x.acme.com.acme.com`) from the PRD's
  probe catalogue ([ADR-0016](../decisions/0016-active-diagnosis-probe-catalogue.md)), warned about
  **before** it becomes a support ticket. incident.io (`10`) does the equivalent for Cloudflare:
  *"be careful to create these records in 'DNS-only' mode, not proxy mode"*. **Copy this.** In our
  case the warning must be conditional on the detected provider, not a generic paragraph for
  everyone.
- **Recognise that the claimant is often not the person with DNS access.** Langdock (`03`) puts,
  underneath the TXT value, a "Don't have access to DNS settings? Send this email to your
  infrastructure team" block with a **ready-made subject and body** (Type/Host/Value + deadline),
  each with its own copy button. It is the best idea in the entire survey and nobody else has it. It
  fits our audience of "has the registrar panel open and has never heard of a TXT record" — and the
  actor who has no panel at all.
- **Detect the provider and speak its language.** Resend (`06`) shows `PROVIDER: Cloudflare` as a
  first-class piece of metadata and writes *"Access the DNS settings page of Cloudflare and add all
  the following DNS records"*. That is exactly
  [ADR-0015](../decisions/0015-provider-specific-setup-instructions.md), already validated in
  production by Resend itself.

Smaller details worth stealing: Google Workspace (`01`) offers an **alternative method** (TXT or
CNAME) collapsed inside the same card, plus a *"Come back here and confirm once you have updated the
code"* checkbox that unlocks the Confirm button — the user declares they did it, the product
verifies. Langdock (`03`) shows a **token expiry** ("expires on 29. Apr"); in our product the token
is stable and never expires ([ADR-0004](../decisions/0004-txt-record-on-underscore-host.md)), so the
honest equivalent is to say so: "this value never changes" — which removes the fear of missing a
window.

**Avoid:** the "Go to Cloudflare" of Google Workspace (`01`) is a deep link into the provider's
panel; the PRD cuts that explicitly
([ADR-0015](../decisions/0015-provider-specific-setup-instructions.md)) because the link breaks and
ages silently.

### 2.2 Waiting — the worst-designed state in the market

Three tiers, in order:

1. **Worst:** Google Workspace (`18`) — full screen, a timer, an indeterminate bar, *"Leave this page
   open while we verify"*. The wait becomes a prison: no information, no exit, and closing the tab
   feels like cancelling.
2. **Average:** Savee (`20`) and Cloudflare (`21`) — the "5 mins to 48 hours" / "1-2 hours but may
   take up to 24 hours" band. Honest about the uncertainty, useless as an expectation. It is
   literally the "may take up to 72 hours" the PRD promises never to write. Cloudflare at least says
   *"We are checking your status periodically"* and offers a "Check nameservers now" — the user knows
   the system is working without them.
3. **Best:** Resend (`19`) — the pending domain's page shows a **timeline of domain events**
   (`Domain added 16/mar 2:02 PM → DNS verified 17/mar 2:41 PM → Verifying domain`) plus a status
   sentence, *"Looking for DNS records: This may take a few hours depending on Cloudflare's
   propagation time"*. The wait stops being a vacuum because it has history, and the estimate is
   **attributed to a cause** (the provider).

AWS Amplify (`11`) contributes the vertical stepper with the current step explained in prose ("SSL
creation in progress… This may take a few minutes") — good for separating "what already happened"
from "where we are stuck".

**What this means for our product.** The PRD's pending screen is a direct evolution of `19`: same
spine (permanent timeline + status sentence), but the sentence stops being "depends on your
provider" and becomes derived from what we already know — does the authoritative have the record? is
there a negative cache? how long is left per SOA MINIMUM. No reference in the survey quantifies the
wait. That is empty market space.

### 2.3 Failure — where everyone gets it wrong

The dominant pattern is **not diagnosing**: a red alert saying it was not found, and the rest is the
user's problem.

- Google Workspace (`13`) is the archetype of the PRD's anti-pattern: *"Unable to verify at the
  moment"*, a friendly illustration, and **three numbered hypotheses** ("might be an issue with your
  host", "check whether you deleted pre-existing MX records", "may take up to 48h"). Three guesses
  stacked = zero information. The user has to test each one.
- Circle (`17`) reduces the failure to a **red toast** — the most important information on the screen
  appears in its most ephemeral element, and then disappears.
- folk (`14`) escalates to a human: *"Your domain isn't connected yet. You can book a call with us"*.
  It confesses that the product does not know what happened.
- AutoSend (`04`) is at least specific about the raw fact: *"No DNS records found — please add the
  DNS records below"*, with the table right underneath and a Refresh.

The two best:

- **Vercel (`15`)** — in the claim flow the error is *"TXT record not found: The verification TXT
  record was not found. Please add the record shown above and wait a few minutes for it to propagate
  before trying again."* It names the exact record, and the error is **anchored below the instruction
  it contradicts**, not in a toast.
- **GitBook (`16`)** — the failure lives inside the stepper: `✗ Invalid configuration for
  test.example.com`, with the following steps greyed out, and the explanation *"The provided hostname
  is missing a CNAME record pointing to `…gitbook.io` **or** the update has not yet propagated"* +
  "Try again". Best of the survey: it shows **where in the chain** it broke and what has not even
  started. Its defect is the "or": it merges "you did not create it" and "it has not propagated yet"
  into one sentence — two causes with opposite fixes (change DNS vs change nothing). That is exactly
  the separation the PRD makes by querying the authoritative
  ([ADR-0009](../decisions/0009-recursive-decides-authoritative-explains.md) /
  [ADR-0012](../decisions/0012-pending-hibernates-never-expires.md)).

**The design rule that falls out of this:** error text lives in the body of the screen, next to the
instruction; the cause is one sentence, the fix is another, and the two are never glued together
with "or". What 12 of 12 references fail to do: distinguish "we did not find it" (the user's failure)
from "we could not look" (ours — the PRD's `unresolvable`,
[ADR-0006](../decisions/0006-events-checks-and-three-valued-outcome.md)). No product in the sample
has that third state.

### 2.4 Partial state and per-record granularity

AutoSend (`22`) shows the middle ground well: an amber band, *"Domain ownership verified.
Configuration pending."*, and a table mixing `VERIFIED` and `PENDING` row by row. Aggregate status on
top, per-record detail underneath. Churnkey (`12`) does the same through expansion: the domain row
has a badge, and opening it reveals the records with badges of their own.

Our product has **one** TXT record, so per-row granularity does not apply — but the structural idea
does: **one verdict on top, raw evidence underneath**. That is the "instruction on top, evidence
underneath" of Section 1 of the PRD, and these two screens show the layout already solved.

### 2.5 Success — the pattern is noise

A congratulations modal, an illustration, implied confetti: Polywork (`26`), AutoSend (`25`), Google
Workspace (`24`). All of them sell the next step (turn on Gmail, send a test email) because in those
products ownership is a means to something else. **In our product ownership is the end**
([ADR-0002](../decisions/0002-ownership-unlocks-nothing.md)) — there is no next step to push, so the
celebratory modal has no function.

The two that do serve us:

- **folk (`28`)** — success **replaces the instruction in place**: the "Verify CNAME records" step
  gets a `Verified` badge and the sentence "Your domain has been verified". No new screen, no modal.
  The user returns to the page and understands the state in a second.
- **Air (`27`)** — a minimal dialog, one sentence, one button. No illustration.

A detail to steal from Polywork (`26`) and Savee (`20`): *"We will notify you when everything is
working"* / *"You will receive an email when this process is complete"* — the explicit promise of an
email is what authorises the user to close the tab. It pairs with the PRD's notification policy
(email only on state change, [ADR-0019](../decisions/0019-notification-policy.md)).

### 2.6 Domain list

Three treatments of status:

- **Badge** (Okta `09`, Churnkey `12`, Hashnode `07`) — compact, ambiguous: "Setup in progress" does
  not say whether you still have to act.
- **Sentence** (Copilot `08`) — `Verifying · validating records` / `Active · correct records have
  been entered`. Takes more room and **says what is happening**. For a product whose thesis is "the
  generic message is the problem", this is the right treatment.
- **Inline, with no intermediate screen** (Tally `35`) — right after adding, the row already shows
  "Verifying DNS records… · Created just now". Good for the moment immediately after the claim.

Empty state: Tally (`34`) is the correct minimum — icon, "No custom domains yet", a button, and a
"Learn about custom domains" link.

### 2.7 Per-provider adaptation

Nobody in the sample does NS detection with adapted instructions — Resend (`06`) comes closest by
showing the detected provider as metadata. The nearest pattern in spirit is Dub's **platform grid**
(`29`): tiles with logos (React, GTM, Framer, Shopify, WordPress, Webflow) and, always, a **"Manual
Installation"** tile as the escape hatch. incident.io (`31`) repeats the structure with "Create teams
manually" at the end of the list.

Lesson for our generic fallback (~6 mapped providers + generic,
[ADR-0015](../decisions/0015-provider-specific-setup-instructions.md)): the fallback is not an error
state, it is **an item in the list, at the same visual weight as the others**. And Dub notes
"Estimated time: 1 hour" at the top — declaring the cost before you start is honest and cheap.

### 2.8 Recovery: deleting, and what happens next

- **Resend (`33`)** — "Delete team" lists the **inventory of what is attached** (0 Members, 1
  Webhooks, 1 Domains, 2 API Keys), warns that "the deletion will be fully processed in 7 days" and
  asks you to type the name. Inventory + deadline + proportional friction.
- **Productboard (`32`)** — the consequences are **checkboxes you have to tick** ("Remove 1 card from
  the Portal", "Unlink 1 insight"). Friction that teaches.
- **Cloaked (`39`)** — the best one for our case: *"Your account will be deleted on December 29,
  2023. You'll still have access and be able to restore your account within the next 30 days."*
  **Absolute date + restoration window + what to do in it.**

The PRD does not delete: it archives, preserves token and history, and hands everything back through
the autocomplete ([ADR-0018](../decisions/0018-archive-and-reclaim.md)). That is gentler than any
reference — so the friction should be proportional: `33`/`32` is the model for "delete permanently",
not for "remove".

### 2.9 Coexistence and contestation — nearly a desert

One direct find: **Vercel (`15`), "Claim Domain Ownership"** — *"This domain is registered with
another Vercel account. Verify DNS ownership to claim it."* It acknowledges that another account
already has the domain and resolves it at the same root of trust (prove it in DNS), with no human
arbitration. Identical to the PRD's thesis
([ADR-0007](../decisions/0007-coexistence-of-multiple-owners.md) /
[ADR-0008](../decisions/0008-contest-by-eviction-instructions.md)). Useful detail: the amber note
says you **may remove the record after verifying** — it gives the end of the story alongside the
beginning.

Two adjacent patterns, since nobody designs "that wasn't me" for domains:

- **Supabase (`37`)** — "Potential issue detected": names the risk in two sentences and offers **two
  exits labelled by their consequence** ("Run without RLS" / "Run and enable RLS"), not "OK/Cancel".
  That is the shape of our contestation dialog.
- **OKX (`38`)** — before reporting, three numbered steps of **what will happen next** ("Make a report
  → Answer follow-up questions → Receive investigation updates"). Our equivalent is shorter and
  stronger because the resolution belongs to the user: "delete this TXT from your zone → we recheck →
  the other account's proof falls".

### 2.10 The grace window

- **Cloaked (`39`)** — absolute date and explicit reversibility (see 2.8). It is the model for the
  72-hour revocation grace ([ADR-0013](../decisions/0013-revocation-with-reversible-grace.md)):
  *"the record disappeared on 19 Aug 14:20; the proof stays valid until 22 Aug 14:20"*.
- **ManyChat (`40`)** — after the deadline, a **persistent banner at the top** ("Your subscription has
  expired and your account is now on the Free plan") plus the state reflected in the object itself
  ("Plan: Expired"). A degraded state has to be visible from any screen, not only on the object's
  page.

---

## 3. Where the references end (and the product begins)

Five things **none** of the 30 products in the sample does. Each is a PRD requirement and therefore
where this product differentiates — and where there is no ready-made pattern to copy:

1. **Naming the specific cause.** Everyone stops at "not found" or stacks hypotheses (`13`). Nobody
   says "your registrar appended the domain again on the host: the record ended up at
   `_app-challenge.acme.com.acme.com`".
2. **Separating the user's failure from ours.** No product has the third state (`unresolvable`).
   Everyone treats "I could not look" as "you did not do it" — and some send email on top of that.
3. **Quantifying the wait.** The market ceiling is "5 min to 48 h" (`20`, `21`). Nobody derives the
   estimate from the observed SOA MINIMUM, nor says "the authoritative already has it, only the cache
   is left".
4. **Recovery without redoing DNS work.** No reference archives while preserving the token, nor
   offers "reactivate and recheck". Deleting is always destructive (`32`, `33`).
5. **Self-service contestation.** Vercel (`15`) acknowledges the conflict but the remedy is only
   "prove it too". Nobody shows the existing owner **which record to delete** to bring down someone
   else's proof.

## 4. Design decisions this research supports

| Decision | Reference that supports it | Reference that teaches the opposite |
|---|---|---|
| Pending is the primary state, with a timeline | Resend `19`, AWS `11` | Google Workspace `18` (spinner-prison) |
| Error in the body of the screen, next to the instruction | Vercel `15`, GitBook `16` | Circle `17` (toast), folk `14` (book a call) |
| One cause + one fix, never an "or" | GitBook `16` (comes close) | Google Workspace `13` (three hypotheses) |
| Status as a sentence, not a badge | Copilot `08` | Okta `09` ("Setup in progress") |
| Instruction in the provider's vocabulary | Resend `06`, Outseta `05`, incident.io `10` | — |
| Generic fallback as an item of equal weight | Dub `29`, incident.io `31` | — |
| Success replaces the instruction, no modal | folk `28`, Air `27` | Polywork `26`, AutoSend `25` |
| Grace with an absolute date + how to reverse it | Cloaked `39`, ManyChat `40` | Savee `20` ("5 mins to 48 hours") |
| Conflict resolved at the root of trust | Vercel `15`, Supabase `37` | — |
| A "I don't have DNS access" block with a ready-made email | Langdock `03` | — |

---

## 5. Full inventory

| # | File | App | Dimension | What it shows |
|---|---|---|---|---|
| 01 | `01-instruction-google-workspace.webp` | Google Workspace | instruction | TXT card (Name/Content/TTL), alternative CNAME method collapsed, "Go to Cloudflare" deep link, self-declaration checkbox before Confirm — [Mobbin](https://mobbin.com/screens/f238c4b7-1fe5-47a3-9b33-7ec625531ada) |
| 02 | `02-instruction-grok-pending.webp` | Grok | instruction | Minimal domain page: Pending badge, date added, TXT value with copy, "we will confirm ownership within 24 hours" — [Mobbin](https://mobbin.com/screens/68e05949-06ff-43d9-aa74-51ede25936d4) |
| 03 | `03-instruction-langdock-email-to-it.webp` | Langdock | instruction | "Don't have access to DNS settings?" block with a ready-made subject and body for the infra team; token with an expiry date — [Mobbin](https://mobbin.com/screens/7f2c86d9-1575-49ca-9059-19b7278b0bcc) |
| 04 | `04-failure-autosend-no-records-found.webp` | AutoSend | failure | "No DNS records found" alert + a table of pending records with per-cell copy + Refresh — [Mobbin](https://mobbin.com/screens/2c9c4317-dfc7-4957-a9ca-79169ad9bc97) |
| 05 | `05-instruction-outseta-steps-host-note.webp` | Outseta | instruction | Numbered steps and the double-append warning on the Host field, written before the error happens — [Mobbin](https://mobbin.com/screens/18bd2af6-3823-4b98-aa54-80ba10af9e15) |
| 06 | `06-instruction-resend-provider-detected.webp` | Resend | instruction / provider | Detected provider (Cloudflare) as metadata; records grouped by purpose; "Auto configure" — [Mobbin](https://mobbin.com/screens/ee71c976-8c06-4610-b736-afbb27829f87) |
| 07 | `07-list-hashnode-verifying.webp` | Hashnode | list | URL/Status/Added/Actions table showing "Verifying"; apex and `www` as separate rows — [Mobbin](https://mobbin.com/screens/c049ea4a-0b28-4215-b985-3b61d2c5366b) |
| 08 | `08-list-copilot-status-sentence.webp` | Copilot | list | Status as a sentence: "Verifying · validating records" / "Active · correct records have been entered" — [Mobbin](https://mobbin.com/screens/7ce56d42-8ac9-457f-a853-05196069789b) |
| 09 | `09-list-okta-domains-table.webp` | Okta | list | Dense table with "Setup in progress" and certificate columns — an ambiguous badge — [Mobbin](https://mobbin.com/screens/3db7378a-0a63-4280-b9dc-5e194ee41bfe) |
| 10 | `10-instruction-incidentio-numbered-warning.webp` | incident.io | instruction | Three numbered steps, a "DNS-only, not proxy mode" warning for Cloudflare, "Domain is pending verification" + Check — [Mobbin](https://mobbin.com/screens/a01b085b-86f0-4b47-b1d8-fed6c8914f6a) |
| 11 | `11-pending-aws-stepper-progress.webp` | AWS Amplify | pending | Vertical stepper with the current step explained in prose + a link to the troubleshooting guide — [Mobbin](https://mobbin.com/screens/1d706922-62c3-433e-a760-244137f06a5e) |
| 12 | `12-list-churnkey-inline-expand.webp` | Churnkey | list / partial | Expandable domain row revealing records with their own status; "Sender Domain Added" toast — [Mobbin](https://mobbin.com/screens/12e97121-20e6-43fc-9e37-1e1b3d1f85ba) |
| 13 | `13-failure-google-workspace-generic-guesses.webp` | Google Workspace | failure | **Anti-pattern:** "Unable to verify at the moment" + three numbered hypotheses + Retry — [Mobbin](https://mobbin.com/screens/216d90ce-306a-40a9-b705-ebb9e610e41b) |
| 14 | `14-failure-folk-modal-domain-not-connected.webp` | folk | failure | **Anti-pattern:** "Domain not connected", and the exit is booking a call with support — [Mobbin](https://mobbin.com/screens/bf89809a-e231-4f22-9ed0-107f92471949) |
| 15 | `15-conflict-vercel-claim-domain-ownership.webp` | Vercel | conflict / failure | "Claim Domain Ownership": the domain belongs to another account, prove it in DNS; the specific "TXT record not found" error; a note that you may remove the record afterwards — [Mobbin](https://mobbin.com/screens/50f72208-2525-4367-9875-bd455dcc71be) |
| 16 | `16-failure-gitbook-stepper-per-step-reason.webp` | GitBook | failure | Failure inside the stepper, later steps greyed out, the reason named (but with an "or" merging two causes) — [Mobbin](https://mobbin.com/screens/c91f010e-e624-482e-94f4-56faf97dde22) |
| 17 | `17-failure-circle-toast-cname-not-found.webp` | Circle | failure | **Anti-pattern:** the failure lives only in an ephemeral red toast; a link to an external validator — [Mobbin](https://mobbin.com/screens/f6024235-f81b-4f3d-8b01-7e5318f4d13b) |
| 18 | `18-pending-google-workspace-spinner-only.webp` | Google Workspace | pending | **Anti-pattern:** a full screen of timer, "Leave this page open while we verify" — [Mobbin](https://mobbin.com/screens/1e371ae4-36c5-4162-b543-3a7a1b902759) |
| 19 | `19-pending-resend-event-timeline.webp` | Resend | pending | A timeline of domain events + a status sentence attributed to the provider. The best waiting reference in the sample — [Mobbin](https://mobbin.com/screens/6f41111b-5a31-4d83-a3fa-ec3f2064a957) |
| 20 | `20-pending-savee-modal-5min-to-48h.webp` | Savee | pending | "5 mins to 48 hours" repeated twice + a promise of email on completion — [Mobbin](https://mobbin.com/screens/11245f96-e28e-4866-b076-0008570c5250) |
| 21 | `21-pending-cloudflare-waiting-registrar.webp` | Cloudflare | pending | "Waiting for your registrar…" with a time band, "we are checking periodically" and a manual recheck action — [Mobbin](https://mobbin.com/screens/d6e70ad1-f98f-4b76-a515-fbce32d1ea2e) |
| 22 | `22-partial-autosend-verified-vs-pending-rows.webp` | AutoSend | partial | Aggregate verdict on top ("ownership verified, configuration pending") + per-record status — [Mobbin](https://mobbin.com/screens/bb3e5124-d099-46c2-881a-2e0037cef8ac) |
| 23 | `23-success-ghost-domain-updated.webp` | Ghost | success | A sober confirmation with a short, concrete deadline ("up to 30 seconds") — [Mobbin](https://mobbin.com/screens/8db18a96-4ca3-426c-aef8-2518552d6ffb) |
| 24 | `24-success-google-workspace-next-step.webp` | Google Workspace | success | Success becomes a springboard to the next onboarding step — [Mobbin](https://mobbin.com/screens/bb4e586a-3a03-40fb-9620-704c1ae1433f) |
| 25 | `25-success-autosend-checklist-modal.webp` | AutoSend | success | Celebratory modal with a 4-item checklist and the pending one highlighted — [Mobbin](https://mobbin.com/screens/5e7bd582-4c12-44a0-8d3e-cc2b3a4b729c) |
| 26 | `26-success-polywork-you-did-it.webp` | Polywork | success | "You did it!" + a propagation caveat + "We will notify you when everything is working" — [Mobbin](https://mobbin.com/screens/8c9b757e-ac0e-45d9-a3f1-b0472463be19) |
| 27 | `27-success-air-minimal-dialog.webp` | Air | success | Minimal dialog: one sentence, one button, one toast with an optional next step — [Mobbin](https://mobbin.com/screens/079f6e54-e75b-4ec0-9a50-1631834ebf66) |
| 28 | `28-success-folk-step-verified-inline.webp` | folk | success | Success replaces the instruction in place: the step gets a Verified badge and a confirmation sentence — [Mobbin](https://mobbin.com/screens/53d5ca64-47e3-4745-b549-cd0be5477aca) |
| 29 | `29-provider-dub-per-platform-instructions.webp` | Dub | provider | Platform grid with logos, a "Manual Installation" tile as the escape hatch, "Estimated time: 1 hour", "I've completed this" — [Mobbin](https://mobbin.com/screens/963b5605-7ef8-43de-a7a0-c30f01b68ee8) |
| 30 | `30-provider-twingate-list.webp` | Twingate | provider | A simple provider list with logos + a Connect button per row — [Mobbin](https://mobbin.com/screens/f7580bc0-e4e1-4346-bd22-e124d86ce8d6) |
| 31 | `31-provider-incidentio-source-of-truth.webp` | incident.io | provider | A provider list inside a stepper, with "Create teams manually" as the last item — [Mobbin](https://mobbin.com/screens/0aad6bca-865f-42d0-9d6c-e9ee9ad8a981) |
| 32 | `32-recovery-productboard-consequence-checklist.webp` | Productboard | recovery | Consequences as mandatory checkboxes before deleting — [Mobbin](https://mobbin.com/screens/d8ca0338-d1d7-4e2a-9243-55567358e202) |
| 33 | `33-recovery-resend-delete-team-inventory.webp` | Resend | recovery | Inventory of what will be lost, processing deadline (7 days) and a typed name to confirm — [Mobbin](https://mobbin.com/screens/52df18d7-8f15-470f-a302-5c407d781091) |
| 34 | `34-flow-tally-empty-state-add-domain.webp` | Tally | flow | Domain empty state: icon, sentence, button, educational link — [Mobbin](https://mobbin.com/flows/1c80b812-54b6-45ff-bbc1-fbd5b699b1a4) |
| 35 | `35-flow-tally-verifying-inline-status.webp` | Tally | flow / list | Right after adding: "Verifying DNS records… · Created just now" on the row itself, with no intermediate screen — [Mobbin](https://mobbin.com/flows/1c80b812-54b6-45ff-bbc1-fbd5b699b1a4) |
| 36 | `36-flow-peerlist-two-steps-help-per-registrar.webp` | Peerlist | flow / instruction | Two steps on the same screen, A vs CNAME with a "do not add both" warning, "Domain not configured yet" + Check, and help articles per registrar (GoDaddy/Namecheap/Cloudflare) — [Mobbin](https://mobbin.com/flows/2feb78d3-d4ee-47b5-842d-040b10dcc40c) |
| 37 | `37-conflict-supabase-risk-two-exits.webp` | Supabase | conflict | "Potential issue detected": risk named in two sentences, two exits labelled by consequence — [Mobbin](https://mobbin.com/screens/ddc7775d-ddd7-4f5a-90cd-c49e66325dbb) |
| 38 | `38-conflict-okx-report-what-happens-next.webp` | OKX | conflict | Before reporting, three steps of what happens after the report — [Mobbin](https://mobbin.com/screens/69011940-3f87-4baf-b65c-0b720664bf7c) |
| 39 | `39-grace-cloaked-deletion-date-restorable.webp` | Cloaked | grace / recovery | Absolute date of the loss + an explicit restoration window + an action to preserve what matters — [Mobbin](https://mobbin.com/screens/627b7763-1075-4891-9571-57fc9c908510) |
| 40 | `40-grace-manychat-expired-persistent-banner.webp` | ManyChat | grace | After the deadline: a persistent top banner + the degraded state reflected in the object — [Mobbin](https://mobbin.com/screens/03b30f47-6ee9-449c-80cc-58456bf3d871) |

---

## 6. Next step

This document is input to Section 3 of the PRD (`docs/domain-ownership/prd.md`). The screens to
design, in the order the PRD prioritises them: pending (2.2), diagnosed failure (2.3), per-provider
instruction (2.1/2.7), coexistence and contestation (2.9), revocation with grace (2.10),
reactivation through autocomplete (2.8).
