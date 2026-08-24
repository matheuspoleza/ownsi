import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { magicLink } from "better-auth/plugins"
import type { Database } from "./database.ts"
import type { CheckSession } from "./http/session.ts"
import type { SendMagicLink } from "./mailer.ts"

const SECONDS_PER_MINUTE = 60

export type GoogleCredentials = {
  readonly clientId: string
  readonly clientSecret: string
}

export type AuthConfig = {
  readonly secret: string
  readonly baseUrl: string
  readonly basePath: string
  readonly magicLinkTtlSeconds: number
  readonly google: GoogleCredentials | null
}

export type AuthDeps = {
  readonly config: AuthConfig
  readonly database: Database
  readonly sendMagicLink: SendMagicLink
}

export function createAuth({ config, database, sendMagicLink }: AuthDeps) {
  const expiresInMinutes = Math.round(config.magicLinkTtlSeconds / SECONDS_PER_MINUTE)

  return betterAuth({
    secret: config.secret,
    baseURL: config.baseUrl,
    basePath: config.basePath,
    trustedOrigins: [config.baseUrl],
    database: prismaAdapter(database, { provider: "postgresql" }),
    socialProviders: config.google ? { google: config.google } : {},
    plugins: [
      magicLink({
        expiresIn: config.magicLinkTtlSeconds,
        sendMagicLink: ({ email, url }) => sendMagicLink({ email, url, expiresInMinutes }),
      }),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>

export function createCheckSession(auth: Auth): CheckSession {
  return async (headers) => {
    const found = await auth.api.getSession({ headers })
    if (!found) return { type: "anonymous" }

    const { id, email, name } = found.user
    return { type: "authenticated", user: { id, email, name } }
  }
}
