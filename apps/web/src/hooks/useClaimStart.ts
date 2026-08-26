import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CLAIM_KEY,
  CLAIMS_KEY,
  createClaim,
  DOMAINS_KEY,
  findOrCreateDomain,
  isAlreadyClaimed,
  type OwnsiError,
} from "../api/claim.api.ts"

export interface UseClaimStartOptions {
  /** The name whose claim is now open — minted just now, or already waiting on the account. */
  onOpen?: (domain: string) => void
}

export interface UseClaimStartResult {
  start: (domain: string) => void
  /** Retires the last failure, for a caller whose field has moved on from the name that failed. */
  clearFailure: () => void
  isStarting: boolean
  failure: OwnsiError | null
}

export const useClaimStart = ({ onOpen }: UseClaimStartOptions = {}): UseClaimStartResult => {
  const queryClient = useQueryClient()

  const mutation = useMutation<string, OwnsiError, string>({
    mutationFn: async (typed) => {
      const domain = await findOrCreateDomain(typed)

      try {
        await createClaim(domain.id)
      } catch (thrown) {
        if (!isAlreadyClaimed(thrown)) throw thrown
      }

      return domain.name
    },
    onSuccess: async (opened) => {
      await queryClient.invalidateQueries({ queryKey: DOMAINS_KEY })
      await queryClient.invalidateQueries({ queryKey: CLAIMS_KEY })
      await queryClient.invalidateQueries({ queryKey: CLAIM_KEY })
      onOpen?.(opened)
    },
  })

  return {
    start: (domain) => mutation.mutate(domain),
    clearFailure: mutation.reset,
    isStarting: mutation.isPending,
    failure: mutation.error,
  }
}
