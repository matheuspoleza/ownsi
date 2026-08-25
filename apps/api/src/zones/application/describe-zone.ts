import type { DescribeZone, ZoneDescription } from "../zones.contract.ts"
import type { ReadZone, ReadZoneError, ZoneStep } from "./read-zone.ts"

export function createDescribeZone(readZone: ReadZone): DescribeZone {
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
      return delegated(step.zone.name, step.zone.nameservers)
    case "published":
      return withAuthority(description, step.negativeCacheTtlSeconds)
  }
}

function delegated(name: string, nameservers: readonly string[]): ZoneDescription {
  const [first, ...rest] = nameservers
  if (first === undefined) return { type: "not_delegated", name }

  return {
    type: "delegated",
    zoneName: name,
    nameservers: [first, ...rest],
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

function unreadable(error: ReadZoneError): ZoneDescription {
  switch (error.type) {
    case "invalid_domain":
      return { type: "unreadable", reason: "invalid_name" }
    case "no_delegation":
      return { type: "not_delegated", name: error.name }
    case "unresolvable":
      return { type: "unreadable", reason: "unreachable" }
  }
}
