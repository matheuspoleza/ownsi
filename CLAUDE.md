# ownsi

The reasoning behind the API rules below is in
[`docs/backend-architecture.md`](docs/backend-architecture.md). Read it before changing one.

Bun workspaces + Turborepo. `apps/api` (Elysia), `apps/web` (React + Vite on Cloudflare),
`apps/docs` (Mintlify), `packages/{db,emails,ui,tsconfig}`. The product spec is
`docs/domain-ownership/prd.md`.

## Comments

Code carries no explanatory comments. A comment is a bug report against a name: if a
line needs prose to be understood, rename the thing or extract a function until it does
not. No section banners, no restating the code in English, no `// TODO(D4)` markers.

The exceptions, and they are the only ones:

- A JSDoc line on a published type when it changes what a caller passes.
- A reference to an external contract that cannot be inferred from the code — an RFC
  number, a vendor quirk, the reason a workaround exists.

Prefer encoding the reason in a name. `negativeCacheTtlSeconds` needs no comment about
RFC 2308; `soaMinimum` would.

Everything is written in English, including commit messages.

## API architecture

`apps/api/src` is one folder per bounded context, plus `shared/`. Inside a context:

| folder         | holds                                              | may import              |
| -------------- | -------------------------------------------------- | ----------------------- |
| `domain/`      | types, pure functions, port definitions            | `shared/`, own `domain/`|
| `application/` | use cases and queries, as closures over their deps | `domain/`, `shared/`    |
| `api/`         | Elysia route factories and wire schemas            | `application/`, `shared/`|
| `infra/`       | adapters that implement the ports                  | `domain/`, `shared/`    |

Three files sit at the root of a context and carry the wiring:

| file                  | holds                                          |
| --------------------- | ---------------------------------------------- |
| `<context>.config.ts` | the config shape the context reads             |
| `<context>.module.ts` | the object graph — use cases, no transport      |
| `<context>.app.ts`    | the Elysia plugin mounting the context's routes |

The split is load-bearing. `*.module.ts` imports no Elysia, so a context can be driven by
something other than HTTP: an Inngest durable function runs the same use case with no
request in sight, and must never pull a service out of an Elysia instance to get it.
`*.app.ts` is where context-level `model()` and `onError` belong as the context grows.

`src/app.ts` is the only file that wires contexts into a server.

`test/architecture.test.ts` enforces every boundary above, including the module/app split,
and fails the build on a violation.

Bounded contexts never import each other. Anything two of them need lives in `shared/`.

### Auth is not a bounded context

Identity is cross-cutting, not a domain: every other context asks "who is this", and none of
them owns the answer. So better-auth is used directly, from `shared/`, and there is no `auth/`
folder:

| file | holds |
| --- | --- |
| `shared/auth.ts` | `createAuth` — the configured better-auth instance, and `createCheckSession` |
| `shared/http/session.ts` | `SessionCheck`, and the Elysia macro a route opts into with `session: true` |
| `shared/mailer.ts` | `SendMagicLink`, with the Resend and `log` drivers |

Two rules survive that shortcut, and they are the point of it:

- Nothing outside `shared/` imports `better-auth`. Contexts read `SessionCheck`, a tagged
  union, so no handler can reach a user off a check that came back anonymous.
- The macro is opt-in per route. `GET /api/zones/:name` is a logged-out visitor's first
  impression and must stay that way (PRD §3.7).

Wrapping better-auth's own API buys nothing and is not done. The day a second runtime needs
the instance — Inngest out of process — `shared/auth.ts` moves to a package unchanged.

### Functional and typed first

Data is plain `readonly` types, never classes. Behaviour is pure functions that take the
data. Nothing is `new`ed except adapters.

Model outcomes as tagged unions so illegal states cannot be constructed. `DnsAnswer` is
`{ type: "answered", records }` or `{ type: "failed", reason }` precisely so no caller can
read records off a lookup that failed — that rule is the product's central promise
(PRD §2, the third outcome) and it is the type system's job, not the reviewer's.

Errors are values. Return `Result<T, E>` with a tagged `E`; do not throw for anything a
caller is expected to handle. Map unions with an exhaustive `switch` closed by
`unreachable(value)` from `shared/result.ts`, so a new variant breaks the build.

### Dependencies

No DI container. A use case is a function that takes its dependencies once and returns
the handler:

```ts
export function createReadZone(deps: ReadZoneDeps): ReadZone {
  return async (input) => { ... }
}
```

Dependencies are applied at composition time and live in the closure. Never thread a
`deps` bag through call sites, and never reach for a service locator.

Ports are function types or small objects of function types, defined in `domain/ports.ts`
and implemented in `infra/`. A single-operation port is a bare function type, so a fake
is one line.

Every module factory takes an `overrides` parameter typed against its ports. That is how
tests swap adapters — checked by `tsc`, unlike a container rebind.

### Elysia

Elysia's own "dependency" is plugin composition, not object construction; the two systems
meet only at a route factory. Rules that follow from that:

- One Elysia instance per controller, built by a `*.routes.ts` factory that takes the use
  case as a plain argument.
- Never break the method chain — Eden Treaty's types on the front end depend on it.
- Never pass `Context` into a function outside `api/`. Destructure what you need.
- `decorate` is for request-scoped values only (`requestIP`, session), never for services.
- Per-request dependencies are Elysia's job: `derive`, `resolve`, `macro`. Never invent a
  parallel request scope.
