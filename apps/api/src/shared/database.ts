import { createPrisma } from "@ownsi/db"

export type Database = ReturnType<typeof createPrisma>

export function createDatabase(url: string): Database {
  return createPrisma(url)
}
