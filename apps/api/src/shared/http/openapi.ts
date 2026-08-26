import { openapi } from "@elysiajs/openapi"
import { Elysia } from "elysia"

const API_VERSION = "0.1.0"

const DESCRIPTION = `
Prove ownership of a domain with a TXT record, and read a zone before anyone signs in.

Two surfaces, and they behave differently on purpose:

- \`GET /api/zones/:name\` is public. It streams what DNS answers, in the order DNS answers it,
  and writes nothing. No account, no key.
- Everything under \`/api/domains\`, \`/api/claims\` and \`/api/verifications\` belongs to an
  account and needs a session cookie.

A lookup that failed never carries records, and a claim that has not been checked never carries a
diagnosis: both are tagged unions, so the shape tells you which case you are in. Errors are always
\`{ error: { code, message, docsUrl } }\` with a stable \`code\`.
`.trim()

const SPECIFICATION_VERSION = "3.1.0"

export type OpenApiDocumentation = {
  /** 3.1.0, over the plugin's 3.0.3: route schemas emit `const`, which OAS 3.0 rejects. */
  readonly openapi: string
  readonly info: { readonly title: string; readonly version: string; readonly description: string }
  readonly servers: { readonly url: string; readonly description: string }[]
  readonly tags: { readonly name: string; readonly description: string }[]
}

export function openApiDocumentation(appUrl: string): OpenApiDocumentation {
  return {
    openapi: SPECIFICATION_VERSION,
    info: { title: "ownsi API", version: API_VERSION, description: DESCRIPTION },
    servers: [{ url: appUrl, description: "The origin the front end and the API share" }],
    tags: [
      {
        name: "Zones",
        description:
          "Reading a zone the way a visitor sees it: the delegation first, so the provider can " +
          "be named, then how long publishing is likely to take. Public, rate limited per IP.",
      },
      {
        name: "Domains",
        description:
          "A name on an account, and nothing else — no status, no token. It is what a claim " +
          "is opened against. Session required.",
      },
      {
        name: "Claims",
        description:
          "The episode: one token, one seven-day window, one outcome. A claim is never " +
          "reopened, so the list of them is the account's history. Session required.",
      },
      {
        name: "Events",
        description:
          "One stream per open tab, telling an account's screens what moved. It carries no " +
          "state: a message names the resource, the client reads it back. Session required.",
      },
      {
        name: "Proof",
        description:
          "A proved claim, shared. A link carries its own slug — never the DNS token — and " +
          "resolves for seven days at `/p/:slug`, where the page states one moment and reads " +
          "no DNS. Session required to publish one.",
      },
      {
        name: "Verifications",
        description:
          "The process behind a claim: the runs it has made, the named diagnosis of the last " +
          "one, and when the next lands. Session required.",
      },
    ],
  }
}

export function openApiPlugin(appUrl: string) {
  return new Elysia({ name: "shared.openapi" })
    .onAfterHandle(({ response }) => withoutBodylessContent(response))
    .use(openapi({ documentation: openApiDocumentation(appUrl) }))
}

/**
 * `@elysiajs/openapi` writes `content: { type: "void" }` for a response declared `t.Void()`,
 * where OAS 3.1 allows only a media type map. A status that carries no body carries no
 * `content` either, so the key is dropped before the document is published: an OpenAPI reader
 * strict enough to validate — Mintlify is — rejects the whole document over the one response.
 */
export function withoutBodylessContent(document: unknown): unknown {
  if (!isObject(document) || !isObject(document.paths)) return document

  return { ...document, paths: mapValues(document.paths, pathItemContent) }
}

function pathItemContent(pathItem: unknown): unknown {
  return isObject(pathItem) ? mapValues(pathItem, operationContent) : pathItem
}

function operationContent(operation: unknown): unknown {
  if (!isObject(operation) || !isObject(operation.responses)) return operation

  return { ...operation, responses: mapValues(operation.responses, responseContent) }
}

function responseContent(response: unknown): unknown {
  if (!isObject(response) || !("content" in response) || isMediaTypeMap(response.content)) {
    return response
  }

  const { content: _bodyless, ...carriesNoBody } = response
  return carriesNoBody
}

function isMediaTypeMap(content: unknown): boolean {
  return isObject(content) && Object.keys(content).every((mediaType) => mediaType.includes("/"))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mapValues(
  source: Record<string, unknown>,
  transform: (value: unknown) => unknown,
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, transform(value)]))
}
