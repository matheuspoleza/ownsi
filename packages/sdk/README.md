# @ownsi/sdk

The client for the ownsi API. A thin layer over the Eden client, typed off the same `App` the
server exports — so a renamed route is a type error here rather than a runtime surprise.

```ts
import { createOwnsi } from "@ownsi/sdk"

const ownsi = createOwnsi({ baseUrl: window.location.origin })

const domain = await ownsi.domains.findOrCreate("acme.com")
const claim = await domain.claim()

claim.record          // { host, name, type, value } — what to write in the DNS panel
claim.token           // immutable for the life of the claim

const verification = await claim.verification()
verification.diagnosis?.fix ?? verification.waitEstimate
```

## Why it exists

The API is split along its seams: a domain is a name, a claim is an episode, a verification is
a process, and each is its own resource. That is right for the backend and tedious for a caller,
who wanted to say *claim this domain* and got three round trips and two ids to carry.

The seam stays where it is and the recomposition happens here, where it costs the backend
nothing. `domain.claim()` is one call. `claim.recheck()` knows which verification to run.

## What it hands back

Every read answers with a handle: the fields the API sent, plus the acts reachable from them.

| | |
| --- | --- |
| `ownsi.domains` | `findOrCreate(name)` · `get(id)` · `list()` |
| a `Domain` | `.claim()` · `.claims()` · `.proof()` · `.archive()` · `.delete()` · `.refresh()` |
| `ownsi.claims` | `create(domainId)` · `get(id)` · `list({ domainId? })` |
| a `Claim` | `.record` · `.verification()` · `.recheck()` · `.cancel()` · `.refresh()` |
| `ownsi.verifications` | `get(id)` |
| a `Verification` | `.run()` · `.attempts()` · `.refresh()` |
| `ownsi.zones` | `read(name, signal?)` — public, streamed, writes nothing |

`ownsi.api` is the Eden client underneath, for a route this package does not cover yet.

`claim.record` is singular because there is one record to write, and it is `null` once the claim
has ended — there is nothing left to put in a panel. It comes from the claim alone, so the
*write this TXT record* screen renders with no verification loaded.

## The two dates a proof states

```ts
await domain.proof()   // { firstVerifiedAt, lastConfirmedAt } — or null
```

Derived across the domain's claims and never stored, so neither date can disagree with the claims
it is read from. That is the PRD's own rule, and after the split there is no single response that
could carry them: they cross two resources, which is precisely what this package is for.
`proofOf(claims)` is the same function if you already hold the list.

## Dates are strings

Eden turns anything that looks like an ISO date into a `Date`. The routes declare `t.String()`, so
that would make every timestamp on this API a `Date` wearing a `string` type — and
`claim.expiresAt.slice(0, 10)` would compile and throw. `parseDate: false` is set on the client so
what comes back is what the type promises.

## Errors

Everything throws an `OwnsiError`, which carries the API's own `code` and `docsUrl` untouched.

```ts
import { isOwnsiError, RETRYABLE } from "@ownsi/sdk"

try {
  await domain.claim()
} catch (error) {
  if (isOwnsiError(error) && error.code === "already_claimed") { ... }
}
```

`RETRYABLE` is the set worth trying again — and `unreachable` is in it. That code is the one the
API never sends: it means no answer arrived, or the answer was not ours. A request that never
arrived and a request that failed are both our side of the line, so both read as `unreachable`
rather than as something about somebody's domain.

## Auth is not here

better-auth publishes its own typed client, and wrapping it would buy a second name for every
method and nothing else. `apps/web` builds it directly in `src/api/auth.client.ts`. The same
argument the API makes for not wrapping better-auth's server API applies on this side.

## Staying current

The payload types need no maintenance: they are derived from the server's exported `App`, so a
new field appears on its own and a renamed route is a type error here. What that cannot catch is
a route the API grows and this package never wraps — an unused route is legal TypeScript.

`test/coverage.test.ts` closes that. It reads the committed OpenAPI document, which
`apps/api/test/docs.test.ts` guarantees is current, and asserts that every operation the API
publishes is either reached by a call here or **written down as deliberately not**, with the
reason. Adding a route becomes a decision rather than an omission. It fails the other way too:
claiming to reach an operation the API no longer publishes.

## Tests

```sh
bun test
```

Against a stub `fetch` that records the requests and answers with canned bodies. What is under
test here is the shaping and the error mapping — the API's behaviour has its own 215 tests, and
asserting it twice would only mean two places to update.
