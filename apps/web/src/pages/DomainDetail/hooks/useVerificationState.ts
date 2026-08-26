import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { CLAIM_KEY, CLAIMS_KEY } from "../../../api/claim.api.ts"
import {
  readVerification,
  type Verification,
  type VerificationStatus,
  verificationKey,
} from "../../../api/verification.api.ts"
import { LIVE_STATUSES } from "../DomainDetail.constants.ts"

export interface UseVerificationStateOptions {
  verificationId: string | null
}

export interface UseVerificationStateResult {
  verification: Verification | null
  isResolving: boolean
}

const SAFETY_NET_MS = 60_000

const isLive = (status: VerificationStatus | undefined) =>
  status !== undefined && LIVE_STATUSES.has(status)

const read = (verificationId: string | null) =>
  verificationId === null ? Promise.resolve(null) : readVerification(verificationId)

export const useVerificationState = ({
  verificationId,
}: UseVerificationStateOptions): UseVerificationStateResult => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: verificationKey(verificationId),
    queryFn: () => read(verificationId),
    enabled: verificationId !== null,
    refetchInterval: ({ state }) => (isLive(state.data?.status) ? SAFETY_NET_MS : false),
  })

  const status = query.data?.status ?? null

  useEffect(() => {
    if (status === null || LIVE_STATUSES.has(status)) return

    queryClient.invalidateQueries({ queryKey: CLAIMS_KEY })
    queryClient.invalidateQueries({ queryKey: CLAIM_KEY })
  }, [status, queryClient])

  return {
    verification: query.data ?? null,
    isResolving: verificationId !== null && query.isPending,
  }
}
