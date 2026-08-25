import type { CheckChallenge } from "../../verification/verification.contract.ts"
import type { CheckClaim } from "../domain/ports.ts"

export function checkClaimByDnsTxt(checkChallenge: CheckChallenge): CheckClaim {
  return ({ domain, token, previousTokens }) =>
    checkChallenge({ method: "dns_txt", domain, token, previousTokens })
}
