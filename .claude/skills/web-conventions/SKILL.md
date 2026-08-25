---
name: web-conventions
description: The conventions apps/web holds itself to — feature colocation, the file suffixes, arrow components with named props, hooks over inline queries, and no explanatory comments. Use when writing or reviewing anything under apps/web/src.
---

# The conventions in apps/web

`CLAUDE.md` is the law and `docs/frontend-architecture.md` is the reasoning. This is the
pass to run over a diff before calling it done. Nothing here is asserted by a test —
`apps/web/test/conventions.test.ts` used to scan for it and was deleted; Biome still fails
the build on `any`, `!`, unused code and barrel files.

## Where a file lives

Organised by feature, not by layer. **A file lives with its only consumer.**

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

- One consumer means the page folder; two means it moves up.
- A page never imports another page's private files. If two pages need it, it is shared —
  move it, do not reach across.
- Nothing under `components/`, `hooks/`, `lib/` or `api/` ever imports from `pages/`. The
  arrow points one way, always.
- `api/` is the only place that knows a server exists. The Eden client is typed off the
  API's exported `App` type, so a changed route is a type error here and nowhere else.

## What a file is called

Every file names its job:

| Suffix | Holds |
| --- | --- |
| `.component.tsx` | a component used by more than one thing, or private to a page |
| `.page.tsx` | a page: reads the URL, calls hooks, lays out the result |
| `.modal.tsx` | a modal |
| `.route.tsx` | a route definition |
| `.utils.ts` · `.constants.ts` | pure helpers and their constants |
| `.api.ts` · `.client.ts` | the server, and the clients that reach it |
| `use*.ts` | a hook — the only files in a `hooks/` folder |

**PascalCase means the file is a component or belongs to one** (`VantageField.constants.ts`).
**camelCase means it stands alone** (`domain.utils.ts`). A PascalCase stem with no matching
`.component.tsx` / `.page.tsx` beside it is a file that lost its owner.

Entrypoints — `main.tsx`, `router.tsx`, `styles.css` — carry no suffix. No barrel files:
no `index.ts` re-exporting a folder, ever.

## Components

- Arrow consts, always. `function` is for recursion, not for components.
- A named, exported props interface — always, including one-prop components. Never an
  inline `}: {` object, never `React.FC`.
- Pages orchestrate; they do not hold business logic.

```tsx
export interface ProofTicketProps {
  readonly domain: string
}

export const ProofTicket = ({ domain }: ProofTicketProps) => { ... }
```

## Hooks

Business logic lives in a hook named `use[Entity]State`, `use[Entity][Action]` or
`use[Entity]Subscription`. A `useQuery` or `useMutation` written inline in a page belongs in
one — that is the single most common drift.

Hooks need no DOM to test, which is what makes them the first thing worth covering here.

## Styling

Tailwind utilities on the element, over the tokens in
`packages/ui/src/styles/theme.css`. There is no `.css.ts`. A component with real variants
gets `cva`, in `packages/ui`.

`packages/ui` keeps shadcn's kebab-case layout so the CLI keeps working — the naming rules
above are for application code, not for it.

## Comments

Same rule as the API: no explanatory comments. A comment is a bug report against a name —
rename the thing or extract a function until the line reads on its own. The exceptions are
a JSDoc line on a published type, and a reference to an external contract that cannot be
inferred. Tool directives (`biome-ignore`, `@ts-expect-error`) are not comments.

## Before calling it done

```sh
cd apps/web && bun run typecheck && bun run lint
```
