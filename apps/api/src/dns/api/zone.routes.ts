import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../shared/http/error-response.ts"
import type { ReadZone } from "../application/read-zone.ts"
import { toZoneError } from "./zone.errors.ts"
import { toZoneResponse, ZoneResponse } from "./zone.response.ts"

const MAX_DOMAIN_LENGTH = 253

export function zoneRoutes(readZone: ReadZone) {
  return new Elysia({ name: "dns.zones", prefix: "/zones" }).get(
    "/:name",
    async ({ params, request, status }) => {
      const result = await readZone({ name: params.name, signal: request.signal })
      if (result.ok) return toZoneResponse(result.value)

      const failure = toZoneError(result.error)
      return status(failure.status, failure.body)
    },
    {
      params: t.Object({ name: t.String({ minLength: 1, maxLength: MAX_DOMAIN_LENGTH }) }),
      response: { 200: ZoneResponse, 400: ErrorResponse, 404: ErrorResponse, 502: ErrorResponse },
      detail: {
        summary: "Read a zone",
        description:
          "Nameservers, detected provider and publishing estimate for a domain. " +
          "No account needed; nothing is written to DNS.",
      },
    },
  )
}
