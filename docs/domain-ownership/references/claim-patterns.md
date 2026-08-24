---
feature: domain-ownership
phase: prd
updated: 2026-08-19
---

# Focus: the "claim" pattern — taking something that already has an owner

This document goes deeper on one specific dimension of the general research in
`docs/domain-ownership/references/README.md`: how products design the moment when **someone claims a
resource another account has already registered**, and the symmetric moment when **the existing
owner reacts**.

The trigger was the screen `15-conflict-vercel-claim-domain-ownership.webp` — *"Claim Domain
Ownership: This domain is registered with another Vercel account. Verify DNS ownership to claim
it."* It is the only reference in the first round that treats an ownership conflict as a product flow
rather than a support ticket, and it is the same thesis as the PRD: there is no arbiter; the dispute
resolves at the same root of trust as the proof.

Screenshots `41` to `55` in `screenshots/`. `01`–`40` belong to the general research.

---

## 1. The four families of "claim"

### A. Claiming a resource already registered by another account

The resource exists, someone already holds it, and you prove that you also control the root.

- **Vercel (`15`)** — the model. It says *who* holds it (another Vercel account), *what to do* (a TXT
  at `_vercel.<domain>`), and — the detail almost nobody has — *what happens afterwards*: "You can
  remove the record after verification is complete". The user gets the end of the story alongside the
  beginning.
- **Otter.ai (`46`)** — an implicit claim by email domain: *"Based on your email, you may be
  interested in joining the workspace with other @content-mobbin.com members"*, showing **who
  administers it**, unmasked: `Managed by jsmith@content-mobbin.com`. Note the asymmetry with our
  case: here the owner's email appears in full because both already share the domain; in ours,
  accounts on different domains can prove the same domain, which is why
  the PRD masks the local part (`m•••@acme.com`)
  while keeping the domain visible.
- **Hex (`47`)** — lists the workspaces the email reaches + *"If you don't see your workspace, try a
  different email"*. It names the most likely mistake (wrong account) instead of leaving the user
  stuck.
- **Notion (`48`)** — "Join teammates or create a workspace": both exits at equal weight, pushing
  neither.

**For us:** the PRD's scenario is gentler than all of these — both accounts stay valid, there is no
"join the other's workspace". But the message structure of `15` is reusable wholesale: *who already
has it* → *what you do* → *what happens next*.

### B. Claiming a listing/profile with an identity attestation

When there is no technical root of trust, the product compensates with a formal declaration and
documents.

- **Tripadvisor (`41`)** — "Claim your listing" in two steps (*Claim your listing* → *Verify your
  identity*), with a **Role at business** field and an attestation signed by checkbox: *"I certify
  that I am an authorized representative or affiliate of this establishment and have the authority to
  register as a business representative. The information I have entered into this form is neither
  false nor fraudulent, and I understand that Tripadvisor may disclose my name and affiliation to
  other verified representatives of this establishment."* Two strong ideas: (1) the claim is **on the
  record**; (2) the product warns you, at the moment of claiming, that it **will tell the other
  verified representatives**. That is exactly the coexistence notification of
  the PRD — except declared *beforehand*, to the
  person claiming, and not only *afterwards*, to the person who already proved. Worth adopting:
  whoever proves a domain that already has an owner should know, at claim time, that the other side
  will be told.
  Smaller details: "Not the right one? Change location" (an exit for the wrong target) and a
  "Frequently asked claiming questions" block on the same page.
- **TikTok (`44`)** — three steps, the last one literally **"Verify your access"** by SMS or phone
  call: it separates "who the business is" from "you have access to it". The same distinction between
  identity and control that underpins DNS proof.
- **Faire (`43`)** — *"Next, we need some proof of business ownership. What documents do you have on
  hand?"* with four options, each explained in one line (permit, EIN, **domain registration**, a
  screenshot of the Instagram/Facebook admin), plus the note *"It's OK if you don't have all of this
  info right now. You can save your progress and complete the form later."* Asking "what do you have
  on hand?" is a good way to offer alternative methods — but the PRD cuts weak methods and stays on TXT alone. Kept as a
  reference to the path not taken.
- **Mercury** (seen in search, not archived) — the opposite extreme: passport upload. It shows where
  the friction ladder ends when no technical proof exists.

### C. Choosing the proof method

- **Pinterest (`42`)** — "Choose how you want to claim" with three columns side by side: *Add HTML
  tag*, *Upload HTML file*, *Add TXT record*, each with the artefact already generated and ready to
  copy. Excellent layout; a product our PRD **decided not to be**
  (the PRD cuts the HTML file and role-address email,
  because they prove the web server or the MX, not the zone). Kept as the contrast that justifies the
  decision: with no capability unlocked by ownership, there is no reason to accept a weaker proof.
- **Google Workspace (`45`)** — *"Verify that you own content-mobbin.com"* with two paths: **"Sign in
  to Cloudflare"** (authorise Google to write the record for you) or *"Switch to manual
  verification"*. The delegated path removes the copy-and-paste entirely — and brings a per-provider
  OAuth dependency, out of scope for one week. What is worth stealing is the ordering: the easy path
  first, the manual one always visible beside it, never hidden.

