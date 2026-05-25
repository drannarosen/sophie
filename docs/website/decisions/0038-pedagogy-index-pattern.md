---
date: 2026-05-13T00:00:00.000Z
tags:
  - pedagogy
  - content
  - mdx
  - remark
  - indexing
  - schema-driven
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/pedagogy-index-extractor.test.ts
      date: "2026-05-13"
      notes: "Extractor coverage: definitions, equations, key insights, misconceptions, objectives, inline-refs, figures."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit.test.ts
      date: "2026-05-15"
      notes: "Audit coverage: D4/D5/E4/F1/F2/F4/C1/O1/O2/K1/MG1/MG2/CS2/V0–V8 (~80 test cases)."
    - kind: test
      ref: packages/core/src/schema/pedagogy-index.test.ts
      date: "2026-05-12"
      notes: "Schema-level shape guarantees for the index."
    - kind: chapter
      ref: examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx
      date: "2026-05-14"
      notes: "1347-line real chapter populates the pedagogy index end-to-end (definitions + equations + key insights + objectives + inline-refs) via the smoke build."
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-audit/runner.ts
      date: "2026-05-15"
      notes: "Audit invariants V0–V8 (this ADR's pattern extended for ADR 0056)."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
    - kind: test
      ref: packages/components/src/components/GlossaryTerm/GlossaryTerm.test.tsx
      date: "2026-05-25"
      notes: "Amendment 2 — useHydrated SSR-gate convention. `renderToString` test asserts SSR snapshot emits bare children (no <a class=trigger>, no Radix machinery) even when the store resolves the term."
    - kind: test
      ref: packages/components/src/components/KeyEquation/KeyEquation.test.tsx
      date: "2026-05-25"
      notes: "Amendment 2 gate test — SSR snapshot emits framing prose only (no <section>/<header>/<details>) even when the equation refId resolves."
    - kind: test
      ref: packages/components/src/components/EquationRef/EquationRef.test.tsx
      date: "2026-05-25"
      notes: "Amendment 2 gate tests — children-form and self-closing form both emit bare fallback at SSR."
    - kind: test
      ref: packages/components/src/components/FigureRef/FigureRef.test.tsx
      date: "2026-05-25"
      notes: "Amendment 2 gate test — SSR emits bare children even when figure-registry + figure-usages resolve."
    - kind: test
      ref: packages/components/src/components/ChapterRef/ChapterRef.test.tsx
      date: "2026-05-25"
      notes: "Amendment 2 gate tests — children-form and self-closing form both emit bare fallback at SSR despite the artifact/unit/section chain resolving."
    - kind: chapter
      ref: /Users/anna/Teaching/astr201/pilots/lecture-02-tools-of-the-trade.md
      date: "2026-05-25"
      notes: "Amendment 2 cross-repo verification: astr201 (first file:-packed consumer) prod console at /units/lecture-02-foundations/reading/ confirmed 0 × React #418 after re-pack. Pre-fix baseline was 12 errors (9 × GlossaryTerm + 3 × KeyEquation, pinned via unminified-React diagnostic build)."
  notes: "The pedagogy-index pattern is the load-bearing reference architecture for ADRs 0042/0043/0044/0045/0056; pattern itself is validated, downstream consumers ship in tranches (see 0044/0045/0046 in-progress). Amendment 2 (2026-05-25) added the `useHydrated`-at-top SSR-gate convention covering the five store-gated components, defending the whole class against the packed-copy SSR-ordering hazard."
---

# ADR 0038: Pedagogy index pattern + role-aggregation principle

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

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
   `packages/astro/src/lib/pedagogy-index/orchestrator.ts` —
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
  on `/library/glossary` (alphabetical across all chapters), and in
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
  + `<EquationRef />`. The pattern is established by PR-C1.
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

## Revisions (2026-05-13 — post-PR-C1)

