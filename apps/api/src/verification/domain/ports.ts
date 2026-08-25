import type { VerificationAttempt } from "./attempt.ts"
import type { Verification } from "./verification.ts"

export type ZoneFacts =
  | {
      readonly type: "answering"
      readonly nameservers: readonly string[]
      readonly negativeCacheTtlSeconds: number | null
    }
  | { readonly type: "unknown" }

export type ReadZoneFacts = (domain: string, signal?: AbortSignal) => Promise<ZoneFacts>

export type VerificationRepository = {
  readonly findById: (verificationId: string) => Promise<Verification | null>
  readonly save: (verification: Verification) => Promise<void>
  readonly saveRun: (verification: Verification, attempt: VerificationAttempt) => Promise<void>
  readonly listAttempts: (
    verificationId: string,
    limit: number,
  ) => Promise<readonly VerificationAttempt[]>
}

export type ScheduleVerification = (input: {
  readonly verificationId: string
  readonly runAt: Date
}) => Promise<void>

export type StopSchedule = (input: { readonly verificationId: string }) => Promise<void>

export type GenerateId = (prefix: string) => string

/** One durable step, so a seven-day wait is testable against a fake that returns at once. */
export type Step = {
  readonly run: <T>(id: string, body: () => Promise<T>) => Promise<T>
  readonly sleepUntil: (id: string, at: Date) => Promise<void>
}
