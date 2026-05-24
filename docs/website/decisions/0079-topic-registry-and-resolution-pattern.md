---
date: 2026-05-23T00:00:00.000Z
tags:
  - topic-registry
  - cards
  - skill-review
  - registry-resolution-pattern
  - mdx-remark-plugin
  - library
  - reasoning-os
status: accepted-design
validation:
  status: in-progress
  last_validated_date: "2026-05-23"
  evidence:
    - kind: test
      ref: packages/core/src/schema/pedagogy-index-entries/topic.test.ts
      date: "2026-05-23"
      notes: "TopicEntry + TopicCardMetadata + CardEntry Zod schemas (12 tests)."
    - kind: test
      ref: packages/astro/src/lib/mdx-plugins/skill-review-resolver.test.ts
      date: "2026-05-23"
      notes: "Resolver invoked via unified().use().run() against fixture topics — covers single-card auto-pick, explicit fragment, bare-multi-card ERROR with curated message, unknown topic ERROR, unknown card ERROR, explicit-children non-destructive."
    - kind: test
      ref: packages/astro/src/lib/mdx-plugins/skill-review-resolver-vite.test.ts
      date: "2026-05-23"
      notes: "Companion Vite plugin handleHotUpdate — surgical chapter invalidation via chapter→topic dep map populated by the remark plugin."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/extractors/topic.test.ts
      date: "2026-05-23"
      notes: "Topic extractor emits PRA-2 finding for orphan body cards (body→frontmatter direction)."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.test.ts
      date: "2026-05-23"
      notes: "PRA-2 audit covers the inverse (frontmatter→body) direction."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/invariants/bridge-uniqueness.test.ts
      date: "2026-05-23"
      notes: "BR-1 covers bridge slug collisions against other Sections, Units, and reserved structural paths."
    - kind: deployment
      ref: examples/smoke/dist/library/topics/logarithms/index.html
      date: "2026-05-23"
      notes: "Smoke build emits Topic Spec pages for both `exponents` and `logarithms`; PRA-1 ERROR baseline = 0 (both prereqs covered by self-closing callsites)."
    - kind: review
      ref: docs/website/pilots/wedge-b-followup-w4b-affordances.md
      date: "2026-05-23"
      notes: "W4b pilot report (Shape α); R+CR APPROVE WITH FIXES → all Critical + Important resolved before PR open."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/invariants/topic-consistency.test.ts
      date: "2026-05-23"
      notes: "W4c: PRA-2 audit-side honors TopicEntry.audit_overrides (frontmatter→body direction); PRA-2-grain WARNING regression for Grain-1 override attempts."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index/extractors/topic.test.ts
      date: "2026-05-23"
      notes: "W4c: PRA-2 extractor-side honors TopicEntry.audit_overrides (body→frontmatter direction); mirrors PRA-1 W4b shape."
    - kind: test
      ref: packages/astro/src/components/TopicSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "W4c: Topic Spec page renders card Prompt/Answer body inline (closes W4b R+CR N5); outer <section aria-labelledby> landmark fix."
    - kind: test
      ref: packages/astro/src/lib/mdx-plugins/skill-review-resolver.test.ts
      date: "2026-05-23"
      notes: "W4c: renderTopicCardSlotsToHtml resolver helper — 3 new tests cover slot extraction reuse for Topic Spec inline body rendering."
    - kind: deployment
      ref: examples/smoke/src/content/topics/math/logarithms.mdx
      date: "2026-05-23"
      notes: "W4c smoke fixture: deliberate PRA-2 orphan card with matching audit_overrides entry demonstrates the honoring path end-to-end."
---

# ADR 0079: Topic registry + registry-resolution pattern

:::{admonition} ADR metadata

- **Status**: accepted-design (2026-05-23 — landed in W4b)
- **Deciders**: anna
- **Amends**: [0038](./0038-pedagogy-index-pattern.md) (pedagogy-index gains TopicEntry + CardEntry), [0053](./0053-conformance-failure-modes.md) (PRA-1 graduation honors `audit_overrides`), [0060](./0060-registry-ecosystem.md) (topic registry is the fourth registry type), [0067](./0067-section-level-artifacts.md) (PRA-1 enforces topic coverage at Unit-prereq level), [0068](./0068-bridge-rooms-and-prereq-pedagogy.md) (`<SkillReview target="topic:..." />` self-closing form lands, bridge rooms render via [bridgeSlug].astro), [0070](./0070-library-room-and-registry-spec-pages.md) (Topics room added to Library hierarchy)
- **Related**: [0023](./0023-vertical-slice-first.md) (YAGNI for v1 schema), [0044](./0044-misconception-graph.md) (future use of resolution-pattern), [0046](./0046-equation-biography.md) (future use of resolution-pattern), [0061](./0061-ai-optimized-codebase-design.md) (focused-files; topic file as the focus unit), [0069](./0069-fsrs-spaced-repetition-engine.md) (cards are FSRS scheduling units)
:::

