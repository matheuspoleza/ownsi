import type { ProofUnreadable } from "../application/get-proof.query.ts"
import type { ProofLink } from "../domain/proof-link.ts"

const CHARACTERS: Readonly<Record<string, string>> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => CHARACTERS[character] ?? character)
}

export function formatProofDate(instant: Date): string {
  return instant.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
}

const STYLE = `
:root { color-scheme: light dark; --ink: #0a0a0a; --page: #fafafa; --muted: #737373;
  --line: #e5e5e5; --proof: #0f5c36; }
@media (prefers-color-scheme: dark) {
  :root { --ink: #fafafa; --page: #0a0a0a; --muted: #a3a3a3; --line: #ffffff1a; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--page); color: var(--ink); font-size: 14px; line-height: 1.5;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased; }
a { color: inherit; }
header { border-bottom: 1px solid var(--line); }
.bar, main { margin: 0 auto; max-width: 1180px; padding: 0 24px; }
.bar { display: flex; align-items: center; justify-content: space-between; height: 58px; }
.word { font-weight: 600; font-size: 17px; letter-spacing: -0.4px; }
.cta { font-size: 13px; font-weight: 500; text-decoration: none; }
main { padding-top: 56px; padding-bottom: 72px; }
.ticket { position: relative; overflow: hidden; max-width: 660px; border-radius: 14px;
  background: var(--proof); color: #fff; display: flex; flex-wrap: wrap; }
.face { flex: 1 1 380px; padding: 20px 22px 22px; }
.stub { flex: 0 0 200px; border-left: 1px dashed #ffffff3d; padding: 20px 22px 22px;
  display: flex; flex-direction: column; justify-content: space-between; gap: 24px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.brand { font-weight: 600; font-size: 13px; }
.kicker { font-size: 11px; font-weight: 500; letter-spacing: 0.6px; color: #ffffffb8; }
.subject { margin: 22px 0 0; font-size: 34px; font-weight: 600; letter-spacing: -0.9px;
  line-height: 1.15; word-break: break-all; }
.holder { margin: 6px 0 0; font-size: 13px; color: #ffffffb8; }
.cells { display: flex; flex-wrap: wrap; gap: 28px; margin: 22px 0 0; }
.label { font-size: 10.5px; font-weight: 500; letter-spacing: 0.4px; color: #ffffff7a; }
.value { font-size: 13.5px; font-weight: 500; margin-top: 4px; }
.token { margin: 20px 0 0; font-size: 12px; color: #ffffffb8; word-break: break-all;
  font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, monospace; }
.stub .value { font-size: 12px; }
.slug { font-size: 10.5px; color: #ffffffb8; word-break: break-all;
  font-family: ui-monospace, "JetBrains Mono", SFMono-Regular, monospace; }
.moment { margin: 32px 0 0; max-width: 620px; font-size: 13px; }
.moment strong { font-weight: 600; }
.fine { margin: 14px 0 0; max-width: 620px; font-size: 12px; color: var(--muted); }
.gone { max-width: 620px; }
.gone h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.5px; margin: 0; }
.gone p { color: var(--muted); margin: 12px 0 0; }
`.trim()

export function proofPage(link: ProofLink, appUrl: string, url: string): string {
  const { attestation: proof } = link
  const proved = formatProofDate(proof.provedAt)
  const title = `${proof.unicodeDomain} — proved on ${proved}`
  const description = `On ${proved}, ${proof.heldBy} demonstrated control of ${proof.unicodeDomain}'s DNS zone.`

  return htmlDocument({
    title,
    description,
    url,
    appUrl,
    body: `
    <article class="ticket">
      <div class="face">
        <div class="top">
          <span class="brand">ownsi</span>
          <span class="kicker">Proof of ownership</span>
        </div>
        <p class="subject">${escapeXml(proof.unicodeDomain)}</p>
        <p class="holder">held by ${escapeXml(proof.heldBy)}</p>
        <dl class="cells">
          <div><dt class="label">Proved</dt><dd class="value">${escapeXml(proved)}</dd></div>
          <div><dt class="label">Method</dt><dd class="value">DNS TXT record</dd></div>
        </dl>
        <p class="token">${escapeXml(proof.token)}</p>
      </div>
      <div class="stub">
        <div>
          <p class="label">Issued</p>
          <p class="value">${escapeXml(formatProofDate(link.issuedAt))}</p>
        </div>
        <p class="slug">${escapeXml(url.replace(/^https?:\/\//, ""))}</p>
      </div>
    </article>

    <p class="moment">
      <strong>This states one moment, and only that.</strong> Nothing was checked when you opened
      this page, and the record that earned the proof may already be gone — it is consumable by
      design. Removing it changes nothing about the date above.
    </p>
    <p class="fine">
      This link stops resolving on ${escapeXml(formatProofDate(link.expiresAt))}. Anyone who has it
      can open this page.
    </p>`,
  })
}

export function unreadablePage(reason: ProofUnreadable, appUrl: string): string {
  const said = SAID[reason.type]

  return htmlDocument({
    title: said.title,
    description: said.body,
    url: appUrl,
    appUrl,
    body: `
    <section class="gone">
      <h1>${escapeXml(said.title)}</h1>
      <p>${escapeXml(said.body)}</p>
    </section>`,
  })
}

const SAID: Readonly<Record<ProofUnreadable["type"], { title: string; body: string }>> = {
  not_found: {
    title: "No proof at this link",
    body: "Nothing has ever been published here. Check the address, or ask whoever sent it for a fresh one.",
  },
  expired: {
    title: "This link has expired",
    body: "A proof link lasts seven days. The proof it pointed at is still true and still dated — ask its holder to issue another.",
  },
  revoked: {
    title: "This link was taken back",
    body: "Whoever issued it has stopped sharing it. The proof itself stands: nothing here retracts a fact about a past moment.",
  },
}

type ProofDocument = {
  readonly title: string
  readonly description: string
  readonly url: string
  readonly appUrl: string
  readonly body: string
}

function htmlDocument(page: ProofDocument): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeXml(page.title)}</title>
<meta name="description" content="${escapeXml(page.description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ownsi">
<meta property="og:title" content="${escapeXml(page.title)}">
<meta property="og:description" content="${escapeXml(page.description)}">
<meta property="og:url" content="${escapeXml(page.url)}">
<meta name="twitter:card" content="summary">
<meta name="robots" content="noindex">
<style>${STYLE}</style>
</head>
<body>
<header><div class="bar">
  <span class="word">ownsi</span>
  <a class="cta" href="${escapeXml(page.appUrl)}">Prove your own domain</a>
</div></header>
<main>${page.body}
</main>
</body>
</html>
`
}
