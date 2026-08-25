import type { Database } from "../../shared/database.ts"
import type { FindRecipient } from "../domain/ports.ts"

export function postgresRecipients(database: Database): FindRecipient {
  return async (userId) => {
    const user = await database.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })

    return user
  }
}