## Context

Sophie's pedagogy graph (ADR 0068) declares a single concept —
**topics** — referenced from three scales of prereq affordance:

1. Bridge `Unit[skill].topic_id` — a top-level bridge-room unit
   teaches one topic.
2. Inline `Section[type=bridge].topic_ids` — a regular section
   review-bundles several topics (Scale 2; deferred from W4b).
3. Inline `<SkillReview target="topic:X" />` — a chapter-side
   retrieval prompt drills one topic just-in-time.

And content `Unit[type=lecture].prereqs: [topic-id-1, topic-id-2]`
declares which topics the lecture assumes.

**Topics have not yet been authored as content.** ADR 0068 said
"topics are first-class identifiers in the pedagogy graph" without
specifying what a topic *is* as a content artifact. Without a
backing content type:

- `<SkillReview target="topic:X" />` cannot resolve a real prompt
  + answer — the self-closing form is a placeholder.
- `Unit[skill]` cannot be authored as a real bridge-room body —
  the topic's worked examples, practice, and explanations have
  nowhere to live.
- PRA-1 audit only checks *whether* a covering SkillReview exists
  for a Unit's prereqs, not whether the topic itself is real.
- Cross-references from equations / misconceptions / glossary to
  topics are ungrounded — the linked-to entity has no surface.

This ADR specifies topics as a full content registry, joining the
[ADR 0060 Registry Ecosystem](./0060-registry-ecosystem.md) family
alongside equations, glossary terms, figures, and misconceptions.

A second concern lands in the same ADR. The
`<SkillReview target="topic:X" />` self-closing form is **the
first use of a general pattern**: an MDX component whose minimal
authoring shape is `<X target="prefix:slug" />` and whose
expanded shape (rendered into the AST at compile time) is
`<X target="prefix:slug">...slot children pulled from another
content file...</X>`. Future components in the same family —
`<MisconceptionRef>` per ADR 0044, `<EquationRef>` per ADR 0046 —
will likely want similar self-closing affordances. Per Sophie's
"land the pattern with its first user" convention (see
[ADR 0058](./0058-epistemic-component-contract.md) shipping the
eight-role taxonomy with its first applications), the resolution
pattern lands in this ADR alongside the topic registry that uses
it first.

A real course (ASTR 201, ASTR 596, COMP 536) is expected to
declare 30-60 topics across 4-6 natural clusters (math, physics,
astronomy, statistics, programming, etc.). The chosen file
layout must scale to this size without overwhelming author
browsing.

## Decision

**Sophie ships a Topics content registry under
`src/content/topics/<category>/<topic-id>.mdx` (Design F: sub-
grouped flat topics with cards inline) and a generalized
registry-resolution remark plugin pattern.** Each topic is a
single MDX file. Frontmatter holds the topic's metadata + an
explicit card list; the body holds `<SkillReview.Card id="X">`
JSX blocks each containing `<SkillReview.Prompt>` +
`<SkillReview.Answer>` slot children. Category sub-directories
under `topics/` are **author convenience only** — they group
related topic files for browsing but have no semantic meaning
in the pedagogy graph. URLs and cross-references treat topics
as flat (a single top-level identifier space).

The resolution pattern is an MDX remark plugin in
`@sophie/astro/src/lib/mdx-plugins/` that expands self-closing
component invocations of the form `<X target="prefix:slug" />`
(optionally with `#card-id` fragment) by reading the referenced
content file and lifting its slot children into the JSX tree.

The pattern's first user is `<SkillReview target="topic:..." />`.
Future inheritors (`<MisconceptionRef>`, `<EquationRef>` with
biography auto-fill) amend this ADR's revision history.

### Topic file shape (Design F: sub-grouped flat + inline cards)

```
src/content/topics/
├─ math/
│  ├─ logarithms.mdx
│  ├─ exponents.mdx
│  ├─ vectors.mdx
│  └─ ...
├─ physics/
│  ├─ newton-second-law.mdx
│  └─ ...
├─ astronomy/
│  ├─ parallax.mdx
│  └─ ...
└─ statistics/
   └─ ...
```

Per-topic file (e.g., `topics/math/logarithms.mdx`):

