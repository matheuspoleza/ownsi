import { Elysia, t } from "elysia"
import type { GetProof, ProofUnreadable } from "../application/get-proof.query.ts"
import { proofBadge, unreadableBadge } from "./badge.response.ts"
import { proofPage, unreadablePage } from "./proof.response.ts"
import { proofUrl } from "./proof-link.response.ts"

const HTML = "text/html; charset=utf-8"

const SVG = "image/svg+xml; charset=utf-8"

/** The attestation never changes, so what is cached can only be the truth. */
const CACHED = "public, max-age=300"

/** A slug that resolves to nothing today may resolve tomorrow, so nothing holds on to it. */
const UNCACHED = "no-store"

export type ProofHandlers = {
  readonly getProof: GetProof
}

const Slug = t.Object({ slug: t.String({ minLength: 1 }) })

export function proofRoutes(handlers: ProofHandlers, appUrl: string) {
  return new Elysia({ name: "proof.routes", prefix: "/p" })
    .get(
      "/:slug",
      async ({ params }) => {
        const found = await handlers.getProof(params.slug)

        return found.ok
          ? sent(proofPage(found.value, appUrl, proofUrl(appUrl, params.slug)), HTML)
          : gone(unreadablePage(found.error, appUrl), HTML, found.error)
      },
      { params: Slug, detail: { hide: true } },
    )
    .get(
      "/:slug/badge.svg",
      async ({ params }) => {
        const found = await handlers.getProof(params.slug)

        return found.ok
          ? sent(proofBadge(found.value), SVG)
          : gone(unreadableBadge(), SVG, found.error)
      },
      { params: Slug, detail: { hide: true } },
    )
}

function sent(body: string, type: string): Response {
  return new Response(body, { headers: { "content-type": type, "cache-control": CACHED } })
}

function gone(body: string, type: string, reason: ProofUnreadable): Response {
  return new Response(body, {
    status: reason.type === "not_found" ? 404 : 410,
    headers: { "content-type": type, "cache-control": UNCACHED },
  })
}
