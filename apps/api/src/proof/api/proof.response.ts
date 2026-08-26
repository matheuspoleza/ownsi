import qrcode from "qrcode-generator"
import { OWNSI_MARK } from "../../shared/brand.ts"
import { unreachable } from "../../shared/result.ts"
import type { ProofUnreadable, PublishedProof } from "../application/get-proof.query.ts"
import type { Recency } from "../domain/recency.ts"

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

const FONTS =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap"

const STYLE = `
:root {
  --background: #fafafa; --foreground: #0a0a0a; --muted-foreground: #737373;
  --border: #e5e5e5; --card: #fafafa; --ticket: #0a0a0a;
  --sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--background); color: var(--foreground);
  font-family: var(--sans); font-size: 14px; line-height: 1.45;
  -webkit-font-smoothing: antialiased; }
dl, dd, dt, p, h1 { margin: 0; }
a { color: inherit; }

header { border-bottom: 1px solid var(--border); }
.inner { margin: 0 auto; display: flex; height: 58px; max-width: 1180px; padding: 0 24px;
  align-items: center; justify-content: space-between; gap: 24px; }
.logo { display: flex; align-items: center; gap: 6px; }
.logo svg { height: 28px; width: 19.72px; color: var(--foreground); }
.word { font-size: 17px; font-weight: 600; letter-spacing: -0.4px; }
.cta { font-size: 13px; font-weight: 500; text-decoration: none; }

main { margin: 0 auto; display: flex; max-width: 1180px; padding: 92px 24px 36px;
  flex-direction: column; align-items: center; }

.ticket { position: relative; display: flex; width: 660px; max-width: 100%;
  border-radius: 14px; background: var(--ticket); color: #fff; }
.face { flex: 1 1 auto; display: flex; min-width: 0; flex-direction: column;
  padding: 24px 26px 24px 28px; }
.top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; }
.brand svg { height: 16px; width: 16px; }
.kicker { font-size: 11px; font-weight: 500; letter-spacing: 0.6px; color: #ffffffa6; }
.subject { padding-top: 24px; font-size: 34px; font-weight: 600; letter-spacing: -0.9px;
  line-height: 1.15; word-break: break-word; }
.holder { padding-top: 5px; font-size: 13px; color: #ffffffa6; }
.tag { display: inline-flex; margin-top: 13px; align-items: center; gap: 6px; align-self: flex-start;
  border-radius: 999px; background: #ffffff14; padding: 4px 10px; font-size: 11px;
  color: #ffffffa6; }
.dot { height: 5px; width: 5px; border-radius: 999px; }
.dot.latest { background: #b6ffce; }
.dot.earlier { background: #b2b2ff; }
.cells { display: flex; padding: 24px 0 15px; }
.cell { display: flex; min-width: 0; flex: 0 0 136px; flex-direction: column; gap: 5px; }
.label { font-size: 10.5px; font-weight: 500; letter-spacing: 0.5px; color: #ffffff6b; }
.value { font-size: 13.5px; font-weight: 500; }
.token { margin-top: auto; padding-top: 15px; border-top: 1px solid #ffffff29;
  font-family: var(--mono); font-size: 12px; color: #ffffffa6; word-break: break-all; }

.stub { display: flex; width: 196px; flex: 0 0 196px; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px; padding: 24px 20px;
  border-left: 1px dashed #ffffff29; }
.plate { display: flex; height: 124px; width: 124px; align-items: center;
  justify-content: center; border-radius: 8px; background: #fff; }
.plate svg { height: 104px; width: 104px; color: var(--ticket); }
.slug { font-family: var(--mono); font-size: 10.5px; color: #ffffffa6; word-break: break-all;
  text-align: center; }
.standing { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #ffffffa6; }
.standing span { height: 6px; width: 6px; border-radius: 999px; background: #fff; }
.notch { position: absolute; right: 185px; height: 22px; width: 22px; border-radius: 999px;
  background: var(--background); }
.notch.up { top: -11px; }
.notch.down { bottom: -11px; }

.dig { display: flex; width: 356px; max-width: 100%; padding-top: 44px;
  flex-direction: column; align-items: center; gap: 9px; }
.dig p { font-size: 12.5px; color: var(--muted-foreground); text-align: center; }
.box { display: flex; width: 100%; align-items: center; gap: 14px; border: 1px solid var(--border);
  border-radius: 9px; background: var(--card); padding: 11px 12px 11px 14px; }
.box code { min-width: 0; flex: 1 1 auto; overflow-x: auto; font-family: var(--mono);
  font-size: 12.5px; white-space: nowrap; }
.box button { display: flex; flex: 0 0 auto; border: 0; background: none; padding: 0;
  color: var(--muted-foreground); cursor: pointer; }
.box svg { height: 15px; width: 15px; }

.fine { padding-top: 30px; font-size: 12px; color: var(--muted-foreground); text-align: center; }

.ticket.spent { opacity: 0.34; }
.ticket.spent .plate { background: #ffffff1f; }
.bar { display: block; border-radius: 5px; background: #ffffff2b; }
.bar.subject { height: 30px; width: 62%; }
.bar.holder { height: 11px; width: 34%; }
.bar.value { height: 12px; width: 74px; }
.bar.token { height: 11px; width: 100%; }
.bar.slug { height: 9px; width: 78%; }

.gone { width: 660px; max-width: 100%; padding-top: 34px; }
.gone h1 { font-size: 20px; font-weight: 600; letter-spacing: -0.4px; }
.gone p { padding-top: 10px; color: var(--muted-foreground); }

@media (max-width: 700px) {
  main { padding-top: 48px; }
  .ticket { flex-direction: column; }
  .stub { width: auto; flex: 1 1 auto; border-left: 0; border-top: 1px dashed #ffffff29; }
  .notch { display: none; }
}
`.trim()

