import { unreachable } from "../../shared/result.ts"
import type { PublishedProof } from "../application/get-proof.query.ts"
import { escapeXml, formatProofDate } from "./proof.response.ts"

const CHARACTER_WIDTH = 6.2

const PADDING = 10

const HEIGHT = 20

const LABEL = "ownsi"

/** A proof was found. Both states of `Recency` are one, so neither colour is a verdict. */
const PROVED = "#0f5c36"

/** A second fact worth knowing, not a demotion — the palette's `--info`, never a warning. */
const NEWER = "#1d4ed8"

/** Nothing to show at all, which is the only state that is genuinely absent. */
const NOTHING = "#737373"

export function proofBadge({ link, recency }: PublishedProof): string {
  const proved = `proved ${formatProofDate(link.attestation.provedAt)}`

  switch (recency.type) {
    case "latest":
      return badge(LABEL, proved, PROVED)
    case "earlier":
      return badge(LABEL, `${proved} · newer ${formatProofDate(recency.latestProvedAt)}`, NEWER)
    default:
      return unreachable(recency)
  }
}

export function unreadableBadge(): string {
  return badge(LABEL, "no proof here", NOTHING)
}

function badge(label: string, message: string, fill: string): string {
  const labelWidth = Math.round(label.length * CHARACTER_WIDTH + PADDING * 2)
  const messageWidth = Math.round(message.length * CHARACTER_WIDTH + PADDING * 2)
  const width = labelWidth + messageWidth

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${HEIGHT}" role="img" aria-label="${escapeXml(`${label}: ${message}`)}">
<title>${escapeXml(`${label}: ${message}`)}</title>
<rect width="${width}" height="${HEIGHT}" rx="3" fill="#0a0a0a"/>
<rect x="${labelWidth}" width="${messageWidth}" height="${HEIGHT}" rx="3" fill="${fill}"/>
<rect x="${labelWidth}" width="4" height="${HEIGHT}" fill="${fill}"/>
<g fill="#ffffff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
<text x="${PADDING}" y="14">${escapeXml(label)}</text>
<text x="${labelWidth + PADDING}" y="14">${escapeXml(message)}</text>
</g>
</svg>
`
}