### D. The models the PRD refuses — and what each one costs

Approval and transfer appear a lot in the sample. They are useful for showing the price:

- **Approval** — Asana (`52`): *"You've requested access to this project on Jan 6. We'll notify you
  when a project admin approves your request."* The claimant is left **idle, dependent on a human**,
  with nothing to do. Miro (`53`) shows the other side: a queue of requests with ✓/✗ and an expiry
  ("Expires in 26d"). This is the design the PRD
  rejects: approval hands a veto to whoever proved first — an attacker who proved first included. A
  good Asana detail, reusable in any waiting state: *"You're currently signed in as …@gmail.com"*,
  which resolves the most common error without needing support.
- **Transfer** — Whop (`51`): "This action cannot be undone"; Maze (`50`): transferring "will give
  full control to Jane Doe & demote you to an admin role", with a typed name to confirm. Both assume
  **a single owner**: for one to win, the other must lose. Wix (`49`) is the interesting exception —
  *"You'll remain a Co-Owner of this site after transfer"* — the only screen in the sample that
  normalises shared ownership. It is the closest the market gets to the PRD's coexistence (both
  accounts valid, nobody demoted).

---

## 2. Copy — what the references actually write

What makes the Vercel screen work is the copy, not the layout. Verbatim sentences from the
references, and what they do well:

| Sentence (verbatim) | Where | What it does well |
|---|---|---|
| "This domain is registered with another Vercel account. Verify DNS ownership to claim it." | Vercel `15` | Names the fact without drama, and the action comes from the same place as the proof |
| "You can remove the record after verification is complete." | Vercel `15` | Hands you the end of the story alongside the beginning |
| "TXT record not found: The verification TXT record was not found. Please add the record shown above and wait a few minutes for it to propagate before trying again." | Vercel `15` | Fact → action → time expectation, in that order |
| "I certify that I am an authorized representative… I understand that Tripadvisor may disclose my name and affiliation to other verified representatives of this establishment." | Tripadvisor `41` | The claim is on the record and the disclosure is announced **beforehand** |
| "Not the right one? Change location" | Tripadvisor `41` | A cheap exit for whoever aimed at the wrong target |
| "Based on your email, you may be interested in joining… Managed by jsmith@content-mobbin.com" | Otter `46` | Says **who** is on the other side, not "another user" |
| "If you don't see your workspace, try a different email." | Hex `47` | Names the most likely mistake |
| "You're currently signed in as …@gmail.com" | Asana `52` | Undoes the wrong-account error without support |
| "You'll remain a Co-Owner of this site after transfer." | Wix `49` | States shared ownership as a normal state, not a failure |
| "If you don't recognize one of them, report it to your admin below." | Okta `54` | Contestation anchored to the exact event row |

**Proposed copy for our product**, derived from these (to be settled in Section 3 of the PRD):

- When claiming a domain that already has a proved owner:
  *"Another account has already proved ownership of `acme.com`. You can prove it too — both proofs
  coexist. Whoever proved it already will be told that you did, with your email partially masked."*
  (the "will be told" comes from Tripadvisor `41`; the coexistence from Wix `49`; the masking from the PRD)
