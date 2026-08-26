import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { CLAIM_KEY, CLAIMS_KEY, DOMAINS_KEY } from "../api/claim.api.ts"
import { subscribeToEvents } from "../api/events.api.ts"
import { verificationKey } from "../api/verification.api.ts"

export interface UseLiveUpdatesOptions {
  enabled: boolean
}

/**
 * One stream for the whole app. A message never carries state: it names what moved and the
 * query that held it is thrown away, so the screen reads it back over its own route.
 */
export const useLiveUpdates = ({ enabled }: UseLiveUpdatesOptions): void => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const stale = (queryKey: readonly unknown[]) => {
      void queryClient.invalidateQueries({ queryKey })
    }

    return subscribeToEvents((event) => {
      switch (event.type) {
        case "verification.ran":
          stale(verificationKey(event.verificationId))
          stale(DOMAINS_KEY)
          break
        case "claim.ended":
          stale(DOMAINS_KEY)
          stale(CLAIMS_KEY)
          stale(CLAIM_KEY)
          break
        case "domain.archived":
        case "domain.unarchived":
          stale(DOMAINS_KEY)
          stale(CLAIMS_KEY)
          break
        default:
          break
      }
    })
  }, [enabled, queryClient])
}
