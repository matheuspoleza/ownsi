import { type Treaty, unwrap } from "./client.ts"

type VerificationRequest = ReturnType<Treaty["verifications"]>

export type VerificationData = NonNullable<Awaited<ReturnType<VerificationRequest["get"]>>["data"]>

export type AttemptData = NonNullable<
  Awaited<ReturnType<VerificationRequest["attempts"]["get"]>>["data"]
>["attempts"][number]

export type Diagnosis = NonNullable<VerificationData["diagnosis"]>

export type WaitEstimate = NonNullable<VerificationData["waitEstimate"]>

export type VerificationStatus = VerificationData["status"]

export type Verification = VerificationData & {
  /** Reads DNS now instead of waiting for the schedule. Rate limited per verification. */
  readonly run: () => Promise<Verification>
  readonly attempts: () => Promise<readonly AttemptData[]>
  readonly refresh: () => Promise<Verification>
}

export type Verifications = {
  readonly get: (verificationId: string) => Promise<Verification>
}

export function verifications(api: Treaty): Verifications {
  return { get: (verificationId) => readVerification(api, verificationId) }
}

export async function readVerification(api: Treaty, verificationId: string): Promise<Verification> {
  return asVerification(api, await unwrap(api.verifications({ id: verificationId }).get()))
}

export async function runVerification(api: Treaty, verificationId: string): Promise<Verification> {
  return asVerification(api, await unwrap(api.verifications({ id: verificationId }).runs.post()))
}

function asVerification(api: Treaty, data: VerificationData): Verification {
  return {
    ...data,
    run: () => runVerification(api, data.id),
    refresh: () => readVerification(api, data.id),
    attempts: async () =>
      (await unwrap(api.verifications({ id: data.id }).attempts.get())).attempts,
  }
}
