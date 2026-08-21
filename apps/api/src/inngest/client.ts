// Inngest client. In dev, INNGEST_DEV=1 points it at the Dev Server from docker-compose.
import { Inngest } from "inngest"

export const inngest = new Inngest({ id: "ownsi" })
