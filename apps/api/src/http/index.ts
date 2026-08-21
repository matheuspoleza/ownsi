import { Elysia } from "elysia"
import { serve } from "inngest/bun"
import { inngest } from "../inngest/client.ts"
import { functions } from "../inngest/functions.ts"
import { claims } from "./claims.ts"
import { health } from "./health.ts"

const inngestHandler = serve({ client: inngest, functions })

export const routes = new Elysia({ prefix: "/api" })
  .use(health)
  .use(claims)
  // Out of the docs: this is Inngest's contract, not ours. (§3.2)
  .all("/inngest", ({ request }) => inngestHandler(request), { detail: { hide: true } })
