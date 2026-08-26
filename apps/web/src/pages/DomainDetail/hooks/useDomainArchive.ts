import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  archiveDomain,
  CLAIMS_KEY,
  DOMAINS_KEY,
  type Domain,
  type OwnsiError,
  readDomain,
} from "../../../api/claim.api.ts"

export interface UseDomainArchiveOptions {
  domainId: string | null
  onArchived: () => void
}

export interface UseDomainArchiveResult {
  archive: () => void
  isArchiving: boolean
  failure: OwnsiError | null
}

const NOTHING_TO_ARCHIVE = "There is no domain to archive."

export const useDomainArchive = ({
  domainId,
  onArchived,
}: UseDomainArchiveOptions): UseDomainArchiveResult => {
  const queryClient = useQueryClient()

  const domain = useQuery({
    queryKey: [...DOMAINS_KEY, domainId],
    queryFn: () => (domainId === null ? Promise.resolve(null) : readDomain(domainId)),
    enabled: domainId !== null,
  })

  const mutation = useMutation<Domain, OwnsiError>({
    mutationFn: () => {
      const found = domain.data
      if (!found) return Promise.reject(new Error(NOTHING_TO_ARCHIVE))
      return archiveDomain(found)
    },
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
