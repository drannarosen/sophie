---
status: accepted
date: 2026-05-13
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [pedagogy, content, mdx, remark, indexing, schema-driven]
---

# ADR 0038: Pedagogy index pattern + role-aggregation principle

## Context

[Bucket B PR 6 (#35)](https://github.com/drannarosen/sophie/pull/35)
shipped `<Aside kind="definition" title="X">` as the canonical
inline-margin definition primitive. The post-merge brainstorm on
2026-05-13 (captured in
[the Bucket C overview](../../plans/2026-05-13-bucket-c-pedagogy-index-overview.md))
surfaced a larger architectural opportunity than "use asides for
glossaries": every structured pedagogy component can become an
**extractable source**, and every downstream surface (chapter
glossary, course glossary, hover popover, cross-reference preview,
audit invariant, learning-objective coverage map) is a *view* of a
single build-time index.

[ADR 0036](0036-define-preference-factory-pattern.md) locked the
analogous factory pattern for **chrome state**: one factory,
many primitives, uniform invariants. This ADR locks the analogous
pattern for **content extraction**: one remark plugin, many
roles, uniform consumers.

[ADR 0030](0030-audience-and-ai-author-model.md) committed Sophie
to AI-as-primary-author with instructor-as-supervisor. That model
requires structured authoring surfaces: AI authors write
`<Aside kind="definition">`, not `<dl class="glossary">`. This
ADR is the architectural mechanism that makes the AI-authored
structure *do work* — turning each authored component into rendered
chapter content, into a course-wide index entry, into a hover
popover preview, into a build-time audit assertion, simultaneously.

## Decision

Sophie's content layer extracts structured pedagogy components
into a single build-time `PedagogyIndex` aggregated by
**pedagogical role**, not by source component type. The index
lives in `@sophie/core`; a custom remark plugin in
`@sophie/astro` populates it during MDX parse; consumers
(Astro components, React popovers, audit checks) read it via a
Vite virtual module.

### Role-aggregation principle

Index collections aggregate by **role** (definition / equation /
key-insight / figure / misconception / objective / ...), not by
**source component**. The remark plugin's job is "find every
component that carries a pedagogical role; tag with role +
source-component metadata."

| Role | Source component(s) | Index collection |
| --- | --- | --- |
| definition | `<Aside kind="definition">` | `definitions` |
| equation | `<KeyEquation>` | `equations` |
| key-insight | `<Aside kind="key-insight">` | `keyInsights` |
| figure | `<Figure>` (registry mode) | `figures` |
| misconception | `<Aside kind="misconception">` (short) OR `<Callout variant="misconception">` (long) | `misconceptions` (with `length: "short" \| "long"` discriminator) |
| objective | `<LearningObjectives>` | `objectives` |

Consequences of the principle:

- **A single role can have multiple source types.** Misconceptions
  surface today via both Aside (short, marginal flag) and Callout
  (long, multi-paragraph contrast). Both feed `pedagogyIndex.misconceptions`
  with a length discriminator. `<ChapterMisconceptions />` renders
  both with visual distinction.
- **A single source component can carry multiple roles.** `<Aside>`
  emits to `definitions` (kind="definition"), `keyInsights`
  (kind="key-insight"), and `misconceptions` (kind="misconception").
  The role is selected by the `kind` discriminator.
- **Adding a new role is a uniform three-step change.**
  (a) Add the source-component variant (e.g. a new `kind` value
  on `<Aside>` or a new `variant` value on `<Callout>`);
  (b) extend the remark plugin to recognize it and emit to a new
  index collection; (c) build the chapter + course consumers
  + (optionally) inline reference component + audit invariants.

### Index schema

The full schema lives in
[`packages/core/src/schema/pedagogy-index.ts`](../../../packages/core/src/schema/pedagogy-index.ts)
(materialized in PR-C1). Each entry carries enough metadata to
render the entry, back-link to its source (chapter + DOM anchor),
support cross-references by canonical slug, and sort/group
consistently across consumers. The overview doc
(§"Pedagogy index schema (FINAL — round 2)") is the schema's
prose specification.

### Source → index → consumer pipeline

```
            ┌────────────────────────────┐
            │   MDX chapter source       │
            │  (canonical, AI-authored)  │
            └──────────────┬─────────────┘
                           │ remark plugin walks AST
        build-time         │
                           ▼
            ┌────────────────────────────┐
            │   PedagogyIndex            │
            │  (one per build; in        │
            │   @sophie/core's shape)    │
            └──────────────┬─────────────┘
                           │ Vite virtual module
        render-time        │ `virtual:sophie/pedagogy-index`
                           ▼
       ┌───────────┬───────┴───────┬────────────┐
       ▼           ▼               ▼            ▼
  <Chapter*/>  <Course*/>     <*Ref/>          Audit
  consumers    consumers      <GlossaryTerm/>  invariants
```

### Each new role adds four things (or fewer)

1. A source-component variant: a new `kind` value on `<Aside>`,
   a new `variant` value on `<Callout>`, or (rarely) a new
   structured component.
2. An entry type in `packages/core/src/schema/pedagogy-index.ts`.
3. Extractor logic in
   `packages/astro/src/lib/pedagogy-index-extractor.ts` —
   typically ~20 LOC matching AST shape + extracting fields.
4. Chapter + (optionally) course consumer components,
   inline reference component, audit invariants. Some roles
   omit the course consumer or the inline reference.

The extractor and schema are extension points; the consumer
surface scales with how a role is actually used in chapters.

### Index access at runtime

Consumers read the index via a Vite virtual module exposed by
`@sophie/astro`:

```ts
import { definitions, equations } from "virtual:sophie/pedagogy-index";
```

The remark plugin populates an in-module accumulator during MDX
parse; the Vite plugin resolves the virtual module ID from that
accumulator. Vite's HMR invalidates the virtual module when any
chapter MDX re-parses, so dev-mode consumers see fresh data
without a hand-rolled cache-invalidation API.

## Rationale

- **One canonical source, many surfaces.** A definition is
  authored once as `<Aside kind="definition" title="...">` and
  rendered four ways: in the chapter at its first-mention site
  (docked margin note per PR 6), in `<ChapterGlossary />`
  (alphabetical at the chapter top), in `<CourseGlossary />`
  on `/glossary` (alphabetical across all chapters), and in
  `<GlossaryTerm name="...">` inline references as hover
  popovers. Authors don't maintain a parallel glossary registry.
- **Schema-driven authoring is the AI-author surface.**
  [ADR 0030](0030-audience-and-ai-author-model.md) commits Sophie
  to AI authoring against structured components. This ADR is the
  mechanism by which AI-authored structure produces navigation
  surfaces "for free." AI authors don't write glossary HTML —
  they write definition asides, and the platform produces
  glossaries.
- **Role-aggregation captures real pedagogical patterns.**
  Misconceptions naturally surface in two forms (a one-line
  flag vs. a multi-paragraph contrast); a type-keyed index
  would split them across `asides` and `callouts`, losing the
  pedagogical unity. Role-aggregation keeps the index axis
  aligned with what a reader actually wants to navigate.
- **Audit invariants become uniform.** Duplicate-term detection,
  orphan-reference detection, broken cross-references — all
  fall out of the single index without per-component audit
  logic. Future invariants extend the same pattern.
- **Documentable for AI authors.** "To add a new pedagogical
  category, define an entry type + extractor + consumers" is
  one-paragraph onboarding, analogous to ADR 0036's "to add a
  new chrome preference, call the factory."

## Alternatives considered

- **Per-component author-passed data (the MiniGlossary
  pattern).** Each glossary block carries its own
  `terms={[...]}` prop. Rejected: forces dual authoring (define
  in prose + repeat in glossary props); guarantees
  drift; no cross-chapter reuse; no audit surface. Was a
  pre-pedagogy-index placeholder; deprecates in PR-C1.
- **Type-keyed index collections** (`asides` / `callouts` /
  `equations` rather than `definitions` / `misconceptions` /
  `equations`). Rejected: misconceptions span two source types;
  type-keyed indices would split a single pedagogical role
  across collections. Role-aggregation is the load-bearing
  axis.
- **Frontmatter-based glossary registry.** Each chapter's
  frontmatter lists terms it defines. Rejected: no link to
  prose anchor; manual maintenance; doesn't scale to
  equations / figures / key-insights without bloating
  frontmatter. Schema-by-frontmatter doesn't compose.
- **Compile-time codegen** that generates a TS module from
  MDX scan results. Rejected: file-on-disk side effects (which
  to gitignore?); two-pass build (codegen → typecheck → build);
  fights Astro/Vite's existing build pipeline. The remark
  plugin + virtual module path is in-band with the toolchain.
- **Runtime extraction** (parse rendered HTML in the browser).
  Rejected: defeats SSR; the index can't be used at build time
  for audits; popover hovers require client-side parsing on
  every page; performance and correctness regressions.

## Consequences

**Easier:**

- PR-C2 (equations index) is a near-mechanical extension:
  add `EquationEntry` type, extract from `<KeyEquation>`
  AST nodes, build `<ChapterEquations />` + `<CourseEquations />`
  + `<EqRef />`. The pattern is established by PR-C1.
- PR-C3 (key-insights + figures + misconceptions) extends
  the same pipeline; the role-aggregation principle is
  *load-bearing* here — `<Aside kind="misconception">` and
  `<Callout variant="misconception">` both target the same
  collection.
- PR-C4 (LO course roll-up + audit invariants) closes the
  audit surface: undefined-term references, orphan
  definitions, intra-chapter slug collisions, duplicate
  term slugs across chapters. Each invariant is one
  function over the populated index.
- Future Phase 2/3 features (concept maps, flashcard export,
  AI quiz authoring) consume the index without re-parsing
  MDX.

**Harder:**

- The remark plugin is now load-bearing for every chapter
  build. Regressions in the plugin block the whole build —
  not the worst failure mode (CI catches it), but it's a
  single chokepoint. Mitigation: plugin has its own pure-
  function unit tests on synthetic AST inputs; integration
  is covered by smoke target e2e.
- Adding a new role means updating four things in lockstep
  (schema + extractor + consumer + audit). The four-step
  cadence is documented in this ADR; future contributors
  (AI or human) need to follow it. Mitigation: AI scaffolding
  per ADR 0030 can template the four-step change.
- Body content is captured as pre-rendered HTML strings
  (overview decision #11). Loses nested interactivity — a
  definition aside can't contain a `<Predict>`. Accepted
  trade-off: definitions shouldn't be interactive; consumer
  simplicity wins.

**Triggers:**

- PR-C1 (definitions index + 3 consumers + Aside title
  refinement + MiniGlossary deprecation) is the first
  instance of the pattern. Lands the schema, the extractor,
  the virtual module, and the three definition consumers.
- PR-C2 (equations) extends the pattern with no new
  infrastructure decisions.
- PR-C3 (key-insights + figures + misconceptions) exercises
  the role-aggregation principle directly via misconceptions'
  dual source.
- PR-C4 (LO course roll-up + audit invariants) closes the
  loop with build-time invariants over the populated index.
- Bucket B PR 7 (faceted search) consumes the index for
  search filters and structured preview cards.
- Future ADR (Phase 3 AI authoring runtime): the schema in
  this ADR is the surface AI authors target.

## References

- [Bucket C overview](../../plans/2026-05-13-bucket-c-pedagogy-index-overview.md)
  — round-1 + round-2 brainstorm; locked schema; locked PR
  sequence. This ADR codifies that overview's architectural
  principle.
- [ADR 0030](0030-audience-and-ai-author-model.md) — AI-as-
  primary-author model. This ADR is its concrete mechanism.
- [ADR 0031](0031-compound-component-layout-primitives.md) —
  compound components. Source components are leaves; index
  entries are their canonical projection.
- [ADR 0036](0036-define-preference-factory-pattern.md) — the
  analogous factory pattern for chrome state. This ADR is
  the content-layer twin.
- [PR #35](https://github.com/drannarosen/sophie/pull/35) —
  the `<Aside>` primitive whose definition kind became the
  first indexed source.
- [`packages/core/src/schema/pedagogy-index.ts`](../../../packages/core/src/schema/pedagogy-index.ts)
  — the schema (materialized in PR-C1).
- [`packages/astro/src/lib/pedagogy-index-extractor.ts`](../../../packages/astro/src/lib/pedagogy-index-extractor.ts)
  — the remark plugin (materialized in PR-C1).
