import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { SessionPlugin } from "../../shared/http/session.ts"
import type { ArchiveDomain } from "../application/archive-domain.use-case.ts"
import type { DeleteDomain } from "../application/delete-domain.use-case.ts"
import type { FindOrCreateDomain } from "../application/find-or-create-domain.use-case.ts"
import type { GetDomain } from "../application/get-domain.query.ts"
import type { ListDomains } from "../application/list-domains.query.ts"
import type { UnarchiveDomain } from "../application/unarchive-domain.use-case.ts"
import { notFound, toFindOrCreateDomainError } from "./domain.errors.ts"
import {
  DomainListResponse,
  DomainResponse,
  DomainStatusValue,
  toDomainListResponse,
  toDomainResponse,
} from "./domain.response.ts"

const MAX_DOMAIN_LENGTH = 253

const DOMAINS_PER_PAGE = 20

const MOST_PER_PAGE = 100

export type DomainHandlers = {
  readonly findOrCreateDomain: FindOrCreateDomain
  readonly archiveDomain: ArchiveDomain
  readonly unarchiveDomain: UnarchiveDomain
  readonly deleteDomain: DeleteDomain
  readonly getDomain: GetDomain
  readonly listDomains: ListDomains
}

const Identifier = t.Object({ id: t.String({ minLength: 1 }) })

export function domainRoutes(handlers: DomainHandlers, session: SessionPlugin) {
  return new Elysia({ name: "domains.routes", prefix: "/domains" })
    .use(session)
    .post(
      "/",
      async ({ body, user, status }) => {
        const found = await handlers.findOrCreateDomain({ userId: user.id, domain: body.domain })
        if (!found.ok) {
          const failure = toFindOrCreateDomainError(found.error)
          return status(failure.status, failure.body)
        }

        return status(201, toDomainResponse(found.value))
      },
      {
        body: t.Object({ domain: t.String({ minLength: 1, maxLength: MAX_DOMAIN_LENGTH }) }),
        session: true,
        response: { 201: DomainResponse, 400: ErrorResponse, 401: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "Put a domain on this account",
          description:
            "Idempotent on the name: asking twice returns the same domain. It carries no " +
            "status of its own — open a claim to start proving it.",
        },
      },
    )
    .get(
      "/",
      async ({ user, query }) => {
        const page = await handlers.listDomains({
          userId: user.id,
          name: query.name ?? null,
          status: query.status ?? null,
          archived: query.archived ?? false,
          after: query.cursor ?? null,
          limit: query.limit ?? DOMAINS_PER_PAGE,
        })

        return toDomainListResponse(page)
      },
      {
        query: t.Object({
          name: t.Optional(t.String({ minLength: 1, maxLength: MAX_DOMAIN_LENGTH })),
          status: t.Optional(DomainStatusValue),
          archived: t.Optional(t.Boolean({ default: false })),
          cursor: t.Optional(t.String({ minLength: 1 })),
          limit: t.Optional(
            t.Number({ minimum: 1, maximum: MOST_PER_PAGE, default: DOMAINS_PER_PAGE }),
          ),
        }),
        session: true,
        response: { 200: DomainListResponse, 401: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "List the domains on this account",
          description:
            "Newest first, one page at a time: pass `nextCursor` back as `cursor` for the " +
            "next one. Each domain carries the state of the claim in play on it, and " +
            "`counts` tallies every status on the account, not only this page. `name` " +
            "narrows to one, which is how a page reads a domain it only knows by name. " +
            "Browsing leaves archived domains out until `archived` asks for them, and " +
            "`counts.archived` says how many are waiting there; naming one finds it either " +
            "way, and every domain carries `archived` so a caller can tell.",
        },
      },
    )
    .get(
      "/:id",
      async ({ params, user, status }) => {
        const found = await handlers.getDomain({ userId: user.id, domainId: params.id })
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
            "The name and when it joined the account. Its claims are their own resource.",
        },
      },
    )
    .post(
      "/:id/archive",
      async ({ params, user, status }) => {
        const archived = await handlers.archiveDomain({ userId: user.id, domainId: params.id })
        if (!archived.ok) return status(notFound.status, notFound.body)

        return toDomainResponse(archived.value)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: DomainResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "Stop involving me with this name",
          description:
            "Leaves the list, ends any open claim on it, and takes back every public link it " +
            "published — those slugs stop resolving for good. The proof itself is untouched: " +
            "the claim keeps its state and its dates, and the domain answers to " +
            "`archived=true`. Idempotent.",
        },
      },
    )
    .post(
      "/:id/unarchive",
      async ({ params, user, status }) => {
        const restored = await handlers.unarchiveDomain({ userId: user.id, domainId: params.id })
        if (!restored.ok) return status(notFound.status, notFound.body)

        return toDomainResponse(restored.value)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: DomainResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "Put this name back on the list",
          description:
            "The domain returns to the list with every claim it ever carried. It opens no " +
            "claim and restores no link: claim it again to start proving it, and publish a " +
            "new link to share a proof it still holds. Idempotent.",
        },
      },
    )
    .delete(
      "/:id",
      async ({ params, user, status }) => {
        const deleted = await handlers.deleteDomain({ userId: user.id, domainId: params.id })
        if (!deleted.ok) return status(notFound.status, notFound.body)

        return status(204, undefined)
      },
      {
        params: Identifier,
        session: true,
        response: { 204: t.Void(), 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Domains"],
          summary: "Erase this domain and everything it carried",
          description:
            "The only eraser. Its claims, their notices and their verifications go with it, " +
            "and any proof link stops resolving. Archiving is what you want if you only " +
            "wanted it off the list.",
        },
      },
    )
}
