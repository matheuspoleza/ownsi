---
name: api-conventions
description: The conventions apps/api holds itself to — no explanatory comments, no classes, errors as values, the closed verb set, one unit per file and the suffix that names a file's role. Use when writing or reviewing anything under apps/api/src.
---

# The conventions in apps/api

`CLAUDE.md` is the law and `docs/backend-architecture.md` is the reasoning. This is the
pass to run over a diff before calling it done. Nothing here is asserted by a test —
`test/architecture.test.ts` polices the boundaries between layers and contexts, and the
rest is read.

## Comments

- No explanatory comment survives. A comment is a bug report against a name: rename the
  thing or extract a function until the line reads on its own.
- No section banners, no English restatement of the code, no `// TODO` markers.
- Two exceptions, and only these: a JSDoc line on a published type when it changes what a
  caller passes, and a reference to an external contract that cannot be inferred — an RFC
  number, a vendor quirk, why a workaround exists.
- Prefer encoding the reason in a name. `negativeCacheTtlSeconds` needs no comment about
  RFC 2308; `soaMinimum` would.

Tool directives (`biome-ignore`, `@ts-expect-error`) are not comments in this sense.

## Types and control flow

- Data is plain `readonly` types. No classes anywhere; nothing is `new`ed except adapters.
- Outcomes are tagged unions, so illegal states cannot be constructed. A nullable field
  travelling next to a boolean flag is a union wearing a disguise.
- Errors are values. `domain/` and `application/` never `throw`; they return
  `Result<T, E>` with a tagged `E`.
- Map a union with an exhaustive `switch` closed by `unreachable(value)` from
  `shared/result.ts`, so a new variant breaks the build.
- No `any`, no non-null `!`, no barrel files. Biome fails the build on these.

## Names

The verbs are a closed set:

| Kind | Verbs |
| --- | --- |
| Query | `get<Thing>`, `list<Things>`, `findOrCreate<Thing>` |
| Command | `create` `cancel` `archive` `delete` `run` `stop` `revoke` `prove` `expire` `notify` |
| Event | `<Entity><Verb>ed`, derived from the command that caused it |

An act that wants a verb outside the set is usually two acts. Widening the set is a
decision; reaching for `apply`, `request`, `announce`, `handle` or `process` is not.

One name, in four places: the file, the type, the function and the module property carry
the same word. That a function closes over its dependencies is the pattern, not the noun,
so no `create*`/`make*` factory prefix appears in `application/`. `create` in a name means
creating something.

## One file, one unit

One use case per file, one query per file, one schedule per file. Its own input, deps and
error types travel with it; nothing else does. A type invented to cover several use cases
at once — because they share a signature rather than a meaning — is the smell this removes.

## The suffix says the role

| Folder | Suffix |
| --- | --- |
| `domain/` | none |
| `application/` | `.use-case.ts` · `.query.ts` · `.schedule.ts` |
| `api/` | `.routes.ts` · `.response.ts` · `.errors.ts` |
| `infra/` | `.repository.ts` · `.service.ts` |
| root | `.module.ts` · `.app.ts` · `.config.ts` · `.contract.ts` |

A file that fits none of them is usually in the wrong folder.

A reaction to an event is an ordinary use case with a business name, wired in one line in
`src/app.ts`. A `.policy.ts` is earned only by a reaction carrying a real condition.

## The wire

- Every route declares a `response` schema per status, and a
  `detail: { tags, summary, description }`. Regenerate with `bun run docs:emit`.
- Every code passed to `errorResponse()` has a `## <code>` heading in
  `apps/docs/errors.mdx`. `test/docs.test.ts` checks it.
- Never break an Elysia method chain — Eden Treaty's types on the front end depend on it.

## Before calling it done

```sh
cd apps/api && bun test && bun run typecheck && bun run lint
```
