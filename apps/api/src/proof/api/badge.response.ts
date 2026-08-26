import type { ProofLink } from "../domain/proof-link.ts"
import { escapeXml, formatProofDate } from "./proof.response.ts"

const CHARACTER_WIDTH = 6.2

const PADDING = 10

const HEIGHT = 20

const LABEL = "ownsi"

export function proofBadge(link: ProofLink): string {
  return badge(LABEL, `proved ${formatProofDate(link.attestation.provedAt)}`, "#0f5c36")
}

export function unreadableBadge(): string {
  return badge(LABEL, "link expired", "#737373")
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
