---
name: docs-conventions
description: The conventions apps/docs holds itself to — what is generated and never edited, the house voice, the shape of each page type, frontmatter, links and the diagnosis vocabulary. Use when writing or reviewing anything under apps/docs.
---

# The conventions in apps/docs

`apps/docs/README.md` is the operating manual — how to run it, what deploys, how an endpoint page
appears. This is the pass to run over a page before calling it done.

`.claude/hooks/check-docs.sh` fires on every edit under `apps/docs` and asserts what a grep can
decide: the generated files, the banned vocabulary, British spelling, MDX shapes that break the
build, and `bun test` for navigation, frontmatter and internal links. Everything below that it
cannot decide is read, not asserted.

## Two files are generated. Editing them by hand is always wrong

| File | Comes from | Change it by |
| --- | --- | --- |
| `openapi.json` | the running Elysia app's `/openapi/json` | editing the route's `response` schemas and `detail`, then `bun run docs:emit` |
| `diagnostics/catalogue.mdx` | `explain()` in `apps/api/src/verification/domain/diagnosis.ts` | editing the `cause` and `fix` strings there, then `bun run docs:emit` |

That direction is the product, not a build detail. The catalogue's sentences can be trusted because
they are the exact strings the API returns, and `apps/api/test/docs.test.ts` fails the build when
either file drifts. A page never restates a schema or a diagnosis sentence in prose; it links to
the generated one.

Adding an endpoint means adding the route and regenerating. There is no page to write.

## Who owns what

One rule lives in one place. When a page needs something from this table, go to its owner rather
than restating the rule here.

| Content | Owner |
| --- | --- |
| Title, opening, prose, headings, steps, links, callouts | this skill |
| `cause` and `fix` for a diagnosis, and every code's name | `apps/api/src/verification/domain/diagnosis.ts` |
| Every request and response shape, and every endpoint page | the route's schemas in `apps/api` |
| The `## <code>` entry behind every `errorResponse()` | `errors.mdx`, asserted by `apps/api/test/docs.test.ts` |
| Navigation, tabs, groups, redirects | `docs.json`, asserted by `apps/docs/test/conventions.test.ts` |
| Machine-written prose patterns | [references/ai-patterns.md](references/ai-patterns.md) |
| What a real finding looks like | [references/calibration.md](references/calibration.md) |

## The voice

The house style is the same one the source holds:

- **Say the true thing, not the reassuring one.** `unresolvable` is ours. Say so.
- **Show the failure next to the success.** A page that documents only the happy path is half a
  page. The third outcome is the product (PRD §2); a page that hides it sells the wrong thing.
- **Name the mechanism.** Not "verification may take a moment" but "resolvers hold a cached
  negative for `secondsRemaining`".
- **No `simply`, no `just`, no `easy`.** If a step needs a minimiser to sound bearable, the step is
  the problem.
- **British spelling**, matching `docs/` and the source. `canceled` and `authorization` stay as
  they are: they are code identifiers, not prose.
- Prose is for a developer deciding what to build. It may be long where the reasoning is long.
  `concepts/` explains why; `guides/` tells you what to do.

Read [references/ai-patterns.md](references/ai-patterns.md) before drafting prose. The four that
catch the most here: a plain verb instead of `serves as` or `is designed to`; a subject-first
opener instead of `While X…` or `In order to…`; a bare imperative instead of `You can click Save`;
and no trailing clause that restates the benefit.

The em dash is house style, not a tell. It stays.

## The page types

| Folder | The page answers | Shape |
| --- | --- | --- |
| `index.mdx` | what ownsi is, and where to go | one paragraph, then `CardGroup` |
| `quickstart.mdx` | the four calls, in order | `Steps`, each with the call and its answer |
| `concepts/` | how the thing works, and why it was built that way | prose, tables of states, `Note` for the deliberate choices |
| `guides/` | how to build a screen with it | `Steps`, code, the failure shown next to the success |
| `diagnostics/overview.mdx` | what a diagnosis is and how to render one | the field shapes, then the three groups of codes |
| `api-reference/` | base URL, auth, streaming — what OpenAPI cannot carry | prose only; the endpoints generate themselves |
| `sdk/` | reaching the API from a language | `CodeGroup`, one tab per language |
| `errors.mdx` | every `errorResponse()` code | one `## <code>` heading each, and never moved |

