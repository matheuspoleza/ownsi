import type { LatestProof } from "../domain/latest-proof.ts"
import type { FindLatestProof } from "../domain/ports.ts"

export type GetLatestProof = (nameAscii: string) => Promise<LatestProof | null>

export type GetLatestProofDeps = {
  readonly findLatestProof: FindLatestProof
}

export function getLatestProof(deps: GetLatestProofDeps): GetLatestProof {
  return async (nameAscii) => deps.findLatestProof(nameAscii)
}
