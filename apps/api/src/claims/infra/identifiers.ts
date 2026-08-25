import type { GenerateId, GenerateToken } from "../domain/ports.ts"

const TOKEN_BYTES = 16
const TOKEN_PREFIX = "ownsi_v1_"

export const randomId: GenerateId = () => `clm_${crypto.randomUUID().replaceAll("-", "")}`

export const randomToken: GenerateToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${TOKEN_PREFIX}${hex}`
}
