import { Elysia, type Static, sse, t } from "elysia"
import type { Broadcast } from "../broadcast.ts"
import { ErrorResponse } from "./error-response.ts"
import type { SessionPlugin } from "./session.ts"

export const StreamEventResponse = t.Union([
  t.Object({ type: t.Literal("heartbeat") }),
  t.Object({
    type: t.Literal("verification.ran"),
    verificationId: t.String(),
    claimId: t.String(),
  }),
  t.Object({ type: t.Literal("claim.ended"), claimId: t.String(), domainId: t.String() }),
  t.Object({ type: t.Literal("domain.archived"), domainId: t.String() }),
])

export type StreamEvent = Static<typeof StreamEventResponse>

export function eventRoutes(broadcast: Broadcast<StreamEvent>, session: SessionPlugin) {
  return new Elysia({ name: "events.routes" }).use(session).get(
    "/events",
    async function* ({ user }) {
      for await (const event of broadcast.subscribe(user.id)) {
        yield sse({ data: event })
      }
    },
    {
      session: true,
      detail: {
        tags: ["Events"],
        summary: "Watch this account for changes",
        description:
          "Server-sent events, one connection per open tab. Every message arrives on the " +
          "default `message` event and its `type` field says what moved; it carries no state " +
          "of its own, so the client reads the resource back over its own route. A " +
          "`heartbeat` every twenty seconds keeps the connection off an idle proxy's timer " +
          "and tells a client that has heard nothing that it is still connected.",
        responses: {
          200: {
            description: "The stream, open until the client closes it.",
            content: { "text/event-stream": { schema: StreamEventResponse } },
          },
          401: {
            description: "No session.",
            content: { "application/json": { schema: ErrorResponse } },
          },
        },
      },
    },
  )
}