```mdx
---
id: logarithms
label: Logarithms
summary: |
  Functions that invert exponentiation; map products to sums.
prereq_topic_ids: [exponents]
linked_equation_ids:
  - stefan-boltzmann
  - wiens-law
linked_misconception_ids:
  - logarithm-as-multiplication
cards:
  - id: product-rule
    label: Product rule
    difficulty: easy
  - id: power-rule
    label: Power rule
    difficulty: medium
  - id: change-of-base
    label: Change of base
    difficulty: hard
---

<SkillReview.Card id="product-rule">
  <SkillReview.Prompt>
    What does $\log_b(xy)$ equal?
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $\log_b(x) + \log_b(y)$ — logarithms turn products into sums.
    Falls out of $b^{m+n} = b^m \cdot b^n$.
  </SkillReview.Answer>
</SkillReview.Card>

<SkillReview.Card id="power-rule">
  <SkillReview.Prompt>
    What does $\log_b(x^n)$ equal?
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $n \cdot \log_b(x)$ — the exponent comes down as a multiplier.
  </SkillReview.Answer>
</SkillReview.Card>

<SkillReview.Card id="change-of-base">
  <SkillReview.Prompt>
    Express $\log_2(x)$ using natural log.
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $\log_2(x) = \ln(x) / \ln(2)$ — divide by $\ln$ of the new base.
  </SkillReview.Answer>
</SkillReview.Card>
```

The topic file is *the* unit of focused-file authoring (ADR 0061):
all of logarithms' content lives in one file, easily edited as a
cohesive whole. The card list in frontmatter mirrors the cards
declared in the body — a build-time audit (PRA-2, new) verifies
consistency between the two.

### Category sub-grouping is organizational, not semantic

The `math/` `physics/` `astronomy/` etc. directories under
`topics/` are **file-system author convenience**. They:

- Do **not** appear in URLs (`/library/topics/logarithms/` —
  flat, regardless of category).
- Do **not** have their own metadata, Spec page, or pedagogy-
  graph entity.
- Are **not** addressable as `target="topic:math"` (math is
  not a topic).
- Are **discovered** by the content-collection loader via
  `glob("topics/**/*.mdx")` so subdirectory restructuring is
  invisible to consumers.

