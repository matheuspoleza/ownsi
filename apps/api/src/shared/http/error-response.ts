import { t } from "elysia"

const DOCS_BASE_URL = "https://docs.ownsi.dev/errors"

export const ErrorResponse = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    docsUrl: t.String(),
  }),
})

export function errorResponse(code: string, message: string) {
  return { error: { code, message, docsUrl: `${DOCS_BASE_URL}#${code}` } }
}
