import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef } from "react"
import type { OwnsiError } from "../../../api/claim.api.ts"
import { useClaimStart } from "../../../hooks/useClaimStart.ts"
import { useClaimState } from "../../../hooks/useClaimState.ts"

export interface UseClaimHandoffOptions {
  domain: string
  signedIn: boolean
}

export interface UseClaimHandoffResult {
  isOpening: boolean
  failure: OwnsiError | null
}

/**
 * Pressing "claim" is the act; the log-in is only what interrupts it. So the moment the account
 * lands back on this name we open the claim it asked for and hand the person their record. A name
 * this account has already claimed is never re-opened — a second claim would retire the token of
 * the first — so it is handed over as it stands.
 */
export const useClaimHandoff = ({
  domain,
  signedIn,
}: UseClaimHandoffOptions): UseClaimHandoffResult => {
  const navigate = useNavigate()
  const handedOver = useRef<string | null>(null)

  const { claim, isResolving } = useClaimState({ domain, enabled: signedIn })

  const hand = useCallback(
    (claimed: string) =>
      navigate({ to: "/domains/$domain", params: { domain: claimed }, replace: true }),
    [navigate],
  )

  const { start, isStarting, failure } = useClaimStart({ onOpen: hand })

  useEffect(() => {
    if (!signedIn || isResolving || handedOver.current === domain) return

    handedOver.current = domain

    if (claim === null) start(domain)
    else hand(domain)
  }, [signedIn, isResolving, claim, domain, start, hand])

  return { isOpening: signedIn && (isResolving || isStarting), failure }
}
