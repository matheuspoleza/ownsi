import { Elysia } from "elysia"
import { zoneRoutes } from "./api/zone.routes.ts"
import type { DnsModule } from "./dns.module.ts"

export function dnsApp(module: DnsModule) {
  return new Elysia({ name: "dns" }).use(zoneRoutes(module.readZone))
}
