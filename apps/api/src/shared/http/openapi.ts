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
        name: "Verifications",
        description:
          "The process behind a claim: the runs it has made, the named diagnosis of the last " +
          "one, and when the next lands. Session required.",
      },
    ],
  }
}
