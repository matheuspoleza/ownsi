import type { Clock } from "../shared/clock.ts"
import type { Database } from "../shared/database.ts"
import {
  type FindOrCreateProofLink,
  findOrCreateProofLink,
} from "./application/find-or-create-proof-link.use-case.ts"
import { type GetProof, getProof } from "./application/get-proof.query.ts"
import { type ListProofLinks, listProofLinks } from "./application/list-proof-links.query.ts"
import { type RevokeProofLink, revokeProofLink } from "./application/revoke-proof-link.use-case.ts"
import type {
  FindProvedClaim,
  GenerateSlug,
  ProofLinkRepository,
  ReadProvider,
} from "./domain/ports.ts"
import { postgresProofLinkRepository } from "./infra/proof-link.repository.ts"
import { randomSlug } from "./infra/slug.service.ts"

export type ProofModuleDeps = {
  readonly clock: Clock
  readonly database: Database
  readonly findProvedClaim: FindProvedClaim
  readonly readProvider: ReadProvider
}

export type ProofModuleOverrides = {
  readonly links?: ProofLinkRepository
  readonly generateSlug?: GenerateSlug
}

export type ProofModule = {
  readonly findOrCreateProofLink: FindOrCreateProofLink
  readonly listProofLinks: ListProofLinks
  readonly revokeProofLink: RevokeProofLink
  readonly getProof: GetProof
}

export function createProofModule(
  deps: ProofModuleDeps,
  overrides: ProofModuleOverrides = {},
): ProofModule {
  const links = overrides.links ?? postgresProofLinkRepository(deps.database)
  const { findProvedClaim, clock } = deps

  return {
    findOrCreateProofLink: findOrCreateProofLink({
      links,
      findProvedClaim,
      readProvider: deps.readProvider,
      generateSlug: overrides.generateSlug ?? randomSlug,
      clock,
    }),
    listProofLinks: listProofLinks({ links, findProvedClaim, clock }),
    revokeProofLink: revokeProofLink({ links, findProvedClaim, clock }),
    getProof: getProof({ links, clock }),
  }
}
