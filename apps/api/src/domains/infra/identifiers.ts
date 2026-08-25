import { CHALLENGE_TOKEN_PREFIX } from "../../verification/verification.contract.ts"
import type { GenerateToken } from "../domain/ports.ts"

const TOKEN_BYTES = 16

export const randomToken: GenerateToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${CHALLENGE_TOKEN_PREFIX}${hex}`
}
