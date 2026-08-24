import { Elysia } from "elysia"
import type { SessionPlugin } from "../shared/http/session.ts"
import { claimRoutes } from "./api/claim.routes.ts"
import type { ClaimsModule } from "./claims.module.ts"

export function claimsApp(module: ClaimsModule, session: SessionPlugin) {
  return new Elysia({ name: "claims" }).use(claimRoutes(module, session))
}
