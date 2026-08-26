import { Elysia } from "elysia"
import type { SessionPlugin } from "../shared/http/session.ts"
import { proofRoutes } from "./api/proof.routes.ts"
import { proofLinkRoutes } from "./api/proof-link.routes.ts"
import type { ProofConfig } from "./proof.config.ts"
import type { ProofModule } from "./proof.module.ts"

export function proofApp(module: ProofModule, session: SessionPlugin, config: ProofConfig) {
  return new Elysia({ name: "proof" }).use(proofLinkRoutes(module, session, config.appUrl))
}

/** The page hangs off the root, not off `/api`: it is what a stranger opens, and it is HTML. */
export function proofPageApp(module: ProofModule, config: ProofConfig) {
  return new Elysia({ name: "proof.page" }).use(proofRoutes(module, config.appUrl))
}