- Give every plugin a `name` so mounting it twice deduplicates.
- `app.handle()` needs a real host: `new Request("http://localhost/api/...")`. A bare
  `http://x/` returns 404.

## Web architecture

`apps/web/src` is organised by feature, not by layer. A file lives with its only consumer:

```
src/
  main.tsx  router.tsx  Root.route.tsx
  api/            everything that talks to the server
  components/     components used by more than one page
  hooks/          hooks used by more than one page
  lib/            pure helpers and their constants
  pages/Claim/    Claim.page.tsx  Claim.route.tsx  Claim.utils.ts
                  components/  hooks/     private to this page
```

One consumer means the page folder; two means it moves up. A page never imports another
page's private files, and nothing under `components/`, `hooks/`, `lib/` or `api/` ever
imports from `pages/`.

Every file names its job: `.component.tsx`, `.page.tsx`, `.modal.tsx`, `.route.tsx`,
`.api.ts`, `.client.ts`, `.utils.ts`, `.constants.ts`, and `use*.ts` for a hook. PascalCase
means the file is a component or belongs to one (`VantageField.constants.ts`); camelCase
means it stands alone (`domain.utils.ts`). No barrel files.

Components are arrow consts with a named, exported props interface — always, including
one-prop components. No `React.FC`. `function` is for recursion, not for components.

Pages orchestrate: they read the URL, call hooks and lay out the result. Business logic
lives in hooks named `use[Entity]State`, `use[Entity][Action]` or `use[Entity]Subscription`.
A `useQuery` or a `useMutation` written inline in a page belongs in one.

Styling is Tailwind utilities on the element, over the tokens in
`packages/ui/src/styles/theme.css`. There is no `.css.ts`; a component with real variants
gets `cva`, in `packages/ui`. `packages/ui` keeps shadcn's kebab-case layout so the CLI
keeps working — the naming rules above are for application code.

`api/` is the only place that knows a server exists. The Eden client is typed off the API's
exported `App` type, so a changed route is a type error here.

`test/conventions.test.ts` enforces the naming, the colocation and the component rules
above, and fails the build on a violation.

`docs/frontend-architecture.md` explains the reasoning.

## Published documentation

`apps/docs` is the public site, on Mintlify. MDX pages plus a `docs.json` that carries the whole
navigation. Its own rules are in [`apps/docs/README.md`](apps/docs/README.md); these are the ones
that reach back into the code.

**Two files in `apps/docs` are generated and committed. Never edit them by hand:**

| Generated file | Comes from |
| --- | --- |
| `api-reference/openapi.json` | the running Elysia app, via `/openapi/json` |
| `diagnostics/catalogue.mdx` | `explain()` in `apps/api/src/shared/diagnosis.ts` |

`apps/api/scripts/emit-docs.ts` writes both; `bun run docs:emit` runs it. `apps/api/test/docs.test.ts`
fails when either drifts from the code, so a route change without a regenerate does not merge.

That direction is the whole point: **the API owns its contract and the docs read it.** A page never
restates a schema or a diagnosis sentence in prose — it links to the generated one. Adding an
endpoint means adding the route with its `response` schemas and a `detail: { tags, summary,
description }`, then regenerating; there is no page to write.

`errors.mdx` sits at the docs root because `errorResponse()` builds `docsUrl` as
`https://ownsi.dev/docs/errors#<code>`. Moving it breaks every error the API has ever returned. Every
code passed to `errorResponse()` must have a `## <code>` heading there, and the test checks it.

Prose pages are hand-written and follow the same voice as the rest of the repo: name the true
thing, show the failure next to the success, no "simply" and no "just".

## Testing

`bun test` in `apps/api` and `apps/web`. Tests construct their subject directly and pass
fakes as arguments; there is no test container and no module mocking.

Fixtures live in the test file that uses them. A test must not depend on a default baked
into a module factory — if it does, the test can pass while ignoring its own setup.

`apps/web` currently runs only the conventions guard. Hooks are the first thing worth
covering there, and they need no DOM. `apps/docs` runs only its conventions guard, which is
all a package of MDX has to prove.

## What enforces what

| Rule | Enforced by |
| --- | --- |
| Layer boundaries, module/app split, context isolation | `apps/api/test/architecture.test.ts` |
| No comments, no classes, no throwing in domain/application | `apps/api/test/conventions.test.ts` |
| Every route documents a response schema per status | `apps/api/test/conventions.test.ts` |
| No `any`, no `!`, bounded complexity, no barrel files | Biome override on `apps/api/**` |
| Web naming, colocation, arrow components, named props, no comments | `apps/web/test/conventions.test.ts` |
| The published docs match the code they document | `apps/api/test/docs.test.ts` |
| Every docs page is navigated, has frontmatter and links somewhere real | `apps/docs/test/conventions.test.ts` |
| All of the above, on every edit | `.claude/hooks/check-api.sh`, `.claude/hooks/check-web.sh` |

When a guard fires, move the code. Do not widen the rule.

## Commands

```
bun run dev        # turbo: api + web
bun run dev:docs   # mintlify on :3000, after regenerating what is generated
bun run docs:emit  # regenerate openapi.json and the diagnostics catalogue
bun run typecheck
bun run lint       # biome
cd apps/api && bun test
cd apps/web && bun test
cd packages/db && bun run db:migrate
```

The contexts still to build are `proof` and `verification`. What they
owe is in the PRD, not in the codebase — the pre-refactor slice that sketched them, including
the working Inngest wiring, is at commit ``. Read it for reference, never as a template:
it predates this architecture and its folder layout no longer exists.
