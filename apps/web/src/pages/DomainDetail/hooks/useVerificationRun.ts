import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { OwnsiError } from "../../../api/claim.api.ts"
import {
  runVerification,
  type Verification,
  verificationKey,
} from "../../../api/verification.api.ts"

export interface UseVerificationRunOptions {
  verification: Verification | null
}

export interface UseVerificationRunResult {
  run: () => void
  isRunning: boolean
  failure: OwnsiError | null
}

const NOTHING_TO_RUN = "There is no verification behind this claim to run."

export const useVerificationRun = ({
  verification,
}: UseVerificationRunOptions): UseVerificationRunResult => {
  const queryClient = useQueryClient()

  const mutation = useMutation<Verification, OwnsiError>({
    mutationFn: () => {
      if (verification === null) return Promise.reject(new Error(NOTHING_TO_RUN))
      return runVerification(verification)
    },
    onSuccess: (ran) => {
      queryClient.setQueryData(verificationKey(ran.id), ran)
    },
  })

  return {
    run: () => mutation.mutate(),
    isRunning: mutation.isPending,
    failure: mutation.error,
  }
}