- In the notification to the existing owner:
  *"`m•••@acme.com` proved ownership of `acme.com` on 19 Aug, by TXT record. If this wasn't you or
  someone on your team: [That wasn't me]."*
  (the event-row-plus-inline-action structure comes from Okta `54`)
- In the "that wasn't me" flow, the Wise `55` "what will happen" list becomes a "what this means"
  list, because the product takes no action — the proof is point in time and is never taken back:
  1. *On 19 Aug, someone able to write to `acme.com`'s zone published a token there.*
  2. *That is a statement about that moment. Removing the record now does not undo it.*
  3. *If it was not you or your team, treat the zone as compromised: audit who has access at your
     DNS provider, and rotate their credentials.*
  4. *Ownsi cannot tell you who they are, and cannot decide who the legitimate owner is — both
     accounts demonstrated real control.*

---

## 3. Contestation: the two references that were missing

Nobody designs "that wasn't me" for domains, but two screens give the whole shape:

- **Okta (`54`)** — "Recent Activity": a table of sign-ins (device, when, where) with a **"Report"**
  link on each row, under the instruction *"These are the last 100 successful sign-ins to your
  account. If you don't recognize one of them, report it to your admin below."* It translates
  directly: the domain timeline lists each proof (masked account, date, method) and contestation is
  an action **on the event's row**, not a menu item lost in Settings.
- **Wise (`55`)** — "Securing your account", with a **"What happens"** block of four explained
  consequences (new password, logged out of all devices, transfers cancelled, cards suspended) before
  the "Confirm and secure" button. It is the model for the list above: whoever contests needs to see
  the whole consequence before acting — including the bad one (I cannot delete it → the DNS is not
  mine).

Complements already catalogued in the general research: **Supabase (`37`)** for the shape of the risk
dialog (named risk + two exits labelled by consequence, never "OK/Cancel") and **OKX (`38`)** for
enumerating what happens after reporting.

---

## 4. What this round changes in the PRD

Nothing in scope — three surface adjustments, all inside what is already decided:

1. **Warn at claim time that the other side will be notified** (Tripadvisor `41`). Today
   the PRD describes the notification to whoever
   already proved; the counterpart on the claimant's screen is missing. Cheap, and it avoids the
   feeling of being reported behind your back.
2. **Contestation lives on the event row** (Okta `54`), not on a separate screen.
3. **"What will happen" before "that wasn't me"** (Wise `55`), with the fourth item — "if you cannot
   delete it, the DNS is not yours" — as part of the list, not as consolation after the failure. The
   PRD already says this in prose; here it becomes a component.

---

## 5. Inventory for this round

| # | File | App | What it shows |
|---|---|---|---|
| 41 | `41-claim-tripadvisor-listing-attestation.webp` | Tripadvisor | "Claim your listing" in 2 steps, role at the business, an attestation warning about disclosure to other verified representatives, a claiming FAQ — [Mobbin](https://mobbin.com/screens/73a90981-8111-4176-bb6d-74eaa0f8fe8a) |
| 42 | `42-claim-pinterest-three-methods.webp` | Pinterest | "Choose how you want to claim": HTML tag / HTML file / TXT record side by side, artefacts ready — [Mobbin](https://mobbin.com/screens/2a1e5ad5-9762-468b-a781-11acc1d9a6b4) |
| 43 | `43-claim-faire-evidence-options.webp` | Faire | "What documents do you have on hand?" — four alternative proofs explained + save progress — [Mobbin](https://mobbin.com/screens/31467b9a-df07-4434-8f31-6d5bdea956c4) |
| 44 | `44-claim-tiktok-verify-your-access.webp` | TikTok | Step 3 called "Verify your access": identity and control as separate things — [Mobbin](https://mobbin.com/screens/44044d1e-8577-4493-9851-f70e02c964dc) |
| 45 | `45-claim-google-workspace-authorize-dns-host.webp` | Google Workspace | "Sign in to Cloudflare" (delegate writing the record) with "Switch to manual verification" beside it — [Mobbin](https://mobbin.com/screens/6f812186-ca4f-44a5-ab9c-1ac8c3c72056) |
| 46 | `46-claim-otter-existing-workspace-managed-by.webp` | Otter.ai | Existing workspace suggested by the email domain, with "Managed by …" visible — [Mobbin](https://mobbin.com/screens/c6a2effd-d510-40e9-8472-8b17689a245b) |
| 47 | `47-claim-hex-choose-workspace-wrong-email.webp` | Hex | Choose a workspace + "try a different email" as a named hypothesis — [Mobbin](https://mobbin.com/screens/65d8d999-28f4-4f14-bd00-e25852008893) |
| 48 | `48-claim-notion-join-or-create.webp` | Notion | "Join teammates or create a workspace": two exits of equal weight — [Mobbin](https://mobbin.com/screens/1f794a8f-3b4d-4f47-99a5-158c604317dc) |
| 49 | `49-transfer-wix-remain-co-owner.webp` | Wix | "You'll remain a Co-Owner of this site after transfer" — shared ownership as a normal state — [Mobbin](https://mobbin.com/screens/bfe98b41-b291-4504-9796-441618298d93) |
| 50 | `50-transfer-maze-demote-to-admin.webp` | Maze | Transfer with explicit demotion + a typed name to confirm — [Mobbin](https://mobbin.com/screens/2c0bad91-7796-492a-b479-d4eea6f3382f) |
| 51 | `51-transfer-whop-cannot-be-undone.webp` | Whop | Irreversible transfer in a short dialog, over an audit log — [Mobbin](https://mobbin.com/screens/4b004bb8-c0cb-48c6-90a1-ac09630f56d6) |
| 52 | `52-approval-asana-waiting-signed-in-as.webp` | Asana | Waiting on human approval + "You're currently signed in as …" — the cost of the approval model — [Mobbin](https://mobbin.com/screens/319b68c7-1833-48ad-a28b-b9a750973943) |
| 53 | `53-approval-miro-request-queue-expiry.webp` | Miro | A queue of access requests with ✓/✗ and an expiry — the other side of approval — [Mobbin](https://mobbin.com/screens/05e59db8-5f5a-4f08-ae23-292fd64fe663) |
| 54 | `54-contest-okta-report-per-row.webp` | Okta | A list of events with "Report" on each row and an instruction on when to use it — [Mobbin](https://mobbin.com/screens/fb308537-7c43-442d-b231-b3b278195fc5) |
| 55 | `55-contest-wise-what-happens-list.webp` | Wise | A "What happens" block with the four consequences before confirming the security action — [Mobbin](https://mobbin.com/screens/34af0d7e-d329-4b95-b6a0-1ced5fd27121) |
