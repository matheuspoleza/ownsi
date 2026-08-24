# Frontend architecture

How `apps/web` and `packages/ui` are put together, and why. `CLAUDE.md` states the rules;
this explains them, so that changing one is a decision rather than an accident.

The backend companion is [`backend-architecture.md`](backend-architecture.md). The two are
not symmetrical on purpose: a React app has no bounded contexts and no ports, and pretending
otherwise buys ceremony rather than safety. What the two do share is the discipline that a
name should carry its own meaning, and that a rule nobody can enforce is a rule nobody keeps.

## The shape

Feature folders, not layer folders:

```
src/
  main.tsx              mounts the providers and the router
  router.tsx            the route tree
  Root.route.tsx        the root route — the outlet and the dev toolbar
  api/                  everything that talks to the server
  components/           components used by more than one page
  hooks/                hooks used by more than one page
  lib/                  pure helpers and their constants
  pages/
    Claim/
      Claim.page.tsx        the screen
      Claim.route.tsx       its route definition
      Claim.utils.ts        helpers only this page uses
      components/           components only this page uses
      hooks/                hooks only this page uses
```

The rule that decides where a file goes is: **one consumer, one folder**. `ZoneReadout` is
rendered only by the claim screen, so it lives in `pages/Claim/components/`. `SignInCard` is
rendered by the claim screen and the sign-in screen, so it lives in `src/components/`.

That is the whole placement algorithm, and it is deliberately mechanical. The alternative —
`components/Claim/`, `hooks/Claim/`, `utils/Claim/` — spreads one feature across three trees
and forces a reader to reassemble it from memory. Moving a file up when a second page starts
using it is a two-line change; the cost of getting it wrong is near zero, so the rule can be
applied without deliberation.

The inverse direction is the one that matters, and it is enforced: a page never imports
another page's private files, and nothing under `components/`, `hooks/`, `lib/` or `api/`
ever imports from `pages/`. Shared code that reaches into a feature is shared code that has
stopped being shared.

## Names carry the file's job

Every file says what it is in its own name:

| Suffix | Holds |
| --- | --- |
| `.component.tsx` | a component |
| `.page.tsx` | a screen — orchestrates data and layout, renders little itself |
| `.modal.tsx` | a dialog or overlay |
| `.route.tsx` | a TanStack Router route definition |
| `.api.ts` | calls against one server resource |
| `.client.ts` | a configured client other modules use |
| `.utils.ts` | pure functions |
| `.constants.ts` | values, and the types that describe them |
| `use*.ts` | a hook |

Casing is part of the signal. PascalCase means "this is a component, or it belongs to one":
`VantageField.constants.ts` sits next to `VantageField.component.tsx` and exists for it.
camelCase means the file stands alone: `domain.utils.ts` belongs to no component.

This pays for itself in search rather than in reading. `pages/Claim/**/*.component.tsx` is
every piece of UI on one screen; `**/*.api.ts` is every call the app makes. Neither is a
question you can ask a tree of `index.ts` files.

There are no barrel files. A barrel makes every importer depend on every export, which
defeats the point of knowing what a file holds from its name, and it costs the bundler its
ability to drop what nobody imports.

## Components

### Arrow functions, and why it is not only taste

Components are `const X = (props: XProps) => ...`. Hoisting is the reason. A `function`
declaration can be called above its definition, so a file can be written in an order that
reads fine and then quietly stops reading fine once a hook is extracted from it. Arrow
consts fail loudly instead, which keeps the definition order and the dependency order the
same thing.

The habit also survives refactoring. Extracting logic out of a component into a hook, or a
handler into a callback, does not change the syntax of what is being moved.

`function` remains correct for recursion, and for a helper that genuinely wants a named
stack frame. Neither has come up in this app yet.

### Props are always a named type

```ts
export interface SignInCardProps {
  title: string
  description: string
  onSubmit: (email: string) => void
}

export const SignInCard = ({ title, description, onSubmit }: SignInCardProps) => { ... }
```

Even for a component with one prop. The argument is not type safety — an inline object type
is just as safe — it is that components grow. The moment a second consumer needs a variant,
an inline type has to be lifted, named, and exported, and every call site's error messages
change shape at once. Naming it on day one makes that a non-event.

The type is exported for the same reason: a wrapper, a story or a test that needs to build
props should not have to re-declare them.

`React.FC` is not used. It adds an implicit `children` that most components do not accept,
and it is the one thing about this pattern that React's own docs now steer away from.

### Pages orchestrate, components render

A `.page.tsx` reads the URL, calls its hooks and lays out the result. It should contain no
`useState` that is really domain state and no `useQuery` inline. `Claim.page.tsx` is the
worked example: two queries and a mutation used to live in it, and it is now a list of
components fed by `useZoneState` and `useMagicLinkSend`.

