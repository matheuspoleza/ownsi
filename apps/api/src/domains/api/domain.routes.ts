import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { SessionPlugin } from "../../shared/http/session.ts"
import type { ClaimAction } from "../application/claim-action.ts"
import type { ClaimDomain } from "../application/claim-domain.ts"
import type { ListDomains } from "../application/list-domains.ts"
import type { ReadDomain } from "../application/read-domain.ts"
import { notFound, toClaimActionError, toClaimDomainError } from "./domain.errors.ts"
import {
  DomainListResponse,
  DomainResponse,
  toDomainListResponse,
  toDomainResponse,
} from "./domain.response.ts"

const MAX_DOMAIN_LENGTH = 253

export type DomainHandlers = {
  readonly claimDomain: ClaimDomain
  readonly listDomains: ListDomains
  readonly readDomain: ReadDomain
  readonly requestCheck: ClaimAction
  readonly cancelClaim: ClaimAction
  readonly archiveDomain: ClaimAction
}

const Identifier = t.Object({ id: t.String({ minLength: 1 }) })

const actionSchema = {
  params: Identifier,
  session: true,
  response: {
    200: DomainResponse,
    401: ErrorResponse,
    404: ErrorResponse,
    409: ErrorResponse,
  },
} as const

export function domainRoutes(handlers: DomainHandlers, session: SessionPlugin) {
  return new Elysia({ name: "domains.routes", prefix: "/domains" })
    .use(session)
    .post(
      "/",
      async ({ body, user, status }) => {
        const claimed = await handlers.claimDomain({ userId: user.id, domain: body.domain })
        if (!claimed.ok) {
          const failure = toClaimDomainError(claimed.error)
          return status(failure.status, failure.body)
        }
        return status(201, toDomainResponse(claimed.value))
      },
      {
        body: t.Object({ domain: t.String({ minLength: 1, maxLength: MAX_DOMAIN_LENGTH }) }),
        session: true,
        response: {
          201: DomainResponse,
          400: ErrorResponse,
          401: ErrorResponse,
          409: ErrorResponse,
        },
        detail: {
          tags: ["Domains"],
          summary: "Claim a domain",
          description:
            "Opens a claim and returns the record to create. A name already claimed on this " +
            "account opens a new claim with a new token, and the previous one becomes history.",
        },
      },
    )
    .get(
      "/",
      async ({ user }) => toDomainListResponse(await handlers.listDomains({ userId: user.id })),
      {
        session: true,
        response: { 200: DomainListResponse, 401: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "List the domains on this account",
          description: "Archived domains are left out; they are still readable by id.",
        },
      },
    )
    .get(
      "/:id",
      async ({ params, user, status }) => {
        const found = await handlers.readDomain({ userId: user.id, id: params.id })
        if (!found.ok) return status(notFound.status, notFound.body)
        return toDomainResponse(found.value)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: DomainResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "Read one domain",
          description:
            "The open claim, every claim before it, and the named diagnosis — so the screen " +
            "says which of the failures is yours without running a DNS query of its own.",
        },
      },
    )
    .post(
      "/:id/verify",
      async ({ params, user, status }) => {
        const checked = await handlers.requestCheck({ userId: user.id, id: params.id })
        if (!checked.ok) {
          const failure = toClaimActionError(checked.error)
          return status(failure.status, failure.body)
        }
        return toDomainResponse(checked.value)
      },
      {
        ...actionSchema,
        detail: {
          tags: ["Domains"],
          summary: "Ask for a check now",
          description:
            "Runs against the open claim. The check itself belongs to the verification " +
            "context, which is not wired yet.",
        },
      },
    )
    .post(
      "/:id/cancel",
      async ({ params, user, status }) => {
        const canceled = await handlers.cancelClaim({ userId: user.id, id: params.id })
        if (!canceled.ok) {
          const failure = toClaimActionError(canceled.error)
          return status(failure.status, failure.body)
        }
        return toDomainResponse(canceled.value)
      },
      {
        ...actionSchema,
        detail: {
          tags: ["Domains"],
          summary: "End the open claim",
          description:
            "The token stops being accepted from here on, and the claim becomes history. " +
            "Claiming the name again issues a new one.",
        },
      },
    )
    .post(
      "/:id/archive",
      async ({ params, user, status }) => {
        const archived = await handlers.archiveDomain({ userId: user.id, id: params.id })
        if (!archived.ok) {
          const failure = toClaimActionError(archived.error)
          return status(failure.status, failure.body)
        }
        return toDomainResponse(archived.value)
      },
      {
        ...actionSchema,
        detail: {
          tags: ["Domains"],
          summary: "Stop involving me with this name",
          description:
            "Leaves the list and ends any open claim. Nothing is retracted: a proof keeps " +
            "its dates and its links resolve.",
        },
      },
    )
}