**Why no semantic parent topics?** The "math fundamentals
contains logarithms" intuition is real, but Sophie already has
the right primitive for this: a **bridge room** (ADR 0068
Scale 1). A `Section[type=bridge]` with `slug: math-fundamentals`
contains `Unit[skill]` entities, each referring to one topic
(`logarithms`, `exponents`, ...). The umbrella IS a real entity
in the pedagogy graph — at the *bridge/section* layer, not the
*topic* layer. Adding parent-topic semantics would duplicate
the bridge-room affordance and introduce cross-level ambiguity
in PRA-1's coverage check (does "math-fundamentals covered" mean
any sub-topic covered? all sub-topics covered?). **Topics stay
flat; bridge rooms own the umbrella.** See [Rationale Q3](#rationale)
for the design trace.

### Pedagogy-index entries

Two new entry types land in
`packages/core/src/schema/pedagogy-index-entries/`:

```typescript
// topic.ts
export const TopicEntrySchema = z.object({
  id: Slug,
  label: NonEmptyString,
  summary: NonEmptyString,
  prereq_topic_ids: z.array(Slug).default([]),
  linked_equation_ids: z.array(Slug).default([]),
  linked_misconception_ids: z.array(Slug).default([]),
  cards: z.array(z.object({
    id: Slug,
    label: NonEmptyString,
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })).default([]),
});

// card.ts (derived from <SkillReview.Card> JSX in topic body,
// surfaced as a separate index entry for FSRS scheduling
// + cross-reference granularity)
export const CardEntrySchema = z.object({
  id: Slug,           // within topic
  topic_id: Slug,     // parent topic
  label: NonEmptyString,
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  // body slots are NOT in the entry — the resolver fetches them
  // from the topic file's MDX AST at compile time.
});
```

The accumulator emits `TopicEntry[]` from frontmatter + `CardEntry[]`
derived from inline `<SkillReview.Card>` JSX blocks. PRA-1 reads
`TopicEntry` for prereq coverage; the resolver reads `CardEntry`
metadata + walks the topic MDX AST to lift slot children. A new
audit invariant **PRA-2** verifies that every card declared in
the topic frontmatter has a matching `<SkillReview.Card id="X">`
JSX block in the body, and vice-versa (frontmatter ↔ body
consistency).

### `target` syntax for self-closing form

Three addressable forms, in order of specificity:

| Form | Resolves to | When to use |
|---|---|---|
| `target="topic:<id>#<card-id>"` | Specific card within topic | Multi-card topics; explicit author selection. |
| `target="topic:<id>"` | THE single card (if topic has exactly one) | Single-card topics; ambiguous if topic has >1 card. |
| `target="card:<global-id>"` | *Reserved for future use* | Globally-unique card IDs, deferred to Wedge D's FSRS adaptive selection. |

**Bare-topic with multi-card topic: build-time ERROR.** The
remark plugin emits a curated message naming the available
cards:

```
ERROR (W4b-resolver): <SkillReview target="topic:logarithms" />
  at examples/smoke/.../reading.mdx:42 is ambiguous.
  Topic 'logarithms' has 3 cards; specify one:
    - topic:logarithms#product-rule
    - topic:logarithms#power-rule
    - topic:logarithms#change-of-base
```

Forcing explicit selection at v1 keeps space open for Wedge D
to introduce adaptive selection (FSRS-driven card pick based on
student mastery, per ADR 0069) without retroactively redefining
bare-topic semantics.

### Resolver behavior (MDX remark plugin)

The plugin lives at
`packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`
and is wired into `sophieMdxOptions.remarkPlugins` in
`packages/astro/src/mdx-config.ts`.

Plugin pseudocode:

```typescript
export const skillReviewResolverRemarkPlugin = () => (tree, file) => {
  visit(tree, "mdxJsxFlowElement", (node) => {
    if (node.name !== "SkillReview") return;
    if (hasChildren(node)) return;  // explicit-children form; no rewrite

    const target = getAttribute(node, "target");
    if (!target?.startsWith("topic:")) {
      throw buildError(file, node, "non-topic targets reserved for future ADRs");
    }

    const [topicId, cardId] = parseTargetFragment(target);
    const topicFilePath = resolveTopicFilePath(topicId);
    // glob over topics/**/*.mdx (category folders invisible)
    if (!topicFilePath) throw missingTopicError(file, node, topicId);

    const topicAst = parseMdx(topicFilePath);
    const cards = findCardBlocks(topicAst);  // <SkillReview.Card id=...>

    if (!cardId && cards.length > 1) {
      throw ambiguousCardError(file, node, topicId, cards);
    }
    const chosenCard = cardId
      ? cards.find(c => c.id === cardId)
      : cards[0];  // single-card topic auto-picks
    if (!chosenCard) throw missingCardError(file, node, topicId, cardId);

    // Lift the chosen card's slot children into the parent node.
    const promptNode = findSlot(chosenCard, "SkillReview.Prompt");
    const answerNode = findSlot(chosenCard, "SkillReview.Answer");
    if (!promptNode || !answerNode) throw malformedCardError(...);

    node.children = [promptNode, answerNode];
  });
};
```

The plugin is *non-destructive* on explicit-children form: if
the author wrote `<SkillReview ...><SkillReview.Prompt>...
</SkillReview.Prompt><SkillReview.Answer>...
</SkillReview.Answer></SkillReview>` directly in the chapter,
the plugin leaves the node alone. Authors retain inline
authoring for one-off prompts that don't warrant a topic-
registry entry.

### Spec page rendering

A new dynamic route at
`examples/smoke/src/pages/library/topics/[topicId].astro`
renders the topic Spec page. Layout:

- Topic title (`label`) + summary
- Cross-references (linked equations, misconceptions, prereq topics)
- All cards inline, each showing prompt + answer + difficulty hint

The route ignores category folders (Spec page is flat per-topic;
all topics share one URL pattern). Per-card Spec routes are
**deferred to W4c or later** — v1 renders cards inline on the
topic page only.

The Library hub at `/library/index.astro` (shipped in W4a)
gains a Topics card alongside the existing 6 rooms.

### PRA-1 graduation (WARN → ERROR)

PRA-1 (introduced in [Wedge B1](../../plans/2026-05-21-wedge-b1-retrieval-family-design.md),
graduated Unit-aware in [Wedge B-followup W1](../../plans/2026-05-22-wedge-b-followup-design.md))
audits that every `Unit[type=lecture].prereqs[]` topic has a
covering `<SkillReview target="topic:X[#card]" />` in the same
or prior Section. W4b graduates severity from `WARNING` to
`ERROR`.

**Coverage rule:** prereq `topic:X` is "covered" if ANY
`<SkillReview>` callsite in the same or prior Section
references `topic:X` (regardless of card fragment, regardless
of self-closing vs explicit-children form). Cards are
addressing detail; topics are the coverage unit.

**Escape via `audit_overrides`:** per
[ADR 0053 §"audit_overrides chapter frontmatter"](./0053-conformance-failure-modes.md#audit_overrides-chapter-frontmatter),
authors opt out per-callsite:

```yaml
---
title: A unit declaring a prereq with no covering SkillReview
audit_overrides:
  - invariant: PRA-1
    anchor: logarithms
    tdr: TDR-XX
    reason: |
      Deliberate test fixture for W4b — exercises PRA-1's
      audit_overrides path through the graduated ERROR
      severity.
---
```

The mandatory `tdr:` field (per ADR 0053 CF2) means every
override carries its own provenance trail.

## Rationale

The W4b brainstorm (2026-05-23) settled six interlocking
decisions:

### Q1. Single ADR for topic-registry + resolution-pattern

Sophie's convention is to land a platform pattern with its
first user (ADRs 0058, 0060, 0063 all follow this). The
resolution-pattern has no independent existence until topics
arrive; splitting prematurely produces a hollow ADR-0080 with
no concrete shape. Future inheritors (ADR 0044, 0046) revise
this ADR's revision history with their use cases rather than
redefining the pattern. **One ADR, two interlocked sections;
single source of truth.**

### Q2. Plugin location: `@sophie/astro/src/lib/mdx-plugins/`

`@sophie/astro` is Sophie's existing MDX-integration boundary
(`packages/astro/src/mdx-config.ts`). The existing
`pedagogyIndexRemarkPlugin` lives at
`packages/astro/src/lib/pedagogy-index/orchestrator.ts`; the
resolver is structurally a sibling pattern. `@sophie/core` is
type-only (Zod schemas + audit logic), and `@sophie/components`
is framework-pure (no `astro:*` imports per [ADR 0001](./0001-repo-shape.md))
— neither is a home for a plugin that reads MDX from disk. A
new `@sophie/mdx-plugins` package is YAGNI for v1 (one file).
The new `lib/mdx-plugins/` subdirectory names a *family*: the
resolution-pattern's future siblings (misconception, equation
biography) live there too.

### Q3. Design F (sub-grouped flat topics + cards inline)

The brainstorm walked through THREE iterations before landing
on Design F:

- **First iteration (Design A):** one topic = one prompt + one
  answer. Rejected at Q6 brainstorm — real topics (logarithms,
  Newton's 2nd law) have many distinct cards (product rule,
  power rule, change-of-base for logarithms; F=ma, free-body
  diagrams, action-reaction for Newton-2). One-card-per-topic
  doesn't survive contact with real curriculum or FSRS per-card
  scheduling (ADR 0069).
- **Second iteration (Design C):** directory per topic with
  sibling card MDX files. Each card a focused file matching
  ADR 0061's "Write-new over Edit-into-giant" principle.
  Rejected post-draft — *directory-tree busyness*. A real course
  has 30-60 topics; Design C generates 30-60 subdirectories ×
  3-5 card files each, totaling 100-200+ file-system entries
  under `topics/`. VSCode tree-view and `ls` output become
  overwhelming.
- **Third iteration (Design F, this ADR):** sub-grouped flat
  topics + cards inline. Combines:
  - **One file per topic** keeps the file system tractable
    (30-60 files, not 100-200).
  - **Sub-grouped folders** (`math/`, `physics/`, etc.) give
    authors a natural categorical scan-path without imposing
    semantic meaning.
  - **Cards inline as `<SkillReview.Card id="X">` JSX** keeps
    each topic file under ~400 LOC (well within ADR 0061's
    800-LOC budget) while colocating all of a topic's content
    in one editable surface.
  - **Flat pedagogy graph** preserves cross-reference clarity
    (`prereq_topic_ids: [logarithms]` is unambiguous regardless
    of which category folder the topic lives in).

The "math fundamentals contains logarithms" intuition that
motivated Anna's pushback on Design C is satisfied by **bridge
rooms** (ADR 0068 Scale 1): a `Section[type=bridge]` with
`slug: math-fundamentals` contains `Unit[skill]` entities, each
referencing a topic. The umbrella IS a real entity in the
pedagogy graph — at the bridge/section layer, not the topic
layer. Topics stay flat; bridge rooms own the umbrella.

### Q4. Bridge route: `[bridgeSlug].astro` single-param dynamic

`getStaticPaths()` returns one path per Section with
`type: bridge`. Bridge slug derived from `section.yaml`;
display-label override from `course.yaml`. Astro's routing
priority (static > dynamic) means `/library/`, `/units/<u>/...`
beat `[bridgeSlug]`. Per-bridge files (Option C from W4-meta-
plan) would fork the BR-1 slug-uniqueness audit out of
pedagogy-audit into a build step; rejected.

### Q5. PRA-1 graduation lands in this ADR

PRA-1 has no standalone home ADR; its definition lives in
audit code + audit-baseline.md + Wedge B1/B-followup-W1
design docs. ADR 0079 is the natural home for its severity
graduation because PRA-1 enforces topic-registry coverage —
the audit and the registry land together. The graduation also
exercises ADR 0053's `audit_overrides` end-to-end (deliberate
broken-prereq fixture + escape entry in smoke).

