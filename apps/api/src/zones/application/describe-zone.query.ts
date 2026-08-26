import type { DescribeZone, ProviderId, ZoneDescription } from "../zones.contract.ts"
import type { GetZone, GetZoneError, ZoneStep } from "./get-zone.query.ts"

export function describeZone(readZone: GetZone): DescribeZone {
  return async (name, signal) => {
    let description: ZoneDescription = { type: "unreadable", reason: "unreachable" }

    for await (const step of readZone({ name, signal })) {
      description = fold(description, step)
    }
    return description
  }
}

function fold(description: ZoneDescription, step: ZoneStep): ZoneDescription {
  switch (step.type) {
    case "failed":
      return unreadable(step.error)
    case "delegated":
      return delegated(step.zone.name, step.zone.nameservers, step.zone.provider)
    case "published":
      return withAuthority(description, step.negativeCacheTtlSeconds)
  }
}

function delegated(
  name: string,
  nameservers: readonly string[],
  provider: ProviderId,
): ZoneDescription {
  const [first, ...rest] = nameservers
  if (first === undefined) return { type: "not_delegated", name }

  return {
    type: "delegated",
    zoneName: name,
    nameservers: [first, ...rest],
    provider,
    authority: { type: "silent" },
  }
}

function withAuthority(
  description: ZoneDescription,
  negativeCacheTtlSeconds: number | null,
): ZoneDescription {
  if (description.type !== "delegated" || negativeCacheTtlSeconds === null) return description

  return { ...description, authority: { type: "answered", negativeCacheTtlSeconds } }
}

function unreadable(error: GetZoneError): ZoneDescription {
  switch (error.type) {
    case "invalid_domain":
      return { type: "unreadable", reason: "invalid_name" }
    case "no_delegation":
      return { type: "not_delegated", name: error.name }
    case "unresolvable":
      return { type: "unreadable", reason: "unreachable" }
  }
}
