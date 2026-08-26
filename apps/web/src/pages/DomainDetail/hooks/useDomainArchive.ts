import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  archiveDomain,
  CLAIMS_KEY,
  DOMAINS_KEY,
  type Domain,
  type DomainActions,
  type OwnsiError,
} from "../../../api/claim.api.ts"

export interface UseDomainArchiveOptions {
  domain: DomainActions | null
  onArchived: () => void
}

export interface UseDomainArchiveResult {
  archive: () => void
  isArchiving: boolean
  failure: OwnsiError | null
}

const NOTHING_TO_ARCHIVE = "There is no domain to archive."

export const useDomainArchive = ({
  domain,
  onArchived,
}: UseDomainArchiveOptions): UseDomainArchiveResult => {
  const queryClient = useQueryClient()

  const mutation = useMutation<Domain, OwnsiError>({
    mutationFn: () =>
      domain === null ? Promise.reject(new Error(NOTHING_TO_ARCHIVE)) : archiveDomain(domain),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: DOMAINS_KEY })
      await queryClient.invalidateQueries({ queryKey: CLAIMS_KEY })
      onArchived()
    },
  })

  return {
    archive: () => mutation.mutate(),
    isArchiving: mutation.isPending,
    failure: mutation.error,
  }
}
