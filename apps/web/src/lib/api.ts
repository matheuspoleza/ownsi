// Client typed from the server's own type. No codegen, no `as Foo[]`. (PRD §3.2)
import { treaty } from "@elysiajs/eden"
import type { App } from "@ownsi/api"

export const api = treaty<App>(window.location.origin)
