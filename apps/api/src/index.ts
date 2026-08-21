// API boot. The type exported here is the contract the front end consumes
// through Eden Treaty — no codegen. (PRD §3.2)
import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"
import { env } from "./env.ts"
import { routes } from "./http/index.ts"

export const app = new Elysia().use(openapi()).use(routes).listen(env.port)

export type App = typeof app

console.log(`api  →  http://localhost:${env.port}/api/health`)
console.log(`docs →  http://localhost:${env.port}/openapi`)
