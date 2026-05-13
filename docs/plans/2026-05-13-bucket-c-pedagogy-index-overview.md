---
title: Bucket C — Pedagogy Index Infrastructure (overview)
date: 2026-05-13
status: brainstorm-output
phase: 2 (Bucket C / pedagogy index)
predecessor: PR #35 (Aside)
---

# Bucket C — Pedagogy Index Infrastructure (overview)

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

## Decisions locked during the 2026-05-13 brainstorm

| # | Decision |
|---|---|
| 1 | **Asides are canonical** for definitions. `<MiniGlossary>` deprecates (renamed to `<ChapterGlossary />` + `<CourseGlossary />`; data source flips from author-passed props to build-time index). |
| 2 | **One build-time index powers all consumers.** Definitions index produced once per build; consumed by chapter glossary, course glossary, `<GlossaryTerm>` popovers, and cross-ref previews. |
| 3 | **Title is canonical for term identity.** Slug auto-generated from title. Duplicate terms across chapters fail the build (audit error). Authoring guideline: define each term ONCE, in the chapter where it first matters. |
| 4 | **Custom remark plugin** extracts asides during MDX parse. Walks AST, captures `{ term, slug, body, chapter, anchor }`. Generalizable to other component types (equations, key-insights, figures). |
| 5 | **PR 8 (`<GlossaryTerm>` popovers) folds into PR-C1.** All four definition-related consumers (chapter glossary, course glossary, popover, cross-ref) ship together. Bucket B's 10-PR list becomes 9. |
| 6 | **Full pedagogy index infrastructure as Bucket C.** Not a Bucket B addendum — its own bucket with ~4 PRs. Bucket B PRs 7, 9, 10 stay scheduled; PR 8 absorbed; PR 9 (cross-ref previews) ships post-Bucket-C to consume the index for term/equation/figure cross-refs. |

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

## Sources → consumers map

| Source primitive | Schema status | Chapter consumer | Course consumer |
|---|---|---|---|
| `<Aside kind="definition" title="...">` | shipped (PR 6) | `<ChapterGlossary />` | `<CourseGlossary />` + `/glossary` route |
| `<Aside kind="key-insight">` | shipped (PR 6) | `<ChapterKeyInsights />` | (optional) `/key-insights` |
| `<Aside kind="digression">` | shipped (PR 6) | (optional) `<ChapterDigressions />` ("Further reading") | — |
| `<KeyEquation>` | shipped | `<ChapterEquations />` | `<CourseEquations />` + `/equations` route |
| `<Figure>` (registry mode) | shipped | `<ChapterFigures />` | `/figures` route |
| `<LearningObjectives>` | shipped | already chapter-top | `/objectives` (coverage map) |
| Citations | future (v1.0 Cluster 3) | inline | `/references` (bibliography) |

## Cross-reference consumers (PR 9 + future)

| Inline component | Index source | Renders |
|---|---|---|
| `<GlossaryTerm name="parallax">` | definitions | term span + hover popover with body |
| `<ChapterRef slug="spoiler-alerts">` | chapter frontmatter | chapter link + hover preview of title/description |
| `<EqRef slug="snell-law">` | equations | equation number + hover preview |
| `<FigureRef name="cosmic-distance-ladder">` | figures | "Fig. 1.4" + hover preview |
| `<SectionRef slug="distance-ladder">` | section anchors (auto-derived from H2/H3) | section link + preview |

## PR sequence (Bucket C — proposed)

| PR | Scope | New components / files | Test budget |
|---|---|---|---|
| **PR-C1** | Definitions index + 3 consumers + audit | `lib/pedagogy-index.ts` (remark plugin), `<ChapterGlossary />`, `<CourseGlossary />`, `<GlossaryTerm />` (Radix Popover), `/glossary` route, `<MiniGlossary>` deprecation + migration | ~30 unit + ~12 e2e |
| **PR-C2** | Equations index + 2 consumers | `<ChapterEquations />`, `<CourseEquations />`, `/equations` route, `<EqRef />` (consumes index for cross-ref) | ~15 unit + ~8 e2e |
| **PR-C3** | Summaries + figures consumers | `<ChapterKeyInsights />`, `<ChapterFigures />`, `<FigureRef />`, optional course routes | ~12 unit + ~8 e2e |
| **PR-C4** | LO course roll-up + audit invariants | `/objectives` coverage map, `<ChapterRef />` (chapter cross-ref), build-time audit: undefined terms used, orphan definitions, duplicate terms | ~15 unit + ~10 e2e |