Three implementation realities surfaced during
[PR #36](https://github.com/drannarosen/sophie/pull/36) that this
ADR's Decision section should be read alongside. None invalidate
the pattern; one narrows the recommended access mechanism, the
others document lessons learned for PRs C2–C4.

### Virtual module bypassed on the chrome critical path

The Decision section names `virtual:sophie/pedagogy-index` as the
consumer access mechanism. In practice, Vite caches the virtual
module's first `load()` result, and that load fires BEFORE
chapter MDX parses — yielding an empty index cached for the rest
of the build.

The shipped pattern: `<TextbookLayout>` forces `render(chapter)`
on every chapter (which triggers the remark plugin → populates
the accumulator), then reads `indexAccumulator.asPedagogyIndex()`
directly and seeds the `@sophie/components` glossary store via
`__setGlossaryDefinitions(...)`. The Vite plugin + virtual module
remain in `@sophie/astro` as a portable read-only surface for
future consumers; the chrome layer takes the direct route.

**Implication for PR-C2+**: equation / key-insight / figure /
misconception consumers should follow the same direct-read
pattern via the accumulator's typed snapshot, not via virtual
module imports. The role-aggregation principle is unchanged.

### Accumulator state must live on `globalThis`

The "module-level singleton accumulator" framing in the Decision
section underspecified an Astro 6 / Vite 7 reality: separate
client + SSR build environments run in the same Node process,
each with its own module-resolution graph. A naive
`const map = new Map()` at module scope produces TWO independent
maps — one written by the MDX-parsing pass, one read by the
page-rendering pass. The accumulator stores its state on
`globalThis` (genuinely per-process; bridges environments).
Future role accumulators must do the same.

### SSR-to-client data transfer requires a `<script>` tag

The setter `__setGlossaryDefinitions(entries)` populates the
React-side store on SSR — but server-side module state doesn't
survive to the wire. The shipped solution: `<TextbookLayout>`
also emits a `<script id="sophie-pedagogy-definitions"
type="application/json">[…]</script>` payload; the store auto-
hydrates from this tag on first client-side lookup. Without it,
inline references like `<GlossaryTerm>` SSR correctly but
rerender as bare prose after React hydration.

**Implication for PR-C3+**: any inline reference component
(`<EquationRef>`, `<FigureRef>`, `<ChapterRef>`) that requires
client-side lookup needs the same script-tag-plus-auto-hydrate
pattern. Generalize the script tag to carry the full
`PedagogyIndex` shape (definitions today; add equations,
key-insights, figures, misconceptions as their roles ship).

### Interaction-model addendum: `<GlossaryTerm>` uses HoverCard, not Popover

Decision #13 from the [Bucket C overview](../../plans/2026-05-13-bucket-c-pedagogy-index-overview.md)
spells the design as "hover shows definition; click navigates."
That's `@radix-ui/react-hover-card` semantics — not Popover.
Radix `Popover.Trigger asChild` over an `<a>` made click both
navigate AND toggle popover (they fight each other in real
browsers; unit tests passed only because JSDOM doesn't follow
href). PR-C1 ships `@radix-ui/react-hover-card@^1.1.16` for
`<GlossaryTerm>`'s trigger.

**Implication for PR-C2+ cross-ref components**: same primitive
choice. `<EquationRef>`, `<FigureRef>`, `<ChapterRef>` all want hover-
preview semantics; HoverCard is the right Radix primitive.
Authors mark each usage `client:load` so React hydration
attaches the pointer handlers (consistent with `<Predict>`,
`<ConfidenceCheck>`, `<InteractiveCallout>` already in the
chapter MDX).

(adr-0038-revisions-pr-c2-c3-c4)=
## Revisions (2026-05-14 — post-PR-C2 / PR-C3 / PR-C4)

Five further implementation realities surfaced across the rest of
Bucket C (PR-C2 [equations + `<EquationRef>`], PR-C3 [key-insights +
figures + misconceptions + factory refactor], the PR-C3 closeout
audit [#39], and PR-C4 [chapters + `<ChapterRef>` + LO course
roll-up + systematic build-time audit invariants]). They refine
the patterns laid down in §1 (Revisions, post-PR-C1) and codify
conventions every future role addition should inherit.

### `createPedagogyStore<T>` factory replaces per-store boilerplate

PR-C1 and PR-C2 each hand-rolled a store with the same shape:
an `set(entries)` SSR-side setter, a `lookup(key)` client-side
reader, and auto-hydration from a `<script id="sophie-pedagogy-*">`
tag on first lookup. By PR-C3 the duplication crossed the DRY
threshold (third callsite); the role-aggregation principle says
one factory covers every role.

PR-C3 ships `createPedagogyStore<T>(scriptId, keyFn)` returning
`{ set, lookup }`. PR-C3 migrates the existing definitions-store
and equations-store; figure-registry, figure-usages, key-insights,
and misconceptions stores all wrap the factory directly. PR-C4
adds `chapters-store`, `modules-store`, and `objectives-store`
through the same factory with zero new patterns.

**Implication for future roles**: never hand-roll the
SSR-set / CSR-lookup / script-tag-hydrate triple. Pass `(scriptId,
keyFn)` to the factory; export the resulting setter as
`__set${RoleName}`; consumers call `${roleStore}.lookup(key)`.

### Two-tier figures model: asset registry vs. usage records

PR-C3's `<Figure>` source component surfaced a model the §1
revisions didn't anticipate: figures have a *registry* (assets
known to the consumer chapter — `src`, `alt`, `caption`,
`credit`) and *usages* (where the chapter prose actually invokes
each figure — `<Figure name="X">` and `<FigureRef name="X">`).
These are two different concerns over the same namespace.

