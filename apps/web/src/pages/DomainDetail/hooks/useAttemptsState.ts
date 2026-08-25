import { useQuery } from "@tanstack/react-query"
import {
  type AttemptData,
  attemptsKey,
  listAttempts,
  type Verification,
} from "../../../api/verification.api.ts"

export interface UseAttemptsStateOptions {
  verification: Verification | null
}

export interface UseAttemptsStateResult {
  attempts: readonly AttemptData[]
}

const NO_ATTEMPTS: readonly AttemptData[] = []

export const useAttemptsState = ({
  verification,
}: UseAttemptsStateOptions): UseAttemptsStateResult => {
  const query = useQuery({
    queryKey: attemptsKey(verification?.id ?? null, verification?.lastRunAt ?? null),
    queryFn: () =>
      verification === null ? Promise.resolve(NO_ATTEMPTS) : listAttempts(verification),
    enabled: verification !== null,
  })

  return { attempts: query.data ?? NO_ATTEMPTS }
}
