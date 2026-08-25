import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CLAIM_KEY,
  CLAIMS_KEY,
  type ClaimDetail,
  createClaim,
  DOMAINS_KEY,
  findOrCreateDomain,
  type OwnsiError,
} from "../api/claim.api.ts"

export interface UseClaimStartOptions {
  /** Where to go once the token exists, when the caller is not already on that name. */
  onCreated?: (domain: string) => void
}

export interface UseClaimStartResult {
  start: (domain: string) => void
  isStarting: boolean
  failure: OwnsiError | null
}

export const useClaimStart = ({ onCreated }: UseClaimStartOptions = {}): UseClaimStartResult => {
  const queryClient = useQueryClient()

  const mutation = useMutation<ClaimDetail, OwnsiError, string>({
    mutationFn: async (domain) => createClaim((await findOrCreateDomain(domain)).id),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: DOMAINS_KEY })
      await queryClient.invalidateQueries({ queryKey: CLAIMS_KEY })
      await queryClient.invalidateQueries({ queryKey: CLAIM_KEY })
      onCreated?.(created.domain)
    },
  })

  return {
    start: (domain) => mutation.mutate(domain),
    isStarting: mutation.isPending,
    failure: mutation.error,
  }
}
