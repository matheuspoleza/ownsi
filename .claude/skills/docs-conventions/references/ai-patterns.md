# Machine-written prose, and how to unwrite it

Referenced from [the docs conventions](../SKILL.md#the-voice). Load it when drafting a page or
reviewing one that reads as generated even though it breaks no rule in the skill.

These are the patterns a model reaches for by default, and a person reaches for under deadline.
They are ordered by how much damage they do. The house rules and the facts win over every one of
them: never trade a true sentence for a natural-sounding one.

The examples are rewrites in ownsi's own vocabulary, not quotations from the published pages.

---

## 1. No importance inflation

Cut any sentence that claims weight without a fact in the same sentence carrying it.

- A detail tied to a vague theme — "part of a broader move towards verifiable identity".
- Pivotal, transformative, significant, with no number, mechanism or consequence behind it.
- A trailing `-ing` clause that editorialises instead of adding information.

**Before:** "ownsi reads three resolvers in parallel, reflecting our commitment to accuracy."

**After:** "ownsi reads three resolvers in parallel. Majority of three wins."

**Trailing pitch clauses.** A sentence that ends in a mini-pitch after a comma restates the benefit
and adds nothing. "Claim a domain in one call, with no configuration required" is two claims and
one of them is decoration.

## 2. Commit to positions

Hedging is a reflex, not a judgement. Hedge only where the answer is genuinely open.

**Before:** "Both polling and the stream have their strengths depending on your requirements."

**After:** "Stream the zone read. Poll the claim: it changes on DNS's clock, not on yours."

Delete "there are various considerations", "it could be argued", "both approaches have merit", and
any presentation of two options as equally weighted when they are not.

## 3. Use plain verbs

A model avoids the copula. Put it back.

| Written | Write instead |
| --- | --- |
| serves as, stands as, functions as | is |
| plays a role in | affects, decides |
| represents | is |
| offers, provides, features | has |
| leverages, utilises | uses |
| is designed to, aims to | (delete, keep the main verb) |
| allows you to, enables you to | lets you |

**Before:** "The challenge record serves as the mechanism by which ownsi is able to verify
ownership."

**After:** "The challenge record is how ownsi proves the domain is yours."

**`This + abstract verb`.** A sentence opening `This creates / enables / ensures / provides`
almost always becomes `You + concrete verb`, or gets cut.

**Before:** "This ensures that a resolver outage does not affect your claim."

**After:** "A resolver outage changes nothing: `unresolvable` transitions no state and sends no
email."

## 4. Break rhythm uniformity

Generated prose is metronomic — every sentence fifteen to twenty-five words, every paragraph three
to five sentences. After drafting, break it. If four sentences in a row are the same length,
shorten one hard. A short sentence after a long one is emphasis. Use it.

## 5. No template sentences

Rewrite anything matching these shapes. The point underneath is usually fine; the packaging is not.

- "It's not just X, it's Y."
- "Whether you're a [role], a [role], or a [role]…"
- "By [gerund], you can [benefit]."
- "In a world where…"
- "Imagine…" as an opener.
- "The answer lies in…"

## 6. Suspect vocabulary

Not banned, but used disproportionately by machines. Three in a paragraph means something is off.

**Adjectives and nouns:** comprehensive, complete, extensive, robust, powerful, seamless,
streamlined, cutting-edge, holistic, nuanced, pivotal, crucial, cornerstone, landscape, ecosystem,
testament.

**Verbs:** delve, harness, leverage, underscore, foster, showcase, navigate, embark, illuminate,
revolutionise, reimagine.

**Filler:** ever-evolving, fast-paced, it is important to note, plays a vital role, in today's
[noun], granular, rich, deeply.

**Minimisers:** simply, just, easily, even, further, already, really, quite, very, actually,
completely, perfectly. `simply`, `just` and `easy` are banned outright by the house rules.

`comprehensive` is the loudest one. Replace it with the things it stands for: "console logs and
the SOA" beats "comprehensive diagnostic information".

## 7. Vary structure, not person

The reader is `you` and stays `you`. What varies is sentence shape: direct instruction, observed
behaviour, conditional ("If the record is on the apex, …"), and short declarative fact. Mix them.

## 8. Concrete over abstract

A number, a record, a code, a named failure. Every time.

**Before:** "Verification can encounter difficulties in certain configurations."

**After:** "A CNAME on `_ownsi-challenge` makes every other record on that name invisible. That is
[`cname_conflict`](/diagnostics/catalogue#cname_conflict)."

When there is no number to give, name a concrete limitation instead of gesturing at one.

## 9. Collapse soft imperatives

When the next sentence is an instruction, drop the permission hedge.

**Before:** "You can then poll the claim until its status changes."

**After:** "Poll the claim until its status changes."

Keep `You can` where it genuinely offers a capability rather than prescribing a step. "You can read
a zone without an account" offers. "You can send the request" describes what should be an
instruction.

## 10. Open with the subject, not a dependent clause

Front-loaded clauses sound thoughtful and read as filler.

**Before:** "While the recursive resolvers are authoritative for what the internet sees, if the
record is new, they may not have it yet."

**After:** "Recursive resolvers show what the internet sees. A new record reaches them late."

Watch for: "While X is Y…", "With ownsi, you can…", "There are many ways to…", "It is important to
note that…", "In order to…".

## 11. Cut scene-setting that restates the heading

A paragraph introducing what the next paragraph shows is scaffolding.

**Before**, under the heading *Reading a zone*: "In this section we will look at how zone reading
works and what it returns."

**After:** delete it. Start with what the read returns.

## 12. No filler openers or closers

Delete "Let's dive in", "Let's break this down", "In conclusion", "To summarise", "As mentioned
earlier", "I hope this helps". Start with the substance. Stop when it ends.

## 13. Cut reflexive humility

"We're continually working to improve", "we know how important your data is", "we take this
seriously". Either name the specific improvement or cut the sentence. Acknowledging a limit is
good; warming up to it is not.

**Before:** "We know DNS can be confusing, so we've worked hard to make diagnostics helpful."

**After:** "Thirteen probes run over the observation already collected, and each one names one
specific shape of wrongness."

## 14. Cut meta-commentary

Explaining the reasoning behind the documentation instead of stating the fact: "this is an area
under active evaluation", "we've gone back and forth on this internally". State the decision.

The exception is the reasoning that belongs to the reader — why public resolvers rather than the
authoritative nameservers, why `unresolvable` is inert. That is not meta-commentary; it is the
thing `concepts/` exists to carry.

## 15. Do not over-list

Bullets are for genuinely parallel items: codes, options, fields, steps. Connected ideas that build
on each other are prose.

**A list should be prose when:** the items are full sentences with transitions, order matters, each
depends on the one before, or there are fewer than three.

**A list is right when:** items are parallel, order does not matter, and the reader will look up one
rather than read all of them.

---

## Boundaries

Never change for style: code identifiers, route names, diagnosis and error codes, field names,
quoted API strings, numbers, versions, and anything inside a fence. `canceled` and `authorization`
are American and stay that way — they are identifiers.

## The editing pass

Run it after drafting, before the page is done. Do not narrate that you ran it.

1. Sentences claiming importance. Is a fact carrying it? If not, cut.
2. Trailing `-ing` and trailing pitch clauses. If they restate the benefit, cut.
3. `serves as`, `is designed to`, `leverages`, `This creates/ensures`. Plain verb, or `You +`
   concrete verb.
4. `comprehensive`, `complete`, `powerful`, `simply`, `just`, `easily`. Cut, or name the specifics.
5. Openers: `While X…`, `With ownsi…`, `There are…`, `In order to…`. Flip to subject-first.
6. `You can X` where X is an instruction. Collapse to the imperative.
7. Four same-length sentences in a row. Break one.
8. Template sentences from rule 5. Rewrite.
9. Reflexive humility and meta-commentary. Cut.
10. Filler openers and closers. Delete.
11. Scene-setting that restates the heading. Cut.
12. Lists that should be prose. Convert.
13. Last read: does it sound like a launch post or like someone who has debugged this? If the
    former, add the specific failure.

When it is a close call, be more direct than feels comfortable. That is almost always right.
