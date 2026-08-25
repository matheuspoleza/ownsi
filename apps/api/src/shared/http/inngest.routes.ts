import { Elysia } from "elysia"
import { serve } from "inngest/bun"
import type { InngestClient } from "../inngest.ts"

export type InngestRoutes = {
  readonly client: InngestClient
  readonly functions: readonly ReturnType<InngestClient["createFunction"]>[]
  readonly signingKey: string
}

export function inngestRoutes({ client, functions, signingKey }: InngestRoutes) {
  const handler = serve({
    client,
    functions: [...functions],
    signingKey: signingKey === "" ? undefined : signingKey,
  })

  return new Elysia({ name: "shared.inngest" }).all("/api/inngest", ({ request }) =>
    handler(request),
  )
}
