export type ProviderId =
  | "cloudflare"
  | "route53"
  | "godaddy"
  | "namecheap"
  | "google-domains"
  | "vercel"
  | "other"

export const PROVIDER_NAMES: Record<ProviderId, string> = {
  cloudflare: "Cloudflare",
  route53: "Amazon Route 53",
  godaddy: "GoDaddy",
  namecheap: "Namecheap",
  "google-domains": "Google Domains",
  vercel: "Vercel",
  other: "your DNS provider",
}
