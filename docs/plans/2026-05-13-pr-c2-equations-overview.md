---
title: PR-C2 — Equations Index (overview)
date: 2026-05-13
status: design-locked
phase: 2 (Bucket C / pedagogy index)
predecessor: PR-C1 (#36, merged at c236017)
---

# PR-C2 — Equations Index (overview)

## Why this exists

PR-C1 shipped the pedagogy index pattern (ADR 0038): a build-time
`PedagogyIndex` extracted from structured MDX components, aggregated
by pedagogical role, consumed by chapter/course surfaces + inline
cross-reference popovers. The first instance of the pattern
(definitions) is live; PR-C2 extends the pattern to **equations** —
the second pedagogical role and the most consequential one for STEM
authoring.

The infrastructure realities from PR-C1 (codified in ADR 0038's
Revisions section) carry through unchanged: globalThis accumulator
across Vite environments, virtual-module bypass on the chrome
critical path, `<script>`-tag SSR→CSR transfer, HoverCard primitive
for inline cross-refs. PR-C2 makes no new infrastructure decisions;
it extends the established machinery.

What WAS open — and is locked by this overview — is the
**equation-specific schema and consumer interaction model**:
numbering semantics, schema field shape, body+tex split, EqRef
popover content, derivation-chain handling, audit invariants. These
nine decisions ripple through every STEM chapter Sophie will ever
ship; brainstorming them with the weight they deserve was the
precondition for implementation.

## Decisions locked

| # | Decision |
|---|---|
| 1 | **Per-chapter auto-numbered, extractor-assigned.** Authors write no number. Reorder updates numbering automatically. `<EqRef>` rendering ("Eq. 1.4" vs. title-only) is a per-instance styling decision. Schema `number` is REQUIRED. |
| 2 | **Schema field alignment**: `label` → `title` (matches `KeyEquation.title` prop); `slug` value = `KeyEquation.id` prop (no auto-derivation; authors write semantic ids); `anchor` kept as separate field for shape-uniformity with `DefinitionEntry` (invariant `anchor === slug` for equations); `number` required. |
| 3 | **Body shape: `body` (full pre-rendered HTML) + `tex` (raw TeX source of the FIRST `$$...$$` block).** `body` matches DefinitionEntry pattern for ChapterEquations/CourseEquations consumers + PR 7 search previews; `tex` powers EqRef's client KaTeX popover render + future LaTeX export + symbol search + AI-as-STEM-domain dim-analysis (ADR 0030). Authoring rule: KeyEquation body MUST lead with the canonical form. |
| 4 | **EqRef popover v1: label + rendered tex.** Client-side KaTeX renders `tex`. Click navigates to source chapter for full body. Structured `variables` array deferred to v2 — would require either fragile prose-parsing or a `<KeyEquation variables=>` prop change (HITL-blocked). Full-body popover rejected (10–40-line equation bodies overflow popovers; bury the equation in framing prose). |
| 5 | **One KeyEquation = one index entry.** Multiple `$$` blocks in one KeyEquation = forms/derivations of the same conceptual equation. Authors split into separate KeyEquations when a form deserves first-class identity. YAGNI on `forms: string[]` and `derives_from: Slug[]` in v1. |
| 6 | **Only `<KeyEquation>` blocks feed the equations index.** Inline `$x$` math stays prose. Bare `$$...$$` blocks NOT wrapped in `<KeyEquation>` stay unindexed (illustrative math, not pedagogically equivalent to a named equation). PR-C4+ may add an audit hint "consider wrapping this bare `$$`" — deferred. |
| 7 | **`<CourseEquations />` default sort: chapter-order** (chapter slug + per-chapter number). `order="alphabetical"` opt-in. Diverges from `<CourseGlossary />` alphabetical-only — equation lookup is topic/chapter-anchored, not name-anchored; matches print-textbook "Index of Equations" convention. `<ChapterEquations />` mirrors `<ChapterGlossary />`: alphabetical default + `order="appearance"` opt-in. |
| 8 | **Audit invariants (PR-C4 scope)**: E1 cross-chapter slug collision (ERROR), E2 intra-chapter slug collision (ERROR), E4 undefined `<EqRef>` (ERROR), E6 KeyEquation with zero `$$` blocks (ERROR). E3 empty id/title already enforced by `KeyEquationPropsSchema`. E5 orphan-equation WARNING + E7 KaTeX-syntax check both skipped (noisy / duplicates render-time signal). |
| 9 | **No AI-specific schema fields in v1.** `tex` + `body` give the four ADR 0030 AI roles enough surface (scaffolding, key-eq validation, dim-analysis, brainstorming). Pre-launch "no back-compat" rule means schema can grow concretely later. `units?`, `variables?`, `prerequisites?` all deferred. |

## Schema (FINAL)

```ts
// packages/core/src/schema/pedagogy-index.ts

export const EquationEntrySchema = z.object({
  /** Canonical slug = KeyEquation.id prop. Author-explicit, no auto-derivation. */
  slug: Slug,
  /** Human-readable name = KeyEquation.title prop. */
  title: NonEmptyString,
  /** Per-chapter sequential number, assigned by the extractor at appearance order. REQUIRED. */
  number: z.number().int().positive(),
  /** Raw TeX source of the FIRST $$...$$ block in the KeyEquation body. Powers EqRef KaTeX popover, LaTeX export, symbol search, AI dim-analysis. */
  tex: NonEmptyString,
  /** Pre-rendered HTML of the full KeyEquation body (matches DefinitionEntry.body shape). Consumers embed via `set:html`. */
  body: z.string(),
  /** Chapter slug containing the source KeyEquation. */
  chapter: Slug,
  /** DOM id on the source <section>; back-link target. Invariant: anchor === slug for equations. */
  anchor: NonEmptyString,
});
export type EquationEntry = z.infer<typeof EquationEntrySchema>;
```

Diff from the PR-C1-era stub: rename `label`→`title`; make `number`
required; add new field `tex`. The `anchor === slug` invariant is
documented (not enforced via Zod; a custom refine would be
over-engineering since the extractor controls both values).

## Sources → consumers map

| Role | Source primitive | Schema | Chapter consumer | Course consumer | Inline cross-ref |
|---|---|---|---|---|---|
| equation | `<KeyEquation id="..." title="...">` | `EquationEntrySchema` (final this PR) | `<ChapterEquations />` (alphabetical default, `order="appearance"` opt-in) | `<CourseEquations />` (chapter-order default, `order="alphabetical"` opt-in) + `/equations` route | `<EqRef slug="...">` (HoverCard; label + KaTeX-rendered `tex`; click → source chapter anchor) |

## PR-C2 sub-tasks (single PR, ~15 unit + ~8 e2e tests)

| # | Task | Files |
|---|---|---|
| 1 | Schema update | `packages/core/src/schema/pedagogy-index.ts` (apply diff above); `packages/core/src/schema/pedagogy-index.test.ts` (Zod refinement tests) |
| 2 | Extractor: `extractEquations` | `packages/astro/src/lib/pedagogy-index-extractor.ts` (new function alongside `extractDefinitions`); per-chapter `number` counter; first-`$$`-block `tex` snapshot from MDX math node `value`; populate `indexAccumulator.equations` |
| 3 | Update accumulator shape | `packages/astro/src/lib/pedagogy-index-accumulator.ts` (add `equations` to `asPedagogyIndex()`); update SSR→CSR `<script>` payload in `<TextbookLayout>` to include equations |
| 4 | `<ChapterEquations />` Astro component | `packages/astro/src/components/ChapterEquations.astro`; `order: "alphabetical" \| "appearance"` prop |
| 5 | `<CourseEquations />` Astro component | `packages/astro/src/components/CourseEquations.astro`; `order: "chapter" \| "alphabetical"` prop (default chapter) |
| 6 | `/equations` route in smoke target | `examples/smoke/src/pages/equations.astro` |
| 7 | `<EqRef>` React cross-ref | `packages/components/src/components/EqRef/` (mirror `<GlossaryTerm>` HoverCard shape; renders label + KaTeX `tex`; consumes global pedagogy index store) |
| 8 | EqRef hydration on first usage | Smoke chapter MDX: add `<EqRef slug="inverse-square-law">` and `<EqRef slug="wiens-law">` cites with `client:load`; verify SSR → CSR transfer via the existing `<script id="sophie-pedagogy-equations">` mechanism (generalizes the definitions tag) |
| 9 | axe-core tests on all new components | `packages/components/src/components/EqRef/EqRef.test.tsx` (HoverCard a11y) |
| 10 | Playwright MCP smoke e2e | Navigate to chapter, hover EqRef → popover renders; click EqRef → URL hash updates to `#wiens-law`; chapter scroll-to-anchor lands on the KeyEquation block |

Test budget: ~15 unit (schema, extractor, ChapterEquations sort,
CourseEquations sort, EqRef render, popover behavior, HoverCard
a11y) + ~8 e2e (build smoke, navigate `/equations`, hover popover,
click navigation, hash routing, dev HMR recompile, sort-toggle
behavior, missing-EqRef error). Matches the budget locked in the
Bucket C overview.

## Audit invariants (PR-C4 hand-off)

PR-C4 will implement four ERROR-severity invariants over the
equations index. Schema is sized to support all four:

| ID | Invariant | Check |
|---|---|---|
| E1 | Cross-chapter slug collision | Group `equations[]` by `slug`; any group with > 1 entry fails |
| E2 | Intra-chapter slug collision | Group `equations[]` by `(chapter, slug)`; any group > 1 fails |
| E4 | Undefined `<EqRef>` | At extract time, collect all `<EqRef slug=>` cite slugs; cross-check against `equations[].slug` set; any unmatched fails |
| E6 | KeyEquation with zero `$$` blocks | At extract time, if a KeyEquation's children contain no MDX math node, fail (the `tex` field would be empty/missing) |

PR-C2 ships the data needed; PR-C4 ships the build-failure
mechanism. The pattern is established by PR-C4's definition
invariants — equations follow the same shape.

## What this overview does NOT change

- The `<KeyEquation>` component shape (`{id, title, children}`) —
  stable since Phase 0; touching it requires explicit HITL alignment,
  not a sub-decision inside PR-C2.
- ADR 0038's role-aggregation principle, accumulator pattern,
  SSR→CSR transfer mechanism, HoverCard primitive choice — all
  unchanged; PR-C2 extends them.
- PR-C1's `<GlossaryTerm>` / `<ChapterGlossary>` / `<CourseGlossary>`
  shapes — `<EqRef>` mirrors but does not share code with
  `<GlossaryTerm>` (different content payload).
- Bucket C PR sequence: PR-C2 → PR-C3 → PR-C4 → PR 7 → PR 10.
  Overview locks remain.

## Deferred

- `variables?: Array<{symbol, definition}>` field + EqRef popover
  variable-defs render — revisit when authoring practice surfaces a
  structured variables convention.
- `forms: string[]` field for full derivation-chain capture — no v1
  consumer.
- `derives_from: Slug[]` field for explicit derivation graph — no v1
  consumer.
- `units?: string` and `prerequisites?: Slug[]` AI-tooling fields —
  no v1 AI tool consumes them.
- `group?: string` for cross-cutting equation families (Maxwell's,
  Friedmann's, etc.) — no v1 consumer.
- E5 orphan-equation WARNING and E7 KaTeX-syntax-check invariants —
  deferred indefinitely.
- Bare-`$$` "consider wrapping in `<KeyEquation>`" audit hint —
  PR-C4+ if authoring practice surfaces a need.

## Cross-PR pattern surfaced

Decision #7 — `<CourseEquations />` defaulting to chapter-order
rather than alphabetical — generalizes to a principle worth naming:
**default sort order matches how readers look it up**. Vocabulary
lookup is alphabetical; equation lookup is chapter/topic-anchored.
PR-C3's brainstorm should consider this for `<CourseFigures />` and
`<CourseMisconceptions />` (both probably chapter-anchored), and
PR-C4 for `<CourseObjectives />` (chapter-anchored — coverage map by
chapter). Not a schema decision; a consumer-default decision per
role. Worth naming in the PR-C3 overview.

## Next session: where to start

After this overview lands on main:

1. **Write the PR-C2 detailed design doc**
   (`docs/plans/2026-05-NN-pr-c2-equations-design.md`). Specifies
   the `extractEquations` API + AST shape, the three consumer
   contracts (ChapterEquations, CourseEquations, EqRef), the test
   list (~15 unit + ~8 e2e by name), the smoke chapter migration
   path (add the two `<EqRef>` cites to spoiler-alerts.mdx), the
   SSR→CSR script-tag generalization plan.
2. **Branch + TDD per ADR 0023 + PR-C1's precedent.** No production
   code without a failing test first.
3. **PR-C2 lands; ADR 0038 may grow a Revisions §2 if PR-C2
   surfaces implementation realities** the way PR-C1 did
   (virtual-module bypass, globalThis, script-tag, HoverCard).
   Document the parallel.

## References

- [Bucket C overview](2026-05-13-bucket-c-pedagogy-index-overview.md) —
  parent design; equation row in the schema map; PR-C2 test budget.
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) —
  pedagogy-index pattern; role-aggregation principle; Revisions
  section listing the four implementation realities PR-C2 must
  inherit.
- [PR #36](https://github.com/drannarosen/sophie/pull/36) — the
  PR-C1 baseline; the machinery PR-C2 extends.
- [`packages/components/src/components/KeyEquation/`](../../packages/components/src/components/KeyEquation/) —
  the source primitive (Phase 0; unchanged by PR-C2).
- [`packages/core/src/schema/pedagogy-index.ts`](../../packages/core/src/schema/pedagogy-index.ts) —
  the schema (revised by PR-C2 per the Schema section above).
- [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md) —
  AI-as-primary-author model; the four roles `tex` + `body` serve.
