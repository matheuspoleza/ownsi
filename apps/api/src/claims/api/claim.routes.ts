import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { SessionPlugin } from "../../shared/http/session.ts"
import type { CancelClaim } from "../application/cancel-claim.use-case.ts"
import type { CreateClaim } from "../application/create-claim.use-case.ts"
import type { GetClaim } from "../application/get-claim.query.ts"
import type { ListClaims } from "../application/list-claims.query.ts"
import { notFound, toCancelClaimError, toCreateClaimError } from "./claim.errors.ts"
import {
  ClaimDetailResponse,
  ClaimListResponse,
  ClaimResponse,
  toClaimDetailResponse,
  toClaimListResponse,
  toClaimResponse,
} from "./claim.response.ts"

export type ClaimHandlers = {
  readonly createClaim: CreateClaim
  readonly cancelClaim: CancelClaim
  readonly getClaim: GetClaim
  readonly listClaims: ListClaims
}

const Identifier = t.Object({ id: t.String({ minLength: 1 }) })

export function claimRoutes(handlers: ClaimHandlers, session: SessionPlugin) {
  return new Elysia({ name: "claims.routes", prefix: "/claims" })
    .use(session)
    .post(
      "/",
      async ({ body, user, status }) => {
        const created = await handlers.createClaim({ userId: user.id, domainId: body.domainId })
        if (!created.ok) {
          const failure = toCreateClaimError(created.error)
          return status(failure.status, failure.body)
        }

        return status(201, toClaimDetailResponse(created.value))
      },
      {
        body: t.Object({ domainId: t.String({ minLength: 1 }) }),
        session: true,
        response: {
          201: ClaimDetailResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
        detail: {
          tags: ["Claims"],
          summary: "Open a claim on a domain",
          description:
            "Mints the token, opens the seven-day window and starts the verification that " +
            "runs against it. The record to create comes back with the claim; the process " +
            "comes back as `verificationId`.",
        },
      },
    )
    .get(
      "/",
      async ({ query, user }) =>
        toClaimListResponse(
          await handlers.listClaims({ userId: user.id, domainId: query.domainId }),
        ),
      {
        query: t.Object({ domainId: t.Optional(t.String()) }),
        session: true,
        response: { 200: ClaimListResponse, 401: ErrorResponse },
        detail: {
          tags: ["Claims"],
          summary: "List the claims on this account",
          description:
            "Newest first, every state included — a claim is never deleted, so the list is " +
            "the account's history. Narrow it to one domain with `domainId`.",
        },
      },
    )
    .get(
      "/:id",
      async ({ params, user, status }) => {
        const found = await handlers.getClaim({ userId: user.id, claimId: params.id })
        if (!found.ok) return status(notFound.status, notFound.body)

        return toClaimDetailResponse(found.value)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: ClaimDetailResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Claims"],
          summary: "Read one claim",
          description:
            "The token, the record to create, the window it runs in — and whether another " +
            "account has proved the same name, which takes nothing away from this one.",
        },
      },
    )
    .post(
      "/:id/cancel",
      async ({ params, user, status }) => {
        const canceled = await handlers.cancelClaim({ userId: user.id, claimId: params.id })
        if (!canceled.ok) {
          const failure = toCancelClaimError(canceled.error)
          return status(failure.status, failure.body)
        }

        return toClaimResponse(canceled.value)
      },
      {
        params: Identifier,
        session: true,
        response: {
          200: ClaimResponse,
          401: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
        detail: {
          tags: ["Claims"],
          summary: "End the open claim",
          description:
            "The token stops being accepted from here on and the verification stops running. " +
            "Claiming the domain again issues a new one.",
        },
      },
    )
}
