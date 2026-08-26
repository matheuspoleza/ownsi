import { createApp } from "./app.ts"
import { loadConfig } from "./config.ts"

const config = loadConfig()

export const app = createApp(config).listen(config.port)

export type App = typeof app
export type { Auth } from "./auth/auth.module.ts"
export type { StreamEvent } from "./shared/http/events.routes.ts"

console.log(`api  ->  http://localhost:${config.port}/api/health`)
console.log(`docs ->  http://localhost:${config.port}/openapi`)
