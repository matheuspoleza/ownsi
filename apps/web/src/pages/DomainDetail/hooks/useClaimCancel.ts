import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CLAIM_KEY,
  CLAIMS_KEY,
  type Claim,
  cancelClaim,
  type OwnsiError,
} from "../../../api/claim.api.ts"

export interface UseClaimCancelOptions {
  claim: Claim | null
}

export interface UseClaimCancelResult {
  cancel: () => void
  isCanceling: boolean
  failure: OwnsiError | null
}

const NOTHING_TO_CANCEL = "There is no open claim to end."

export const useClaimCancel = ({ claim }: UseClaimCancelOptions): UseClaimCancelResult => {
  const queryClient = useQueryClient()

  const mutation = useMutation<Claim, OwnsiError>({
    mutationFn: () => {
      if (claim === null) return Promise.reject(new Error(NOTHING_TO_CANCEL))
      return cancelClaim(claim)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CLAIMS_KEY })
      await queryClient.invalidateQueries({ queryKey: CLAIM_KEY })
    },
  })

  return {
    cancel: () => mutation.mutate(),
    isCanceling: mutation.isPending,
    failure: mutation.error,
  }
}