### Q6. Bare-topic + multi-card = ERROR

Forcing explicit `topic:X#card` for multi-card topics carves
space for Wedge D's adaptive selection (FSRS-driven card
pick) without retroactively redefining bare-topic semantics.
Loud-with-escape matches Sophie's audit_overrides philosophy:
a curated ERROR naming available cards is itself a UX
affordance (the build tells the author exactly what's
available).

## Alternatives considered

### Alternative A. Topic = one file with one prompt+answer

Original Q3 lock. Simpler; doesn't scale beyond toy topics.
Real curriculum has 3-10 cards per topic; hardcodes 1:1
topic:card assumption that fails at Wedge D's FSRS scheduling.
**Rejected at Q6 brainstorm 2026-05-23.**

### Alternative B. Flat topic files with cards inline (no sub-grouping)

Closest sibling to chosen Design F. Same one-file-per-topic
shape, but all 30-60 topic files in a single flat
`topics/` directory. Loses categorical scan-ability for
authors browsing the registry. **Rejected** — sub-grouping
costs nothing semantically and pays off in author UX at scale.

### Alternative C. Directory per topic with sibling card files

Initially proposed in the W4b ADR-0079 draft on 2026-05-23.
Each card is its own focused MDX file under a topic directory.
Cleanest per-file simplicity; **rejected** when the
directory-tree-busyness cost surfaced — 100-200+ file-system
entries under `topics/` is overwhelming for authors. Design F's
inline cards reduce this to 30-60 files.

