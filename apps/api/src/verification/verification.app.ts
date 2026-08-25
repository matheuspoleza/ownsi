import { Elysia } from "elysia"
import type { SessionPlugin } from "../shared/http/session.ts"
import { verificationRoutes } from "./api/verification.routes.ts"
import type { VerificationModule } from "./verification.module.ts"

export function verificationApp(module: VerificationModule, session: SessionPlugin) {
  return new Elysia({ name: "verification" }).use(verificationRoutes(module, session))
}
