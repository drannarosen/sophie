---
title: PR-C4 — LO course roll-up + ChapterRef + audit invariants (overview)
date: 2026-05-14
status: design-locked (11-Q brainstorm complete)
phase: 2 (Bucket C / pedagogy index)
predecessor: PR-C3 (#38) + chore/pr-c3-followups (#39)
---

# PR-C4 — overview (final Bucket C PR)

PR-C4 closes Bucket C (pedagogy index infrastructure) with three load-bearing pieces:

1. **`<ChapterRef slug="X">`** — the fourth inline cross-ref after
   `<GlossaryTerm>`, `<EqRef>`, and `<FigureRef>`. Renders the chapter
   title by default; click navigates to the chapter; hover opens a
   preview card with module breadcrumb + title + description.

2. **`/objectives` course-wide LO roll-up** — a hierarchical page
   listing every chapter's learning objectives grouped by module. Each
   chapter heading is rendered as a `<ChapterRef>` (PR-C4 ships both the
   cross-ref and a route that uses it). Drives the long-deferred
   audit-of-coverage need.

3. **Systematic build-time audit invariants** — first systematic pass
   over the populated `PedagogyIndex`. Catches undefined cross-refs,
   orphan defined-but-unreferenced terms, intra/cross-chapter anchor
   collisions, registry figures with zero usages. Accumulates findings
   into an `AuditReport` with three severity levels (ERROR fails build;
   WARNING prints + continues; INFO verbose-only).

After PR-C4, Bucket C is **4/4 done**. Remaining Bucket B:
PR 7 (faceted search consuming the pedagogy index) and PR 10 (print
polish). Six PRs become two.

## Why this exists

Bucket C built the pedagogy-index infrastructure
([ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md))
incrementally. PR-C1 shipped definitions; PR-C2 shipped equations;
PR-C3 shipped key-insights + figures + misconceptions + the
`createPedagogyStore<T>` factory + the two-tier figures model. Three
roles are still missing or incomplete:

- **Chapters** are reachable by URL but not by index — no inline
  cross-ref primitive, no hover preview, no audit invariants that
  reason about them.
- **Learning objectives** ship as a pure-display IndexedDB component
  with no extractable role in the index, so coverage analysis is
  impossible.
- **Audit invariants** are documented (E1/E2/F1/F2/M1/M2/etc.) but only
  enforced defensively inside individual extractors. There is no
  *systematic* end-of-build sweep that catches the cross-cutting
  cases (undefined `<GlossaryTerm name="X">`, orphan defined terms,
  registry figures with zero usages).

PR-C4 ships all three together because they share dependencies:
the audit pass needs the chapters collection (to scope
intra-chapter checks) and the objectives collection (to enforce
ordering / id-stability); the `/objectives` route needs ChapterRef
to render chapter headings.

## Decisions locked (11-Q brainstorm, 2026-05-14)

| # | Decision |
|---|---|
| 1 | **`chapters` joins `PedagogyIndex`.** New `chapters: ReadonlyArray<ChapterEntry>` collection populated from `getCollection('chapters')` at the TextbookLayout merge point. New SSR setter `__setChapters` follows the same script-tag hydration pattern (ADR 0038 §1.3). Mirrors the inline-ref pattern exactly so `<ChapterRef>` is the same shape as `<EqRef>`/`<FigureRef>`. |
| 2 | **Hover-preview = module breadcrumb + chapter title + description.** Three-line card: module title (muted) / chapter title (prominent) / description (when present; card shrinks otherwise). Module title resolved via the `modules` Astro content-collection. Order numbering skipped — navigation context belongs in sidebar/TOC. |
| 3 | **Audit = accumulate-and-report with 3 severity levels.** Single `runPedagogyAudit(index): AuditReport` function called once at end-of-build. ERROR exits non-zero; WARNING prints + continues; INFO verbose-only. Matches biome/eslint shape — one author edit surfaces all related findings together. |
| 4 | **`<LearningObjectives>` refactor: children-mode + new `<Objective>` source component.** New API: `<LearningObjectives id="ch-objectives"><Objective verb="Recognize" id="lo-1">body</Objective></LearningObjectives>`. Each `<Objective>` becomes an extractable mdast flow element walked by the remark plugin. No back-compat shim (pre-launch); one smoke chapter migrates. AI-authoring-friendly per [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md). IndexedDB contract preserved (objective `id` stability invariant unchanged). |
| 5 | **`/objectives` page = hierarchical Module → Chapter → Objectives.** Module h2 → chapter h3 rendered as `<ChapterRef>` → `<ul>` of objective bodies. Server-rendered consuming `PedagogyIndex.objectives` joined with `PedagogyIndex.chapters`. Maps to print convention; reuses the new ChapterRef primitive. |
| 6 | **`<ChapterRef slug="X" />` default = chapter title.** Diverges from EqRef/FigureRef ordinal-by-default because chapters reference *concepts* (named by title) while equations and figures reference *positions* (numbered for in-prose lookup). No global course-wide chapter ordinal computed in v1. |
| 7 | (resolved by Q5) **Module-first hierarchy; authoring order within.** |
| 8 | **`<ChapterRef>` dual-mode, identical pattern to EqRef/FigureRef.** `children ?? <ChapterTitle>` ternary. Same HoverCard primitive; the only divergence is the navigation target (different page vs same-page anchor) handled transparently by `<a href>`. |
| 9 | **ADR 0038 Revisions §2 written in Phase 3** (after PR-C4 lands; may surface a 5th implementation reality worth folding in). |
| 10 | **Audit produces a separate `AuditReport` object; index entries stay clean.** No usage-count flags on `DefinitionEntry` etc. PR 7 faceted search reads index AND optionally calls `runPedagogyAudit(index)` for facet data. No back-coupling. |
| 11 | **Optional `width?`/`height?` on `FigureRegistryEntrySchema`.** Consumers pass through to `<img>` when present. No v1 audit invariant — promote to WARNING later if measurable CLS becomes a problem. Resolves Phase 1's deferred item #12. |

## Scope summary

### New components

- **`<ChapterRef slug="...">`** in `packages/components/src/components/ChapterRef/` — mirror EqRef/FigureRef shape (.tsx + .schema.ts + .module.css + .test.tsx + .stories.tsx + .contract.ts). Uses HoverCard primitive + Lucide `BookOpen` (or similar) icon via `lucide-react` adapter per [ADR 0039](../website/decisions/0039-lucide-two-adapter-convention.md). Reads from `chapters` + `modules` collections via the `createPedagogyStore<T>` factory ([PR-C3 ADR 0038 §1.2](../website/decisions/0038-pedagogy-index-pattern.md)).
- **`<Objective verb="..." id="...">body</Objective>`** in `packages/components/src/components/Objective/` — pure display primitive. Extracted by the remark plugin when nested inside `<LearningObjectives>`. Inline body content rendered to HTML at extraction time (same pattern as definitions).
- **Refactored `<LearningObjectives>`** — drops `objectives: Objective[]` prop; reads `<Objective>` children instead. IndexedDB contract unchanged. One smoke chapter callsite migrates.

### Schema additions (`packages/core/src/schema/pedagogy-index.ts`)

```ts
ChapterEntrySchema = z.object({
  slug: NonEmptyString,
  title: NonEmptyString,
  module: NonEmptyString,         // module slug, joined to ModuleEntry
  order: z.number().int().optional(),
  description: z.string().optional(),
});

ObjectiveEntrySchema = z.object({
  id: NonEmptyString,              // author-supplied; persists across edits
  verb: NonEmptyString,
  body: NonEmptyString,            // HTML, rendered at extraction time
  chapter: NonEmptyString,
  anchor: NonEmptyString,          // `lo-${id}` or `lo-${counter}`
});

ModuleEntrySchema = z.object({
  slug: NonEmptyString,
  title: NonEmptyString,
  order: z.number().int(),
  description: z.string().optional(),
});

// Extend PedagogyIndexSchema:
chapters: ReadonlyArray<ChapterEntry>;
modules: ReadonlyArray<ModuleEntry>;
objectives: ReadonlyArray<ObjectiveEntry>;

// Extend FigureRegistryEntrySchema (Q11):
width: z.number().int().positive().optional();
height: z.number().int().positive().optional();
```

### Audit module (new)

`packages/astro/src/lib/pedagogy-audit.ts` — exports
`runPedagogyAudit(index: PedagogyIndex): AuditReport`. AuditReport
shape: `{ errors: AuditFinding[], warnings: AuditFinding[], info: AuditFinding[] }`.
Each finding has `{ severity, code, message, location? }`.

Invariants enforced:

- **Definition**: D4 undefined `<GlossaryTerm name="X">` (ERROR); D5 orphan defined-but-unreferenced (WARNING).
- **Equation**: E1 cross-chapter slug collision (ERROR); E4 undefined `<EqRef name="X">` (ERROR); E6 zero-`$$` `<KeyEquation>` (ERROR — defense-in-depth; extractor catches first).
- **Figure**: F1 `<Figure name="X">` with X not in registry (ERROR); F2 `<FigureRef name="X">` with X having zero usages in any chapter (ERROR); F4 registry figure with zero usages anywhere (WARNING).
- **Misconception**: M3 orphan `<Aside kind="misconception">` with no source-of-truth title or id-derived anchor (WARNING — heuristic).
- **Key-insight**: K1 zero-`<KeyInsight>` chapters (INFO only — informational, not a defect).
- **Chapter**: C1 ChapterRef pointing at unknown chapter slug (ERROR).
- **Objective**: O1 duplicate objective id within a chapter (ERROR); O2 chapter with zero objectives (WARNING).

### Pages

- `examples/smoke/src/pages/objectives.astro` — server-renders the LO roll-up.
- Existing `/key-insights`, `/figures`, `/equations`, `/misconceptions`, `/glossary` routes ship with appropriate audit-report handling at build.

### Test budget

~15 unit + ~10 e2e per overview row 152. Iron-law TDD per [ADR 0023](../website/decisions/0023-vertical-slice-first-build-order.md): failing test first; no production code without it.

## Files

### New

- `packages/components/src/components/ChapterRef/` (component + schema + module css + test + stories + contract)
- `packages/components/src/components/Objective/` (component + schema + test + stories)
- `packages/astro/src/lib/pedagogy-audit.ts` (audit module)
- `packages/astro/src/components/CourseObjectives.astro` (or similar; `/objectives` page renderer)
- `examples/smoke/src/pages/objectives.astro` (route)

### Modified

- `packages/core/src/schema/pedagogy-index.ts` (add `ChapterEntry`, `ModuleEntry`, `ObjectiveEntry`; extend `PedagogyIndex`; extend `FigureRegistryEntry`)
- `packages/astro/src/lib/pedagogy-index-extractor.ts` (add `extractObjectives`, `addObjectives`, `setChapters`, `setModules`; update `asPedagogyIndex`)
- `packages/astro/src/components/TextbookLayout.astro` (add 3 new SSR setters: `__setChapters`, `__setModules`, `__setObjectives`; emit 3 script tags)
- `packages/components/src/components/LearningObjectives/` (refactor to children-mode + new Objective)
- `examples/smoke/src/content/chapters/spoiler-alerts.mdx` (migrate `<LearningObjectives>` to children-mode)
- `examples/smoke/src/content.config.ts` (if needed for `objectives` collection naming)

### Deleted

- The legacy prop-array `LearningObjectives` schema fields (`objectives: Objective[]` prop). Hard rename per no-back-compat-pre-launch.

## Cross-PR patterns surfaced (worth a future ADR 0038 §2 entry)

- **Refactor source-component APIs as the index pattern matures.** PR-C3 surfaced `createPedagogyStore<T>` factory; PR-C4 surfaces the `<Parent><Child>...</Child></Parent>` source-component pattern as the AI-authoring-friendly shape. ADR 0038 §2 (Phase 3) should articulate this as a deliberate convention.
- **Audit pass as a separate concern from index population.** Index aggregates; audit reasons about aggregate. Clean separation; PR 7 search joins both.
- **ChapterRef text default diverges from EqRef/FigureRef.** Conscious deviation reflecting pedagogical role: chapters are *concepts*, equations are *positions*. Documented.

## Audit invariants (PR-C4 hand-off → PR 7 + future)

PR-C4 fixes the cross-cutting build-time pass; per-component
defense-in-depth (M1 intra-chapter, M2 cross-chapter, F3 canonical-twice,
F5 intra-chapter anchor) remains in the extractors. The PR 7 faceted
search will read `AuditReport` for facet data when "show me orphan
defined terms" or "show me unused registry figures" becomes a real
search use case.

## What this overview does NOT change

- No persistence model changes ([ADRs 0007, 0029](../website/decisions/0007-persistence-model.md)).
- No theming changes ([ADR 0005](../website/decisions/0005-theming-three-layers.md)) — ChapterRef uses existing shadow-popover + brand-* tokens.
- No A11y primitive changes — Radix HoverCard via [ADR 0019](../website/decisions/0019-a11y-primitives.md), `useHydrated()` hook from Phase 1.
- LearningObjectives IndexedDB contract semantics unchanged (objective id-stability remains the persistence invariant).

## Deferred

- **Course-level objectives + coverage matrix** — wait until authoring practice surfaces a need.
- **`headingLevel?` prop** on chapter consumers (Phase 1 item #13 forward-looking note) — defer until real consumer needs nested-section usage.
- **Auto-detect figure dimensions via build-tool** — wait until measurable CLS becomes a real problem.
- **Audit WARNING for missing figure width/height (F5)** — defer until CLS is measurable.

## Next session: where to start

1. Read this overview + the matching design doc.
2. Follow the iron-law TDD cadence: failing test first.
3. Use `superpowers:subagent-driven-development` for the ~15-20 task implementation.

## References

- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) — pedagogy index pattern
- [ADR 0039](../website/decisions/0039-lucide-two-adapter-convention.md) — Lucide adapter convention
- [PR-C3 overview](./2026-05-14-pr-c3-overview.md)
- [Bucket C overview](./2026-05-13-bucket-c-pedagogy-index-overview.md)
