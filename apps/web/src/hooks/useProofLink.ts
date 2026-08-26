import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { OwnsiError } from "../api/claim.api.ts"
import {
  listProofLinks,
  type ProofLink,
  proofLinksKey,
  publishProofLink,
  revokeProofLink,
} from "../api/proof.api.ts"

export interface UseProofLinkOptions {
  /** The proved claim the link shares. Null while the screen has nothing to share yet. */
  claimId: string | null
}

export interface UseProofLinkResult {
  /** The one link still resolving, or null until somebody asks for one. */
  link: ProofLink | null
  isResolving: boolean
  publish: () => void
  isPublishing: boolean
  revoke: () => void
  isRevoking: boolean
  failure: OwnsiError | null
}

const NOTHING_TO_SHARE = "There is no proved claim here to share."

const NO_LINK = "There is no link out to take back."

const NO_LINKS: readonly ProofLink[] = []

export const useProofLink = ({ claimId }: UseProofLinkOptions): UseProofLinkResult => {
  const queryClient = useQueryClient()

  const links = useQuery({
    queryKey: proofLinksKey(claimId),
    queryFn: () => (claimId === null ? Promise.resolve(NO_LINKS) : listProofLinks(claimId)),
    enabled: claimId !== null,
  })

  const link = (links.data ?? NO_LINKS).find((one) => one.standing === "live") ?? null

  const settle = async () => {
    await queryClient.invalidateQueries({ queryKey: proofLinksKey(claimId) })
  }

  const publish = useMutation<ProofLink, OwnsiError>({
    mutationFn: () =>
      claimId === null ? Promise.reject(new Error(NOTHING_TO_SHARE)) : publishProofLink(claimId),
    onSuccess: settle,
  })

  const revoke = useMutation<ProofLink, OwnsiError>({
    mutationFn: () => (link === null ? Promise.reject(new Error(NO_LINK)) : revokeProofLink(link)),
    onSuccess: settle,
  })

  return {
    link,
    isResolving: claimId !== null && links.isPending,
    publish: () => publish.mutate(),
    isPublishing: publish.isPending,
    revoke: () => revoke.mutate(),
    isRevoking: revoke.isPending,
    failure: publish.error ?? revoke.error,
  }
}
