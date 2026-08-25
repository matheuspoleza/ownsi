import { describe, expect, test } from "bun:test"
import { type DomainName, parseDomainName } from "../../src/shared/domain-name.ts"

function parse(raw: string): DomainName {
  const result = parseDomainName(raw)
  if (!result.ok) throw new Error(`expected ${raw} to parse, got ${result.error}`)
  return result.value
}

describe("parseDomainName", () => {
  test("reduces a pasted URL to the bare name", () => {
    const domain = parse("HTTP://WWW.Acme.com:8080/some/path?q=1")
    expect(domain.ascii).toBe("acme.com")
    expect(domain.normalisations).toEqual([
      "lowercased",
      "scheme_removed",
      "path_removed",
      "port_removed",
      "www_removed",
    ])
  })

  test("takes the domain out of an email address", () => {
    const domain = parse("matheus@acme.com")
    expect(domain.ascii).toBe("acme.com")
    expect(domain.normalisations).toContain("userinfo_removed")
  })

  test("drops the trailing dot of a fully qualified name", () => {
    expect(parse("acme.com.").ascii).toBe("acme.com")
  })

  test("encodes an IDN as punycode and keeps the unicode form to show", () => {
    const domain = parse("cafés.fr")
    expect(domain.ascii).toBe("xn--cafs-dpa.fr")
    expect(domain.unicode).toBe("cafés.fr")
    expect(domain.normalisations).toContain("punycode_encoded")
  })

  test("reports nothing applied when the input was already normal", () => {
    expect(parse("acme.com").normalisations).toEqual([])
  })

  test("finds the registrable name under a multi-part suffix", () => {
    const domain = parse("shop.acme.co.uk")
    expect(domain.registrable).toBe("acme.co.uk")
    expect(domain.publicSuffix).toBe("co.uk")
    expect(domain.isPublicSuffix).toBe(false)
  })

  test("flags a public suffix without refusing it", () => {
    expect(parse("co.uk").isPublicSuffix).toBe(true)
  })

  test.each([
    ["", "empty"],
    ["   ", "empty"],
    ["not a domain", "not_a_hostname"],
    ["localhost", "not_a_hostname"],
    ["acme", "not_a_hostname"],
    [`${"a".repeat(250)}.com`, "too_long"],
  ] as const)("refuses %p as %p", (input, reason) => {
    const result = parseDomainName(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe(reason)
  })
})
