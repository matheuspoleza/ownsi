import type { Database } from "../shared/database.ts"
import type { CheckSession } from "../shared/http/session.ts"
import type { AuthConfig } from "./auth.config.ts"
import type { SendMagicLink } from "./domain/ports.ts"
import { type Auth, createAuth, createCheckSession } from "./infra/better-auth.ts"

export type { Auth } from "./infra/better-auth.ts"

import type { SendEmail } from "../shared/email.ts"
import { createSendMagicLink } from "./infra/mailer.ts"

export type AuthModuleDeps = {
  readonly config: AuthConfig
  readonly sendEmail: SendEmail
  readonly database: Database
}

export type AuthModuleOverrides = {
  readonly sendMagicLink?: SendMagicLink
}

export type AuthModule = {
  readonly handler: Auth["handler"]
  readonly checkSession: CheckSession
}

export function createAuthModule(
  deps: AuthModuleDeps,
  overrides: AuthModuleOverrides = {},
): AuthModule {
  const sendMagicLink = overrides.sendMagicLink ?? createSendMagicLink(deps.sendEmail)
  const auth = createAuth({ config: deps.config, database: deps.database, sendMagicLink })

  return { handler: auth.handler, checkSession: createCheckSession(auth) }
}
