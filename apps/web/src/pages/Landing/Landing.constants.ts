export interface Witness {
  resolver: string
  address: string
  latency: string
}

/** The three public resolvers the API reads, in the order they answer. */
export const WITNESSES: readonly Witness[] = [
  { resolver: "google", address: "8.8.8.8", latency: "189 ms" },
  { resolver: "cloudflare", address: "1.1.1.1", latency: "214 ms" },
  { resolver: "quad9", address: "9.9.9.9", latency: "240 ms" },
]

/** The zone's own nameservers are asked separately, and the readout says what they held. */
export const AUTHORITY = "ns1.cloudflare.com holds it"

export const HEADLINE = "Claim. Prove. Share."

export const LEAD =
  "One TXT record proves a domain is yours — once, not once for every platform that asks. What you get back is a public link anyone can open and check."

export const STEPS = [
  {
    title: "Claim",
    body: "Type the domain. We give you the exact TXT record, with the steps for your provider.",
  },
  {
    title: "Prove",
    body: "We read it back from three public resolvers and the zone's own nameservers, and show you what each one returned.",
  },
  {
    title: "Share",
    body: "You get a link. Anyone can open it and re-run the check themselves.",
  },
] as const
