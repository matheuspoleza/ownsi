import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { SessionPlugin } from "../../shared/http/session.ts"
import type { FindOrCreateProofLink } from "../application/find-or-create-proof-link.use-case.ts"
import type { ListProofLinks } from "../application/list-proof-links.query.ts"
import type { RevokeProofLink } from "../application/revoke-proof-link.use-case.ts"
import { claimNotProved, proofLinkNotFound } from "./proof.errors.ts"
import {
  ProofLinkListResponse,
  ProofLinkResponse,
  toProofLinkListResponse,
  toProofLinkResponse,
} from "./proof-link.response.ts"

export type ProofLinkHandlers = {
  readonly findOrCreateProofLink: FindOrCreateProofLink
  readonly listProofLinks: ListProofLinks
  readonly revokeProofLink: RevokeProofLink
}

const Identifier = t.Object({ id: t.String({ minLength: 1 }) })

const Share = t.Object({ id: t.String({ minLength: 1 }), slug: t.String({ minLength: 1 }) })

export function proofLinkRoutes(
  handlers: ProofLinkHandlers,
  session: SessionPlugin,
  appUrl: string,
) {
  return new Elysia({ name: "proof.links", prefix: "/claims" })
    .use(session)
    .post(
      "/:id/proof_links",
      async ({ params, user, status }) => {
        const issued = await handlers.findOrCreateProofLink({
          userId: user.id,
          email: user.email,
          claimId: params.id,
        })
        if (!issued.ok) return status(claimNotProved.status, claimNotProved.body)

        return status(201, toProofLinkResponse(issued.value, appUrl))
      },
      {
        params: Identifier,
        session: true,
        response: { 201: ProofLinkResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Proof"],
          summary: "Publish a link to this proof",
          description:
            "Idempotent while one is live: asking twice hands back the same slug. The slug is " +
            "its own — never the DNS token — and it stops resolving after seven days.",
        },
      },
    )
    .get(
      "/:id/proof_links",
      async ({ params, user, status }) => {
        const found = await handlers.listProofLinks({
          userId: user.id,
          email: user.email,
          claimId: params.id,
        })
        if (!found.ok) return status(claimNotProved.status, claimNotProved.body)

        return toProofLinkListResponse(found.value, appUrl)
      },
      {
        params: Identifier,
        session: true,
        response: { 200: ProofLinkListResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Proof"],
          summary: "List the links published for this proof",
          description:
            "Newest first, expired and revoked ones included — what was shared is part of the " +
            "record. `standing` says which of them still resolves.",
        },
      },
    )
    .post(
      "/:id/proof_links/:slug/revoke",
      async ({ params, user, status }) => {
        const taken = await handlers.revokeProofLink({
          userId: user.id,
          email: user.email,
          claimId: params.id,
          slug: params.slug,
        })
        if (!taken.ok) return status(proofLinkNotFound.status, proofLinkNotFound.body)

        return toProofLinkResponse(taken.value, appUrl)
      },
      {
        params: Share,
        session: true,
        response: { 200: ProofLinkResponse, 401: ErrorResponse, 404: ErrorResponse },
        detail: {
          tags: ["Proof"],
          summary: "Stop sharing one link",
          description:
            "The slug stops resolving from here on. It retracts nothing: the proof keeps its " +
            "date, and any other link to it keeps working.",
        },
      },
    )
}
