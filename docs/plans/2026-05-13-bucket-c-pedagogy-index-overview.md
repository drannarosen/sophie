---
title: Bucket C — Pedagogy Index Infrastructure (overview)
date: 2026-05-13
status: design-locked (round-2 brainstorm complete)
phase: 2 (Bucket C / pedagogy index)
predecessor: PR #35 (Aside)
---

# Bucket C — Pedagogy Index Infrastructure (overview)

> **Update — round-2 brainstorm complete (2026-05-13).** The
> 7 open questions from the initial brainstorm are resolved
> below in "Decisions locked — round 2". Sequencing decision:
> Bucket C runs FIRST, then Bucket B PR 7 (now expanded to
> faceted search), then PR 10. Misconceptions get dual
> treatment (Aside + Callout) under a unifying pedagogical-role
> principle. Index schema finalized.

## Why this exists

PR 6 shipped `<Aside kind="definition" title="X">` as the
canonical inline-margin definition primitive. During the
post-merge brainstorm (2026-05-13), the project surfaced a
bigger architectural opportunity than "use asides for
glossaries":

> Every structured pedagogy component can become an
> **extractable source**. Every consumer (chapter glossary,
> course glossary, hover popover, summary list, figure index,
> equations index, course objectives roll-up) becomes a *view*
> of a single build-time index. The infrastructure that turns
> structured components into indexed data is a **platform
> feature** — not a per-component implementation.

This is the schema-driven authoring story from
[ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md)
made concrete: AI scaffolds chapter content using structured
components; structure produces navigation surfaces for free.

## Decisions locked — round 1 (initial brainstorm)

| # | Decision |
|---|---|
| 1 | **Asides are canonical** for definitions. `<MiniGlossary>` deprecates (renamed to `<ChapterGlossary />` + `<CourseGlossary />`; data source flips from author-passed props to build-time index). |
| 2 | **One build-time index powers all consumers.** Definitions index produced once per build; consumed by chapter glossary, course glossary, `<GlossaryTerm>` popovers, and cross-ref previews. |
| 3 | **Title is canonical for term identity.** Slug auto-generated from title. Duplicate terms across chapters fail the build (audit error). Authoring guideline: define each term ONCE, in the chapter where it first matters. |
| 4 | **Custom remark plugin** extracts asides during MDX parse. Walks AST, captures `{ term, slug, body, chapter, anchor }`. Generalizable to other component types (equations, key-insights, figures). |
| 5 | **PR 8 (`<GlossaryTerm>` popovers) folds into PR-C1.** All four definition-related consumers (chapter glossary, course glossary, popover, cross-ref) ship together. Bucket B's 10-PR list becomes 9. |
| 6 | **Full pedagogy index infrastructure as Bucket C.** Not a Bucket B addendum — its own bucket with ~4 PRs. Bucket B PRs 7, 9, 10 stay scheduled; PR 8 absorbed; PR 9 (cross-ref previews) ships post-Bucket-C to consume the index for term/equation/figure cross-refs. |

## Decisions locked — round 2 (post-PR-6, this brainstorm session)

