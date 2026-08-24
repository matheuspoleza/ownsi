---
name: api-bounded-context
description: Add or extend a bounded context in apps/api — layering, tagged-union modelling, closure-based dependencies, module wiring and the architecture test. Use when adding an endpoint, use case, port or adapter to the API.
---

# Adding to the API

Read `CLAUDE.md` first; this is the procedure, that is the law.

## Where the code goes

A bounded context is `apps/api/src/<context>/` with `domain/`, `application/`, `api/` and
`infra/`, plus three roots: `<context>.config.ts`, `<context>.module.ts` (object graph, no
transport) and `<context>.app.ts` (Elysia plugin). A small context may keep the layer files
flat; add the folders when it stops fitting on one screen.

Contexts planned but not built: `auth`, `claims`, `proof`, `verification`. What each owes is
in `docs/domain-ownership/prd.md`. Commit `` holds the pre-refactor slice — useful for
the Inngest wiring, misleading for structure, since its layers no longer exist.

## Order of work

1. **Model the outcome before the code.** Write the tagged union for what can come back,
   including the failure that is ours rather than the caller's. Make the illegal state
   unrepresentable — a non-empty tuple for "must have at least one", a variant instead of
   a nullable field.

2. **Declare the port.** In `domain/ports.ts`, as a function type where there is one
   operation. Do not describe the vendor; describe what the domain needs.

3. **Write the pure functions.** In `domain/`. They take data and return data.

4. **Write the use case.** In `application/`, as `create<Name>(deps) => handler`. It
   returns `Result<T, E>` with a tagged `E`. No throwing, no HTTP vocabulary, no Elysia.

5. **Write the adapter.** In `infra/`, a function returning the port. Map every vendor
   failure onto the union — a timeout is `failed`, never an empty `answered`.

6. **Write the route.** In `api/<thing>.routes.ts`, a factory taking the use case. Give
   the Elysia instance a `name`. Map the error union with an exhaustive `switch` closed by
   `unreachable`. Always declare `response` per status; it pins Eden's types and fills
   OpenAPI.

7. **Wire it.** Build the graph in `<context>.module.ts`, with an `overrides` parameter
   typed against the ports; it returns use cases and imports no Elysia. Mount the routes in
   `<context>.app.ts`. Add the context to `src/app.ts`.

8. **Test it.** Domain functions directly; the use case with fakes passed as arguments;
   the route through `createApp(config, overrides)` and `app.handle`.

## Checks

```
cd apps/api && bun test && bun run typecheck && bun run lint
```

`test/architecture.test.ts` fails the build if a layer imports across the boundary. If it
fires, the fix is to move the code, never to widen the rule.
