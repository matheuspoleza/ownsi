import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { endSession, SESSION_KEY } from "../api/session.api.ts"

export interface UseSessionEndResult {
  end: () => void
  isEnding: boolean
}

export const useSessionEnd = (): UseSessionEndResult => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: endSession,
    onSuccess: async () => {
      queryClient.setQueryData(SESSION_KEY, null)
      queryClient.removeQueries({
        predicate: ({ queryKey }) => queryKey[0] !== SESSION_KEY[0],
      })
      await navigate({ to: "/" })
    },
  })

  return { end: () => mutation.mutate(), isEnding: mutation.isPending }
}
