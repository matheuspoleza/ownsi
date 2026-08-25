import type { DescribeZone, ZoneDescription } from "../../zones/zones.contract.ts"
import type { ReadZoneFacts, ZoneFacts } from "../domain/ports.ts"

export function zoneFactsFrom(describeZone: DescribeZone): ReadZoneFacts {
  return async (domain, signal) => translate(await describeZone(domain, signal))
}

function translate(description: ZoneDescription): ZoneFacts {
  if (description.type !== "delegated") return { type: "unknown" }

  return {
    type: "answering",
    nameservers: description.nameservers,
    negativeCacheTtlSeconds:
      description.authority.type === "answered"
        ? description.authority.negativeCacheTtlSeconds
        : null,
  }
}