Total: ~72 unit + ~38 e2e new test cases across Bucket C.

## Interaction with Bucket B (remaining)

| Bucket B PR | Status / interaction |
|---|---|
| 7 (Pagefind search) | **Independent** — runs anytime. Pagefind already indexes all chapter content; the search index complements (not competes with) the pedagogy index. |
| 8 (`<GlossaryTerm>` popover) | **Absorbed** into Bucket C PR-C1. |
| 9 (cross-ref previews) | **Splits**: `<ChapterRef>` lands in PR-C4 (chapter index); `<EqRef>` in PR-C2; `<FigureRef>` in PR-C3. Original "PR 9" as a unit disappears. |
| 10 (print stylesheet) | **Independent** — runs anytime. |

**Recommended sequence**: PR 7 → PR-C1 → PR-C2 → PR-C3 → PR-C4 → PR 10. Each PR ships consumers as soon as their index dependency is ready. Bucket B + C complete in this order = full v1 chrome + pedagogy.

## Pedagogy index schema (draft)

```ts
// packages/core/src/pedagogy-index.ts

export interface DefinitionEntry {
  term: string;        // canonical, from <Aside title>
  slug: string;        // url-safe, from title
  body: string;        // pre-rendered HTML of the aside's body
  chapter: string;     // chapter slug containing the source aside
  anchor: string;      // DOM id on the source aside for back-links
}

export interface EquationEntry {
  slug: string;        // from <KeyEquation> id/name
  label: string;       // display label (e.g. "Snell's Law")
  number?: number;     // chapter-local equation number
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

export interface PedagogyIndex {
  definitions: ReadonlyArray<DefinitionEntry>;
  equations: ReadonlyArray<EquationEntry>;
  keyInsights: ReadonlyArray<KeyInsightEntry>;
  figures: ReadonlyArray<FigureEntry>;
}
```

The index lives in `@sophie/core` (per ADR 0001's separation: core
is the data-shapes layer). Astro components consume it via a thin
runtime helper or via Astro Content Collections.

## Audit invariants (planned for PR-C4)

Build-time checks that fail the build (or warn) when violated:

1. **Duplicate terms across chapters** — same canonical slug
   defined in two chapters. Error (chapters disambiguate?
   schema check via map of seen slugs during extraction).
2. **Orphan definitions** — defined term that no `<GlossaryTerm>`
   inline reference uses. Warning (might be intentional for a
   reference-only term).
3. **Undefined `<GlossaryTerm name="X">`** — inline reference
   to a term that doesn't exist in the index. Error.
4. **Definitions outside `<Aside kind="definition">`** —
   `<MiniGlossary>` (deprecated) still in use after migration
   window. Error.
5. **Empty title on `<Aside kind="definition">`** — title is now
   *required* for the definition kind (schema change). Error.

## Open questions for the next session

These were surfaced but not resolved during this brainstorm:

1. **Anchor ID strategy for asides** — auto-slug from title?
   Explicit `id` prop? Hybrid (auto with override)?
   Recommend hybrid (matches Markdown heading slugification).
2. **Body content storage** — HTML string (pre-rendered, simplest)
   vs MDX source (re-render at consumer time, more flexible)
   vs structured AST node (richest, hardest).
3. **Sort order** — alphabetical (glossary convention) vs
   appearance order (matches chapter flow) vs hybrid (course
   view alphabetical, chapter view appearance).
4. **Aliases / synonyms** — does "parallax" auto-match "parallaxes"
   (stemming)? "stellar parallax" → "parallax"? Schema field for
   explicit aliases?
5. **`<Aside kind="definition">` schema change** — make `title`
   required for this kind specifically (Zod refinement).
6. **Cross-reference target** — does `<GlossaryTerm>` link to
   the canonical aside (in some other chapter) or to the
   chapter-glossary entry (current chapter)?
7. **Misconception kind** — should we add `<Aside kind="misconception">`
   for "common student errors"? Auto-aggregates to a chapter
   review section. Lower priority; defer to first authoring
   need.

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

1. **Resolve the 7 open questions** above via brainstorm round 2.
2. **Write PR-C1 detailed design doc** (the big first deliverable).
3. **Draft ADR 0038** — pedagogy-index pattern (codifies the
   architectural commitment in this overview).
4. **Begin PR-C1 implementation** following the TDD discipline
   established in Bucket B.

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