## Hooks

Business logic lives in hooks, named for what they own:

| Shape | Name |
| --- | --- |
| state for an entity | `use[Entity]State` |
| an action on it | `use[Entity][Action]` |
| a live subscription | `use[Entity]Subscription` |

`useZoneState` owns the two chained queries the claim screen needs — the delegation, then
the publishing estimate that depends on it — and returns `isReading` and `hasFailed` already
derived. The page never sees `isSuccess` from two queries and never has to remember how to
combine them.

`useMagicLinkSend` owns the mutation and the "we sent it to this address" state. It is in
`src/hooks/` rather than in a page because both the claim screen and the sign-in screen send
magic links; before it existed the same six lines were in both, and the two had already
started to drift.

A hook is also the seam where this app can be tested without a DOM. `useZoneState` is a
function of `api/zone.api.ts`; swapping that module is how a test drives it.

## Styling

Tailwind v4, with the tokens in `packages/ui/src/styles/theme.css` and the primitives in
`packages/ui`. Utilities are written inline on the element.

### Why there is no `.css.ts`

The convention this app otherwise follows pairs each component with a `.css.ts` of styled
components. That step is deliberately skipped, and the reason is that it solves a problem
Tailwind does not have.

`.css.ts` exists to get CSS out of the component file. With utilities the CSS is already
not in the component file — it is in `theme.css` as tokens, and what appears on the element
is a reference to it. Introducing Emotion to reach the same separation would mean a second
styling system, a runtime cost on every render, and a second definition of every colour that
`theme.css` already owns. Two sources of truth for the palette is a worse outcome than a
long `className`.

Where a component genuinely accumulates variants, the answer is `cva` — see
`packages/ui/src/components/ui/button.tsx`, which holds every variant and size in one place
and is the reason a cursor fix there propagated to the whole app in one edit. That is the
Tailwind-native shape of "styling separated from logic", and it is worth reaching for when a
component has variants. It is not worth reaching for to move a one-off flex row.

If the app ever needs styling that cannot be expressed as utilities — a runtime-computed
gradient, a third-party widget that only takes a class — that is the moment to revisit this,
not before.

### `packages/ui` keeps shadcn's file layout

The design-system package is kebab-case (`button.tsx`, `card.tsx`) rather than
`Button.component.tsx`. That is what the shadcn CLI writes and what `components.json` points
at; renaming it means the next `shadcn add` lands a file in the wrong shape, in the wrong
case, next to the one it was meant to replace. The naming convention above is for
application code, where nothing generates files for us.

## The server boundary

`api/` is the only place that knows a server exists.

`eden.client.ts` builds an Eden Treaty client typed straight off `@ownsi/api`'s exported
`App` type. There is no codegen and no generated SDK: the front end compiles against the
server's actual routes, so a changed response shape is a type error here rather than a
runtime surprise. This is also why `CLAUDE.md` insists the API never breaks an Elysia method
chain — a broken chain degrades these types silently.

`zone.api.ts` and `auth.api.ts` currently return fixtures behind a delay. They are real
modules with real types, so the screens are walkable end to end without the API running, and
wiring the real calls touches those two files and nothing else.

## What enforces what

Prose does not enforce anything. This is what actually bites:

| Rule | Enforced by |
| --- | --- |
| File suffixes, casing, no barrel files | `apps/web/test/conventions.test.ts` |
| Components are arrow functions with a named props type | `apps/web/test/conventions.test.ts` |
| Pages stay out of each other; shared code never imports a page | `apps/web/test/conventions.test.ts` |
| No explanatory comments | `apps/web/test/conventions.test.ts` |
| Formatting, import order, unused code, hook dependencies | Biome |
| Props and API shapes | `tsc --noEmit` |
| All of the above, on every edit | `.claude/hooks/check-web.sh` |
| Everything else | `CLAUDE.md`, and review |

Each guard was verified by planting a violation and watching it fail. A guard that has never
failed is not known to work.

When a guard fires, move the code. Widening the rule to fit the code is how an architecture
document becomes fiction.

## What is not settled

Written down so the gaps are visible rather than discovered:

- **No component tests.** The guard suite is the only thing `bun test` runs in `apps/web`.
  Hooks are the natural first target, and they need no DOM.
- **No error or loading boundary.** Every screen handles its own failure inline. The first
  screen that cannot will need a route-level boundary, and that belongs in `Root.route.tsx`.
- **`.modal.tsx` has no instance yet.** The suffix is reserved; the first dialog decides
  whether modals are page-private or shared.
- **Nothing is memoised.** No component in the flow re-renders often enough to justify it.
  Reach for `memo` with a profile in hand, not on principle.
