import { Elysia } from "elysia"
import type { SessionPlugin } from "../shared/http/session.ts"
import { domainRoutes } from "./api/domain.routes.ts"
import type { DomainsModule } from "./domains.module.ts"

export function domainsApp(module: DomainsModule, session: SessionPlugin) {
  return new Elysia({ name: "domains" }).use(domainRoutes(module, session))
}
