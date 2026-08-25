import { type Claims, claims } from "./claims.ts"
import { createTreaty, type OwnsiConfig, type Treaty } from "./client.ts"
import { type Domains, domains } from "./domains.ts"
import { type Verifications, verifications } from "./verifications.ts"
import { type Zones, zones } from "./zones.ts"

export type {
  ChallengeRecord,
  Claim,
  ClaimData,
  ClaimDetail,
  ClaimDetailData,
  ClaimState,
  Claims,
  Coexistence,
} from "./claims.ts"
export type { FetchLike, OwnsiConfig } from "./client.ts"
export type { Domain, DomainData, Domains } from "./domains.ts"
export type { OwnsiError, OwnsiErrorCode } from "./error.ts"
export { isOwnsiError, OWNSI_ERROR_CODES, RETRYABLE } from "./error.ts"
export type {
  AttemptData,
  Diagnosis,
  Verification,
  VerificationData,
  VerificationStatus,
  Verifications,
  WaitEstimate,
} from "./verifications.ts"
export type { ZoneDelegation, ZonePublishing, ZoneStep, Zones } from "./zones.ts"

export type Ownsi = {
  readonly domains: Domains
  readonly claims: Claims
  readonly verifications: Verifications
  readonly zones: Zones
  /** The Eden client underneath, for a route the SDK does not cover yet. */
  readonly api: Treaty
}

export function createOwnsi(config: OwnsiConfig): Ownsi {
  const api = createTreaty(config)

  return {
    domains: domains(api),
    claims: claims(api),
    verifications: verifications(api),
    zones: zones(api),
    api,
  }
}
