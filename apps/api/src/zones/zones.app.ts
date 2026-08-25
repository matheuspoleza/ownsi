import { Elysia } from "elysia"
import { zoneRoutes } from "./api/zone.routes.ts"
import type { ZonesModule } from "./zones.module.ts"

export function zonesApp(module: ZonesModule) {
  return new Elysia({ name: "zones" }).use(zoneRoutes(module.readZone))
}
