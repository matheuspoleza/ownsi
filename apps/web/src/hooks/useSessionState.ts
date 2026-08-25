import { useQuery } from "@tanstack/react-query"
import { type Account, readSession, SESSION_KEY } from "../api/session.api.ts"

export interface UseSessionStateResult {
  account: Account | null
  isResolving: boolean
}

const SESSION_STALE_TIME = 30_000

export const useSessionState = (): UseSessionStateResult => {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: readSession,
    staleTime: SESSION_STALE_TIME,
  })

  return { account: query.data ?? null, isResolving: query.isPending }
}
