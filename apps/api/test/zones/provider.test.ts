import { describe, expect, test } from "bun:test"
import { parseSoaRecord } from "../../src/zones/domain/dns.ts"
import { detectProvider } from "../../src/zones/domain/provider.ts"
import { estimatePublishing } from "../../src/zones/domain/publishing.ts"

describe("detectProvider", () => {
  test.each([
    [["ns1.cloudflare.com", "ns2.cloudflare.com"], "cloudflare"],
    [["ns-1017.awsdns-63.net", "ns-1047.awsdns-02.org", "ns-1882.awsdns-43.co.uk"], "route53"],
    [["ns1.vercel-dns.com", "ns2.vercel-dns.com"], "vercel"],
    [["dns1.registrar-servers.com", "dns2.registrar-servers.com"], "namecheap"],
    [["ns01.domaincontrol.com", "ns02.domaincontrol.com"], "godaddy"],
    [["ns-cloud-a1.googledomains.com", "ns-cloud-a2.googledomains.com"], "google-domains"],
    [["dns1.p08.nsone.net", "dns2.p08.nsone.net"], "other"],
    [[], "other"],
  ] as const)("reads %p as %p", (nameservers, expected) => {
    expect(detectProvider(nameservers)).toBe(expected)
  })

  test("falls back to the generic panel when the delegation is split", () => {
    expect(
      detectProvider([
        "dns1.p08.nsone.net",
        "dns2.p08.nsone.net",
        "dns3.p08.nsone.net",
        "dns4.p08.nsone.net",
        "ns-1283.awsdns-32.org",
        "ns-1707.awsdns-21.co.uk",
        "ns-421.awsdns-52.com",
        "ns-520.awsdns-01.net",
      ]),
    ).toBe("other")
  })

  test("names the provider that holds a strict majority", () => {
    expect(detectProvider(["ns1.cloudflare.com", "ns2.cloudflare.com", "ns-1.awsdns-01.com"])).toBe(
      "cloudflare",
    )
  })

  test("ignores the case and the trailing dot the wire uses", () => {
    expect(detectProvider(["NS1.Cloudflare.com."])).toBe("cloudflare")
  })
})

describe("estimatePublishing", () => {
  test("is unknown when the SOA could not be read", () => {
    expect(estimatePublishing(null)).toEqual({ type: "unknown" })
  })

  test.each([
    [300, 5],
    [3600, 60],
    [60, 1],
    [29, 1],
    [0, 0],
  ])("turns %p seconds of negative cache into %p minutes", (seconds, minutes) => {
    expect(estimatePublishing(seconds)).toEqual({ type: "known", minutes })
  })
})

describe("parseSoaRecord", () => {
  test("reads the seven fields DoH hands back as one string", () => {
    expect(
      parseSoaRecord("ns1.Cloudflare.com. dns.cloudflare.com. 2412182421 10000 2400 604800 300"),
    ).toEqual({
      primaryNameserver: "ns1.cloudflare.com",
      hostmaster: "dns.cloudflare.com",
      serial: 2412182421,
      refreshSeconds: 10000,
      retrySeconds: 2400,
      expireSeconds: 604800,
      negativeCacheTtlSeconds: 300,
    })
  })

  test.each([[undefined], [""], ["ns1.acme.com hostmaster 1 2 3"], ["a b c d e f g"]])(
    "returns null for %p rather than a half-parsed record",
    (input) => {
      expect(parseSoaRecord(input)).toBeNull()
    },
  )
})
