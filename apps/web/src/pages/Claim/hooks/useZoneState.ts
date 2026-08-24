import { experimental_streamedQuery as streamedQuery, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import {
  RETRYABLE_ZONE_ERRORS,
  readZone,
  type ZoneDelegation,
  type ZoneFailure,
  type ZonePublishing,
  type ZoneStep,
} from "../../../api/zone.api.ts"

export interface UseZoneStateOptions {
  domain: string
}

export interface UseZoneStateResult {
  delegation?: ZoneDelegation
  publishing?: ZonePublishing
  isReading: boolean
  isSlow: boolean
  failure: ZoneFailure | null
}

interface ZoneReading {
  delegation?: ZoneDelegation
  publishing?: ZonePublishing
}

const ZONE_STALE_TIME = 60_000
const RETRIES = 1
const READING_FLOOR_MS = 1100
const SLOW_AFTER_MS = 5_000

const EMPTY_READING: ZoneReading = {}

const withStep = (reading: ZoneReading, step: ZoneStep): ZoneReading =>
  step.step === "delegation" ? { ...reading, delegation: step } : { ...reading, publishing: step }

const useElapsed = (ms: number, key: string) => {
  const [elapsedFor, setElapsedFor] = useState<string | null>(null)

  useEffect(() => {
    setElapsedFor(null)
    const timer = setTimeout(() => setElapsedFor(key), ms)
    return () => clearTimeout(timer)
  }, [ms, key])

  return elapsedFor === key
}

export const useZoneState = ({ domain }: UseZoneStateOptions): UseZoneStateResult => {
  const query = useQuery<ZoneReading, ZoneFailure>({
    queryKey: ["zone", domain],
    queryFn: streamedQuery({
      streamFn: ({ signal }) => readZone(domain, signal),
      reducer: withStep,
      initialValue: EMPTY_READING,
      refetchMode: "replace",
    }),
    staleTime: ZONE_STALE_TIME,
    retry: (attempt, error) => attempt < RETRIES && RETRYABLE_ZONE_ERRORS.has(error.code),
  })

  const floorElapsed = useElapsed(READING_FLOOR_MS, domain)
  const slowElapsed = useElapsed(SLOW_AFTER_MS, domain)

  const reading = query.data ?? EMPTY_READING
  const stillReading = !reading.publishing && !query.error

  return {
    delegation: reading.delegation,
    publishing: reading.publishing,
    isReading: stillReading || !floorElapsed,
    isSlow: stillReading && slowElapsed,
    failure: query.error,
  }
}
