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

/** The panel's own words for the two fields that matter, and the path to the form. */
export interface ProviderInstruction {
  hostLabel: string
  valueLabel: string
  where: string
}

export const PROVIDER_INSTRUCTIONS: Record<ProviderId, ProviderInstruction> = {
  cloudflare: {
    hostLabel: "Name",
    valueLabel: "Content",
    where: "DNS › Records",
  },
  route53: {
    hostLabel: "Record name",
    valueLabel: "Value",
    where: "Hosted zones › Create record",
  },
  godaddy: {
    hostLabel: "Name",
    valueLabel: "Value",
    where: "My Products › DNS",
  },
  namecheap: {
    hostLabel: "Host",
    valueLabel: "Value",
    where: "Domain List › Advanced DNS",
  },
  "google-domains": {
    hostLabel: "Host name",
    valueLabel: "Data",
    where: "DNS › Custom records",
  },
  vercel: {
    hostLabel: "Name",
    valueLabel: "Value",
    where: "Domains › DNS Records",
  },
  other: {
    hostLabel: "Host",
    valueLabel: "Value",
    where: "DNS records",
  },
}
