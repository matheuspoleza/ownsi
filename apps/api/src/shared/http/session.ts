import { Elysia } from "elysia"
import { errorResponse } from "./error-response.ts"

export type SessionUser = {
  readonly id: string
  readonly email: string
  readonly name: string
}

export type SessionCheck =
  | { readonly type: "authenticated"; readonly user: SessionUser }
  | { readonly type: "anonymous" }

export type CheckSession = (headers: Headers) => Promise<SessionCheck>

export function sessionPlugin(checkSession: CheckSession) {
  return new Elysia({ name: "shared.session" }).macro({
    session: {
      resolve: async ({ request, status }) => {
        const check = await checkSession(request.headers)

        if (check.type === "anonymous") {
          return status(401, errorResponse("unauthenticated", "Sign in to continue."))
        }

        return { user: check.user }
      },
    },
  })
}
