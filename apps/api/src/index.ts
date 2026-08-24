import { createApp } from "./app.ts"
import { loadConfig } from "./config.ts"

const config = loadConfig()

export const app = createApp(config).listen(config.port)

export type App = typeof app
export type { Auth } from "./shared/auth.ts"

console.log(`api  ->  http://localhost:${config.port}/api/health`)
console.log(`docs ->  http://localhost:${config.port}/openapi`)
