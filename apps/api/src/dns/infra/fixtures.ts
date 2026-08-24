import type { DnsFixtures } from "./fake-resolver.ts"

function delegation(name: string, hosts: readonly string[]) {
  return {
    status: "NOERROR" as const,
    records: hosts.map((data) => ({ name, type: "NS" as const, ttl: 86_400, data })),
  }
}

function startOfAuthority(name: string, primaryNameserver: string, negativeCacheTtl: number) {
  return {
    status: "NOERROR" as const,
    records: [
      {
        name,
        type: "SOA" as const,
        ttl: negativeCacheTtl,
        data: `${primaryNameserver} hostmaster.${name} 2026082401 10000 2400 604800 ${negativeCacheTtl}`,
      },
    ],
  }
}

export const DEMO_FIXTURES: DnsFixtures = {
  "acme.com|NS": delegation("acme.com", ["ns1.cloudflare.com", "ns2.cloudflare.com"]),
  "acme.com|SOA": startOfAuthority("acme.com", "ns1.cloudflare.com", 300),

  "example.org|NS": delegation("example.org", [
    "ns-1.awsdns-01.com",
    "ns-2.awsdns-02.org",
    "ns-3.awsdns-03.net",
  ]),
  "example.org|SOA": startOfAuthority("example.org", "ns-1.awsdns-01.com", 900),

  "silent.test|NS": delegation("silent.test", ["dns1.registrar-servers.com"]),
}