### Alternative D. Flat global `cards/` collection + topic-aggregator pointers

Cards globally-unique IDs; topic = YAML with `cards: [...]`
list. Cards can belong to multiple topics (currently no
curriculum need). Split-attention authoring (card content
far from topic metadata). YAGNI. **Rejected.**

### Alternative E. Nested semantic topics (parent-topic + sub-topic + cards)

Anna proposed "math fundamentals topic with logarithms
within it." Three semantic levels: parent topic, sub-topic,
cards. **Rejected** for three reasons:

1. **Duplicates bridge-room affordance.** ADR 0068's bridge
   rooms already provide the umbrella concept at the right
   semantic layer (Section[type=bridge] containing N
   `Unit[skill]` entities). Parent-topics would duplicate this
   one layer down.
2. **PRA-1 coverage becomes ambiguous.** Does
   `prereqs: [math-fundamentals]` mean "covered if any sub-
   topic covered" or "covered if all sub-topics covered"?
   Multi-level coverage rules ripple into more audit
   complexity than the affordance buys.
3. **Cross-cluster topics resist single-home nesting.** In
   ASTR 596, `autodiff` could plausibly nest under
   `jax-fundamentals` OR `multivariate-calculus`. Forcing one
   home over-commits; flat topics with explicit cross-refs
   handles this cleanly.

### Alternative for ADR scope: separate ADR 0080 for resolution-pattern

Cleaner concern separation; risks the resolution-pattern ADR
being defined in a vacuum without a concrete first user.
**Rejected at Q1 brainstorm 2026-05-22.**

## Consequences

### Easier

- **Authoring at course scale.** A 50-topic course produces
  ~50 topic files in 4-6 category folders. Authors browse by
  category; editing a topic = one file edit. Adding a card =
  appending a JSX block to the topic file.
- **`<SkillReview target="topic:..." />` becomes content-
  backed.** Self-closing form resolves to real prompts; no
  placeholder branch in the production renderer (per
  [ADR 0001](./0001-repo-shape.md) framework-purity, the
  resolution stays out of `@sophie/components`).
- **FSRS scheduling (Wedge D) gets per-card history out of the
  box.** `practice_attempt` keys include card fragment; FSRS
  operates on cards, the natural unit.
- **Cross-registry references gain a target.** ADR 0044
  misconceptions, ADR 0046 equation biographies can declare
  `prereq_topic_ids` or `linked_misconception_ids` with real
  resolution.
- **PRA-1 has teeth.** Build fails on uncovered prereqs;
  `audit_overrides` provides per-callsite escape with TDR
  provenance per ADR 0053.
- **Future ADRs inherit the resolution-pattern.** ADRs 0044
  and 0046 amending this ADR's revision history with their
  use cases is cheap; the pattern is one MDX remark plugin
  family.
- **Bridge rooms own the umbrella concept cleanly.** Authors
  thinking "Math Refresher" → "logarithms" / "exponents" /
  "vectors" model this as one bridge room with three
  `Unit[skill]` entries, each referring to a flat topic.

### Harder

- **Two sources of truth for cards.** Topic file frontmatter
  lists `cards: [{id, label, difficulty}]` AND topic body has
  `<SkillReview.Card id="X">` JSX. Authors must keep these in
  sync. **Mitigation:** PRA-2 audit (new) enforces consistency
  at build time — frontmatter card list ↔ body card blocks
  must match exactly, or the build fails.
- **Topic file grows with card count.** A topic with 10 cards
  produces a ~300-400 LOC file. Mitigated by the cap implicit
  in the pedagogical reality (topics rarely exceed 10 cards
  without becoming clusters that warrant being split). Hard
  cap per ADR 0061 LOC budget: 800 LOC; topic files will
  warrant attention if they approach this.
- **Category folders feel like they should be addressable.**
  Authors may intuit `<a href="/library/topics/math/">` should
  list all math topics. **Mitigation:** the Topics Spec page
  at `/library/topics/` lists all topics grouped by category
  (the categories surface in the rendered listing, just not in
  URLs).
