import { describe, expect, test } from "bun:test"
import { parseDomainName } from "../../src/shared/domain-name.ts"
import { zoneCandidates } from "../../src/zones/domain/delegation.ts"

const parse = (raw: string) => {
  const result = parseDomainName(raw)
  if (!result.ok) throw new Error(`${raw} does not parse`)
  return result.value
}

describe("the zones a name could be answered by", () => {
  test("walks up to the registrable name and stops there", () => {
    expect(zoneCandidates(parse("app.staging.acme.com"))).toEqual([
      "app.staging.acme.com",
      "staging.acme.com",
      "acme.com",
    ])
  })

  test("stops above the public suffix, never at it", () => {
    expect(zoneCandidates(parse("shop.acme.co.uk"))).toEqual(["shop.acme.co.uk", "acme.co.uk"])
  })

  test("is just the name itself when it is already the apex", () => {
    expect(zoneCandidates(parse("acme.com"))).toEqual(["acme.com"])
  })
})