The shipped pattern: `figureRegistry: ReadonlyArray<FigureRegistryEntry>`
is consumer-global (set once at TextbookLayout SSR from the
consumer's `content/figures.ts`); `figureUsages: ReadonlyArray<FigureUsageEntry>`
is per-chapter (extracted from the MDX walk). The build-time
audit (PR-C4) joins them: F1 errors when a usage references a
name not in the registry; F2 errors when an inline reference
points at an unregistered name; F4 warns when a registry entry
has zero usages.

**Implication for future role pairs**: when a role has both
declarative metadata (the asset) and call-site usages (where it's
referenced), split into a `registry`-style consumer-global
collection and a `usages`-style per-chapter collection on
`PedagogyIndex`. The audit reconciles them.

### SSR setters ship uniformly even when no React consumer exists in v1

By PR-C3 the accumulator was emitting six collections; only four
had React-rendered inline-ref consumers (definitions, equations,
figure-registry, figure-usages). Key-insights and misconceptions
were indexed but only read by server-rendered chapter / course
consumers (Astro `<ChapterKeyInsights>`, `<CourseMisconceptions>`).
The setter pattern is uniform anyway: `__setKeyInsights` and
`__setMisconceptions` are exported, called by TextbookLayout,
and feed script-tag JSON payloads — even though no React store
consumes them in v1.

**Why uniform**: pattern parity matters more than completeness.
The marginal cost of an unused setter is two lines (one
`__setX(pedagogy.X)` call + one `<script id="sophie-pedagogy-X">`
tag). The marginal benefit is that future consumers (Bucket B
PR 7 faceted search; PR-C4 audit invariants reading
`inlineRefUsages`) don't have to bootstrap the plumbing.

PR-C4 inherits this convention: `__setChapters`, `__setModules`,
and `__setObjectives` all ship. `chapters` has a React consumer
(`<ChapterRef>` hover preview); `modules` is joined into the
ChapterRef hover preview; `objectives` is currently SSR-only but
ready for future inline-ref shapes.

### ADR 0027 conflict caught at design-doc time (PR-C4 Task 4)

PR-C4's original design draft proposed `useChapterContext` for
reading `course` and `chapter` inside the refactored
`<LearningObjectives>`. [ADR 0027](./0027-mdx-render-boundary-prop-threading.md)
explicitly forbids context propagation into MDX-rendered React
components — each gets its own `renderToStaticMarkup` SSR pass
outside any `client:load` parent's React tree, so context
providers don't reach them. The implementer caught the conflict
*before* writing code; the design doc was corrected on main
(`6fa48d8`) before any implementation work proceeded.

**Implication for future role refactors**: the
`(course, chapter, …)` props that thread through every
persistence-bearing component aren't ergonomic boilerplate to
be eliminated via "global context provider" patterns. They're
the ADR-0027-mandated shape. Any proposal to source these from
hooks or context inside MDX-rendered components is a
super-ADR-0027 architectural change requiring its own ADR.

### Audit pass is a separate concern; `AuditReport` is the contract

PR-C4 ships `runPedagogyAudit(index: PedagogyIndex): AuditReport`
as a pure function — reads the index, returns findings with
`{ errors, warnings, info }` severity levels (accumulate-and-
report, exit code reflects ERROR presence). No annotations on
index entries; audit output is a discrete object. The Bucket B
PR 7 faceted search will call `runPedagogyAudit(index)` for
facet data (e.g., "show me orphan defined terms") without
back-coupling.

**Two practical surprises during PR-C4 integration**:

- **Audit-call timing**: `runPedagogyAudit` runs inside
  `TextbookLayout.astro`'s frontmatter, *after* `render(chapter)`
  Promise.all (which triggers MDX parsing → populates accumulator).
  Reading `indexAccumulator.asPedagogyIndex()` from a *page*
  frontmatter (e.g., `examples/smoke/src/pages/library/objectives.astro`) yields empty arrays
  because Astro evaluates page frontmatter before child-component
  frontmatter. Pages consume the index via a child component
  slotted into `TextbookLayout` (the established `<Course*>`
  pattern; PR-C4 follows it with `<CourseObjectives>`).
- **MDX prop typecheck is not enforced at build**: dropping a
  required prop from a schema (e.g., `objectives[]` from
  `<LearningObjectives>`) doesn't fail `pnpm --filter smoke
  build` even when the smoke chapter still uses the old shape —
  Astro doesn't typecheck MDX prop shapes at build. Schema
  breakages must be caught at consumer migration time (or by a
  future remark plugin that validates MDX prop shapes against
  `@sophie/core` schemas). Worth a forward-looking audit
  invariant.

### SoTA testing pattern surfaces a real production bug (PR-C4 closeout)

E2E tests in early Bucket C waited on `networkidle` or arbitrary
`{ timeout: N }` knobs. Phase 1 (#39) replaced `networkidle`
with the scoped `data-react-hydrated="true"` attribute wait.
PR-C4 closeout took the next step: condition-based waiting on
Radix HoverCard's `data-state="open"` / `data-state="closed"`
attributes (the deterministic state-machine signal), with no
timeout knobs.

**The SoTA-not-simple thesis paid off**: switching the in-page
ToC scroll-spy test from `waitForTimeout(150)` to
`expect(tocLink).toHaveAttribute("aria-current", "location")`
exposed a latent production bug. The scroll-spy observed every
`h2[id]` inside `.sophie-content`, including the
`<LearningObjectives>` heading (added by PR-C4's children-mode
refactor for axe-region naming) that had no corresponding ToC
link. When the observer fired on that orphan heading, it cleared
`aria-current` on every link. Naive `waitForTimeout` made the
test pass through pure luck; condition-based waiting forced the
fix. Production fix: invert source of truth — observe only
headings that have a corresponding ToC link, not all chapter
headings.

**Implication for every future test**: replace timing-based
waits with condition-based waits whenever a deterministic
observable state exists. Test correctness is downstream of
production correctness; SoTA test patterns expose latent
production bugs that simple timing patterns hide.

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
- [`packages/astro/src/lib/pedagogy-index/orchestrator.ts`](../../../packages/astro/src/lib/pedagogy-index/orchestrator.ts)
  — the remark plugin (materialized in PR-C1).

## Revisions (2026-05-18 — Registry ecosystem amendment)

[ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md) names a
second source for pedagogy-index content. The pedagogy index now
aggregates from **two patterns** at the consumption layer.

### R1 — Pedagogy index aggregates registry + collection sources

Pre-0060: every pedagogy-index entry came from chapter-inline MDX,
extracted by `pedagogy-index-extractor` at build time. The extractor
walked the MDX AST and populated `PedagogyIndex.{equations,
misconceptions, definitions, keyInsights, …}` from chapter content.

Post-0060: equations and figures migrate to the registry pattern
(per-entry MDX files in `src/content/equations/` and
`src/content/figures/`). The pedagogy index continues to expose the
same shape (`PedagogyIndex.equations[]`, `PedagogyIndex.figures[]`),
but the *source* of each entry differs:

| Index field | Source pre-0060 | Source post-0060 |
|---|---|---|
| `equations` | chapter-inline `<KeyEquation>` | `src/content/equations/*.mdx` registry (PR-A) |
| `figures` | `figures.ts` generated from `figures.yml` | `src/content/figures/*.mdx` registry (PR-B) |
| `misconceptions`, `definitions`, `keyInsights`, `objectives` | chapter-inline | chapter-inline (unchanged at v1) |

The `pedagogy-index-extractor` gains a registry-collection loader
path alongside its existing chapter-MDX walker. Consumers (audit,
aggregators, `<EquationRef>` lookup, AI authoring) read the index the same
way regardless of source.

### R2 — The two patterns coexist by design

Registry-pattern content (universal + reusable, per ADR 0060's
bright-line rule) and collection-pattern content (one-shot or
instance-specific, authored inline) both feed the pedagogy index.
The `<ChapterXxx>` / `<CourseXxx>` aggregators don't care which
pattern produced an entry — they render the same dt/dd shape either
way. The asymmetry lives at the *authoring* layer, not at the
*consumption* layer.

This preserves ADR 0038's original contract (one pedagogy index;
multiple consumers; one extraction phase) while accommodating the
registry-vs-collection distinction the ecosystem requires.

## Amendment 2 (2026-05-25 — hydration-gate convention)

The pedagogy-store + script-tag-auto-hydration pattern (this ADR's
v1 design) is correct for in-workspace consumers (the smoke target),
but has a latent **packed-copy SSR-ordering hazard** that surfaces
React #418 errors as soon as a consumer installs `@sophie/components`
via a `file:` packed copy. Phase 1.5 of the
[island-hydration-gate investigation](https://github.com/drannarosen/sophie/issues)
(2026-05-25) pinned this against astr201's lecture-02 reading page:
12 × React #418 in production, 0 in dev, 0 in smoke prod.

### A2.1 — The packed-vs-workspace SSR-ordering hazard

When a consumer imports `@sophie/components` from the workspace
(`workspace:*`), Vite resolves modules to the source `.ts` files. The
chain `TextbookLayout` → `__setGlossaryDefinitions` →
`pedagogy-store.set` populates the store *before* slot children
render at SSR, so the store-gated islands (`<GlossaryTerm>`,
`<KeyEquation>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`) see
a populated store at SSR and emit the full tree.

When a consumer imports `@sophie/components` from a `file:`-packed
copy, Vite resolves to the prebuilt `dist/` JavaScript. The same
import chain produces a *different* effective module-graph ordering
at SSR — the chapter MDX's React-island SSR runs *before*
`TextbookLayout`'s `__set*` setters fire. The store is empty when
the islands render server-side, so SSR emits the bare fallback
(`<>{children}</>`). On the client, the script-tag auto-hydration
populates the store *before* React's first render commits, so the
client renders the full tree. Same component, two tree shapes → React
detects a hydration mismatch → #418 per island.

Phase 1.5 evidence:

- **Smoke (workspace)** `dist/units/spoiler-alerts/reading/index.html`:
  GlossaryTerm SSR = `<a class="trigger_T-3f8" href="...">…popover…</a>`;
  KeyEquation SSR = `<section id="inverse-square-law" class="section_PjIV6">…</section>`.
  Console: 0 × #418.
- **astr201 (`file:`-packed)** `dist/units/lecture-02-foundations/reading/index.html`:
  GlossaryTerm SSR = `<astro-slot>word</astro-slot>` × 10;
  KeyEquation SSR = framing-only × 3. Console: 12 × #418, named via
  an unminified-React diagnostic build as 9 × `<mne>` + 3 × `<Cne>`
  (GlossaryTerm + KeyEquation internal names).

### A2.2 — The convention: `useHydrated` gate at the top of render

Every component that reads any pedagogy store at render time must
gate the entire render on `useHydrated()`:

```tsx
export function MyStoreGatedComponent({ … }: Props) {
  const entry = lookupX(key);     // hook-rule-safe: unconditional read
  const hydrated = useHydrated();  // hook-rule-safe: unconditional call
  if (!hydrated) {
    return <>{children}</>;        // or <>{children ?? key}</> per family
  }
  if (!entry) {
    // dev-only authoring-drift warning, then bare fallback
    return <>{children}</>;
  }
  // …full tree…
}
```

The gate forces SSR + first client render to emit the same bare
fallback regardless of store state; the full tree appears once the
mount-effect flips the gate. SSR and first client render are
hydration-safe by construction; React #418 cannot fire for the gated
class.

The five gated components at v1:

| Component | Stores read | SSR fallback |
|---|---|---|
| `<GlossaryTerm>` | `definitions` | `<>{children}</>` |
| `<KeyEquation>` | `equations` (+ `equationCitations` transitively) | `<>{children}</>` (framing prose only) |
| `<EquationRef>` | `equations` (+ `equationCitations`) | `<>{children ?? refId}</>` |
| `<FigureRef>` | `figureRegistry` + `figureUsages` | `<>{children}</>` |
| `<ChapterRef>` | `artifacts` + `units` + `sections` | `<>{children ?? chapter}</>` |

### A2.3 — Tradeoff and author-visible behavior

The fallback tree is the canonical prose; the cross-reference
chrome (`<a class="trigger">`, Radix HoverCard, `<section>` cards)
appears one frame after hydration. SEO crawlers and no-JS readers
see prose unchanged but without affordances — acceptable because
prose IS the canonical content and the chrome IS the affordance
(per ADR 0058 epistemic-role contract). Authors writing new
store-gated components must apply the convention; the test pattern
(`renderToString` assertion that SSR emits the fallback) is
enforced via per-component unit tests in `packages/components/src/`.

### A2.4 — Why this is structural, not patch

Three alternatives were considered and rejected:

1. **Fix SSR ordering so `__set*` runs before island SSR.** Would
   preserve full SSR markup but requires fighting Astro's slot-
   evaluation order in `file:`-packed consumers — known fragile per
   the Sprint K diagnostic comments in the affected components.
2. **`globalThis`-singleton store to defeat module duplication.**
   Built + tested during Phase 1.5; left the #418 count at exactly
   12, confirming the root cause is *not* module duplication.
3. **Targeted per-component patches.** Would only fix the two
   components hit by astr201 today (GlossaryTerm + KeyEquation),
   leaving EquationRef/FigureRef/ChapterRef as latent bugs for any
   new packed consumer.

The `useHydrated`-at-top gate defends the whole class regardless
of which consumer triggers the bug. Per W4 (define success criteria;
loop until verified) + the "SoTA-structural-over-patch" engineering
principle.

### A2.5 — Where the convention's tests live

Each of the five components has a `renderToString` unit test that
asserts the SSR snapshot contains only the fallback, not the
post-hydration chrome:

- [`packages/components/src/components/GlossaryTerm/GlossaryTerm.test.tsx`](../../../packages/components/src/components/GlossaryTerm/GlossaryTerm.test.tsx) — "renders bare children at SSR even when the term resolves (useHydrated gate)"
- [`packages/components/src/components/KeyEquation/KeyEquation.test.tsx`](../../../packages/components/src/components/KeyEquation/KeyEquation.test.tsx) — "renders only framing prose at SSR even when refId resolves (useHydrated gate)"
- [`packages/components/src/components/EquationRef/EquationRef.test.tsx`](../../../packages/components/src/components/EquationRef/EquationRef.test.tsx) — "hydration gate" describe block (children-form + self-closing form)
- [`packages/components/src/components/FigureRef/FigureRef.test.tsx`](../../../packages/components/src/components/FigureRef/FigureRef.test.tsx) — "renders only the children at SSR even when name resolves"
- [`packages/components/src/components/ChapterRef/ChapterRef.test.tsx`](../../../packages/components/src/components/ChapterRef/ChapterRef.test.tsx) — "hydration gate" describe block (children-form + self-closing form)

Cross-repo end-to-end verification: rebuild `@sophie/components`,
re-pack astr201 via `rm -rf node_modules && pnpm store prune &&
pnpm install` (per astr201/AGENTS.md), build astr201 prod, navigate
to `/units/lecture-02-foundations/reading/` via Playwright, assert
**0 × #418** in console. Validated 2026-05-25.

### A2.6 — `client:load` is mandatory for all five components

The `useHydrated`-at-top gate only flips post-`useEffect`. Components
rendered without `client:load` (static Astro mode) skip React
hydration entirely; `useHydrated()` returns `false` forever; the
gate stays closed and the component renders as **permanent bare
prose**. Smoke's `examples/smoke/src/content/sections/stars/units/spectra-and-composition/reading.mdx`
exercised this anti-pattern with 22 × `<GlossaryTerm>` + 4 ×
`<KeyEquation>` without `client:load`. Phase 1.5 follow-up
verification caught the regression on CI (the
[`glossary-term-prose-integrity.spec.ts`](../../../examples/smoke/e2e/glossary-term-prose-integrity.spec.ts)
suite asserted post-hydration trigger/footnote counts; the static
chapter produced zero of either).

Resolution (single-PR scope expansion): every callsite of the five
store-backed components now carries `client:load`. Smoke's
spectra-and-composition was updated in this PR. The authoring
requirement is documented in
[`chapter-components.md`](../reference/chapter-components.md#hover-interactive-inline-cross-references-over-the-pedagogy-index).

Hover popovers (Radix HoverCard) wouldn't function without
hydration anyway — Radix needs client-mounted event listeners —
so the requirement matches what authors already wanted from these
components. A build-time audit invariant flagging missing
`client:*` directives on the five tracked components is now
implemented as audit invariant **CL1** (severity: ERROR) in
[`packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts`](../../../packages/astro/src/lib/pedagogy-index/extractors/inline-refs.ts)
and
[`packages/astro/src/lib/pedagogy-index/extractors/equation-citations.ts`](../../../packages/astro/src/lib/pedagogy-index/extractors/equation-citations.ts).
The invariant emits a finding for any of the five store-backed
components (`GlossaryTerm`, `EquationRef`, `FigureRef`,
`ChapterRef`, `KeyEquation`) in chapter MDX without a `client:*`
directive (`client:load`, `client:visible`, `client:idle`,
`client:only`, `client:media`). Findings ride on
`PedagogyIndex.extractorFindings` and surface as build errors via
[`packages/astro/src/lib/pedagogy-audit/invariants/extractor-findings.ts`](../../../packages/astro/src/lib/pedagogy-audit/invariants/extractor-findings.ts).
The prose-integrity e2e suite remains as defence-in-depth empirical
coverage.

### A2.7 — `stripWrappingParagraph` strengthened for multi-block bodies

Under the hydration-gate path, first-use footnote HTML is injected
via `innerHTML = ...` on the client (instead of by the SSR document
parser at page-load time). The HTML5 *fragment* parsing algorithm
used by `innerHTML` does **not** hoist block children out of an
inline `<span>` the way the *document* parser does at SSR — so any
multi-block definition body that the pre-strengthening
`stripWrappingParagraph` returned unchanged (its "rare but worth
defending" bail) now stays inside the span and breaks prose
integrity. Smoke's Kirchhoff's-laws definition was the first
authored body to surface this (intro `<p>` followed by `<ol>` with
three `<li>`s).

The strip pass now flattens multi-block bodies (multi-`<p>` siblings,
or `<p>` + sibling block structures) by replacing all `<p>`/`</p>`
with whitespace separators and recursively unwrapping block-level
tags with surrounding spaces. List/paragraph semantics collapse to
flowing prose in the footnote; the **popover** still receives the
full block structure (its `<div>` container is block-safe). New
unit test fixture `multi-block` pins the contract; existing tests
unchanged.
