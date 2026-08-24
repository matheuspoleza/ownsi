import { treaty } from "@elysiajs/eden"
import type { App } from "@ownsi/api"

export const api = treaty<App>(window.location.origin).api