const COPY_SCRIPT = `
document.querySelector("[data-copy]")?.addEventListener("click", (event) => {
  const button = event.currentTarget
  navigator.clipboard.writeText(button.dataset.copy).then(() => {
    button.setAttribute("aria-label", "Copied")
  })
})
`.trim()

const CIRCLE_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="presentation"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`

const COPY_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="presentation"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`

export function proofPage(published: PublishedProof, appUrl: string, url: string): string {
  const { link, recency } = published
  const proof = link.attestation
  const proved = formatProofDate(proof.provedAt)
  const dig = `dig TXT ${proof.challengeHost} +short`
  const title = `${proof.unicodeDomain} — proved on ${proved}`
  const description = `On ${proved}, ${proof.heldBy} demonstrated control of ${proof.unicodeDomain}'s DNS zone.`

  return htmlDocument({
    title,
    description,
    url,
    appUrl,
    script: COPY_SCRIPT,
    body: `
    <article class="ticket">
      <span class="notch up"></span>
      <span class="notch down"></span>

      <div class="face">
        <div class="top">
          <span class="brand">${CIRCLE_CHECK}ownsi</span>
          <span class="kicker">Proof of ownership</span>
        </div>

        <p class="subject">${escapeXml(proof.unicodeDomain)}</p>
        <p class="holder">held by ${escapeXml(proof.heldBy)}</p>
        <p class="tag"><span class="dot ${recency.type}"></span>${escapeXml(tagFor(recency))}</p>

        <dl class="cells">
          <div class="cell">
            <dt class="label">Proved</dt>
            <dd class="value">${escapeXml(proved)}</dd>
          </div>
          ${cell("Provider", proof.provider)}
        </dl>

        <p class="token">${escapeXml(proof.token)}</p>
      </div>

      <div class="stub">
        <span class="plate">${qrSvg(url)}</span>
        <span class="slug">${escapeXml(bare(url))}</span>
        <span class="standing"><span></span>Does not expire</span>
      </div>
    </article>

    <section class="dig">
      <p>Do not take our word for it.</p>
      <div class="box">
        <code>${escapeXml(dig)}</code>
        <button type="button" data-copy="${escapeXml(dig)}" aria-label="Copy the lookup">
          ${COPY_GLYPH}
        </button>
      </div>
      <p>${escapeXml(orderFor(recency, proof.unicodeDomain))}</p>
    </section>

    <p class="fine">
      Anyone who has this address can open this page. It resolves until its holder takes it back.
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
    ${SPENT_TICKET}

    <section class="gone">
      <h1>${escapeXml(said.title)}</h1>
      <p>${escapeXml(said.body)}</p>
    </section>`,
  })
}

