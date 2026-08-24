import { describe, expect, test } from "bun:test"
import { Elysia, t } from "elysia"
import { ErrorResponse } from "../../src/shared/http/error-response.ts"
import {
  type CheckSession,
  type SessionUser,
  sessionPlugin,
} from "../../src/shared/http/session.ts"

const ADA: SessionUser = { id: "usr_ada", email: "ada@example.com", name: "Ada" }

const signedIn: CheckSession = async () => ({ type: "authenticated", user: ADA })
const signedOut: CheckSession = async () => ({ type: "anonymous" })

const neverAsked: CheckSession = async () => {
  throw new Error("a route that did not opt in asked for the session")
}

const UserResponse = t.Object({ id: t.String(), email: t.String(), name: t.String() })

function server(checkSession: CheckSession) {
  return new Elysia()
    .use(sessionPlugin(checkSession))
    .get("/me", ({ user }) => user, {
      session: true,
      response: { 200: UserResponse, 401: ErrorResponse },
    })
    .get("/open", () => ({ open: true as const }), {
      response: { 200: t.Object({ open: t.Literal(true) }) },
    })
}

const get = (checkSession: CheckSession, path: string) =>
  server(checkSession).handle(new Request(`http://localhost${path}`))

describe("the session macro", () => {
  test("hands the user to a route that opts in", async () => {
    const response = await get(signedIn, "/me")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(ADA)
  })

  test("refuses an anonymous caller with the shared error shape", async () => {
    const response = await get(signedOut, "/me")
    const body = (await response.json()) as { error: { code: string; docsUrl: string } }

    expect(response.status).toBe(401)
    expect(body.error.code).toBe("unauthenticated")
    expect(body.error.docsUrl).toContain("unauthenticated")
  })

  test("never runs on a route that did not opt in", async () => {
    const response = await get(neverAsked, "/open")

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ open: true })
  })
})
