import { useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import {
  RETRYABLE_ZONE_ERRORS,
  readZone,
  type Zone,
  type ZoneFailure,
} from "../../../api/zone.api.ts"

export interface UseZoneStateOptions {
  domain: string
}

export interface UseZoneStateResult {
  zone?: Zone
  isReading: boolean
  failure: ZoneFailure | null
}

const ZONE_STALE_TIME = 60_000
const RETRIES = 1
const READING_FLOOR_MS = 1100

const useReadingFloor = (ms: number, key: string) => {
  const [elapsedFor, setElapsedFor] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setElapsedFor(key), ms)
    return () => clearTimeout(timer)
  }, [ms, key])

  return elapsedFor === key
}

export const useZoneState = ({ domain }: UseZoneStateOptions): UseZoneStateResult => {
  const query = useQuery<Zone, ZoneFailure>({
    queryKey: ["zone", domain],
    queryFn: ({ signal }) => readZone(domain, signal),
    staleTime: ZONE_STALE_TIME,
    retry: (attempt, error) => attempt < RETRIES && RETRYABLE_ZONE_ERRORS.has(error.code),
  })

  const floorElapsed = useReadingFloor(READING_FLOOR_MS, domain)

  return {
    zone: query.data,
    isReading: query.isPending || !floorElapsed,
    failure: query.error,
  }
}
