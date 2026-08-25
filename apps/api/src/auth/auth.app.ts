import { Elysia } from "elysia"
import type { AuthModule } from "./auth.module.ts"

export function authApp(module: AuthModule) {
  return new Elysia({ name: "auth" }).mount(module.handler)
}
