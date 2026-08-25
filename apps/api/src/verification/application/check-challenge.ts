import type { CheckChallenge } from "../domain/attempt.ts"
import type { CheckTxtChallenge } from "./txt-method.ts"

export type VerificationMethods = {
  readonly checkTxtChallenge: CheckTxtChallenge
}

export function createCheckChallenge(methods: VerificationMethods): CheckChallenge {
  return ({ method, domain, token, previousTokens }, signal) => {
    switch (method) {
      case "dns_txt":
        return methods.checkTxtChallenge({ domain, token, previousTokens }, signal)
    }
  }
}
