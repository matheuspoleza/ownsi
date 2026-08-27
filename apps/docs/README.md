# @ownsi/docs

The public documentation site, on [Mintlify](https://mintlify.com). MDX in, a hosted site out.

The API it documents is internal today. The site exists anyway, because the shape the API has now is
the shape it will have when it opens — and because the [diagnostics
catalogue](diagnostics/catalogue.mdx) is a product surface, not an appendix.

## Running it

From the repo root:

```sh
bun install
bun run dev:docs        # regenerates what is generated, then serves on :3000
```

It needs no database and no API running — the two generated files are committed. It does
regenerate them first, through turbo's `^docs:emit` on `@ownsi/api`; running the Mintlify CLI
directly skips that and serves whatever is in git.

`:3000` is also the API's port, so run one or the other. Mintlify takes the next free port
when it finds `:3000` busy.

The Mintlify CLI is **not a dependency of this repo** — it pulls Puppeteer and a headless Chromium,
which is a lot of `bun install` for a preview server. The scripts reach it through `npx`, so it
downloads on first use and nothing lands in `bun.lock`. `npm i -g mint` works too and is faster if
you run it often.

> Use `npx`, not `bunx`. `bunx` installs into this repo's `node_modules`, where the CLI's React
> resolves to the workspace's React 19 and it dies on an invalid-hook-call before rendering
> anything. `npx` keeps it in its own cache.

Inside this package:

| Script | What it does |
|---|---|
| `bun run dev` | the preview, without the regenerate the root's `dev:docs` does first |
| `bun run links` | `mint broken-links`, which also validates the OpenAPI document |
| `bun test` | the conventions guard — navigation, frontmatter, internal links |

## Layout

```
docs.json               the whole site: theme, navigation, tabs, footer
index.mdx               home
quickstart.mdx          the four calls, in order
errors.mdx              the error-code catalogue — the path `docsUrl` points at, do not move it
concepts/               how the thing works: zone reading, the record, verification, the lifecycle
guides/                 how to build a screen with it
diagnostics/
  overview.mdx          what a diagnosis is and how to render one
  catalogue.mdx         GENERATED — the twelve codes
api-reference/
  introduction.mdx      base URL, conventions, what is stable
  authentication.mdx    the session today, the key later
  streaming.mdx         the one streaming endpoint
  openapi.json          GENERATED — every endpoint page comes from this
sdk/                    Eden Treaty, and generating a client from the spec
test/conventions.test.ts
```

## What is generated, and from where

Two files are emitted by `apps/api` and **committed**. Mintlify deploys from git, so the build has
to be able to read them without running Bun.

| File | Emitted from | Regenerate with |
|---|---|---|
| `openapi.json` | The running Elysia app's `/openapi/json` | `bun run docs:emit` |
| `diagnostics/catalogue.mdx` | `explain()` in `apps/api/src/verification/domain/diagnosis.ts` | `bun run docs:emit` |

`apps/api/test/docs.test.ts` fails when either file drifts from the code, so CI catches a stale
commit. **Editing a generated file by hand is always wrong** — change the route schema or the
`explain()` copy, then regenerate.

That is why the catalogue's `cause` and `fix` sentences can be trusted: they are the exact strings
the API returns, not a transcription of them.

## Writing a page

Every page is MDX with frontmatter:

```mdx
---
title: "Reading a zone"
description: "One sentence. It is the search result and the AI answer."
icon: "globe"
---
```

Then add it to `docs.json` under the right tab and group. `test/conventions.test.ts` fails on a page
that exists but is not navigated, on a navigation entry with no file, on missing frontmatter, and on
a link to a page that does not exist — so a half-added page does not merge.

House style, same as the rest of the repo:

- Say the true thing, not the reassuring one. `unresolvable` is ours; say so.
- Link a diagnosis code the first time a page names one.
- Show the failure alongside the success. A page that only documents the happy path is half a page.
- No "simply", no "just", no "easy".
- British spelling, matching `docs/` and the source.

Available components are Mintlify's: `Card`, `CardGroup`, `Steps`/`Step`, `Note`, `Warning`,
`Check`, `Accordion`/`AccordionGroup`, `CodeGroup`, `ResponseField`, `Tabs`/`Tab`, `Frame`.

## Documenting an endpoint

Nothing to write. Add the route in `apps/api` with its `response` schemas and a
`detail: { tags, summary, description }`, run `bun run docs:emit`, and the endpoint page appears
under **Endpoints** — parameters, schemas, playground and code samples included.

`tags` and `summary` are not decoration: the page's URL is `api-reference/<tag>/<summary>`, both
slugified. `GET /api/zones/:name` is tagged `Zones` and summarised "Read a zone", so it lives at
`/api-reference/zones/read-a-zone`. Renaming either moves the page. The tag descriptions that head
each group live in `apps/api/src/shared/http/openapi.ts`, next to the `info` block.

That file also pins the document to OpenAPI **3.1.0** rather than the Elysia plugin's default
3.0.3. The route schemas emit `const` for the discriminant on every tagged union, and OAS 3.0
rejects `const` — on 3.0 the whole Endpoints group silently fails to generate.

Write a page by hand only when an endpoint needs prose the OpenAPI `description` cannot carry. Then
it is an MDX file whose frontmatter points at the operation:

```mdx
---
title: "Read a zone"
openapi: "openapi.json GET /api/zones/{name}"
---
```

## Deploying

Connect the repo in the Mintlify dashboard with **content directory** set to `apps/docs`, and the
deployment branch set to `main`. Pushes deploy; pull requests get a preview.

There is deliberately no `build` script here: Mintlify builds the site, and running its CLI in CI
would mean installing Chromium on every job. `bun test` covers internal links and navigation without
it; `bun run links` is the fuller check, run by hand before a release.

The PRD (§3.9, §3.10) puts the docs at `docs.ownsi.dev`, and Mintlify serves that hostname itself —
a CNAME to its edge, its own certificate, nothing on the app's origin. The Cloudflare Worker in
`apps/web/worker` therefore proxies only `/api` and `/p`; it knows nothing about the docs.

That is the reason for the subdomain rather than a path on `ownsi.dev`: a path would mean the Worker
carrying Mintlify's own URL scheme — its asset and playground prefixes live at the domain root, not
under the subpath — and breaking at the edge whenever the vendor moved them. `docsUrl` on every API
error resolves to `docs.ownsi.dev/errors#<code>`, which is `errors.mdx` at this root.

## Still to do

- **A navbar logo.** `docs/branding/assets/` ships ~900 KB SVGs that wrap a raster on an opaque
  white background, so neither the size nor dark mode works here. The site renders the name as text
  until there is a transparent mark, black and white, around 120 px tall. The favicon is the symbol
  at 256 px and is fine.
- Endpoints the PRD specifies and the API has not built yet appear here the moment they exist,
  with no work in this package. `DELETE /api/domains/:id`, `/api/events`, `/proof_links` and
  `GET /p/:slug` all ship today; `/p/:slug` serves HTML rather than JSON, so it is the one route
  the OpenAPI document does not carry and `concepts/sharing-a-proof.mdx` documents by hand.
