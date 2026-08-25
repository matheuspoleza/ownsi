import type { VerificationAttempt } from "../../src/verification/domain/attempt.ts"
import type { VerificationRepository } from "../../src/verification/domain/ports.ts"
import type { Verification } from "../../src/verification/domain/verification.ts"

export type InMemoryVerifications = VerificationRepository & {
  readonly all: () => readonly Verification[]
  readonly attempts: () => readonly VerificationAttempt[]
}

export function inMemoryVerificationRepository(
  seed: readonly Verification[] = [],
): InMemoryVerifications {
  const stored = new Map<string, Verification>(seed.map((one) => [one.id, one]))
  const runs: VerificationAttempt[] = []

  return {
    findById: async (verificationId) => stored.get(verificationId) ?? null,
    save: async (verification) => {
      stored.set(verification.id, verification)
    },
    saveRun: async (verification, attempt) => {
      stored.set(verification.id, verification)
      runs.push(attempt)
    },
    listAttempts: async (verificationId, limit) =>
      runs
        .filter((run) => run.verificationId === verificationId)
        .reverse()
        .slice(0, limit),
    all: () => [...stored.values()],
    attempts: () => [...runs],
  }
}
