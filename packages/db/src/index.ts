import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client.ts"

export * from "../generated/prisma/client.ts"

/** TCP driver: the same adapter serves the docker-compose Postgres and Neon. */
export function createPrisma(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

export type Db = ReturnType<typeof createPrisma>
