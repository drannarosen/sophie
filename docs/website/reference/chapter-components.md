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
  status: in-progress
  last_validated_date: "2026-05-22"
  evidence:
    - kind: test
      ref: packages/components/src/components/SpacedReview/SpacedReview.test.tsx
      date: "2026-05-22"
      notes: "<SpacedReview section=…> section-scope rendering graduated end-to-end (Wedge B-followup W1); 11 unit tests cover target= and section= paths."
    - kind: chapter
      ref: examples/smoke/src/content/chapters/02-stars/stellar-evolution.mdx
      date: "2026-05-22"
      notes: "<SpacedReview section=\"stars\"> callsite exercises the new section-scope render path in smoke; section_id resolves cleanly through SR-1."
    - kind: review
      ref: docs/reviews/2026-05-22-wedge-b1-retrieval-family.md
      date: "2026-05-22"
      notes: "Wedge B1 retrieval-family A- grade validated the component-contract pattern this doc describes; W1 graduations extend coverage to Unit-aware PRA-1 + section-validity SR-1."
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
| `<Aside kind="definition">` | Source for `PedagogyIndex.definitions`. Required `title` slugifies into the canonical anchor. A term MAY be defined in multiple chapters (cross-lecture reinforcement, [ADR 0086](../decisions/0086-multi-chapter-glossary-definitions.md)); the optional boolean-presence `canonical` prop (`<Aside kind="definition" title="X" canonical>`) marks which definition the `/library/glossary` room shows — at most one per slug across the textbook, else a build error. |
| `<Aside kind="key-insight">` | Source for `PedagogyIndex.keyInsights` (short variant). |
| `<Aside kind="misconception">` | Source for `PedagogyIndex.misconceptions` (short variant). |
| `<Aside kind="note">` / `kind="digression">` | Non-indexed marginal asides; no pedagogy-index role. |
| `<Callout>` (and `variant="key-insight"` / `variant="misconception"` / `variant="deep-dive"`) | Static variant ships pure-display; the `key-insight` and `misconception` variants ALSO feed the index (long-form). `variant="deep-dive"` feeds `PedagogyIndex.deepDives` per [ADR 0058 §R-deep-dive](../decisions/0058-epistemic-component-contract.md); `variant="the-more-you-know"` is intentionally NOT tracked (taxonomy boundary). |
| `<Figure>` | Source for `PedagogyIndex.figureUsages` (per-chapter record of where each registry figure appears). Resolves `name` against the consumer-supplied `figureRegistry`. |
| `<KeyEquation refId="...">` | Chapter-side citation of a registry equation per [ADR 0060](../decisions/0060-registry-ecosystem.md). `refId` resolves to a registry MDX entry at `src/content/equations/<refId>.mdx`. Body of the registry MDX carries the biography children (Observable / Assumption / BreaksWhen / Units / CommonMisuse / DerivationStep) + frontmatter (`title`, `tex`, `symbols`, `constants`, `related`); the chapter `<KeyEquation>` block accepts optional framing prose children for chapter-specific context. Optional `showDerivation` (expand derivation steps inline) and `hideRelated` (suppress related-equations footer) flags. Citations populate `PedagogyIndex.equationCitations`; declarations populate `PedagogyIndex.equations`. |
| `<Objective>` | Pure-display primitive. Only meaningful as a child of `<LearningObjectives>`; the remark extractor walks it during MDX parse to populate `PedagogyIndex.objectives`. |
| `<MultiRep>` | Children-mode source for `PedagogyIndex.multiReps` (per [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md); v1 design locked in [2026-05-17 design doc](../../plans/2026-05-17-multirep-design.md)). Wraps `<RepVerbal>`, `<RepEquation refKey symbol>`, `<RepFigure refName symbolLabel>` children at v1 — one concept across multiple representational modes. Feeds the **MR1, MR2, MR4, MR6 + NR1–NR4** Representation Alignment Audit invariants. **v1 children-mode validated end-to-end by the [M2-L2 Surface Flux & Colors pilot](../pilots/m2-l2-surface-flux-and-colors.md) (2026-05-25): two bindings, R10-compliant `aria-labelledby` landmarks, 0 MR/NR audit warnings.** Per WS B+D ([issue #191](https://github.com/drannarosen/sophie/issues/191)), `<RepFigure refName>` and `<RepEquation refKey>` callsites now count toward F4 (orphan figure) and R-series equation invariants — MultiRep-only references no longer false-positive as orphans. **Remaining deferrals:** `<RepCode>` (pending `<CodeCell>`, ADR 0018) + MR3 / MR5 invariants (ship with `<RepCode>`); `<RepIntuition>` dropped 2026-05-14 (intuition framing belongs in `<RepVerbal>`). |
| `<OMIFlow>` | Children-mode composite primitive (ADR 0063) wrapping three named slots: `<OMIFlow.Observable>`, `<OMIFlow.Model>`, `<OMIFlow.Inference>`. The slot component name binds the epistemic role at the schema layer (slot-name-binds-role, §Decision 11); there is no `role=` prop. The build-time `transformOMIFlow` pass harvests slot children into pre-rendered HTML payloads on `PedagogyIndex.omiFlows`. Strict-3 invariant: each `<OMIFlow>` MUST contain exactly one of each slot kind. Optional `concept="…"` prop binds the flow to a Notation Registry concept (ADR 0043) for future MultiRep ↔ OMIFlow cross-link. Feeds the **OF-1** (slot source-order WARN) + **OF-2** (chapter `framing:"OMI"` requires ≥1 OMIFlow ERROR) audit invariants. |
| `<RepVerbal>` / `<RepEquation>` / `<RepFigure>` | Pure-display primitives. Only meaningful as children of `<MultiRep>`; the extractor walks them during MDX parse to populate `multiReps` AND emit `InlineRefUsageEntry` records (`kind: "rep-figure" \| "rep-equation"`) per WS B+D so the figure/equation registries see MultiRep references as first-class citations. `<RepEquation>` / `<RepFigure>` carry refs that resolve against `equations` / `figureRegistry` names respectively. |
| `<Intervention>` 🚧 in-progress | Children-mode source for `PedagogyIndex.interventions` (per [ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md); v1 design locked in [2026-05-17 design doc](../../plans/2026-05-17-intervention-design.md)). Nests inside a misconception `<Aside>` or `<Callout variant="misconception">` (`addresses="this"`) — or stands outside with an explicit `addresses="<misc-slug>"`. `type` references the 12 canonical interventions in `intervention-index.ts` or `"custom"`. Feeds the **MG3 + MG4 + I1–I3** audit invariants. (I4 deferred until ADR 0041 `move-index.ts` ships.) |
| `<Observable>` / `<Assumption>` / `<Units>` / `<BreaksWhen>` / `<CommonMisuse>` / `<DerivationStep>` | Biography children of an equation (per [ADR 0046](../decisions/0046-equation-biography.md) + [ADR 0060](../decisions/0060-registry-ecosystem.md)). **Authored in the equation registry MDX body** at `src/content/equations/<id>.mdx`, NOT chapter-side. Make an equation's observational meaning, assumptions, units, validity domain, common student misuses, and derivation first-class structured metadata. Each declares its `epistemicRole` as a hardcoded const (Observable→observable, Assumption→assumption, BreaksWhen→approximation, Units→none, CommonMisuse→cross-refs misconception, DerivationStep→model). `<Units>` is now optional per [ADR 0046 §R10](../decisions/0046-equation-biography.md) — the notation registry resolves units by symbol; per-equation `<Units>` children only needed when a symbol isn't in the registry. Feeds the **E7 + E8 + E9** audit invariants (only fire when biography children present); the R1–R4 invariants police citation-vs-declaration cross-reference integrity. See [equation-registry-schema](equation-registry-schema.md) for the registry MDX shape. |
| `<WorkedExample>` | Compound primitive for step-by-step applied quantitative reasoning (per [ADR 0081](../decisions/0081-worked-example-component.md)). Slots bind by component identity: `<WorkedExample.Problem>` (givens) / `<WorkedExample.Step label="…">` (repeatable; mirrors `<DerivationStep>`) / `<WorkedExample.DimCheck>` (dimensional verification) / `<WorkedExample.Result>` (answer + interpretation). Root renders a `<section aria-labelledby>` region with `data-epistemic-role="numerical"`; `<WorkedExample.DimCheck>` carries `data-dim-check` as the **QB6** ("units shown at every step") audit hook. **Replaces the disallowed `<Callout variant="deep-dive">` approximation** for worked examples ([ADR 0064](../decisions/0064-chapter-migration-playbook.md) §3). Per WS B+D ([issue #188](https://github.com/drannarosen/sophie/issues/188)), the pedagogy-index extractor + audit invariants ship: `extractWorkedExamples` populates `PedagogyIndex.workedExamples` with per-callsite slot-coverage summaries; **WE-1** WARN (≥1 `<Step>` AND zero `<DimCheck>` — QB6 coverage gap), **WE-2** ERROR (missing `<Problem>` or `<Result>`), and **WE-3** WARN (unknown JSX flow child, R7 disposition) consume them. |

### Chrome primitives (PR 5, Phase B)

Four layout primitives that compose with — but never replace —
Sophie's pedagogy components. They are deliberately "chrome": no
`epistemicRole` per [ADR 0058](../decisions/0058-epistemic-component-contract.md)
(optional omission for non-pedagogy components), no pedagogy-index
contribution, no audit invariants. Use them to organize pedagogical
content; reach for the eight-role pedagogy components when content
carries scientific reasoning meaning.

#### `<Card>` — static container

Static SSR container with optional `Card.Header` + `Card.Footer`
slots. When `title` or a `Card.Header` slot is present, the root
becomes `<section aria-labelledby={titleId}>` for screen-reader
landmark navigation; titleless cards render as a plain `<div>`
(non-landmark — no name to anchor to per [R10](../../AGENTS.md)).
Composed solely from existing tokens per [ADR 0005](../decisions/0005-theming-three-layers.md).
axe-clean across all combinations.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | `string?` | — | Shorthand header text. When `Card.Header` slot is also provided, the slot wins (Q3 lock). |
| `id` | `string?` | — | Anchor id on the root. |
| `className` | `string?` | — | Concatenated with the card root class. |
| `children` | `ReactNode` | — | Body + optional `Card.Header` / `Card.Footer` slots. |

```mdx
<Card title="Spectral classification">
  Stars are classified O / B / A / F / G / K / M from hottest to
  coolest.
</Card>
```

#### `<Grid>` — pure layout

Responsive CSS grid with 1–4 columns. Each non-null child is wrapped
in a `<div role="listitem">`; the root is `<div role="list">`. NOT
a landmark — `role="list"` is grouping. Empty grid falls back to a
plain `<div>` (a list with zero items is an axe violation under
best-practice rules).

| Prop | Type | Default | Notes |
|---|---|---|---|
| `cols` | `1 \| 2 \| 3 \| 4` | required | Number of columns. |
| `responsive` | `boolean?` | `true` | Collapses to 1 column at <640px. |
| `gap` | `"sm" \| "md" \| "lg"?` | `"md"` | Maps to `--sophie-space-2` / `--sophie-space-3` / `--sophie-space-4`. |
| `id` | `string?` | — | Anchor id on the root. |
| `className` | `string?` | — | Concatenated with the grid root class. |

```mdx
<Grid cols={3}>
  <Card title="O type">~30,000 K</Card>
  <Card title="G type">~5,800 K (Sun)</Card>
  <Card title="M type">~3,500 K</Card>
</Grid>
```

#### `<Tabs>` — non-persistent tabbed interface

Compound shape backed by Radix Tabs ([ADR 0019](../decisions/0019-radix-ui-primitives.md)):
`<Tabs>` wraps n × `<Tab label="…">` children. Each label slugifies
into the Radix `value` identity; duplicate slugs throw at render
(Q1 loud-feedback lock). Renders as a plain `<div>` — no landmark
(no inherent name to anchor `<section aria-labelledby>` to per
[R10](../../AGENTS.md)); Radix provides all ARIA semantics for the
tablist + tabpanel interaction. NO persistence — view-state only;
for persisted disclosure use `<Dropdown>`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `defaultLabel` | `string?` | first tab | Label of the tab open on first render. Slugified before passing to Radix as `defaultValue`. |
| `id` | `string?` | — | Anchor id on the root. |
| `className` | `string?` | — | Concatenated with the tabs root class. |

`<Tab>` props: `label: string` (required), `id?: string`,
`children: ReactNode`.

```mdx
<Tabs defaultLabel="Composition">
  <Tab label="Line spectra">
    Atomic transitions produce sharp lines at characteristic
    wavelengths.
  </Tab>
  <Tab label="Composition">
    Line strength encodes elemental abundance.
  </Tab>
</Tabs>
```

#### `<Dropdown>` — persistence-bearing disclosure

Replaces `<CollapsibleCard>` from Phase A. Backed by Radix Accordion
([ADR 0019](../decisions/0019-radix-ui-primitives.md)); single- and
multi-item forms share the same render path. Per-instance open/closed
state persists via `useInteractive`
([ADR 0004](../decisions/0004-component-contract.md),
[ADR 0007](../decisions/0007-indexeddb-persistence.md)) under the key
`dropdown:${id}:open`. Per [ADR 0027](../decisions/0027-course-unit-id-required-props.md):
`course`, `unit`, `id` are required. Use with `client:load` if placed
directly in MDX.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `course` | `string` | required | IDB course key per ADR 0027. |
| `unit` | `string` | required | IDB unit key per ADR 0027. |
| `id` | `string` | required | Per-instance anchor for persisted open-slug array. |
| `label` | `string?` | — | Single-item shorthand. Mutually exclusive with `<Dropdown.Item>` children (throws at render if both supplied). |
| `defaultOpen` | `string[]?` | `[]` | Slugs of items open on first visit, before persisted state. |
| `allowMultiple` | `boolean?` | `false` | When true, multiple items may be open simultaneously (Radix `type="multiple"`). |

`<Dropdown.Item>` props: `label: string` (required), `id?: string`,
`children: ReactNode`.

```mdx
{/* Single-item shorthand */}
<Dropdown
  client:load
  course="astr201"
  unit="spectra"
  id="deep-dive-hydrogen"
  label="Deep Dive: Hydrogen's atomic fingerprint"
>
  H-alpha at 656.3 nm is the n=3 → n=2 transition.
</Dropdown>

{/* Multi-item form */}
<Dropdown
  client:load
  course="astr201"
  unit="spectra"
  id="classification"
  allowMultiple
>
  <Dropdown.Item label="Line spectra">
    Atomic transitions produce sharp lines.
  </Dropdown.Item>
  <Dropdown.Item label="Composition">
    Line strength encodes elemental abundance.
  </Dropdown.Item>
</Dropdown>
```

### Interactive React island

#### Persistence-bearing (IndexedDB state)

> **W3 prop-name convention (locked 2026-05-22):** All persistence-
> bearing components take `course`, `unit`, `id` as their IDB-key
> dimension props (W3 D1 — parent-ref family). Pre-W3 the second
> prop was named `chapter`; the rename `chapter` → `unit` reflects
> that the value identifies the parent Unit (matching
> `UnitEntry.id`), not a reading-artifact slug. The artifact-ref
> family (`<ChapterRef>`, `<ChapterGlossary>` + 6 chrome roll-ups,
> `<ChapterMultiReps>`) preserves the prop name `chapter` because
> its value is a reading-artifact slug (= `UnitEntry.chapter` D7
> binding). Per W2/D4 1:1 these strings happen to be equal in
> production; the W3 split decouples them at the type/prop layer.

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
| `<Dropdown>` | Persistence-bearing disclosure widget (single-item shorthand or n-item accordion). Replaces `<CollapsibleCard>` from Phase A — see "Chrome primitives" section below for API. |
| `<RetrievalPrompt>` | Primary in-flow recall prompt (Wedge B1 retrieval family) |
| `<SpacedReview>` | Queued review surface; surfaces past-attempted targets (Wedge B1) |
| `<SkillReview>` | Inline prereq-bridge prompt; same prefix-typed `target` convention (Wedge B1) |

#### Hover-interactive (inline cross-references over the pedagogy index)

| Component | Looks up | Default rendered text | Mode |
|---|---|---|---|
| `<GlossaryTerm name="X">term</GlossaryTerm>` | `definitions` | The element's children (always; `name` is the lookup key) | Children-only |
| `<EquationRef refId="X" />` | `equations` (registry collection) | Equation title with hover preview (KaTeX-rendered tex + title + compact biography summary). Clicks navigate to `/equations/<refId>` registry route. | Self-closing or children |
| `<FigureRef name="X" />` | `figureRegistry` + `figureUsages` | "Fig. N" (ordinal) with hover preview (thumbnail + caption) | Self-closing or children |
| `<ChapterRef chapter="X" />` | `artifacts` + `units` + `sections` | Unit title with hover preview (section breadcrumb + title + description); links to `/units/X/reading`. W2/D3 prop rename (`slug` → `chapter`); W3/D1 KEEPS the prop name `chapter` (artifact-ref family — references the reading-artifact slug, not the parent Unit id). Per W2/D4 the prop value equals both the reading-artifact id and the parent Unit id. | Self-closing or children |
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

**SSR fallback (Phase 1.5 hydration-gate, 2026-05-25).** All four
hover-interactive cross-references (`<GlossaryTerm>`, `<EquationRef>`,
`<FigureRef>`, `<ChapterRef>`) plus the block-level `<KeyEquation>`
gate their store-backed render on `useHydrated()`. At SSR and on the
first client render the gate is closed: the component emits only its
text fallback (`<>{children}</>` for `<GlossaryTerm>` /
`<KeyEquation>` / `<FigureRef>`; `<>{children ?? refId}</>` for
`<EquationRef>`; `<>{children ?? chapter}</>` for `<ChapterRef>`),
without the `<a class="trigger">` anchor, the Radix HoverCard
machinery, or `<KeyEquation>`'s `<section>` card. The full tree
appears once the mount-effect flips the gate. This is by design — it
defends the whole class of store-backed components against the
packed-copy-consumer SSR-ordering bug that surfaced 12 × React #418
errors on the astr201 lecture-02 reading page (the pedagogy stores
are populated *after* island-SSR runs in packed builds, so reading
the store during SSR produces a different tree shape than the
post-hydration client render → React #418). Author-visible
consequences: SEO and no-JS readers see the prose unchanged but
without the cross-reference affordances; readers with JS see the
chrome appear within ~one frame of hydration. See ADR 0038 +
[Sprint K diagnostic comment in `GlossaryTerm.tsx:63-69`].

**Authoring requirement — `client:load` is mandatory.** Because the
gate only flips post-`useEffect`, all five store-backed components
**must** be rendered as hydrating React islands. In MDX, that means
the `client:load` directive on every callsite:

```mdx
<GlossaryTerm client:load name="spectrum">spectrum</GlossaryTerm>
<KeyEquation client:load refId="bohr-energy" />
<EquationRef client:load refId="wiens-law" />
<FigureRef client:load name="cosmic-distance-ladder" />
<ChapterRef client:load chapter="measuring-the-sky" />
```

Static rendering (no `client:load`) skips React hydration entirely;
`useHydrated()` returns `false` forever; the component renders as
permanent bare prose with no anchor, no popover, no first-use
footnote. The hover popover wouldn't function in a static render
anyway (Radix needs hydrated event listeners), so this requirement
matches what authors already wanted from these components. See
ADR 0038 Amendment 2 for the architectural rationale.

**First-use footnote multi-block handling
(Amendment 2 follow-up, 2026-05-25).** `<GlossaryTerm
data-first-use="true">` injects the canonical definition body into an
inline `<span>` (see `stripWrappingParagraph` in `GlossaryTerm.tsx`).
Authors can use multi-block markdown in definition bodies
(intro paragraph followed by a list, multi-paragraph bodies, nested
blocks); the strip pass flattens these to inline-safe HTML in the
footnote (preserving all text, collapsing list/paragraph semantics
to flowing prose). The full block structure is still preserved in
the **popover** (`<div>` container), which is the canonical place
for rich definition content.

**Popover vs. footnote rendering.** `<GlossaryTerm
data-first-use="true">` injects the definition body into *both*
surfaces, but they render the body differently:

- **Popover.** The body renders inside a `<div>` container (block-
  safe) and preserves the authored structure exactly — paragraphs,
  lists, nested blocks all render as written. Use the popover when
  the definition relies on multi-block content (a lead paragraph
  followed by a list of conditions, e.g.).
- **Inline first-use footnote.** The body is parsed via
  `innerHTML=` into an inline container, and the strip pass
  (`stripWrappingParagraph`) flattens multi-block bodies into
  inline-safe prose, collapsing list/paragraph semantics into
  flowing text (see ADR 0038 § A2.7). All text is preserved; the
  block structure is not.

Authors who need to preserve structured content should rely on the
popover; the inline footnote is for short summary text.

### Astro consumer (server-rendered aggregator)

#### Chapter-level (used inside MDX)

| Component | Renders |
|---|---|
| `<ChapterGlossary chapter="X" />` | All definitions defined in chapter X, sorted alphabetically |
| `<ChapterEquations chapter="X" />` | All `<KeyEquation>` blocks in chapter X |
| `<ChapterFigures chapter="X" />` | All `<Figure>` usages in chapter X, joined with `figureRegistry` for src/alt/caption |
| `<ChapterKeyInsights chapter="X" />` | All key-insight Asides + Callouts in chapter X |
| `<ChapterMisconceptions chapter="X" />` | All misconception Asides + Callouts in chapter X |
| `<ChapterMultiReps chapter="X" />` | All `<MultiRep>` bindings declared in chapter X, grouped by concept (per [2026-05-17 design](../../plans/2026-05-17-multirep-design.md); v1 validated by the [M2-L2 pilot](../pilots/m2-l2-surface-flux-and-colors.md)) |
| `<ChapterTDRs chapter="X" />` | All TDRs referenced from chapter X via `<TDRRef>`. In student-facing build, filters to public TDRs only (often empty); in instructor build, includes all referenced TDRs |

Each component currently hardcodes `<h2>` for its section heading. A
forward-looking `headingLevel?: 2 | 3 | 4` prop will land when a real
consumer needs nested-section usage (Phase 1 item #13 forward-looking
JSDoc note).

#### Course-level Library rooms (rollups + Spec pages)

Each Library room ships a **rollup** (all entries on one route) plus
a per-entry **Spec page** (one URL per registry entry), with two
documented exceptions. The shape is locked by
[ADR 0070](../decisions/0070-library-room-and-registry-spec-pages.md);
the eight epistemic roles are locked by
[ADR 0058](../decisions/0058-epistemic-component-contract.md).

| Room | Rollup route | Spec route | Notes |
|---|---|---|---|
| Glossary | `/library/glossary/` | `/library/glossary/<slug>/` | Definition Spec — term, definition body, cross-refs to citing chapters. |
| Equations | `/library/equations/` | `/library/equations/<id>/` | Renders `<BiographyRender>` (KaTeX-formatted equation biography per ADR 0060) + cross-refs to citing `<KeyEquation>` callsites. |
| Figures | `/library/figures/` | `/library/figures/<name>/` | Two-tier registry+usage shape: Spec page renders `<img>` from the canonical registry entry + lists every chapter usage; `canonical` flag distinguishes the registry entry from per-chapter usages. |
| Misconceptions | `/library/misconceptions/` | `/library/misconceptions/<slug>/` | Misconception Spec page renders the misconception body + the `length` variant (`short` / `standard` / `long`) shaped per ADR 0044 + 0058. |
| Key Insights | `/library/key-insights/` | `/library/key-insights/<slug>/` | KeyInsight Spec page; slug derived from `title` when present, else falls back to `<unit>-<anchor>` per W4c D4. |
| Objectives | `/library/objectives/` | *(no Spec route)* | Rollup-only per W4c D1 exception — Objectives have no stable per-entry identity worth a URL. Three-level grouping: Module → Chapter → Objectives. |
| Topics | `/library/topics/` | `/library/topics/<topic-id>/` | Topic Spec rendered via Astro dynamic route `pages/library/topics/[topicId].astro` (W4b; ADR 0079). Renders each card's Prompt + Answer body inline per W4c Task 8.4 (no link-out indirection). |
| Observables | `/library/observables/` | `/library/observables/<unit>-<anchor>/` | OMI Spec page sourced from `OMIFlowEntry.observable` slot (W4c). One Spec per observable in any chapter's `<OMIFlow>`. |
| Models | `/library/models/` | `/library/models/<unit>-<anchor>/` | OMI Spec page sourced from `OMIFlowEntry.model` slot (W4c). |
| Inferences | `/library/inferences/` | `/library/inferences/<unit>-<anchor>/` | OMI Spec page sourced from `OMIFlowEntry.inference` slot (W4c). |

**Three rooms remain deferred** per ADR 0058 §4 — Assumption,
Approximation, and Numerical are reserved roles in the eight-role
taxonomy but have no v1 extractor + rollup. They will land when a
concrete chapter authoring need surfaces them.

Course consumers are imported into the Astro page for their route
(`examples/smoke/src/pages/library/{glossary,equations,figures,key-insights,misconceptions,objectives}.astro`
for the W4a-era rollups; `pages/library/topics/[topicId].astro`,
`pages/library/observables/[slug].astro`,
`pages/library/models/[slug].astro`, and
`pages/library/inferences/[slug].astro` for W4b + W4c dynamic routes),
each slotted into `TextbookLayout`. They are **never** imported into
MDX chapter content.

#### Library hub + bridge rooms (W4a + W4b + W4c)

| Route | Astro page | Purpose |
|---|---|---|
| `/library/` | `pages/library/index.astro` | Library hub — surfaces all 10 Course-level rooms above (6 W4a-era + Topics from W4b + 3 W4c OMIFlow rollups) with per-room entry counts. |
| `/<bridge-slug>/` | `pages/[bridgeSlug].astro` | Bridge Room render per ADR 0068 Scale 1 (W4b). Single-param dynamic route; one path per `Section[type=bridge]`. URL slug comes from `section.yaml`; optional `course.yaml` override sets the display label only. BR-1 audit invariant enforces course-wide slug uniqueness against other Sections + Unit ids + reserved Library paths (`library` / `sections` / `units` / `topics`). |

The two route shapes use `buildModuleNavInputs(sections, units)`
from `@sophie/astro` to derive `<ModuleNav>`'s
`{modules, chapters}` props — the same helper all six W4a rooms
use, so adding new sidebar-bearing routes is one helper call.

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
  ComprehensionGate,
  ConfidenceCheck,
  Dropdown,
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

In <ChapterRef client:load chapter="measuring-the-sky" />, we will see how
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
// examples/smoke/src/pages/library/objectives.astro
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

## Integration consumption

Per [ADR 0082](../decisions/0082-chapter-layout-extraction.md),
`@sophie/astro` ships a canonical chapter layout
(`ChapterLayout.astro`) and a reading-route page injected at
`/units/[unit]/reading` directly from the integration. Consumers
no longer maintain duplicates of either file; the consumer's
`astro.config.ts` only needs to wire the integration and hand in
the figure registry:

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import { defineSophieIntegration } from "@sophie/astro";
import { figures } from "./src/content/figures.ts";

export default defineConfig({
  integrations: [defineSophieIntegration({ figures })],
});
```

The `figures` option is the consumer-owned figure registry (the
same shape `<Figure>` and `<FigureRef>` resolve against). The
integration hands it to the shipped `ChapterLayout` and the
injected reading route through the **`virtual:sophie/figures`**
virtual module — Vite synthesizes a tiny ESM module whose default
export is the registry that was passed in. Per ADR 0082
§ Consequences, this hand-off is build-time only: changes to
`figures.ts` require a **dev-server restart** (no HMR).

The injected reading route owns the route segment
`src/pages/units/[unit]/reading.astro`. If a consumer ships a file
at that exact path the integration warns at build time
("`<file>` shadows the injected reading route from
`@sophie/astro`; the consumer file will win"); the consumer file wins by Astro's
file-system precedence, but the warning surfaces the drift. Per
ADR 0082 the canonical setup is to delete the consumer copy and
rely on the injected route.

See [ADR 0082](../decisions/0082-chapter-layout-extraction.md) for
the full design (extraction motivation, virtual-module rationale,
shadow-detection invariant, alternatives considered).

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
`<FigureRef name="unknown">`, `<ChapterRef chapter="unknown">` all fall
back to bare-text render + dev `console.warn`. The audit pass
catches this systematically (D4 / E4 / F2 / C1 for chapter-side
miss; R1–R4 for cross-reference integrity between registry
declarations and chapter citations); fix authoring errors at build
time, not at runtime.

## Authoring traps (build-time-enforced)

Two MDX parse traps surfaced from the ADR 0064 chapter-migration
pilots produce opaque acorn errors far from the author's intent.
`@sophie/astro` ships a pre-parse Vite plugin
(`packages/astro/src/lib/mdx-plugins/mdx-author-traps.ts`) that
scans raw `.mdx` text BEFORE MDX/acorn runs and throws curated
`file:line:col` errors instead.

### Trap 1 — multi-line inline `$...$` math with TeX spacing macros

Inline math `$...$` should stay on a **single line** by convention.
The lint specifically flags the case that breaks MDX: a span that
wraps across a newline AND contains a `{...}` block whose body has
a `\` followed by a NON-letter (TeX spacing macros `\,` `\;` `\!`
`\\` etc.). When this happens, `remark-math` fails to recognize
the span, MDX hands the `{...}` to acorn as a JSX expression, and
acorn fails with *"Expecting Unicode escape sequence"* on the
`\<non-letter>`.

Multi-line spans containing only `\<letter>{...}` (e.g.,
`\lambda_{\text{obs}}`, `\sqrt{(1+\beta)/(1-\beta)}`) are
empirically tolerated by the current MDX/remark-math pipeline and
NOT flagged — but single-line discipline is still the recommended
authoring convention; rely on the lint as a safety net, not a
permission slip.

| Wrong (flagged) | Right |
|---|---|
| `$\mathrm{erg\,K^{-1}}` + newline + `{(\,)}$` (wraps; contains `\,` in braces) | `$\mathrm{erg\,K^{-1}}(\,)$` (single line) |
| (or use display) | `$$\mathrm{erg\,K^{-1}}(\,)$$` |

Originating finding: M3-L2 pilot Surprise #1 / [issue #190](https://github.com/drannarosen/sophie/issues/190).

### Trap 2 — raw `<` before a non-letter

A literal `<` followed by anything that is not a letter, `/`, `!`,
`?`, or whitespace makes MDX read the span as the start of a JSX
tag — and acorn fails with *"Unexpected character `N` before
name"*. The classic offender is `<3,700 K` in a table cell.
Escape as `&lt;` or wrap in math.

| Wrong | Right |
|---|---|
| `\| M \| <3,700 K \| ... \|` | `\| M \| &lt;3,700 K \| ... \|` |
| | `\| M \| $<3{,}700$ K \| ... \|` |

Both `<` inside inline code spans (`` `<3` ``) and inside fenced
code blocks (` ``` ... ``` `) are left alone — the lint scanner
masks code regions before checking.

Originating finding: M2-L2 pilot Surprise #3 / [issue #193](https://github.com/drannarosen/sophie/issues/193).

## `practice.mdx` deferral (no route yet)

`practice` is a valid [`ArtifactType`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/artifact.ts)
per [ADR 0067](../decisions/0067-section-level-artifacts.md), so
authoring `src/content/sections/<sec>/units/<unit>/practice.mdx`
builds clean against the content collection. But `@sophie/astro`
[(ADR 0082)](../decisions/0082-chapter-layout-extraction.md)
**does not yet inject a `/units/<unit>/practice` route** — the
route ships with [ADR 0073](../decisions/0073-unified-assessment-schema.md)
(unified assessment schema, unimplemented). Practice content
authored today silently never renders.

To make this gap visible, the integration emits a build-time
WARNING per `practice.mdx` it discovers, pointing at the
tracking issue ([#189](https://github.com/drannarosen/sophie/issues/189)).
Authors can: (a) ignore the warning and ship practice content
ahead of ADR 0073, (b) move the file out of `src/content/sections/`
to suppress the warning, or (c) wait for ADR 0073 to land before
authoring.

The decision to warn-and-defer (rather than ship a single-purpose
`practice` artifact type + route now) was made in the WS-A/B/C/E
triage cycle (2026-05-25): ADR 0073's broader assessment schema
may want a different route shape, and committing the route now
risks back-compat work later.

## Mobile rendering + a11y guarantees

The shipped `ChapterLayout` ([ADR 0082](../decisions/0082-chapter-layout-extraction.md))
ships two document-layer defenses that authors don't need to
think about — but should know exist so unexpected behavior on
narrow viewports points the right direction during debugging.

**Off-canvas overflow defense — `html { overflow-x: clip }`.**
Off-canvas drawers (the mobile TocDrawer, future popovers) are
`position: fixed` with `transform: translateX(100%)` to slide off
the viewport when closed. CSS transforms contribute to
`body.scrollWidth` even for fixed elements, so the drawer's
post-transform bounding box pushes the document horizontally
without this defense. `overflow-x: clip` on `<html>` (in
`packages/astro/src/styles/textbook-layout.css`) defends the
document layer against the whole class of off-canvas leaks.
`clip` is preferred over `hidden` because it does NOT create a
scroll container, so it preserves sticky positioning (topbar +
sidebar both rely on this) and scroll-snap behavior. Originating
finding: M3-L2 pilot's Surprise #3 / [issue #187](https://github.com/drannarosen/sophie/issues/187).

**KaTeX-display keyboard a11y — `rehypeKatexDisplayA11y` plugin.**
`rehype-katex` emits display equations as
`<span class="katex-display">…</span>`; the shipped layout applies
`overflow-x: auto` so wide equations scroll within their column.
Without `tabindex="0"` + an accessible name on the scroll
container, axe-core flags `scrollable-region-focusable` (keyboard-
only users can't reach scrolled content). A build-time rehype
plugin (`packages/astro/src/lib/pedagogy-index/transforms/katex-display-a11y.ts`,
wired into [`packages/astro/src/mdx-config.ts`](../decisions/0082-chapter-layout-extraction.md))
stamps `tabindex="0"` + `role="group"` + `aria-label="Equation, scrollable"`
on every `.katex-display` it sees. Build-time over runtime JS to
avoid the React #418 hydration class the [`useHydrated`](../decisions/0083-use-hydrated.md)
gates were built to defend against. Per R10 (AGENTS.md), the role
is `group` (named focusable region inside the chapter's `<main>`
landmark), not a landmark. Originating finding: M2-L2 pilot's
Surprise #2 / [issue #192](https://github.com/drannarosen/sophie/issues/192).

Display math authored via React components that bypass
`rehype-katex` (e.g., `<KeyEquation refId>` callsites which
render through the component layer at hydration time) do NOT
inherit these attributes. They're typically not flagged because
their container CSS keeps them un-scrollable, but if a future
audit catches a React-rendered `.katex-display` failing
`scrollable-region-focusable`, the fix belongs at the React
component layer — same `tabindex`/`role`/`aria-label` triple.

The regression guard is `examples/smoke/e2e/mobile-chapter-a11y.spec.ts`
against the minimal `mobile-a11y-fixture` chapter.

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
| Inline reference to another chapter | `<ChapterRef chapter="X" />` (W2/D3 prop rename; links to `/units/X/reading`) |
| Inline reference to a Teaching Decision Record | `<TDRRef num="14" />` (per [ADR 0040](../decisions/0040-teaching-decision-records.md)) |
| The chapter-opening "you will be able to..." list | `<LearningObjectives>` with `<Objective>` children |
| One concept presented across multiple representational modes (prose + equation + figure) with explicit cross-bindings | `<MultiRep>` with `<RepVerbal>` / `<RepEquation>` / `<RepFigure>` children (validated end-to-end by the [M2-L2 pilot](../pilots/m2-l2-surface-flux-and-colors.md)). `<RepCode>` deferred (pending `<CodeCell>`); intuition framing lives in `<RepVerbal>` prose. |
| The full OMI arc as a visible three-panel composite — observable evidence, the model that explains it, the inference that follows | `<OMIFlow id="…" concept="…">` with `<OMIFlow.Observable>` / `<OMIFlow.Model>` / `<OMIFlow.Inference>` children. Renderer emits canonical observable → model → inference order regardless of source order. Strict-3-slot invariant (ADR 0063). Chapters declaring `framing: "OMI"` in frontmatter must render ≥1 OMIFlow (OF-2). |
| A pedagogical intervention paired with a misconception (worked example, contrasting cases, bridging analogy, etc.) | `<Intervention type="..." addresses="this">` 🚧 nested inside a misconception `<Aside>` or `<Callout>` |
| Observational meaning / assumptions / units / validity domain / common misuses / derivation of an equation | `<Observable>` / `<Assumption>` / `<Units>` / `<BreaksWhen>` / `<CommonMisuse>` / `<DerivationStep>` as biography children in the equation's registry MDX body (`src/content/equations/<id>.mdx`). See [equation-registry-schema](equation-registry-schema.md). |
| A single checkbox for a tracked item | `<InteractiveCheckbox>` |
| A "predict before the answer" prompt | `<Predict>` |
| A confidence rating (1–5 or 1–7) | `<ConfidenceCheck>` |
| A "did you understand?" gate | `<ComprehensionGate>` |
| An effort-level self-report | `<EffortLog>` |
| A free-text reflection prompt | `<Reflection>` |
| A "Deep Dive" disclosure block | `<Dropdown label="…">body</Dropdown>` (single-item shorthand) or `<Dropdown>` with `<Dropdown.Item>` children (multi-item accordion) |
| In-flow recall prompt anchored to a pedagogy-graph node (equation / glossary / misconception / learning-objective / key-insight / topic) | `<RetrievalPrompt target="prefix:slug">` with required `<RetrievalPrompt.Prompt>` + `<RetrievalPrompt.Answer>` slot children. Amber left-band. Writes `practice_attempt` records via `useRetrievalAttempt`. Self-assess buttons (Got it / Partial / Missed it) render automatically below the revealed answer. Per Wedge B1 design doc §1. |
| Queued review surface that resurfaces past-attempted targets due for review | `<SpacedReview target="prefix:slug" max={3} />` (single-target scope) or `<SpacedReview section="<section-slug>" max={3} />` (Section-scope, **graduated in Wedge B-followup W1**). Section-scope resolves the slug → `UnitEntry`s in that Section → `unit.chapter` slugs → aggregates `practice_attempt` records via `useInteractiveRangeMulti`, then runs the LRU over the merged set with `max`. SR-1 audit invariant validates the section slug against `PedagogyIndex.sections`. Exactly-one selection rule (`target` xor `section`) enforced by Zod refine. Cyan left-band. Optional `<SpacedReview.Empty>` slot overrides the default empty-state message. Wedge B1 ships an LRU stub scheduler; Wedge D's FSRS replaces the function body. |
| Inline prereq-bridge prompt at the point a prereq concept is invoked mid-reading | `<SkillReview target="topic:X" />` or `<SkillReview target="topic:X#card-id" />` (self-closing form, resolved at MDX compile time by the topic-registry resolver — see *Topic registry + `<SkillReview>` self-closing form* below), OR `<SkillReview target="topic:X">` with inline `<SkillReview.Prompt>` + `<SkillReview.Answer>` + `<SkillReview.ReviewMore>` slot children (explicit form). Violet left-band. Same `target` prefix convention as RetrievalPrompt + SpacedReview. |
| Chapter-end roll-up of definitions | `<ChapterGlossary chapter="X" />` |
| Chapter-end roll-up of equations | `<ChapterEquations chapter="X" />` |
| Chapter-end roll-up of figures | `<ChapterFigures chapter="X" />` |
| Chapter-end roll-up of key insights | `<ChapterKeyInsights chapter="X" />` |
| Chapter-end roll-up of misconceptions | `<ChapterMisconceptions chapter="X" />` |
| Chapter-end roll-up of referenced Teaching Decision Records | `<ChapterTDRs chapter="X" />` |
| Course-wide pages | `<Course*>` on the matching `/library/glossary`, `/library/equations`, `/library/figures`, `/library/key-insights`, `/library/misconceptions`, `/library/objectives` route, plus the W4b + W4c dynamic Spec routes under `/library/topics/<id>/`, `/library/observables/<slug>/`, `/library/models/<slug>/`, `/library/inferences/<slug>/` |

Pick by pedagogical intent first; the static-vs-interactive split
and the chapter-vs-course aggregation level follow automatically.

## Section-scope `<SpacedReview>` lookup chain (W1)

`<SpacedReview section="<slug>" max={3} />` resolves cross-chapter
review aggregation through three hops, all build-time data exposed
via the `PedagogyIndex`:

```text
section="stars"                         # author-supplied prop
  ↓ filter UnitEntry by section_id
unitStore.all().filter(u => u.section_id === "stars")
  ↓ collect unit.chapter slugs
["spectra-and-composition", "stellar-evolution", …]
  ↓ useInteractiveRangeMulti(course, chapters, "practice-attempt:")
merged Record<key, PracticeAttempt[]> across all chapters
  ↓ selectLeastRecentlyAttempted({ attempts, max })
[target_id, target_id, …]               # rendered as "Review:" items
```

**Authoring rules:**

- Exactly one of `target=` or `section=` per callsite (Zod refine).
- `section` must be a valid `SectionEntry.slug` in
  [`PedagogyIndex.sections`](../../packages/core/src/schema/pedagogy-index.ts).
  Invalid refs emit **SR-1 ERROR** at audit time.
- `max` (default 3) caps the rendered list across all distinct
  `target_id`s in the merged attempt set — distinct topics compete
  for slots when more candidates exist than `max` allows.
- The `<SpacedReview.Empty>` slot is honored when the merged set is
  empty (no attempts yet in any chapter bound to a Unit in this
  Section).

**Cross-chapter LWW semantics:** identical unwrapped keys across
chapters (e.g., two chapters both writing `practice-attempt:topic:logs`
for distinct students of the same target) are merged last-chapter-wins
in iteration order — documented in
[`ResponseStore.getAllMulti`](../../packages/components/src/runtime/ResponseStore.ts).
The `practice-attempt:<target_id>` key shape rarely collides across
chapters in the same Section in practice (each chapter logs against
its own surfaced targets).

**Where the data flows from:**

1. Build-time: `TextbookLayout` calls `getCollection('sections')` +
   `getCollection('units')` and forwards via
   `indexAccumulator.setSections()` / `setUnits()`.
2. SSR-merge: `__setSections(pedagogy.sections)` +
   `__setUnits(pedagogy.units)` hydrate the client-side stores;
   `<script id="sophie-pedagogy-sections">` + `…-units` JSON payloads
   support auto-hydration when no setter ran (e.g., direct island
   mount).
3. Render-time: `<SpacedReview section=…>` reads `unitStore.all()`
   inside a `useMemo([section])` to derive the chapter list, then
   the cross-chapter range hook fires.

See [Wedge B-followup design doc D2](../../plans/2026-05-22-wedge-b-followup-design.md#d2--useinteractiverangemulti-hook-for-cross-chapter-range-reads)
for the rationale + cross-call contract.

## Topic registry + `<SkillReview>` self-closing form (W4b)

Per [ADR 0079](../decisions/0079-topic-registry-and-resolution-pattern.md),
Sophie ships a Topics content collection plus a SkillReview
self-closing resolver. The two land together because the
self-closing form is the resolver pattern's first user.

### Topic file shape (Design F: sub-grouped flat + inline cards)

Topic files live at
`src/content/topics/<category>/<topic-id>.mdx`. Category
subdirectories (`math/`, `physics/`, `astronomy/`, ...) are
**author convenience** only — they do NOT appear in URLs
(`/library/topics/<topic-id>` is flat) and have no semantic
meaning in the pedagogy graph. The "math fundamentals contains
logarithms" intuition is owned by **bridge rooms** (ADR 0068
Scale 1; below) one layer up, not by topic nesting.

Per-topic file shape:

```mdx
---
id: logarithms
label: Logarithms
summary: |
  Functions that invert exponentiation; map products to sums.
prereq_topic_ids: [exponents]
linked_equation_ids:
  - stefan-boltzmann
linked_misconception_ids:
  - logarithm-as-multiplication
cards:
  - id: product-rule
    label: Product rule
    difficulty: easy
  - id: power-rule
    label: Power rule
    difficulty: medium
---

<SkillReview.Card id="product-rule">
  <SkillReview.Prompt>
    What does $\log_b(xy)$ equal?
  </SkillReview.Prompt>
  <SkillReview.Answer>
    $\log_b(x) + \log_b(y)$ — logarithms turn products into sums.
  </SkillReview.Answer>
</SkillReview.Card>

<SkillReview.Card id="power-rule">
  <SkillReview.Prompt>...</SkillReview.Prompt>
  <SkillReview.Answer>...</SkillReview.Answer>
</SkillReview.Card>
```

The frontmatter `cards: []` array is the source of truth for
card metadata. Body `<SkillReview.Card id="X">` blocks must
match 1:1; **PRA-2** audit invariant catches mismatches in both
directions (frontmatter→body via `topic-consistency.ts`; body→
frontmatter via the topic extractor's `extractorFindings` push).

### `<SkillReview.Card>` slot vocabulary

Three named JSX nodes appear inside a topic file's body:

| Tag | Purpose |
|---|---|
| `<SkillReview.Card id="X">` | Card container; `id` must match a frontmatter entry. |
| `<SkillReview.Prompt>` | Required slot inside each card. The question shown to the student. Math + components render naturally. |
| `<SkillReview.Answer>` | Required slot inside each card. The answer + brief explanation. Often pairs with a quick "why this matters" sentence. |

Authors do **not** import these components — they're routed by
the chapter components map at compile time.

### Self-closing form: `<SkillReview target="topic:..." />`

In chapter MDX, authors invoke a topic-registry card via a
self-closing tag:

```mdx
{/* Single-card topic — auto-picks the one card. */}
<SkillReview target="topic:exponents" course="astr-201" unit="spoiler-alerts" />

{/* Multi-card topic — explicit fragment required. */}
<SkillReview target="topic:logarithms#product-rule" course="astr-201" unit="spoiler-alerts" />
```

At MDX compile time, the resolver remark plugin (lives in
`@sophie/astro` at
`packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`)
expands the self-closing form by lifting the matching card's
`<SkillReview.Prompt>` + `<SkillReview.Answer>` slot children
into the chapter tree. The SkillReview component itself is
unchanged.

**Bare target against a multi-card topic = ERROR** (per ADR
0079 Q6): the build fails with a curated message naming the
available cards. Authors must specify a fragment or use the
explicit-children form. The strict-ERROR-with-curated-message
shape carves room for Wedge D's adaptive selection (FSRS-driven
card pick) without retroactively redefining bare-target
semantics.

**Explicit-children form still works.** If a chapter wants a
one-off prompt that doesn't warrant a topic-registry entry, the
author writes:

```mdx
<SkillReview target="topic:exponents" course="..." unit="...">
  <SkillReview.Prompt>What does $b^m \cdot b^n$ equal?</SkillReview.Prompt>
  <SkillReview.Answer>$b^{m+n}$.</SkillReview.Answer>
</SkillReview>
```

The resolver is non-destructive on the explicit-children form
(it triggers only when the tag has zero children).

### PRA-1 graduation (WARN → ERROR; W4b)

`<SkillReview target="topic:X[#card]" />` now contributes
prereq-coverage in the **PRA-1 ERROR** invariant. A Unit
declaring `prereqs: [topic-id]` MUST have at least one
`<SkillReview target="topic:topic-id…">` in the same or prior
Section. The optional `#card` fragment is addressing detail —
PRA-1 strips it for the coverage check, so any callsite
referencing `topic:X` covers a prereq of `X` regardless of card.

Per ADR 0053, authors can opt out per-callsite via Unit
frontmatter:

```yaml
audit_overrides:
  - invariant: PRA-1
    anchor: nonexistent-topic
    tdr: TDR-XX
    reason: |
      Deliberately uncovered for fixture/test purposes.
```

The mandatory `tdr:` field anchors every override to a
Teaching Decision Record (provenance trail per ADR 0053 CF2).

## Bridge rooms (W4b)

Per [ADR 0068](../decisions/0068-bridge-rooms-and-prereq-pedagogy.md)
Scale 1, a Course can host bridge rooms — top-level pages
rendering a `Section[type=bridge]` from the sections content
collection. Each bridge slug becomes a Course-root URL segment
(e.g., `/math-fundamentals/`).

### Authoring a bridge section

```yaml
# src/content/sections/math-fundamentals/section.json
id: math-fundamentals
slug: math-fundamentals
title: Math Fundamentals
type: bridge
order: 0
description: |
  Math prerequisites for ASTR 201 — logarithms, exponents,
  basic algebra. Refresh before the first content section.
```

Bridge rooms render via `pages/[bridgeSlug].astro` — a
single-param dynamic route that walks the sections collection
and emits one path per `Section[type=bridge]`. Section title
+ description + a list of contained `Unit[type=skill]` entries
render in v1; per-unit artifact rendering lands in a future
wedge.

### BR-1 audit invariant — slug uniqueness

Bridge slugs collide with other routes if not unique. **BR-1**
catches this at build time. A bridge slug MUST NOT match:

- Any other Section's slug (bridge or regular).
- Any Unit's id (W3/D7 convention: Unit id is its slug).
- Reserved structural paths: `library`, `sections`, `units`,
  `topics`.

Fix the collision by renaming the bridge slug — the audit
output names the colliding entity.

### Scale 2 (inline `Section[type=bridge]`) — deferred

ADR 0068 also defines Scale 2 (inline mid-Section bridge
blocks). Per [W4 meta-plan Q3](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md),
Scale 2 is deferred until a curriculum pilot demands it.

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
| Retrieval prompt | `rp-` | auto: `rp-${counter}` per chapter (Wedge B1) |
| Spaced review | `sp-` | auto: `sp-${counter}` per chapter (Wedge B1) |
| Skill review | `sk-` | auto: `sk-${counter}` per chapter (Wedge B1) |

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
- [ADR 0068](../decisions/0068-bridge-rooms-and-prereq-pedagogy.md) — Bridge rooms + prereq pedagogy. `<SkillReview>` lives here; Wedge B1 unifies its signature with the rest of the retrieval family (target prefix-typed: `topic:`, `eq:`, etc.).
- [Wedge B1 design doc](../../plans/2026-05-21-wedge-b1-retrieval-family-design.md) — locked decisions for `<RetrievalPrompt>` + `<SpacedReview>` + `<SkillReview>`: shared `<RetrievalCard>` primitive, `practice_attempt` persistence shape, LRU stub scheduler, target-prefix convention, smoke chapter usage. PRA-1 / RET-1 / SR-1 curriculum-CI invariants.
- [Wedge B-followup design doc](../../plans/2026-05-22-wedge-b-followup-design.md) — W1 graduation of PRA-1 (Unit-aware) + SR-1 (section-validity) + `<SpacedReview section=…>` end-to-end rendering. Adds `sections` + `units` collections to `PedagogyIndex` and the `useInteractiveRangeMulti` hook for cross-chapter range reads. Locks ADR 0067 as Sophie's canonical content shape via the four-wedge W1→W4 migration sequence.
- [ADR 0061](../decisions/0061-ai-optimized-codebase-design.md) — AI-optimized codebase design (six rules including docs-atomic-with-code).
- [ADR 0082](../decisions/0082-chapter-layout-extraction.md) — Chapter layout + reading route extracted into `@sophie/astro`; consumers receive both via the integration, hand in the figure registry as a config option, and read it through `virtual:sophie/figures`.
- [equation-registry-schema](equation-registry-schema.md) — the registry MDX shape (frontmatter + biography body).
- [Component contract](component-contract.md) — the TypeScript interface every component implements.
- [Add a custom component](../how-to/add-a-custom-component.md) — recipe for new components.
