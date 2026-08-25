import { unreachable } from "../../../shared/result.ts"
import type { CheckChallenge, VerificationMethodId } from "../attempt.ts"
import type { CheckTxtChallenge } from "./txt/check.ts"

export type VerificationMethods = {
  readonly checkTxtChallenge: CheckTxtChallenge
}

export function checkChallenge(methods: VerificationMethods): CheckChallenge {
  return (method: VerificationMethodId, challenge, signal) => {
    switch (method) {
      case "dns_txt":
        return methods.checkTxtChallenge(challenge, signal)
      default:
        return unreachable(method)
    }
  }
}
