import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { GetProof } from "../application/get-proof.query.ts"
import { ProofResponse, toProofResponse } from "./attestation.response.ts"
import { toProofError } from "./proof.errors.ts"

/** The attestation cannot change. The order it sits in can, and five minutes is how late
 * a reader may learn that a newer proof of the same name exists. */
const CACHED = "public, max-age=300"

/** A slug that resolves to nothing today may resolve tomorrow, so nothing holds on to it. */
const UNCACHED = "no-store"

export function attestationRoutes(getProof: GetProof, appUrl: string) {
  return new Elysia({ name: "proof.attestation", prefix: "/proofs" }).get(
    "/:slug",
    async ({ params, set, status }) => {
      const found = await getProof(params.slug)

      if (!found.ok) {
        const failure = toProofError(found.error)
        set.headers["cache-control"] = UNCACHED

        return status(failure.status, failure.body)
      }

      set.headers["cache-control"] = CACHED

      return toProofResponse(found.value, appUrl)
    },
    {
      params: t.Object({ slug: t.String({ minLength: 1 }) }),
      response: { 200: ProofResponse, 404: ErrorResponse, 410: ErrorResponse },
      detail: {
        tags: ["Proof"],
        summary: "Read a published proof",
        description:
          "The machine-readable side of the page a link opens. No account needed: the slug is " +
          "the whole of it. Hands back the domain, the holder as a stranger may see them, the " +
          "token and the host it was written on, so a reader can run the lookup themselves — " +
          "this reads no DNS. `recency` says whether a later proof of the same name exists — it " +
          "takes nothing away from this one, and the reader decides what it means. Answers 410 " +
          "once the link is taken back, and the proof behind it stands either way.",
      },
    },
  )
}