- **Bare-topic ambiguity ERROR is one more author surface
  to learn.** Mitigated by the curated error message naming
  available cards — error is itself a teaching affordance.

### Triggers (follow-on work)

- **W4b implementation** (this wedge): topic registry shipped;
  one smoke topic per existing prereq; resolver plugin landed;
  PRA-1 graduated; PRA-2 (frontmatter↔body card consistency)
  added; bridge rooms (Scale 1).
- **W4c (next wedge):** topic Spec pages get the
  `<LibraryCollectionShell>` chrome; observable/model/inference
  rollups land via OMIFlowEntry; per-card Spec routes added if
  curriculum demands them.
- **Wedge D (FSRS scheduling):** introduces adaptive bare-
  topic selection. Bare `topic:X` (multi-card) gains a
  defined non-ERROR meaning (FSRS picks weakest card).
- **ADR 0044 misconception interventions:** likely add a
  `<MisconceptionRef target="misc:foo" />` self-closing form;
  ADR 0079's resolution-pattern is the natural target.
- **ADR 0046 equation biographies:** `<EquationRef refId="...">`
  may want a self-closing form that auto-fills biography
  fields. Same plugin family.
- **Wedge E BKT mastery:** per-card mastery scores; card-level
  prominence adjustment in `<SkillReview>` display.

## Implementation notes

- **Astro content-collection config** (`examples/smoke/src/
  content.config.ts`): add `topics` collection (type: content,
  schema: `TopicEntrySchema`, loader: glob
  `topics/**/*.mdx` — `**` catches category subdirs).
- **`@sophie/core` schema files:**
  `packages/core/src/schema/pedagogy-index-entries/topic.ts`
  (new) + `card.ts` (new). Exports added to the entries
  barrel.
- **`@sophie/astro` accumulator + extractor:** new extractor
  walks the topics content collection; emits `TopicEntry[]`
  from frontmatter + `CardEntry[]` from inline JSX
  `<SkillReview.Card>` blocks into `PedagogyIndex`. Two new
  accumulator methods.
- **`@sophie/astro` MDX plugin:**
  `packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`
  (new file). Wired into `sophieMdxOptions.remarkPlugins` in
  `mdx-config.ts` (after `remarkMath`, before
  `pedagogyIndexRemarkPlugin` so the resolved children get
  walked by the index extractor too).
- **`@sophie/astro` audit:** `retrieval-family.ts` PRA-1
  severity flipped to `ERROR`; `audit_overrides` honored per
  ADR 0053. New PRA-2 invariant for frontmatter↔body card
  consistency. Tests updated.
- **Bridge route:** `examples/smoke/src/pages/[bridgeSlug].astro`
  (new file) with `getStaticPaths()` querying sections
  collection for `type: bridge`. Reuses `<Section>` chrome.
- **BR-1 audit invariant:** new invariant file in
  `packages/astro/src/lib/pedagogy-audit/invariants/`. Checks
  bridge-slug uniqueness across Sections + bridge rooms +
  reserved Library paths (`library`, `sections`, `units`,
  `topics`).
- **Smoke fixture (`examples/smoke/`):**
  - `src/content/topics/math/logarithms.mdx` — topic file with
    2-3 cards inline, exercising multi-card selection.
  - `src/content/topics/math/exponents.mdx` — single-card
    topic, exercising auto-pick.
  - One existing chapter MDX swaps explicit-children
    `<SkillReview>` → self-closing form, exercising resolver.
  - One bridge section (`src/content/sections/foundations/
    section.yaml` with `type: bridge`) + a Unit[skill]
    referencing one of the topics.
  - One deliberately-broken Unit with
    `audit_overrides: [{invariant: PRA-1, ...}]` demonstrating
    the escape path.
- **Library hub update:** `examples/smoke/src/pages/library/
  index.astro` adds Topics tile in the rooms list.
- **Docs:** `chapter-components.md` adds Topics-room author
  guidance + `<SkillReview target="topic:..." />` self-closing
  documentation; `audit-baseline.md` updates PRA-1 row +
  adds BR-1 + PRA-2 rows.

## References

- [Wedge B-followup W4 meta-plan](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md)
  — locks Meta-Q0 (W4 sub-wedge split) + Q1–Q6 (decisions this
  ADR implements)
- [W4a pilot report](../pilots/wedge-b-followup-w4a-library-routes.md)
  — Library room route migration (predecessor sub-wedge)
- [ADR 0068](./0068-bridge-rooms-and-prereq-pedagogy.md) §
  "Shared pedagogy graph" — topic_id as the pedagogy-graph
  identifier; bridge rooms own the semantic umbrella
- [ADR 0053](./0053-conformance-failure-modes.md) §
  "audit_overrides" — three-grain override semantics with
  mandatory `tdr:` provenance
- [ADR 0061](./0061-ai-optimized-codebase-design.md) — topic
  file as focused-file unit; LOC budget 800 hard cap