| # | Decision |
|---|---|
| 7 | **Bucket C runs first; then Bucket B PR 7 (faceted search); then PR 10 (print).** Bucket C-first lets PR 7 ship faceted-search consuming the pedagogy index (search definitions / equations / figures with structured preview cards). Authoring confidence wins: chapters #2 and #3 will be drafted *after* the structured-content pipeline is hardened. |
| 8 | **`title` is REQUIRED for `<Aside kind="definition">`.** Zod schema refinement: when `kind === "definition"`, `title` must be present. Other kinds (note / digression / key-insight / future misconception) keep title optional. Authoring error if a definition aside lacks a title — catches "silently missing glossary entry" at the schema layer. |
| 9 | **Anchor IDs: hybrid auto-slug + explicit override.** Default `id={slug(title)}` on the rendered `<details>` element. Authors can override with explicit `<Aside id="...">` for collision resolution or migration. Matches Markdown heading slugification (Astro already auto-applies this to H2/H3). Build-time audit detects intra-chapter slug collisions and fails with a hint. |
| 10 | **No aliases / synonyms in v1.** Exact-match only. `<GlossaryTerm name="parallax">` requires a definition titled "Parallax" (case-insensitive slug match). When authoring practice surfaces a need (e.g. prose uses "parallaxes" and can't refactor), add `aliases?: string[]` to AsidePropsSchema. AI authoring will help normalize prose to canonical terms at scaffolding time. |
| 11 | **Body content: pre-rendered HTML string.** Remark plugin renders each aside's body to HTML at extraction time; index entries carry `body: string` containing rendered HTML. Consumers embed via `set:html={entry.body}`. Loses nested-interactivity (no `<Predict>` inside a definition) — accepted; definitions shouldn't be interactive. Simplest consumer code, no re-render cost. |
| 12 | **Sort order: ChapterGlossary alphabetical default + `order` prop; CourseGlossary alphabetical only.** Reference convention wins for the common case; appearance-order opt-in via `<ChapterGlossary order="appearance" />` for reading-flow review. Same applies to `<ChapterEquations>` and `<ChapterFigures>` (chapter-scoped consumers). |
| 13 | **`<GlossaryTerm>` click target: canonical aside in source chapter; hover popover shows definition.** Click navigates to the section of the original source chapter; hover shows the definition inline (no navigation needed for quick reference). CourseGlossary entries have a "defined in chapter X" back-link to the canonical source. Makes definitions feel like first-class concept anchors. |
| 14 | **Misconceptions: dual treatment (Aside kind + Callout variant); both feed one `misconceptions` collection.** Add `<Aside kind="misconception">` for 1-2 sentence flags (marginal reminders). Rename `<Callout variant="caution">` → `<Callout variant="misconception">` for full-treatment misconceptions (multi-paragraph contrast + correction). Both source components feed `pedagogyIndex.misconceptions` with a `length: "short" \| "long"` tag. `<ChapterMisconceptions />` consumer renders both with visual distinction. Authoring rule: length determines which. |

## Architectural principle that emerged

`★ Insight from round 2: index collections aggregate by pedagogical role, not by component type.`

The misconception decision (round 2 #14) generalizes: each entry
in the pedagogy index has a `role` (definition / equation /
key-insight / figure / misconception / objective / ...), and any
source component can carry that role. The index aggregates
*across* component types. The remark plugin's job is "extract
every component that has an identifiable pedagogical role; tag
with role + source-component metadata."

Consequences for future kinds:
- Adding a new pedagogical role typically means: (a) add the
  source-component variant (e.g. `<Aside kind="X">` or
  `<Callout variant="X">`); (b) extend the remark plugin to
  recognize it; (c) build the chapter + course consumers.
- A single role can have multiple source types (misconception
  has 2 today; future roles might have more).
- A single source component can carry multiple roles via its
  kind/variant enum.

This is documented as the "role-aggregation principle" in the
forthcoming ADR 0038 (pedagogy index pattern).

## The pattern in one diagram

```
                    ┌──────────────────────────┐
                    │   MDX chapter source     │
                    │  (canonical content)     │
                    └────────────┬─────────────┘
                                 │
                 build-time      │ remark plugin walks AST
                                 ▼
                    ┌──────────────────────────┐
                    │   Pedagogy Index         │
                    │  { definitions: [...],   │
                    │    equations:   [...],   │
                    │    keyInsights: [...],   │
                    │    figures:     [...],   │
                    │    objectives:  [...] }  │
                    └────────────┬─────────────┘
                                 │
            ┌────────────┬───────┴───────┬─────────────┐
            ▼            ▼               ▼             ▼
       <Chapter*/>   <Course*/>     <GlossaryTerm/>  Audit
                                    <ChapterRef/>    invariants
                                    <EqRef/>
                                    <FigureRef/>
```

## Sources → consumers map (post round-2)

Index collections aggregate **by pedagogical role**, not by
component type. Some roles have multiple source components.

| Role | Source primitive(s) | Schema | Chapter consumer | Course consumer |
|---|---|---|---|---|
| definition | `<Aside kind="definition" title="...">` (**title required**) | shipped (PR 6) + Zod refinement in PR-C1 | `<ChapterGlossary />` (alphabetical default; `order="appearance"` opt-in) | `<CourseGlossary />` + `/glossary` route |
| equation | `<KeyEquation>` | shipped | `<ChapterEquations />` | `<CourseEquations />` + `/equations` route |
| key-insight | `<Aside kind="key-insight">` | shipped (PR 6) | `<ChapterKeyInsights />` | (optional) `/key-insights` |
| figure | `<Figure>` (registry mode) | shipped | `<ChapterFigures />` | `/figures` route |
| digression | `<Aside kind="digression">` | shipped (PR 6) | (optional) `<ChapterDigressions />` ("Further reading") | — |
| **misconception** (NEW) | `<Aside kind="misconception">` (short) OR `<Callout variant="misconception">` (long, renamed from `caution`) | adds 1 AsideKind + renames 1 CalloutVariant in PR-C3 | `<ChapterMisconceptions />` (renders both lengths with visual distinction) | (optional) `/misconceptions` |
| objective | `<LearningObjectives>` | shipped | already chapter-top | `/objectives` (coverage map) |
| citation | future (v1.0 Cluster 3) | future | inline | `/references` (bibliography) |

## Cross-reference consumers (PR 9 + future)

| Inline component | Index source | Renders |
|---|---|---|
| `<GlossaryTerm name="parallax">` | definitions | term span + hover popover with body |
| `<ChapterRef slug="spoiler-alerts">` | chapter frontmatter | chapter link + hover preview of title/description |
| `<EqRef slug="snell-law">` | equations | equation number + hover preview |
| `<FigureRef name="cosmic-distance-ladder">` | figures | "Fig. 1.4" + hover preview |
| `<SectionRef slug="distance-ladder">` | section anchors (auto-derived from H2/H3) | section link + preview |

## PR sequence (LOCKED — round 2)

Bucket C runs FIRST, then Bucket B PR 7 (expanded scope), then
PR 10.

| PR | Scope | New components / files | Test budget |
|---|---|---|---|
| **PR-C1** | Definitions index + 3 consumers + audit + Aside title-required refinement | `@sophie/core/pedagogy-index.ts` (types), remark plugin (`@sophie/astro/lib/pedagogy-index-extractor.ts`), `<ChapterGlossary />`, `<CourseGlossary />`, `<GlossaryTerm />` (Radix Popover), `/glossary` route, `<MiniGlossary>` deprecation + smoke chapter migration | ~30 unit + ~12 e2e |
| **PR-C2** | Equations index + 2 consumers + EqRef | `<ChapterEquations />`, `<CourseEquations />`, `/equations` route, `<EqRef />` (consumes index for cross-ref with hover preview) | ~15 unit + ~8 e2e |
| **PR-C3** | Key-insights + figures + misconceptions | `<ChapterKeyInsights />`, `<ChapterFigures />`, `<FigureRef />`, `<ChapterMisconceptions />`, AsideKind `+misconception`, CalloutVariant `caution → misconception` rename, optional course routes | ~18 unit + ~12 e2e |
| **PR-C4** | LO course roll-up + ChapterRef + audit invariants | `/objectives` coverage map, `<ChapterRef />` (chapter cross-ref with hover preview), build-time audit: undefined terms used, orphan definitions, duplicate terms, intra-chapter anchor collisions | ~15 unit + ~10 e2e |

Total: ~78 unit + ~42 e2e new test cases across Bucket C.

## After Bucket C — Bucket B remainders (revised scope)

| PR | Status / scope change |
|---|---|
| **PR 7 (search)** | **Expanded.** Originally "Pagefind text search with Cmd-K modal." Now: **faceted search consuming the pedagogy index**. Pagefind base-indexes prose; the modal exposes filters by index role (definitions / equations / figures / chapters). Preview cards in search results render the role-appropriate component (term + body for definitions, equation + label for equations, etc.). Same engineering work as the original PR 7 + ~30% more for the faceting UI. Inherits ADR 0037 cross-bundle pattern for modal-open ↔ chrome state. |
| ~~8 (`<GlossaryTerm>`)~~ | **Absorbed into PR-C1.** |
| ~~9 (cross-ref previews)~~ | **Split across Bucket C:** `<EqRef>` in PR-C2; `<FigureRef>` in PR-C3; `<ChapterRef>` in PR-C4. |
| **PR 10 (print)** | **Unchanged scope.** Pure CSS `@media print` rules; print-as-Wide; collapse interactive state; hide chrome. Ships last. |

**LOCKED SEQUENCE**: PR-C1 → PR-C2 → PR-C3 → PR-C4 → PR 7 → PR 10.

Six PRs remaining to complete v1 chrome + pedagogy.

## Pedagogy index schema (FINAL — round 2)

```ts
// packages/core/src/pedagogy-index.ts

/**
 * Every index entry carries enough metadata to:
 *   - render the entry (body, title, etc.)
 *   - back-link to its source (chapter + anchor)
 *   - support cross-references by canonical identifier (slug)
 *   - sort/group consistently across consumers
 */

export interface DefinitionEntry {
  /** Canonical term (from <Aside title>, REQUIRED by Zod refinement). */
  term: string;
  /** URL-safe slug. Auto-generated from title; can be overridden by explicit `<Aside id="...">`. */
  slug: string;
  /** Pre-rendered HTML of the aside body. Embedded via `set:html`. */
  body: string;
  /** Chapter slug containing the source aside. */
  chapter: string;
  /** DOM id on the source <details> element; for back-links. */
  anchor: string;
}

export interface EquationEntry {
  slug: string;
  label: string;
  number?: number;
  body: string;        // pre-rendered KaTeX HTML
  chapter: string;
  anchor: string;
}

export interface KeyInsightEntry {
  body: string;        // pre-rendered HTML
  chapter: string;
  anchor: string;
}

export interface FigureEntry {
  name: string;        // registry name
  caption?: string;
  chapter: string;
  anchor: string;
}

/**
 * NEW (round 2): misconceptions aggregate from BOTH source
 * component types under one pedagogical role. `length` is the
 * source-component discriminator.
 */
export interface MisconceptionEntry {
  body: string;
  chapter: string;
  anchor: string;
  length: "short" | "long";   // "short" = Aside, "long" = Callout
  /** Optional short header (the Callout title or Aside title). */
  label?: string;
}

export interface PedagogyIndex {
  definitions: ReadonlyArray<DefinitionEntry>;
  equations: ReadonlyArray<EquationEntry>;
  keyInsights: ReadonlyArray<KeyInsightEntry>;
  figures: ReadonlyArray<FigureEntry>;
  misconceptions: ReadonlyArray<MisconceptionEntry>;
  // Future collections: digressions, citations, objectives (course roll-up).
}
```

The index lives in `@sophie/core` (per ADR 0001's separation: core
is the data-shapes layer). The remark plugin that produces it
lives in `@sophie/astro/lib/pedagogy-index-extractor.ts`. Astro
components consume it via a thin runtime helper or via Astro
Content Collections (decision deferred to PR-C1 design doc).

## Audit invariants (planned for PR-C4)

Build-time checks that fail the build (or warn) when violated:

1. **Duplicate terms across chapters** — same canonical slug
   defined in two chapters. Build ERROR. Resolution: rename or
   consolidate.
2. **Intra-chapter slug collision** — two `<Aside kind="definition">`
   in the same chapter generating the same auto-slug. Build ERROR.
   Resolution: explicit `<Aside id="...">` override on one.
3. **Empty title on `<Aside kind="definition">`** — Zod refinement
   error at the schema layer (caught before build). Resolution:
   add the title or change kind.
4. **Undefined `<GlossaryTerm name="X">`** — inline reference to a
   term that doesn't exist in the index. Build ERROR.
5. **Orphan definitions** — defined term that no `<GlossaryTerm>`
   reference uses anywhere. Build WARNING (may be intentional for
   reference-only terms, e.g. a definition meant for the glossary
   without inline usage).
6. **Definitions outside `<Aside kind="definition">`** —
   `<MiniGlossary>` (deprecated) still in use after PR-C1's
   migration. Build ERROR.

## Other clever ideas surfaced

These are pedagogically interesting but lower priority — file
under "future polish":

- **Flashcard generator** — definitions index → exportable
  flashcard set (.csv or Anki .apkg)
- **AI quiz authoring** — definitions index + key-insights →
  draft quiz items; AI fills in distractors
- **Concept map nodes** — Phase 2 feature; definitions index
  becomes nodes; `<GlossaryTerm>` inline references become edges
- **Coverage-gap audit** — terms used in prose (NLP detection)
  but not defined as asides → suggest authoring a definition
- **Translation surface** — i18n targets the structured
  `title + body` pair cleanly (per ADR 0009 plans for future
  i18n)
- **Reading-difficulty metric** — count of `<GlossaryTerm>`
  density per paragraph as a readability heuristic

## What this brainstorm does NOT change

- ADR 0032 (vanilla JS chrome state) — unchanged; this is content
  layer, not chrome
- ADR 0036 (definePreference factory) — unchanged
- ADR 0037 (cross-bundle DOM observation) — unchanged
- PR 6's `<Aside>` schema — title becomes required for
  `kind="definition"`, otherwise unchanged
- PR 4's `<TocSidebar>` — section anchors will become an
  *implicit* index source in PR-C4

## Next session: where to start

Round-2 brainstorm complete (this revision). Remaining
implementation gates:

1. **Write PR-C1 detailed design doc** (`docs/plans/<next-date>-pr-c1-glossary-index-design.md`).
   Builds on this overview; specifies the remark plugin API,
   the `<ChapterGlossary />` + `<CourseGlossary />` + `<GlossaryTerm />`
   contracts in detail, the smoke chapter migration path,
   TDD test list (~30 unit + ~12 e2e), and the
   `<MiniGlossary>` deprecation procedure.
2. **Draft ADR 0038 — pedagogy index pattern** (codifies the
   role-aggregation principle from this overview's round-2
   insight; direct-push to main per the ADRs-codify-shipped-
   patterns cadence, but written ahead of PR-C1 to ensure the
   implementation can cite it). Also covers PR 5's two-adapter
   Lucide icon convention if we're consolidating ADRs at once.
3. **Begin PR-C1 implementation** following the TDD discipline
   established across Bucket B. Iron-law: no production code
   without a failing test first.

## References

- [Bucket B PR 6 audit](../reviews/2026-05-13-bucket-b-pr6-audit.md) — current state (A+, 96/100).
- [PR 6 Aside design doc](2026-05-13-aside-design.md) — the
  canonical-source primitive this builds on.
- [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md) —
  AI-as-primary-author model; this infrastructure is its concrete
  expression.
- [ADR 0036](../website/decisions/0036-define-preference-factory-pattern.md) —
  the analogous "factory pattern" for chrome state; PR-C1's
  remark plugin is the analogous pattern for content extraction.
- [overview.md §17 Cluster 4](../website/overview.md) — Glossary
  system was scheduled here; this Bucket C overview supersedes
  the cluster-4 plan.
