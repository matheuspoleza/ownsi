import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { SessionPlugin } from "../../shared/http/session.ts"
import type { ClaimDomain } from "../application/claim-domain.ts"
import type { ListClaims } from "../application/list-claims.ts"
import type { ReadClaim } from "../application/read-claim.ts"
import type { TransitionClaim } from "../application/transition-claim.ts"
import { notFound, toClaimDomainError } from "./claim.errors.ts"
import {
  ClaimListResponse,
  ClaimResponse,
  toClaimListResponse,
  toClaimResponse,
} from "./claim.response.ts"

const MAX_DOMAIN_LENGTH = 253

export type ClaimHandlers = {
  readonly claimDomain: ClaimDomain
  readonly listClaims: ListClaims
  readonly readClaim: ReadClaim
  readonly requestCheck: TransitionClaim
  readonly archiveClaim: TransitionClaim
  readonly restoreClaim: TransitionClaim
}

const Identifier = t.Object({ id: t.String({ minLength: 1 }) })

const transitionSchema = {
  params: Identifier,
  session: true,
  response: { 200: ClaimResponse, 401: ErrorResponse, 404: ErrorResponse },
} as const

export function claimRoutes(handlers: ClaimHandlers, session: SessionPlugin) {
  return new Elysia({ name: "claims.domains", prefix: "/domains" })
    .use(session)
    .post(
      "/",
      async ({ body, user, status }) => {
        const claimed = await handlers.claimDomain({ userId: user.id, domain: body.domain })
        if (!claimed.ok) {
          const failure = toClaimDomainError(claimed.error)
          return status(failure.status, failure.body)
        }
        return status(201, toClaimResponse(claimed.value))
      },
      {
        body: t.Object({ domain: t.String({ minLength: 1, maxLength: MAX_DOMAIN_LENGTH }) }),
        session: true,
        response: {
          201: ClaimResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
        },
        detail: {
          tags: ["Domains"],
          summary: "Claim a domain",
          description:
            "Issues the token for this account and returns the record to create. The token " +
            "is stable for the life of the claim: recheck, archive and reactivation preserve it.",
        },
      },
    )
    .get(
      "/",
      async ({ user }) => toClaimListResponse(await handlers.listClaims({ userId: user.id })),
      {
        session: true,
        response: { 200: ClaimListResponse, 401: ErrorResponse },
        detail: { tags: ["Domains"], summary: "List the domains on this account" },
      },
    )
    .get(
      "/:id",
      async ({ params, user, status }) => {
        const found = await handlers.readClaim({ userId: user.id, id: params.id })
        if (!found.ok) return status(notFound.status, notFound.body)
        return toClaimResponse(found.value)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: ClaimResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "Read one claim",
          description:
            "Carries the named diagnosis and the wait estimate, so the screen says which of " +
            "the failures is yours without running a DNS query of its own.",
        },
      },
    )
    .post(
      "/:id/verify",
      async ({ params, user, status }) => {
        const checked = await handlers.requestCheck({ userId: user.id, id: params.id })
        if (!checked.ok) return status(notFound.status, notFound.body)
        return toClaimResponse(checked.value)
      },
      {
        ...transitionSchema,
        detail: {
          tags: ["Domains"],
          summary: "Ask for a check now",
          description:
            "Resumes a dormant claim and returns the claim as it stands. The check itself " +
            "belongs to the verification context, which is not wired yet.",
        },
      },
    )
    .post(
      "/:id/archive",
      async ({ params, user, status }) => {
        const archived = await handlers.archiveClaim({ userId: user.id, id: params.id })
        if (!archived.ok) return status(notFound.status, notFound.body)
        return toClaimResponse(archived.value)
      },
      {
        ...transitionSchema,
        detail: {
          tags: ["Domains"],
          summary: "Archive a domain",
          description:
            "Leaves the main list and stops being checked. Token and history are preserved, " +
            "and it stops counting towards coexistence.",
        },
      },
    )
    .post(
      "/:id/restore",
      async ({ params, user, status }) => {
        const restored = await handlers.restoreClaim({ userId: user.id, id: params.id })
        if (!restored.ok) return status(notFound.status, notFound.body)
        return toClaimResponse(restored.value)
      },
      {
        ...transitionSchema,
        detail: {
          tags: ["Domains"],
          summary: "Reactivate and recheck",
          description:
            "Same token as before, so a TXT record still in the zone verifies without the " +
            "owner opening their DNS panel.",
        },
      },
    )
}
