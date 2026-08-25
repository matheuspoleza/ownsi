import { useMutation, useQueryClient } from "@tanstack/react-query"
import { endSession } from "../api/session.api.ts"

export interface UseSessionEndResult {
  end: () => void
  isEnding: boolean
}

export const useSessionEnd = (): UseSessionEndResult => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: endSession,
    onSuccess: () => {
      queryClient.clear()
    },
  })

  return { end: () => mutation.mutate(), isEnding: mutation.isPending }
}
