---
title: PR-C3 — Key-insights + Figures + Misconceptions (overview)
date: 2026-05-14
status: design-locked
phase: 2 (Bucket C / pedagogy index)
predecessor: PR-C2 (#37, merged at e9defa3)
revises: 2026-05-13 Bucket C overview decisions #14 (caution→misconception rename) and figures schema stub
---

# PR-C3 — Key-insights + Figures + Misconceptions (overview)

## Why this exists

PR-C3 ships **three pedagogical roles in one PR** — the third and largest
instance of the ADR 0038 pedagogy index pattern. PR-C1 established the
machinery (definitions); PR-C2 extended it to equations; PR-C3 extends it
to key-insights, figures, and misconceptions while doing a meaningful
refactor of the React-store layer (shared factory extraction) and
introducing the **two-tier figures model** to handle the asset/usage
distinction figures inherently have.

The infrastructure realities from PR-C2 carry through unchanged: globalThis
accumulator, virtual-module bypass on chrome critical path, `<script>`-tag
SSR→CSR transfer, HoverCard primitive for inline cross-refs. PR-C3 adds
ONE substantive new infrastructure piece: `createPedagogyStore<T>` factory
in `@sophie/components/runtime/` that migrates PR-C1's `definitions-store`,
PR-C2's `equations-store`, AND the new figures stores to a single shared
implementation.

This is the biggest single PR in Bucket C — three roles, two extended
source primitives, three new chapter consumers, three new course
consumers, one new inline-ref component (`<FigureRef>`), a meaningful
schema refinement (two-tier figures), and a cross-PR refactor (store
factory). Estimated ~15–18 subagent tasks; ~1500-2000 LOC.

## Revisions of the 2026-05-13 Bucket C overview

PR-C3's 2026-05-14 brainstorm revised two decisions from the earlier
Bucket C overview:

- **Decision #14 (caution → misconception)**: The original overview locked
  a hard rename. PR-C3 brainstorm decided to **add `misconception`
  alongside `caution`** in CalloutVariant. Rationale: keeps `caution` as a
  generic admonition variant distinct from the pedagogical misconception
  role; authors choose semantically. The 1 smoke chapter callsite (titled
  "Misconception Alert") still migrates to `variant="misconception"` since
  it IS semantically a misconception.
- **Figures schema stub**: The 2026-05-13 stub treated FigureEntry like
  DefinitionEntry/EquationEntry — one canonical chapter per entry. PR-C3
  brainstorm replaced this with a **two-tier model**: separate figure
  registry (asset data; consumer-app-controlled) + figure-usage entries
  (per-chapter `<Figure>` invocations in the pedagogy index). This handles
  multi-chapter figures and other-artifact reuse (slides, problem sets)
  natively. Schema implication: rename `FigureEntrySchema` →
  `FigureUsageEntrySchema`; add `FigureRegistryEntrySchema` to
  `@sophie/core` as a sibling type.

## Decisions locked (10 — PR-C3 brainstorm 2026-05-14)

| # | Decision |
|---|---|
| 1 | **Ship all 3 roles in one PR-C3** (overview-locked; confirmed). Key-insights + figures + misconceptions bundle naturally — shared machinery, both new roles touch the Aside schema, Callout schema gains 2 changes. Estimated ~15–18 subagent tasks; ~1500-2000 LOC. |
| 2 | **Callout: ADD `misconception` to CalloutVariant alongside `caution`** (REVISES 2026-05-13 overview decision #14, which locked a hard rename). Rationale: `caution` keeps general-warning semantics; `misconception` is the pedagogical-role variant that feeds the index. Migrate the 1 smoke chapter callsite (`spoiler-alerts.mdx:1209`, already titled "Misconception Alert") to `variant="misconception"`. ~5 file touches total. |
| 3 | **Two-tier figures model** (REVISES 2026-05-13 figure schema stub). Figure registry = source of truth for asset data (`{name, src, alt, caption?, credit?}`; consumer-app-controlled; one entry per name; flat namespace). Pedagogy figure-usages = per-chapter usage records (`{name, chapter, anchor, number, canonical, captionOverride?}`). Multi-chapter figures naturally produce N usage entries; future slide/problem-set artifacts get their own usage indices alongside `pedagogy-figures`. Schema: add `FigureRegistryEntrySchema` to `@sophie/core`; rename existing `FigureEntrySchema` → `FigureUsageEntrySchema`. |
| 4 | **Extract `createPedagogyStore<T>` factory in `@sophie/components/runtime/`** + migrate PR-C1's definitions-store, PR-C2's equations-store, and new figures stores to use it. Net ~110 LOC for all 4+ stores vs ~340 LOC duplicated. Pre-launch no-back-compat refactor. One point to fix bugs. The factory designs with 4 concrete shapes in hand (not speculative). |
| 5 | **`<FigureRef>` popover renders thumbnail + caption.** Small lazy-loaded `<img>` (max ~12rem × 8rem) + caption text. Caption resolution: `captionOverride` (usage) → `caption` (registry) → `name` (fallback). Matches EqRef's pedagogically-strong preview pattern. Click navigates to canonical usage's chapter+anchor. |
| 6 | **Figure numbering: per-usage chapter-scoped sequential + canonical resolution.** Each `<Figure>` JSX node gets a per-chapter sequential number (counter starting at 1; matches equation pattern). `<FigureRef name="X" />` (self-closing) renders `"Fig. N"` from the figure's canonical usage. Canonical = first usage by build order, OR an author-explicit `<Figure name="X" canonical />` wins. Chapter-index resolution ("Fig. 1.4") deferred to multi-chapter scale (render-time-only migration in `FigureRef.tsx`). |
| 7 | **Key-insight schema: title OPTIONAL; `KeyInsightEntry` gains `title?`.** AsideKind `"key-insight"` keeps title optional (Aside's current schema; not all marginal insights need names). `KeyInsightEntrySchema` extends stub to `{title?, body, chapter, anchor}`. ChapterKeyInsights renders `<dt>{entry.title ?? "Key insight"}</dt>`. Sort order: **appearance only** (no `order` prop — alphabetical doesn't fit untitled entries). No `<KeyInsightRef>` in v1. |
| 8 | **Misconception schema + extraction**: Aside misconception title optional (mirrors key-insight). Add `id?: string` to Callout (symmetric with Aside's `id?`; applies to all Callout variants). `MisconceptionEntry` stub stays as-is (`{body, chapter, anchor, length, label?}`). Single `extractMisconceptions` function walks BOTH `<Aside kind="misconception">` (length="short") AND `<Callout variant="misconception">` (length="long"); length discriminator from node.name. |
| 9 | **Ship all three course consumers**: `<CourseFigures />` + `/figures`, `<CourseKeyInsights />` + `/key-insights`, `<CourseMisconceptions />` + `/misconceptions`. Sort defaults: CourseFigures chapter-order default + alphabetical opt-in (mirrors CourseEquations); CourseKeyInsights appearance-only (untitled entries); CourseMisconceptions chapter-order default + alphabetical-by-label opt-in. Consistency principle: every chapter consumer has a course mirror. |
| 10 | **Audit invariants — PR-C3 defense-in-depth THROWS**: K1 (key-insight intra-chapter anchor collision), K2 (key-insight empty body warning), M1 (misconception intra-chapter slug collision), M2 (misconception cross-chapter slug collision), M3 (misconception empty body warning), F3 (multiple figures marked `canonical` for same name), F5 (figure intra-chapter anchor collision). **PR-C4 systematic**: F1 (`<Figure name="X" />` with X not in registry), F2 (`<FigureRef name="X" />` with X having zero usages), F4 (registry figure with zero usages WARNING). Registry-consistency checks need consumer-build state — properly PR-C4. |

## Schema (FINAL)

```ts
// packages/core/src/schema/pedagogy-index.ts

// EXISTING (unchanged): DefinitionEntry, EquationEntry, PedagogyIndex (top-level)

// EXTENDED:
export const KeyInsightEntrySchema = z.object({
  /** Optional human-readable title (from <Aside title>). NEW in PR-C3. */
  title: z.string().optional(),
  /** Pre-rendered HTML of the aside body. */
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
});

// REPLACED (was FigureEntrySchema):
export const FigureRegistryEntrySchema = z.object({
  /** Canonical figure name (registry key; flat namespace). */
  name: NonEmptyString,
  /** Image asset URL or local path. */
  src: NonEmptyString,
  /** Alt text for accessibility. */
  alt: NonEmptyString,
  /** Default caption (used when no per-usage override). */
  caption: z.string().optional(),
  /** Attribution / credit text. */
  credit: z.string().optional(),
});

export const FigureUsageEntrySchema = z.object({
  /** Registry key — must resolve to a FigureRegistryEntry at SSR merge time. */
  name: NonEmptyString,
  /** Chapter slug containing the source `<Figure>` JSX. */
  chapter: Slug,
  /** DOM id on the rendered <figure> element; back-link target. */
  anchor: NonEmptyString,
  /** Per-chapter sequential number, extractor-assigned at appearance order. */
  number: z.number().int().positive(),
  /** Set by the author via `<Figure name="X" canonical />`. Exactly one per name. */
  canonical: z.boolean(),
  /** Optional caption override from `<Figure caption="...">` JSX prop; wins over registry caption. */
  captionOverride: z.string().optional(),
});

// EXTENDED (label semantics clarified):
export const MisconceptionEntrySchema = z.object({
  body: z.string(),
  chapter: Slug,
  anchor: NonEmptyString,
  /** "short" = extracted from <Aside kind="misconception">; "long" = extracted from <Callout variant="misconception">. */
  length: z.enum(["short", "long"]),
  /** Optional label — comes from Aside.title OR Callout.title; both source primitives have optional title. */
  label: z.string().optional(),
});

// EXTENDED top-level:
export const PedagogyIndexSchema = z.object({
  definitions: z.array(DefinitionEntrySchema).readonly(),
  equations: z.array(EquationEntrySchema).readonly(),
  keyInsights: z.array(KeyInsightEntrySchema).readonly(),
  figureRegistry: z.array(FigureRegistryEntrySchema).readonly(),  // NEW collection
  figureUsages: z.array(FigureUsageEntrySchema).readonly(),       // RENAMED from figures
  misconceptions: z.array(MisconceptionEntrySchema).readonly(),
});
```

**Diff from PR-C2 schema state**:
- `KeyInsightEntry` gains `title?: string`
- `FigureEntry` REPLACED by `FigureRegistryEntry` (asset data) + `FigureUsageEntry` (per-chapter usage)
- `MisconceptionEntry` clarifies `label` semantics in JSDoc
- `PedagogyIndex` collection rename: `figures` → `figureUsages`, new `figureRegistry` collection

## Sources → consumers map (post PR-C3)

| Role | Source primitive(s) | Schema | Chapter consumer | Course consumer | Inline cross-ref |
|---|---|---|---|---|---|
| definition | `<Aside kind="definition">` | shipped | `<ChapterGlossary />` | `<CourseGlossary />` + `/glossary` | `<GlossaryTerm name>` |
| equation | `<KeyEquation>` | shipped | `<ChapterEquations />` | `<CourseEquations />` + `/equations` | `<EqRef slug>` |
| **key-insight** (NEW) | `<Aside kind="key-insight">` (Aside schema unchanged; title stays optional) | `KeyInsightEntrySchema` (+ title?) | `<ChapterKeyInsights />` (appearance-sort only) | `<CourseKeyInsights />` + `/key-insights` (appearance) | none (v1) |
| **figure** (NEW; two-tier) | `<Figure name>` (registry mode) | `FigureRegistryEntrySchema` (consumer-app data) + `FigureUsageEntrySchema` (extracted) | `<ChapterFigures />` (numbered) | `<CourseFigures />` + `/figures` (chapter-order default) | `<FigureRef name>` (HoverCard thumbnail + caption) |
| **misconception** (NEW; dual-source) | `<Aside kind="misconception">` (length="short") OR `<Callout variant="misconception">` (length="long"); both kind/variant ADDED in PR-C3 | `MisconceptionEntrySchema` | `<ChapterMisconceptions />` | `<CourseMisconceptions />` + `/misconceptions` | none (v1) |

## PR-C3 sub-tasks (~15–18 subagent tasks; ~30 unit + ~15 e2e tests)

| # | Task | Files |
|---|---|---|
| 1 | Pre-flight: schema diff in `@sophie/core` | `pedagogy-index.ts` (KeyInsightEntry+title; FigureRegistry+Usage split; MisconceptionEntry JSDoc) + tests |
| 2 | Aside schema: add AsideKind `"misconception"` | `Aside.schema.ts` (enum addition + tests) |
| 3 | Callout schema: add CalloutVariant `"misconception"` + `id?: string` prop | `Callout.schema.ts` + tests |
| 4 | Smoke MDX migration: change 1 callsite to `variant="misconception"` | `spoiler-alerts.mdx:1209` |
| 5 | `createPedagogyStore<T>` factory + migrate definitions-store + equations-store | `runtime/pedagogy-store.ts` + factory tests; migrate PR-C1/C2 stores; existing tests still pass |
| 6 | `extractKeyInsights` + tests | `pedagogy-index-extractor.ts` (new function + accumulator method) |
| 7 | `extractFigures` (slim usage entries only; no registry resolution) + tests | extractor extension |
| 8 | `extractMisconceptions` (dual-source: Aside + Callout) + tests | extractor extension |
| 9 | Accumulator extension for 3 new collections | `addKeyInsights`, `addFigureUsages`, `addMisconceptions`; extended `clearChapter`; extended `asPedagogyIndex` |
| 10 | Remark plugin wiring for all 3 new extractors | extend `pedagogyIndexRemarkPlugin` |
| 11 | `<ChapterKeyInsights />` Astro component | new file |
| 12 | `<ChapterFigures />` Astro component (numbered, canonical-aware) | new file |
| 13 | `<ChapterMisconceptions />` Astro component (renders both lengths with visual distinction) | new file |
| 14 | `<CourseKeyInsights />` + `/key-insights` route | 2 new files |
| 15 | `<CourseFigures />` + `/figures` route | 2 new files |
| 16 | `<CourseMisconceptions />` + `/misconceptions` route | 2 new files |
| 17 | `<FigureRef>` React component + figure-registry-store + figure-usages-store | new `FigureRef/` directory; uses factory from task 5 |
| 18 | TextbookLayout SSR→CSR extension for 4 new payloads (keyInsights, figureRegistry, figureUsages, misconceptions) | extend frontmatter + emit 4 new script tags |
| 19 | Smoke MDX cites: add 1+ `<FigureRef>` cite; optionally add a `canonical` flag to a Figure to exercise that path | 1-2 inline cite changes |
| 20 | E2E specs for the new surfaces | `chapter-key-insights.spec.ts`, `course-key-insights.spec.ts`, `chapter-figures.spec.ts`, `course-figures.spec.ts`, `figure-ref.spec.ts`, `chapter-misconceptions.spec.ts`, `course-misconceptions.spec.ts` |

Test budget: ~30 unit (schema, factory, 3 extractors, accumulator extension, 3 chapter components, FigureRef, registry-merge) + ~15 e2e (route renders, sort defaults, FigureRef hover/click, canonical resolution).

## Audit invariants (PR-C4 hand-off)

| ID | Invariant | Severity | Implementation |
|---|---|---|---|
| F1 | `<Figure name="X" />` with X not in figureRegistry | ERROR | TextbookLayout SSR merge cross-check (PR-C4) |
| F2 | `<FigureRef name="X" />` with X having zero usages | ERROR | PR-C4 build-time index walk |
| F4 | Registry figure with zero usages | WARNING | PR-C4 build-time index walk |

(The 7 PR-C3 defense-in-depth THROWS — K1, K2, M1, M2, M3, F3, F5 — are extractor-internal and don't need PR-C4 work.)

## What this overview does NOT change

- The 4 ADR 0038 Revisions-section realities (globalThis accumulator, virtual-module bypass, script-tag SSR→CSR, HoverCard primitive) — all preserved.
- PR-C1's GlossaryTerm + Glossary consumer shapes — unchanged.
- PR-C2's EqRef + Equation consumer shapes — unchanged.
- The Bucket C PR sequence: PR-C3 → PR-C4 → PR 7 → PR 10. Overview locks remain.
- The PR-C1 audit invariants (1, 2, 3) and PR-C2 deferred invariants (E1, E2, E4, E6) — still hand off to PR-C4.

## Cross-PR patterns surfaced

Two patterns emerged during PR-C3 brainstorm that should propagate to PR-C4:

- **"Default sort matches how readers look it up"** (named in PR-C2 overview): CourseGlossary alphabetical (dictionary convention); CourseEquations chapter-order (topic-anchored); CourseFigures chapter-order (topic-anchored); CourseMisconceptions chapter-order (topic-anchored); CourseKeyInsights appearance-only (untitled entries). Generalizes to: `<Course*>` defaults reflect how readers find that role.
- **"Asset vs. usage distinction"** (NEW in PR-C3): figures introduce a two-tier model that future asset-like roles can mirror — e.g., a hypothetical `<Citation>` role would have a citation registry (the bibliography) + per-chapter usage entries. PR-C4's LearningObjective roll-up may or may not need this; flag for the PR-C4 brainstorm to consider.

## Deferred

- `<KeyInsightRef>` inline cross-ref — no v1 consumer; key-insights are chapter-flow callouts, not cross-referenced
- `<MisconceptionRef>` inline cross-ref — same reasoning
- Chapter-index resolution for figure numbering ("Fig. 1.4") — defer to multi-chapter scale (render-time-only migration in `FigureRef.tsx`)
- F1/F2/F4 systematic audit invariants — PR-C4 territory
- Slide-deck / problem-set artifact figure-usage indices — future phase; the two-tier model is forward-compatible
- M4 (Callout misconception title-required) — flagged but skipped; title stays optional

## Next session: where to start

1. **Write the PR-C3 detailed design doc** (`docs/plans/2026-05-14-pr-c3-design.md`). Specifies the `createPedagogyStore<T>` factory API, the three new extractor functions, the FigureRef HoverCard + thumbnail component, the two-tier SSR→CSR transfer in TextbookLayout, the 30 unit + 15 e2e test list, the smoke MDX migration plan.
2. **Branch + TDD per ADR 0023 + PR-C1/C2 precedent.** No production code without a failing test first.
3. **PR-C3 lands; PR-C4's LO roll-up + systematic invariants follow.**

## References

- [PR-C2 design doc](./2026-05-13-pr-c2-equations-design.md) — engineering precedent (especially the 13-decision shape, the extractor pattern, the TextbookLayout SSR→CSR wiring)
- [PR-C2 overview](./2026-05-13-pr-c2-equations-overview.md) — brainstorm-decision shape
- [Bucket C overview (2026-05-13)](./2026-05-13-bucket-c-pedagogy-index-overview.md) — parent design; PR-C3 row in schema map; decisions #14 + figures stub revised here
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) — pedagogy-index pattern; role-aggregation principle; Revisions-section realities PR-C3 inherits
- [ADR 0039](../website/decisions/0039-lucide-two-adapter-convention.md) — Lucide two-adapter convention; FigureRef is the third pedagogy-side consumer (after GlossaryTerm, EqRef)
- [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md) — AI-as-primary-author model; the four roles all 3 new collections serve
- [PR #36](https://github.com/drannarosen/sophie/pull/36) — PR-C1 baseline
- [PR #37](https://github.com/drannarosen/sophie/pull/37) — PR-C2 baseline (just merged at e9defa3)
- [`packages/components/src/components/Figure/`](../../packages/components/src/components/Figure/) — source primitive for figures (Phase 0; unchanged by PR-C3)
- [`packages/components/src/components/Aside/`](../../packages/components/src/components/Aside/) — source primitive for key-insights + short misconceptions (extended for `"misconception"` kind)
- [`packages/components/src/components/Callout/`](../../packages/components/src/components/Callout/) — source primitive for long misconceptions (extended for `"misconception"` variant + `id?` prop)
