import { CHALLENGE_LABEL, challengeHost } from "../../verification/verification.contract.ts"
import type { Claim } from "./claim.ts"

export type ChallengeRecord = {
  readonly host: string
  readonly name: string
  readonly type: "TXT"
  readonly value: string
}

export function challengeRecords(claim: Claim, nameAscii: string): readonly ChallengeRecord[] {
  if (claim.state !== "pending") return []

  return [
    {
      host: CHALLENGE_LABEL,
      name: challengeHost(nameAscii),
      type: "TXT",
      value: claim.token,
    },
  ]
}
