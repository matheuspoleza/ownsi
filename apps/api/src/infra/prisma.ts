// The application's Prisma client. One per process.
import { createPrisma } from "@ownsi/db"
import { env } from "../env.ts"

export const prisma = createPrisma(env.databaseUrl)