/** The shape of a proof with none of its facts: what was published here is nobody's business now. */
const SPENT_TICKET = `
    <article class="ticket spent" aria-hidden="true">
      <span class="notch up"></span>
      <span class="notch down"></span>

      <div class="face">
        <div class="top">
          <span class="brand">${CIRCLE_CHECK}ownsi</span>
          <span class="kicker">Proof of ownership</span>
        </div>

        <p class="subject"><span class="bar subject"></span></p>
        <p class="holder"><span class="bar holder"></span></p>

        <dl class="cells">
          <div class="cell">
            <dt class="label">Proved</dt>
            <dd class="value"><span class="bar value"></span></dd>
          </div>
          <div class="cell">
            <dt class="label">Provider</dt>
            <dd class="value"><span class="bar value"></span></dd>
          </div>
        </dl>

        <p class="token"><span class="bar token"></span></p>
      </div>

      <div class="stub">
        <span class="plate"></span>
        <span class="slug"><span class="bar slug"></span></span>
      </div>
    </article>`.trim()

const SAID: Readonly<Record<ProofUnreadable["type"], { title: string; body: string }>> = {
  not_found: {
    title: "No proof at this link",
    body: "Nothing has ever been published here. Check the address, or ask whoever sent it for a fresh one.",
  },
  revoked: {
    title: "This link was taken back",
    body: "Whoever issued it has stopped sharing it, and this address no longer states a proof of ownership.",
  },
}

/** Says where this proof sits in time. The affirmative case states an absence, never a rank. */
function tagFor(recency: Recency): string {
  switch (recency.type) {
    case "latest":
      return "Most recent proof"
    case "earlier":
      return "Later proof on record"
    default:
      return unreachable(recency)
  }
}

function orderFor(recency: Recency, domain: string): string {
  switch (recency.type) {
    case "latest":
      return `Nothing later has been proved for ${domain}.`
    case "earlier":
      return `A later proof of ${domain} was made on ${formatProofDate(recency.latestProvedAt)}.`
    default:
      return unreachable(recency)
  }
}

function cell(label: string, value: string | null): string {
  if (value === null) return ""

  return `<div class="cell">
            <dt class="label">${escapeXml(label)}</dt>
            <dd class="value">${escapeXml(value)}</dd>
          </div>`
}

function bare(url: string): string {
  return url.replace(/^https?:\/\//, "")
}

/** One path of module squares, so the code scales with the plate and carries no image. */
function qrSvg(text: string): string {
  const code = qrcode(0, "M")
  code.addData(text)
  code.make()

  const size = code.getModuleCount()
  let path = ""
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (code.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`
    }
  }

  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="This page's address as a QR code"><path d="${path}" fill="currentColor"/></svg>`
}

type ProofDocument = {
  readonly title: string
  readonly description: string
  readonly url: string
  readonly appUrl: string
  readonly body: string
  readonly script?: string
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<style>${STYLE}</style>
</head>
<body>
<header><div class="inner">
  <span class="logo">${OWNSI_MARK}<span class="word">ownsi</span></span>
  <a class="cta" href="${escapeXml(page.appUrl)}">Prove your own domain</a>
</div></header>
<main>${page.body}
</main>
${page.script ? `<script>${page.script}</script>` : ""}
</body>
</html>
`
}
