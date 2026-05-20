---
title: Chapter components reference
short_title: Chapter components
description: >-
  Every Sophie component a chapter author can use, with import patterns and the
  three category distinctions.
tags:
  - components
  - authoring
  - mdx
  - reference
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
status: shipped
---

# Chapter components

Every Sophie component a chapter author can drop into MDX, the three
categories they fall into, and how each one wires up to Astro.

After Bucket C closed (PRs C1–C4 — the pedagogy-index infrastructure),
Sophie has **three** component categories rather than the two of the
Phase 0 era:

1. **Static (Astro-rendered)** — no React hydration; render once
   server-side. Includes the primary *source* components for the
   pedagogy index (`<Aside>` for definitions / key-insights /
   misconceptions; `<KeyEquation>` for equation citations; `<Figure>`
   for figure usages; `<LearningObjectives>` containing `<Objective>`
   for learning objectives — although `<LearningObjectives>` itself
   is interactive). Equation *declarations* (with biography children)
   live in registry MDX files at `src/content/equations/<id>.mdx`
   per [ADR 0060](../decisions/0060-registry-ecosystem.md); chapter
   MDX cites them via `<KeyEquation refId>`.
2. **Interactive React island** — hydrates as a React island. Either
   (a) **persistence-bearing**, owning state in IndexedDB (e.g.,
   `<Predict>`, `<LearningObjectives>`, `<InteractiveCallout>`), or
   (b) **hover-interactive** for inline cross-references over the
   pedagogy index (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`,
   `<ChapterRef>`). Both use `client:load`.
3. **Astro consumer (server-rendered aggregator)** — reads the
   pedagogy index server-side and renders a directory or roll-up
   block. Used at chapter-end inside MDX (`<Chapter*>`) or on
   dedicated routes (`<Course*>`). Never hydrates.

The platform draws a hard line between *static* and *hydrated React
island* — the two use different MDX import patterns and mixing them
up is the most common authoring mistake (either form fails silently
in ways the page render won't catch). The Astro-consumer category is
a third path that doesn't go through the React-island machinery at
all.

:::{seealso}
The architectural rationale lives in
[ADR 0027 — MDX render boundary prop threading](../decisions/0027-mdx-render-boundary-prop-threading.md)
and [ADR 0038 — Pedagogy-index pattern](../decisions/0038-pedagogy-index-pattern.md).
This page is the chapter author's quick reference.
:::

## The inventory

### Static (Astro-rendered)

| Component | Notes |
|---|---|
| `<Aside kind="definition">` | Source for `PedagogyIndex.definitions`. Required `title` slugifies into the canonical anchor. |
| `<Aside kind="key-insight">` | Source for `PedagogyIndex.keyInsights` (short variant). |
| `<Aside kind="misconception">` | Source for `PedagogyIndex.misconceptions` (short variant). |
| `<Aside kind="note">` / `kind="digression">` | Non-indexed marginal asides; no pedagogy-index role. |
| `<Callout>` (and `variant="key-insight"` / `variant="misconception"` / `variant="deep-dive"`) | Static variant ships pure-display; the `key-insight` and `misconception` variants ALSO feed the index (long-form). `variant="deep-dive"` feeds `PedagogyIndex.deepDives` per [ADR 0058 §R-deep-dive](../decisions/0058-epistemic-component-contract.md); `variant="the-more-you-know"` is intentionally NOT tracked (taxonomy boundary). |
| `<Figure>` | Source for `PedagogyIndex.figureUsages` (per-chapter record of where each registry figure appears). Resolves `name` against the consumer-supplied `figureRegistry`. |
| `<KeyEquation refId="...">` | Chapter-side citation of a registry equation per [ADR 0060](../decisions/0060-registry-ecosystem.md). `refId` resolves to a registry MDX entry at `src/content/equations/<refId>.mdx`. Body of the registry MDX carries the biography children (Observable / Assumption / BreaksWhen / Units / CommonMisuse / DerivationStep) + frontmatter (`title`, `tex`, `symbols`, `constants`, `related`); the chapter `<KeyEquation>` block accepts optional framing prose children for chapter-specific context. Optional `showDerivation` (expand derivation steps inline) and `hideRelated` (suppress related-equations footer) flags. Citations populate `PedagogyIndex.equationCitations`; declarations populate `PedagogyIndex.equations`. |
| `<Objective>` | Pure-display primitive. Only meaningful as a child of `<LearningObjectives>`; the remark extractor walks it during MDX parse to populate `PedagogyIndex.objectives`. |
| `<MultiRep>` 🚧 in-progress | Children-mode source for `PedagogyIndex.multiReps` (per [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md); v1 design locked in [2026-05-17 design doc](../../plans/2026-05-17-multirep-design.md)). Wraps `<RepVerbal>`, `<RepEquation refKey symbol>`, `<RepFigure refName symbolLabel>` children at v1 — one concept across multiple representational modes. Feeds the **MR1, MR2, MR4, MR6 + NR1–NR4** Representation Alignment Audit invariants. `<RepCode>` deferred until `<CodeCell>` ships (ADR 0018); `<RepIntuition>` dropped 2026-05-14 (intuition framing belongs in `<RepVerbal>`). |
| `<OMIFlow>` | Children-mode composite primitive (ADR 0063) wrapping three named slots: `<OMIFlow.Observable>`, `<OMIFlow.Model>`, `<OMIFlow.Inference>`. The slot component name binds the epistemic role at the schema layer (slot-name-binds-role, §Decision 11); there is no `role=` prop. The build-time `transformOMIFlow` pass harvests slot children into pre-rendered HTML payloads on `PedagogyIndex.omiFlows`. Strict-3 invariant: each `<OMIFlow>` MUST contain exactly one of each slot kind. Optional `concept="…"` prop binds the flow to a Notation Registry concept (ADR 0043) for future MultiRep ↔ OMIFlow cross-link. Feeds the **OF-1** (slot source-order WARN) + **OF-2** (chapter `framing:"OMI"` requires ≥1 OMIFlow ERROR) audit invariants. |
| `<RepVerbal>` / `<RepEquation>` / `<RepFigure>` 🚧 in-progress | Pure-display primitives. Only meaningful as children of `<MultiRep>`; the extractor walks them during MDX parse to populate `multiReps`. `<RepEquation>` / `<RepFigure>` carry refs that resolve against `equations` / `figureRegistry` names respectively. |
| `<Intervention>` 🚧 in-progress | Children-mode source for `PedagogyIndex.interventions` (per [ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md); v1 design locked in [2026-05-17 design doc](../../plans/2026-05-17-intervention-design.md)). Nests inside a misconception `<Aside>` or `<Callout variant="misconception">` (`addresses="this"`) — or stands outside with an explicit `addresses="<misc-slug>"`. `type` references the 12 canonical interventions in `intervention-index.ts` or `"custom"`. Feeds the **MG3 + MG4 + I1–I3** audit invariants. (I4 deferred until ADR 0041 `move-index.ts` ships.) |
| `<Observable>` / `<Assumption>` / `<Units>` / `<BreaksWhen>` / `<CommonMisuse>` / `<DerivationStep>` | Biography children of an equation (per [ADR 0046](../decisions/0046-equation-biography.md) + [ADR 0060](../decisions/0060-registry-ecosystem.md)). **Authored in the equation registry MDX body** at `src/content/equations/<id>.mdx`, NOT chapter-side. Make an equation's observational meaning, assumptions, units, validity domain, common student misuses, and derivation first-class structured metadata. Each declares its `epistemicRole` as a hardcoded const (Observable→observable, Assumption→assumption, BreaksWhen→approximation, Units→none, CommonMisuse→cross-refs misconception, DerivationStep→model). `<Units>` is now optional per [ADR 0046 §R10](../decisions/0046-equation-biography.md) — the notation registry resolves units by symbol; per-equation `<Units>` children only needed when a symbol isn't in the registry. Feeds the **E7 + E8 + E9** audit invariants (only fire when biography children present); the R1–R4 invariants police citation-vs-declaration cross-reference integrity. See [equation-registry-schema](equation-registry-schema.md) for the registry MDX shape. |

### Interactive React island

#### Persistence-bearing (IndexedDB state)

| Component | Use case |
|---|---|
| `<InteractiveCallout>` | Side info with a reviewed-state toggle |
| `<InteractiveCheckbox>` | Single tracked checkbox |
| `<LearningObjectives>` | Chapter-opening "you will be able to…" list (children-mode, contains `<Objective>` elements). After PR-C4, the LO checkbox interactivity has a known cloneElement-through-astro-slot gap; see follow-ups. |
| `<Predict>` | "Predict before the answer" prompt |
| `<ConfidenceCheck>` | 1–5 / 1–7 confidence rating |
| `<ComprehensionGate>` | "Did you understand?" gate before next section |
| `<EffortLog>` | Effort self-report |
| `<Reflection>` | Free-text reflection prompt |
| `<CollapsibleCard>` | "Deep Dive" disclosure block |

#### Hover-interactive (inline cross-references over the pedagogy index)

| Component | Looks up | Default rendered text | Mode |
|---|---|---|---|
| `<GlossaryTerm name="X">term</GlossaryTerm>` | `definitions` | The element's children (always; `name` is the lookup key) | Children-only |
| `<EquationRef refId="X" />` | `equations` (registry collection) | Equation title with hover preview (KaTeX-rendered tex + title + compact biography summary). Clicks navigate to `/equations/<refId>` registry route. | Self-closing or children |
| `<FigureRef name="X" />` | `figureRegistry` + `figureUsages` | "Fig. N" (ordinal) with hover preview (thumbnail + caption) | Self-closing or children |
| `<ChapterRef slug="X" />` | `chapters` + `modules` | Chapter title with hover preview (module breadcrumb + title + description) | Self-closing or children |
| `<TDRRef num="14" />` | `tdrReferences` (Teaching Decision Records) | `TDR-N: [title]` with hover preview (title + evidence_type + evidence_strength + 1-line summary) | Self-closing or children |

`<TDRRef>` respects per-ADR-0040 visibility rules: in student-facing
build, internal TDRs render as `<span class="sr-only">` (screen-reader
accessible + instructor HTML inspection) instead of as a visible link;
public TDRs render as normal cross-references. Instructor-build
(dual-profile v2+) renders all TDRs with full hover preview regardless
of visibility.

Each carries the new `data-react-hydrated="true"` attribute after
mount via the `useHydrated()` hook (Phase 1 item #10 pattern); e2e
tests wait on this signal before exercising hover behavior.

### Astro consumer (server-rendered aggregator)

#### Chapter-level (used inside MDX)

| Component | Renders |
|---|---|
| `<ChapterGlossary chapter="X" />` | All definitions defined in chapter X, sorted alphabetically |
| `<ChapterEquations chapter="X" />` | All `<KeyEquation>` blocks in chapter X |
| `<ChapterFigures chapter="X" />` | All `<Figure>` usages in chapter X, joined with `figureRegistry` for src/alt/caption |
| `<ChapterKeyInsights chapter="X" />` | All key-insight Asides + Callouts in chapter X |
| `<ChapterMisconceptions chapter="X" />` | All misconception Asides + Callouts in chapter X |
| `<ChapterMultiReps chapter="X" />` 🚧 in-progress | All `<MultiRep>` bindings declared in chapter X, grouped by concept (per [2026-05-17 design](../../plans/2026-05-17-multirep-design.md)) |
| `<ChapterTDRs chapter="X" />` | All TDRs referenced from chapter X via `<TDRRef>`. In student-facing build, filters to public TDRs only (often empty); in instructor build, includes all referenced TDRs |

Each component currently hardcodes `<h2>` for its section heading. A
forward-looking `headingLevel?: 2 | 3 | 4` prop will land when a real
consumer needs nested-section usage (Phase 1 item #13 forward-looking
JSDoc note).

#### Course-level (used on dedicated routes only)

| Component | Route | Renders |
|---|---|---|
| `<CourseGlossary />` | `/glossary` | All definitions across the course, alphabetical |
| `<CourseEquations />` | `/equations` | All equations across the course |
| `<CourseFigures />` | `/figures` | Every figure (canonical entries from registry) |
| `<CourseKeyInsights />` | `/key-insights` | All key insights across the course |
| `<CourseMisconceptions />` | `/misconceptions` | All misconceptions across the course |
| `<CourseObjectives />` | `/objectives` | Hierarchical Module → Chapter → Objectives roll-up. Chapter headings link to each `/chapters/X` route. (PR-C4) |

Course consumers are imported into the Astro page for their route
(`examples/smoke/src/pages/{glossary,equations,figures,key-insights,misconceptions,objectives}.astro`),
each slotted into `TextbookLayout`. They are **never** imported into
MDX chapter content.

## The import patterns

### Static components — through `<Content components={...}>`

Static components are wired up once, at the chapter page level. The
chapter author writes the tag in MDX and never imports it:

```mdx
{/* No import statement needed for static components. */}

<Aside kind="definition" title="Photon">
A photon is a packet of light.
</Aside>

<Figure name="hubble-deep-field" caption="A deep-field image." />

{/* Chapter cites the registry entry; biography lives at
    src/content/equations/wiens-law.mdx per ADR 0060. */}
<KeyEquation refId="wiens-law">
This relationship matters here because we want to map peak
wavelength to temperature for the example star below.
</KeyEquation>
```

The page that renders the MDX wires the map:

```astro
---
import { makeStaticComponents } from "@sophie/astro";
import { figures } from "../content/figures.ts";

const { Content } = await Astro.glob("../content/chapters/*.mdx")[0];
---

<Content components={makeStaticComponents({ figures })} />
```

Sophie's `makeStaticComponents` accepts a figure registry (for
`<Figure name=...>` lookups) and returns every static component
ready to wire in.

### Interactive React island — direct import + `client:load`

Interactive components don't flow through the components map.
Astro's `<Content components={...}>` map can't carry hydration
metadata, so each instance must be imported into the MDX file and
marked for hydration:

```mdx
import {
  ChapterRef,
  CollapsibleCard,
  ComprehensionGate,
  ConfidenceCheck,
  EffortLog,
  EquationRef,
  FigureRef,
  GlossaryTerm,
  InteractiveCallout,
  InteractiveCheckbox,
  LearningObjectives,
  Objective,
  Predict,
  Reflection,
} from "@sophie/components";

<LearningObjectives
  client:load
  course="astr201"
  chapter="ch1"
  id="lo"
  heading="By the end of this lecture, you will be able to:"
>
  <Objective verb="State" id="thesis">
    the course thesis.
  </Objective>
  <Objective verb="Distinguish" id="parallax">
    parallax-derived distance from standard-candle distance.
  </Objective>
</LearningObjectives>

In <ChapterRef client:load slug="measuring-the-sky" />, we will see how
<GlossaryTerm client:load name="parallax">parallax</GlossaryTerm>
underpins every distance method.
```

Every persistence-bearing component takes three threading props —
`course`, `chapter`, `id` — which compose into the IndexedDB key
([ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md)).
The four cross-reference components (`<GlossaryTerm>`, `<EquationRef>`,
`<FigureRef>`, `<ChapterRef>`) take only a lookup prop (`name` /
`slug` / `refId`) plus optional children for custom anchor text — no
persistence keys, since they don't own state.

The `client:load` directive tells Astro to hydrate the component as
a React island on page load. (`client:visible` works for refs below
the fold if performance becomes a concern; `client:load` is the
default starting point.)

### Astro consumer — import the `.astro` file directly

Chapter-level consumers can be imported into MDX as Astro components:

```mdx
import ChapterGlossary from "@sophie/astro/components/ChapterGlossary.astro";
import ChapterMisconceptions from "@sophie/astro/components/ChapterMisconceptions.astro";

{/* …chapter prose… */}

<ChapterGlossary chapter="ch1" />
<ChapterMisconceptions chapter="ch1" />
```

Course-level consumers are imported only into Astro pages (not MDX):

```astro
---
// examples/smoke/src/pages/objectives.astro
import TextbookLayout from "@sophie/astro/components/TextbookLayout.astro";
import CourseObjectives from "@sophie/astro/components/CourseObjectives.astro";
---
<TextbookLayout>
  <CourseObjectives />
</TextbookLayout>
```

Astro consumers read the populated `PedagogyIndex` directly via
`indexAccumulator.asPedagogyIndex()` — the same mechanism
TextbookLayout uses to feed the React-side stores. Per
[ADR 0038 Revisions §2](../decisions/0038-pedagogy-index-pattern.md#adr-0038-revisions-pr-c2-c3-c4),
this read must happen in a *child* of `TextbookLayout` (e.g., a
`<Course*>` component slotted into the page), not in the page
frontmatter itself — Astro evaluates page frontmatter before
TextbookLayout's setChapters / setModules / render(chapter) cycle
populates the accumulator.

## Common failure modes

Four mistakes catch authors at least once:

**Importing a static component AND using `client:load` on it.**
Hydrates a stateless component as an isolated React island for no
benefit. The page works but ships extra JavaScript. The PR-C4 audit
pass does not flag this yet; a future audit invariant should.

**Using an interactive component without `client:load`.**
The component renders server-side once with its initial state and
never hydrates, so state changes are lost and IndexedDB persistence
(or HoverCard interactivity) never engages. Looks correct on first
paint; breaks the moment a student tries to interact.

**Forgetting the `course`/`chapter`/`id` props on a persistence-
bearing component.** TypeScript catches `course` and `chapter` as
required (or it would, if MDX prop typecheck were enforced at build —
see ADR 0038 §2). `id` is also required; without it, two instances
on the same page share an IndexedDB key and clobber each other.

**Referencing a name/slug that doesn't exist in the index.**
`<GlossaryTerm name="unknown">`, `<EquationRef refId="unknown">`,
`<FigureRef name="unknown">`, `<ChapterRef slug="unknown">` all fall
back to bare-text render + dev `console.warn`. The audit pass
catches this systematically (D4 / E4 / F2 / C1 for chapter-side
miss; R1–R4 for cross-reference integrity between registry
declarations and chapter citations); fix authoring errors at build
time, not at runtime.

## When to use each component

| Use case | Component |
|---|---|
| A heading and a paragraph of side info | `<Callout>` or `<Aside kind="note">` |
| Side info with a reviewed-toggle | `<InteractiveCallout>` |
| A defined term with a margin definition | `<Aside kind="definition" title="...">` |
| A flagged misconception (1–2 sentences) | `<Aside kind="misconception">` |
| A flagged misconception (multi-paragraph) | `<Callout variant="misconception">` |
| A flagged key insight (1–2 sentences) | `<Aside kind="key-insight">` |
| A flagged key insight (multi-paragraph) | `<Callout variant="key-insight">` |
| Optional technical depth on the chapter's topic (derivation, mechanism, worked detail) — collapsible | `<Callout variant="deep-dive" id="..." title="...">` (tracked in `PedagogyIndex.deepDives` per [ADR 0058 §R-deep-dive](../decisions/0058-epistemic-component-contract.md)) |
| Adjacent enrichment (history, cultural connections, fun facts) — collapsible | `<Callout variant="the-more-you-know" title="...">` (intentionally NOT tracked — outside the eight-role taxonomy per ADR 0058 §R-deep-dive) |
| An image with caption + credit | `<Figure>` (registry-resolved) |
| A named equation block citing a registry entry | `<KeyEquation refId="X">` (registry-resolved per [ADR 0060](../decisions/0060-registry-ecosystem.md)) |
| Inline reference to a defined term | `<GlossaryTerm name="X">term</GlossaryTerm>` |
| Inline reference to an equation | `<EquationRef refId="X" />` |
| Inline reference to a figure | `<FigureRef name="X" />` |
| Inline reference to another chapter | `<ChapterRef slug="X" />` |
| Inline reference to a Teaching Decision Record | `<TDRRef num="14" />` (per [ADR 0040](../decisions/0040-teaching-decision-records.md)) |
| The chapter-opening "you will be able to..." list | `<LearningObjectives>` with `<Objective>` children |
| One concept presented across multiple representational modes (prose + equation + figure) with explicit cross-bindings | `<MultiRep>` 🚧 with `<RepVerbal>` / `<RepEquation>` / `<RepFigure>` children. `<RepCode>` deferred (pending `<CodeCell>`); intuition framing lives in `<RepVerbal>` prose. |
| The full OMI arc as a visible three-panel composite — observable evidence, the model that explains it, the inference that follows | `<OMIFlow id="…" concept="…">` with `<OMIFlow.Observable>` / `<OMIFlow.Model>` / `<OMIFlow.Inference>` children. Renderer emits canonical observable → model → inference order regardless of source order. Strict-3-slot invariant (ADR 0063). Chapters declaring `framing: "OMI"` in frontmatter must render ≥1 OMIFlow (OF-2). |
| A pedagogical intervention paired with a misconception (worked example, contrasting cases, bridging analogy, etc.) | `<Intervention type="..." addresses="this">` 🚧 nested inside a misconception `<Aside>` or `<Callout>` |
| Observational meaning / assumptions / units / validity domain / common misuses / derivation of an equation | `<Observable>` / `<Assumption>` / `<Units>` / `<BreaksWhen>` / `<CommonMisuse>` / `<DerivationStep>` as biography children in the equation's registry MDX body (`src/content/equations/<id>.mdx`). See [equation-registry-schema](equation-registry-schema.md). |
| A single checkbox for a tracked item | `<InteractiveCheckbox>` |
| A "predict before the answer" prompt | `<Predict>` |
| A confidence rating (1–5 or 1–7) | `<ConfidenceCheck>` |
| A "did you understand?" gate | `<ComprehensionGate>` |
| An effort-level self-report | `<EffortLog>` |
| A free-text reflection prompt | `<Reflection>` |
| A "Deep Dive" disclosure block | `<CollapsibleCard>` |
| Chapter-end roll-up of definitions | `<ChapterGlossary chapter="X" />` |
| Chapter-end roll-up of equations | `<ChapterEquations chapter="X" />` |
| Chapter-end roll-up of figures | `<ChapterFigures chapter="X" />` |
| Chapter-end roll-up of key insights | `<ChapterKeyInsights chapter="X" />` |
| Chapter-end roll-up of misconceptions | `<ChapterMisconceptions chapter="X" />` |
| Chapter-end roll-up of referenced Teaching Decision Records | `<ChapterTDRs chapter="X" />` |
| Course-wide pages | `<Course*>` on the matching `/glossary`, `/equations`, `/figures`, `/key-insights`, `/misconceptions`, `/objectives` route |

Pick by pedagogical intent first; the static-vs-interactive split
and the chapter-vs-course aggregation level follow automatically.

## Anchor convention

Every pedagogy-index entry has a stable anchor derived from its
source. Authors writing cross-references must match these. The
canonical table lives in
[`packages/core/src/schema/pedagogy-index.ts`](https://github.com/drannarosen/sophie/tree/main/packages/core/src/schema/pedagogy-index.ts)
JSDoc:

| Role | Prefix | Source |
|---|---|---|
| Definition | `def-` | author-supplied via title/id slug |
| Equation | `eq-` | author-supplied via id slug |
| Key insight | `ki-` | auto: `ki-${counter}` |
| Figure | `fig-` | auto: `fig-${slug(name)}-${counter}` |
| Misconception | `misc-` | auto: `misc-${counter}` (auto only); explicit ids slugify directly |
| Chapter | `ch-` | passthrough chapter slug |
| Objective | `lo-` | author-supplied via id |
| TDR | `tdr-` | passthrough TDR number (e.g., `tdr-14` for TDR-014) |

## References

- [ADR 0001](../decisions/0001-platform-not-monorepo.md) — repo shape.
- [ADR 0004](../decisions/0004-component-contract-revisions.md) — component contract.
- [ADR 0007](../decisions/0007-persistence-indexeddb.md) — IndexedDB + ResponseStore + BroadcastChannel.
- [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md) — static vs persistence-bearing render boundary.
- [ADR 0038](../decisions/0038-pedagogy-index-pattern.md) — pedagogy-index pattern (the architectural basis for the cross-reference and aggregator categories).
- [ADR 0042](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) — Pedagogy Contract + AI Contribution Ledger (course-level YAML + per-chapter frontmatter; gates the Notation Registry opt-in).
- [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md) — Notation Registry + `<MultiRep>` + Representation Alignment Audit. v1 ships NR1–NR4 + MR1, MR2, MR4, MR6 invariants (MR3 + MR5 deferred with `<RepCode>`). See [2026-05-17 design hardening](../../plans/2026-05-17-multirep-design.md).
- [ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md) — Misconception Graph + Intervention Library + `<Intervention>`. MG1 + MG2 already ship; v1 sprint adds MG3 + MG4 + I1–I3 (I4 deferred until `move-index.ts` ships). See [2026-05-17 design hardening](../../plans/2026-05-17-intervention-design.md).
- [ADR 0046](../decisions/0046-equation-biography.md) — Equation Biography (now 6 children + `<DerivationStep>`) + E7 + E8 + E9 audit invariants. See [2026-05-17 design hardening](../../plans/2026-05-17-equation-biography-design.md).
- [ADR 0058](../decisions/0058-epistemic-component-contract.md) — Epistemic Component Contract (8-role taxonomy). MultiRep binds role via Notation Registry concept declaration; EquationBiography children declare role as hardcoded const.
- [ADR 0060](../decisions/0060-registry-ecosystem.md) — Registry Ecosystem. Equation biographies move from chapter-inline to registry MDX bodies; `<KeyEquation refId>` + `<EquationRef refId>` cite the registry; R1–R4 audit invariants police citation/declaration integrity.
- [ADR 0061](../decisions/0061-ai-optimized-codebase-design.md) — AI-optimized codebase design (six rules including docs-atomic-with-code).
- [equation-registry-schema](equation-registry-schema.md) — the registry MDX shape (frontmatter + biography body).
- [Component contract](component-contract.md) — the TypeScript interface every component implements.
- [Add a custom component](../how-to/add-a-custom-component.md) — recipe for new components.