- [ADR 0070](./0070-library-room-and-registry-spec-pages.md)
  — `/library/topics/` URL convention (amended in W4a)
- [ADR 0069](./0069-fsrs-spaced-repetition-engine.md) — FSRS
  per-card scheduling (cards-as-leaf precedent)

## Revision history

### 2026-05-23 — Wedge B-followup W4c: PRA-2 graduation + Topic Spec card-body inline rendering

W4c extends the W4b PRA-1 graduation pattern to PRA-2 (both
directions), inlines the Topic Spec card bodies via a resolver-
helper export, and fixes a latent W4b a11y bug on the Topic Spec
landmark.

**PRA-2 graduated to honor `TopicEntry.audit_overrides`.** Per
[ADR 0053](./0053-conformance-failure-modes.md), both directions
of the PRA-2 audit (extractor body→frontmatter; audit-invariant
frontmatter→body) check `topic.audit_overrides ?? []` before
emitting a finding. A per-card override entry of the shape
`{ invariant: "PRA-2", anchor: <card-id> }` suppresses the
finding for that specific card. This mirrors the PRA-1 W4b shape
exactly — same lookup helper, same `tdr:` provenance requirement
per [ADR 0053 CF2](./0053-conformance-failure-modes.md), same
end-to-end smoke coverage.

**Per-card anchor only — strict per W4c D5.** Unlike PRA-1 (which
honors both Grain 1 / no-anchor and Grain 2 / specific-anchor
overrides), PRA-2 is intentionally strict: only Grain 2
(per-card anchor) is honored. A whole-topic PRA-2 wildcard would
swallow the entire class of frontmatter↔body drift bugs PRA-2
exists to catch — defeating the audit's purpose. The narrowing is
documented at the override callsite via the new
`PRA-2-grain` WARNING (below) so authors get a signal instead of
silent suppression failure.

**New `PRA-2-grain` WARNING.** Grain-1 PRA-2 override attempts
(an override entry with `invariant: "PRA-2"` but no `anchor:`
field) surface as a WARNING naming the affected topic plus the
override callsite. The WARNING explicitly directs the author to
either provide a `anchor: <card-id>` field (the supported shape)
or remove the override entirely. Closes Batch 2 Task 2.3+2.4
reviewer's Important I1.

**Topic Spec page renders card Prompt + Answer body inline (N5
fix).** The W4b R+CR identified N5 — the Topic Spec page rendered
only card metadata (id, label, difficulty), not the actual
Prompt/Answer body content — as a deferred concern. W4c closes it.
A new helper `renderTopicCardSlotsToHtml(topicsDir, topicId)`
is exported from `packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`
and reuses the resolver's slot-extraction logic (W3 — touch only
what you must; the resolver already walks topic MDX and lifts
slot children, so the Topic Spec page consumes that same path
instead of duplicating). The exported helper returns
`{ promptHtml, answerHtml }[]` keyed by card id; the Topic Spec
page template renders each card's prompt + answer inline beneath
the card metadata.

**Topic Spec landmark fix: `<article>` → `<section
aria-labelledby>`.** The W4b Topic Spec page wrapped its content
in an `<article>` element. `<article>` is not a landmark in the
WAI-ARIA landmark roles taxonomy — it provides a self-contained
composition role but does not appear in screen-reader landmark
navigation. The latent a11y bug was caught by Batch 8 axe
coverage (the new TopicSpecContent.axe.test.ts asserts a
nameable region landmark). The fix changes the wrapper to
`<section aria-labelledby={headingId}>` — matching the W4c Task
4.6 CourseObjectives fix and the W4c Task 3.1
LibraryCollectionShell pattern. One consistent landmark
discipline across the entire Library surface.

**Smoke fixture: PRA-2 audit_overrides end-to-end demo.** A
deliberately-orphan card in `examples/smoke/src/content/topics/
math/logarithms.mdx` carries a matching `audit_overrides` entry
with `invariant: PRA-2`, `anchor: <orphan-card-id>`, and a `tdr:`
provenance field. The smoke build emits zero PRA-2 findings for
the orphan card (override honored) while continuing to emit
PRA-2 findings for any *other* orphan introduced during
authoring (override scope correctly limited to the named anchor).
Batch 9.3.

**Companion ADRs.** [ADR 0070 W4c entry](./0070-library-room-and-registry-spec-pages.md#id-2026-05-23-wedge-b-followup-w4c-shell-extraction-3-omiflow-rooms-8-per-entry-spec-routes)
documents the broader Library shell extraction + 8 per-entry
Spec routes; [ADR 0058 W4c entry](./0058-epistemic-component-contract.md#id-2026-05-23-wedge-b-followup-w4c-observable-model-inference-rollup-chrome-per-callsite-spec-routes)
documents the Observable/Model/Inference rollups.