`errors.mdx` sits at the docs root because `errorResponse()` builds `docsUrl` as
`https://docs.ownsi.dev/errors#<code>`. Moving it breaks every error the API has ever returned.

## Frontmatter

```mdx
---
title: "Reading a zone"
description: "One sentence. It is the search result and the AI answer."
icon: "globe"
---
```

`title` and `description` are required, and the conventions test fails without them.

The description is not a subtitle. It is the meta description, the search result on
`docs.ownsi.dev`, and increasingly the sentence an assistant quotes instead of the page. Write it
as the page's answer, not its label:

- Lead with what the reader gets or does, then the mechanism.
- One or two sentences. Two only when the second carries a fact the first does not.
- No restatement of the title. `title: "How verification works"` with
  `description: "How verification works in ownsi"` wastes the only sentence most readers see.
- The same voice as the page. `"Four steps, and only the first one decides. The rest exist to
  explain a negative."` says more than any summary of it would.

There is no `keywords:` field on any page, deliberately. Mintlify's search reads it, and adding it
is a real decision to make once — not a field to sprinkle on one page. Add it to every page in one
change, with a rule for what belongs in it, or leave it off.

## Links, and naming a code

- **Link a diagnosis code the first time a page names one**:
  ``[`domain_appended`](/diagnostics/catalogue#domain_appended)``. A page that names codes and
  never links the catalogue fails the hook.
- Enumerating all thirteen as chips is not a first mention. Link the catalogue once nearby and
  leave the chips bare.
- Link an error code to `/errors#<code>`.
- Link text names its destination. No `Learn more`, no `Click here`.
- Internal links are absolute paths without the extension: `/concepts/verification`. The
  conventions test resolves every one.

## The MDX that breaks

Three shapes fail at build or render wrong, and the hook catches all three:

- **Markdown inside `<Step title="...">`.** Mintlify renders the title literally, so the brackets
  and asterisks reach the reader. Put the link in the step body.
- **`<name@ownsi.dev>`.** The `<` opens a JSX tag and takes the whole page down. Write
  `[name@ownsi.dev](mailto:name@ownsi.dev)`.
- **A `mintlify.app` preview hostname in prose.** It is a deployment artefact. Link the relative
  path.

Available components are Mintlify's: `Card`, `CardGroup`, `Steps`/`Step`, `Note`, `Warning`,
`Check`, `Accordion`/`AccordionGroup`, `CodeGroup`, `ResponseField`, `Tabs`/`Tab`, `Frame`.

`Note` carries a deliberate choice or a caveat. `Warning` is for something hard to undo. Do not
reach for `Warning` to add weight to a sentence.

## Read the source before trusting a sentence about behaviour

The tests assert relations: a route named in prose is one the API serves, a page is navigated, a
link resolves, a generated file matches its source. They cannot assert behaviour — that a header is
honoured, that an act is possible, that a count is right. Every defect the August 2026 audit found
was of the second kind, and every one of them was published and passing.

So when a page says what the product *does* rather than what it *exposes*, open the code:
`apps/api/src/**/api/*.response.ts` for shapes, `*.routes.ts` for the acts that exist,
`diagnosis.ts` for the vocabulary, `packages/sdk/src` for what a TypeScript reader holds. A count
in front of a list is an assertion about the list; count it.

[references/calibration.md](references/calibration.md) is that audit, before and after.

## Before calling a page done

- Does it lead with what the reader gets, not with what the system is?
- Does it show the failure next to the success?
- Is every claim about behaviour true of the endpoints that answer today, not of the PRD?
- Is every diagnosis code linked on first mention, and every error code linked to `/errors`?
- Is the description a sentence worth being the only one a reader sees?
- Is the page in `docs.json`, under the right tab and group?
- Did anything reach for a generated file instead of its source?
- `cd apps/docs && bun test`, and `bun run links` before a release.
