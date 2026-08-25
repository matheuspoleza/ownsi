import { Elysia, sse, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import { unreachable } from "../../shared/result.ts"
import type { ReadZone } from "../application/read-zone.ts"
import { toZoneError } from "./zone.errors.ts"
import { toDelegationStep, toPublishingStep, ZoneStepResponse } from "./zone.response.ts"

const MAX_DOMAIN_LENGTH = 253

export function zoneRoutes(readZone: ReadZone) {
  return new Elysia({ name: "dns.zones", prefix: "/zones" }).get(
    "/:name",
    async function* ({ params, request, status }) {
      for await (const step of readZone({ name: params.name, signal: request.signal })) {
        switch (step.type) {
          case "failed": {
            const failure = toZoneError(step.error)
            return status(failure.status, failure.body)
          }
          case "delegated":
            yield sse({ event: "delegation", data: toDelegationStep(step) })
            break
          case "published":
            yield sse({ event: "publishing", data: toPublishingStep(step) })
            break
          default:
            return unreachable(step)
        }
      }
    },
    {
      params: t.Object({ name: t.String({ minLength: 1, maxLength: MAX_DOMAIN_LENGTH }) }),
      response: {
        200: ZoneStepResponse,
        400: ErrorResponse,
        404: ErrorResponse,
        502: ErrorResponse,
      },
      detail: {
        tags: ["Zones"],
        summary: "Read a zone",
        description:
          "Streams the reading in the order DNS answers it: the delegation first, so the " +
          "provider can be named, then the publishing estimate. No account needed; nothing " +
          "is written to DNS.",
      },
    },
  )
}
