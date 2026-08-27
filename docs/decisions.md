---
feature: domain-ownership
phase: delivery
updated: 2026-08-26
---

# Decisions

The brief was one sentence. The PRD, the research, the model and everything below are mine.
Each entry is the decision, the alternative that lost, and the cost I accepted.

---

## 1. Product decision: No exclusive ownership

A team, an agency and their client can all legitimately control the same zone. A single-tenant
product gates on the tenant, so exclusivity is free there. Ownsi is generic, so a claim binds to a
user and the public read publishes facts instead of a verdict. `GET /proofs/:slug` returns the
attestation and a `Recency` of `latest`, or `earlier` with the date of the newer proof. An older
proof never demotes itself, and the badge uses the same colour for both states.

**Rejected:** one owner per domain, newest wins.

**Cost:** the consuming platform has to decide its own policy, because we do not arbitrate between
claimants. We publish who proved a name and when.

## 2. Product decision: Proof history and no re-check

Write the TXT, prove it, remove it whenever you like. The record is consumable, which is what
Vercel already documents: *"You can remove the record after verification is complete"*.

**Rejected:** a badge that revalidates and decays.

**Cost:** this was a scope cut, not a thesis. Continuous checking costs twice: building it well
(DNS failures that are not the user's fault, a "was proved, now is not" state, how many failed
reads demote somebody) and operating it forever. Neither fit the week.

## 3. Technical decision: Clean archicture + Bounded Context

Bounded contexts force one question: who owns this data. Partway through the week that question
had an answer nobody liked. `domains/` was four subjects in one folder, `verification/` owned no
data, and seven of the claim's sixteen columns belonged to neither. The split came out of that: a
claim is an episode, a verification is a process, and the attempts are the process's children.

**Rejected:** folders by layer, with the model discovered while writing routes.

**Cost:** hours spent on structure before a single endpoint existed. It paid because adding a use
case stayed mechanical all the way to the last one.

## 4. Product decision: Named failures were tested on a real zone

Fifteen diagnosis codes, built against `ownsi.dev` with the cases you can force in a real panel:
the appended domain, the record on `www`, the record at the apex, a quoted token, a CNAME in the
way, somebody else's token.

**Rejected:** one "not verified yet" for all of them.

**Cost:** being specific means you can be specifically wrong, and wrong sends people to fix what is
not broken. A diagnosis may only assert what that read observed. `record_absent` used to say the
record was never created, at a moment when the zone's own nameservers had not been asked.

## 5. Product decision: Demo domains using a real zone

Ownsi answers for a demo zone, so a claim completes inside a video with no DNS panel and no wait.

**Rejected:** a "simulate success" button, or a faster clock in the backend.

**Cost:** operating a zone. In exchange, the demo runs the same code as a real claim, so nothing in
the video is a branch that exists only for the video.

## 6. Technical decision: Why Cloudflare

The landing flow reads a zone with no account, so `GET /api/zones/:name` is a logged-out visitor's
first impression and cannot wait for a server to wake up. A Cloudflare Worker serves the static
assets and proxies `/api` and `/p`, so the page paints while the API is still starting. Postgres on
Neon, the API on Railway, the claim's clock on Inngest.

**Rejected:** a free tier that sleeps, and a single host serving everything.

**Cost:** four providers to keep in your head and in CI.
