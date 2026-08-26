import { GlobeIcon } from "@ownsi/ui"
import type { ComponentProps, ReactNode } from "react"

const CloudflareGlyph = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M16.5088 16.8447c.1475-.5068.0908-.9707-.1553-1.3154-.2246-.3164-.6045-.499-1.0615-.5205l-8.6592-.1123a.1559.1559 0 0 1-.1333-.0713c-.0283-.042-.0351-.0986-.021-.1553.0278-.084.1123-.1484.2036-.1562l8.7359-.1123c1.0351-.0489 2.1601-.8868 2.5537-1.9136l.499-1.3013c.0215-.0561.0293-.1128.0147-.168-.5625-2.5463-2.835-4.4453-5.5499-4.4453-2.5039 0-4.6284 1.6177-5.3876 3.8614-.4927-.3658-1.1187-.5625-1.794-.499-1.2026.119-2.1665 1.083-2.2861 2.2856-.0283.31-.0069.6128.0635.894C1.5683 13.171 0 14.7754 0 16.752c0 .1748.0142.3515.0352.5273.0141.083.0844.1475.1689.1475h15.9814c.0909 0 .1758-.0645.2032-.1553l.12-.4268zm2.7568-5.5634c-.0771 0-.1611 0-.2383.0112-.0566 0-.1054.0415-.127.0976l-.3378 1.1744c-.1475.5068-.0918.9707.1543 1.3164.2256.3164.6055.498 1.0625.5195l1.8437.1133c.0557 0 .1055.0263.1329.0703.0283.043.0351.1074.0214.1562-.0283.084-.1132.1485-.204.1553l-1.921.1123c-1.041.0488-2.1582.8867-2.5527 1.914l-.1406.3585c-.0283.0713.0215.1416.0986.1416h6.5977c.0771 0 .1474-.0489.169-.126.1122-.4082.1757-.837.1757-1.2803 0-2.6025-2.125-4.727-4.7344-4.727"
      fill="#F38020"
    />
  </svg>
)

const Route53Glyph = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M3.6 3.6h16.8v16.8H3.6zM2 2v20h20V2z"
      fill="#8C4FFF"
      transform="translate(0 0) scale(0)"
    />
    <path
      d="M12 1.2 2.6 5.4v13.2L12 22.8l9.4-4.2V5.4zm0 1.9 7.6 3.4-7.6 3.4-7.6-3.4zM4.2 7.9l7 3.2v8.8l-7-3.1zm8.6 12V11.1l7-3.2v8.9z"
      fill="#8C4FFF"
    />
  </svg>
)

const VercelGlyph = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 2 23 21H1z" fill="currentColor" />
  </svg>
)

const GoDaddyGlyph = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M20.4 3.6c-2.2-2.2-5.8-1.9-8.9.4-3.1-2.3-6.7-2.6-8.9-.4-2.2 2.2-1.9 5.8.4 8.9-2.3 3.1-2.6 6.7-.4 8.9 2.2 2.2 5.8 1.9 8.9-.4 3.1 2.3 6.7 2.6 8.9.4 2.2-2.2 1.9-5.8-.4-8.9 2.3-3.1 2.6-6.7.4-8.9zM4.3 4.9c1.2-1.2 3.3-1.1 5.4.1-2 1.9-3.6 4.2-4.5 6.7-1.7-2.3-2-4.8-.9-6.8zm1.4 14.2c-1.2-1.2-1.1-3.3.1-5.4 1.9 2 4.2 3.6 6.7 4.5-2.3 1.7-4.8 2-6.8.9zm13-.2c-1.2 1.2-3.3 1.1-5.4-.1 2-1.9 3.6-4.2 4.5-6.7 1.7 2.3 2 4.8.9 6.8zm-.4-7.5c-.9-2.5-2.5-4.8-4.5-6.7 2.1-1.2 4.2-1.3 5.4-.1 1.1 2 .8 4.5-.9 6.8z"
      fill="#1BDBDB"
    />
  </svg>
)

const NamecheapGlyph = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M2 19 9 4l6 11 1-8 6 16-7-4-6-11-1 8z" fill="#DE3723" />
  </svg>
)

const GoogleGlyph = (props: ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" role="presentation" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path
      d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8z"
      fill="#4285F4"
    />
    <path
      d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .6-2.2 1-3.8 1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23z"
      fill="#34A853"
    />
    <path d="M5.7 14a6.6 6.6 0 0 1 0-4.2V7H2a11 11 0 0 0 0 9.9z" fill="#FBBC05" />
    <path
      d="M12 5.4c1.6 0 3.1.6 4.3 1.7l3.2-3.2A11 11 0 0 0 2 7l3.7 2.9c.9-2.7 3.4-4.6 6.3-4.6z"
      fill="#EA4335"
    />
  </svg>
)

const GLYPHS: Record<string, (props: ComponentProps<"svg">) => ReactNode> = {
  cloudflare: CloudflareGlyph,
  route53: Route53Glyph,
  vercel: VercelGlyph,
  godaddy: GoDaddyGlyph,
  namecheap: NamecheapGlyph,
  "google-domains": GoogleGlyph,
}

export interface ProviderGlyphProps {
  provider: string
  className?: string
}

/**
 * A named provider gets its own mark; an unnamed one gets a globe. The globe turns when an
 * `AnimateIcon` around the real hover target says so — never on the 14px glyph itself.
 */
export const ProviderGlyph = ({ provider, className }: ProviderGlyphProps) => {
  const Glyph = GLYPHS[provider.toLowerCase()]
  if (!Glyph) return <GlobeIcon className={className} strokeWidth={1.6} />

  return <Glyph className={className} />
}
