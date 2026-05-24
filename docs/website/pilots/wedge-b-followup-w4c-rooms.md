---
title: 'Pilot report: Wedge B-followup W4c — Library shell + 3 OMIFlow rooms + 8 Spec routes + PRA-2 + audit cleanup'
short_title: 'Pilot: W4c rooms'
description: 'W4c ships Library room chrome at scale: hybrid <LibraryCollectionShell> extraction + 5 Course* refactor + 3 new CourseX OMIFlow rollups + 8 per-entry Spec routes + KeyInsight/Misconception slug derivation + PRA-2 audit_overrides honoring + landmark a11y structural fixes. Closes Wedge B-followup. Shape α.'
authors:
  - name: Anna Rosen
date: 2026-05-23
---

## Pilot context

**What W4c shipped.** One net-new shared shell, three new OMIFlow
rollup components, eight per-entry Spec routes, two new derived
slug fields, three new audit invariants, full bidirectional
`audit_overrides` honoring on PRA-2, and three structural-a11y
fixes that surfaced latent W4b landmark bugs caught at the new
axe gate.

1. **`<LibraryCollectionShell>` hybrid component** — net-new
   chrome at
   [`packages/astro/src/components/LibraryCollectionShell.astro`](../../../packages/astro/src/components/LibraryCollectionShell.astro).
   Wraps a Library collection (header + back-link + count + `<ol>`
   slot) in a single shared shape. Six existing Course* components
   (`CourseGlossary`, `CourseKeyInsights`, `CourseEquations`,
   `CourseMisconceptions`, `CourseFigures`, plus
   `CourseObjectives` partial-adoption for aria-labelledby) and
   three new ones (`CourseObservables`, `CourseModels`,
   `CourseInferences`) now share the shell. Uses
   `<section aria-labelledby>` (not `<main>`) for the region
   landmark — see Surprise #5.

2. **3 new OMIFlow rollup components + routes** —
   `CourseObservables`, `CourseModels`, `CourseInferences`
   surface the existing OMIFlowEntry slot data through the same
   shell shape as the 5 W4a-era room rollups. New rollup routes at
   `/library/observables/`, `/library/models/`,
   `/library/inferences/`. Library hub goes 7 → 10 tiles.

3. **8 new per-entry Spec routes** — dynamic routes at
   `/library/<collection>/<slug>/` for Equation, Misconception,
   Glossary, Figure, KeyInsight, Observable, Model, Inference
   (Topic Spec route already shipped in W4b; W4c upgrades its
   card body to render inline — see Task 8.4 / closes W4b Minor
   N5). Each route is a thin layout wrapper around a corresponding
   `<XSpecContent>` inner component that the Container API tests
   exercise.

4. **2 new derived slug fields + 2 audit invariants** —
   `KeyInsightEntry.slug` + `MisconceptionEntry.slug` become
   required, populated by the extractors from `kebabCase(label)`.
   Two new audit invariants (`KI-slug-unique`,
   `Misconception-slug-unique`) catch collisions across the index.
   Underwrites the deterministic per-entry Spec route URL shape.

5. **PRA-2 `audit_overrides` honoring** — both extractor-side
   (direction B: body→frontmatter orphans) and audit-side
   (direction A: frontmatter→body orphans) honor a topic's
   `audit_overrides` block per ADR 0053's three-grain contract.
   New `PRA-2-grain` WARNING fires when a Grain-1 override
   blankets PRA-2 instead of using anchored Grain-2/3 entries.

**Why now.** [W4b](./wedge-b-followup-w4b-affordances.md)
(PR #162, merged 2026-05-23) shipped the topic registry +
resolver + PRA-1 graduation + Topic Spec page. The room story
was now end-to-end *except* for chrome: 5 of 10 Library room
rollups existed pre-W4a; W4a + W4b added URL conventions and
the Topics tile. W4c populates the remaining 3 rollups (OMIFlow
trio), extracts the shared shell, adds per-entry Spec routes
across all 8 remaining collections, and closes the
`audit_overrides` story (PRA-1 plumbing W4b shipped without a
PRA-2 consumer). After W4c lands, the Library room mechanic is
end-to-end complete and **Wedge B-followup closes**.

**Pre-launch posture.** Per
[`feedback_no_backcompat_prelaunch`](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_no_backcompat_prelaunch.md):
KeyInsight + Misconception slug fields go from absent to
required in one commit; all extractor + audit + route + test
sites migrate together. No transition shape; no shim.

**Per ADR 0064 §4 — structural-density-diversity criterion.**
W4c is **chrome-extraction-heavy** — the structural-density
profile differs from W4a (mechanical URL migration) and W4b
(design-pressure-heavy + net-new ADR). W4c is the highest-LOC
of the three sub-wedges (~9,300 insertions / 405 deletions
across 116 files; 47 commits chronologically); shape is
"one new shell + N refactor adoptions + N parallel Spec routes
+ tight extractor / invariant additions + a11y structural
cleanup." The 3-sub-wedge sequence (W4a + W4b + W4c) has now
exercised all three structural density classes the ADR 0064 §4
rotation requires before the next consumer-chapter pilot.

**What's explicitly out of scope.** Per ADR 0058 §4: 3 deferred
Library rooms (Assumption / Approximation / Numerical) wait
until role-tagging extends the OMIFlow vocabulary. Per ADR 0079
Tier-2 deferrals: PDF export, filter UI, per-card Spec routes.
Back-link linkification across the 9 Spec routes is deferred
until the Unit→URL mapping lock (currently the chapter route
shape is per-section, not per-unit; Spec back-links to "first
section that cites this entry" would need a stable URL shape).
Container API setup hardening (vite-7/8 augmentation seam) is
documented in code but not refactored upstream.

## Shortcode → component dictionary

W4c added or modified the following implementation files in
`@sophie/components` / `@sophie/astro`:

| Component / module | Path | Purpose |
|---|---|---|
| `<LibraryCollectionShell>` | [`packages/astro/src/components/LibraryCollectionShell.astro`](../../../packages/astro/src/components/LibraryCollectionShell.astro) | NEW shared chrome for all 9 Course* rollups; uses `<section aria-labelledby>` (not `<main>`) |
| `<CourseObservables>`, `<CourseModels>`, `<CourseInferences>` | `packages/astro/src/components/Course{Observables,Models,Inferences}.astro` | NEW OMIFlow rollups; consume OMIFlowEntry slot data; share shell |
| 6 refactored Course* | `Course{Glossary,KeyInsights,Equations,Misconceptions,Figures,Objectives}.astro` | Adopt `<LibraryCollectionShell>` (Objectives partial — see Task 4.6 aria-labelledby fix) |
| 9 `<XSpecContent>` inner components | `Equation/Misconception/Glossary/Figure/KeyInsight/Observable/Model/Inference/TopicSpecContent.astro` | NEW per-entry detail bodies; Container-API testable seam (route files thin layout wrappers) |
| 2 new schema fields | [`packages/core/src/schema/pedagogy-index-entries/inline-content.ts`](../../../packages/core/src/schema/pedagogy-index-entries/inline-content.ts), [`topic.ts`](../../../packages/core/src/schema/pedagogy-index-entries/topic.ts) | `KeyInsightEntry.slug` + `MisconceptionEntry.slug` required; `TopicEntry.audit_overrides` optional |
| 2 extractor slug populators | [`extractors/key-insights.ts`](../../../packages/astro/src/lib/pedagogy-index/extractors/key-insights.ts), [`extractors/misconceptions.ts`](../../../packages/astro/src/lib/pedagogy-index/extractors/misconceptions.ts) | Derive `slug = kebabCase(label)` |
| 3 new audit invariants | [`invariants/key-insights.ts`](../../../packages/astro/src/lib/pedagogy-audit/invariants/key-insights.ts), [`invariants/misconceptions.ts`](../../../packages/astro/src/lib/pedagogy-audit/invariants/misconceptions.ts), `topic-consistency.ts` PRA-2-grain | KI-slug-unique, Misconception-slug-unique, PRA-2-grain WARNING on Grain-1 PRA-2 override |
| `renderTopicCardSlotsToHtml` resolver helper | [`packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts`](../../../packages/astro/src/lib/mdx-plugins/skill-review-resolver.ts) | Reuses W4b resolver to lift Topic Spec card body into inline HTML for Spec route (Task 8.4) |
| Container API test infrastructure | [`packages/astro/test-setup.ts`](../../../packages/astro/test-setup.ts), [`vitest.config.ts`](../../../packages/astro/vitest.config.ts), [`test-utils/container-axe.ts`](../../../packages/astro/src/test-utils/container-axe.ts), `test-fixtures/astro-project/` | NEW Astro Container API + axe wrapper; 18+ component-level axe specs |
| Smoke e2e gate | [`examples/smoke/e2e/library-rooms-axe.spec.ts`](../../../examples/smoke/e2e/library-rooms-axe.spec.ts) | NEW @axe-core/playwright e2e against all 10 Library rooms |
| PRA-2 demo fixture | [`examples/smoke/src/content/topics/math/logarithms.mdx`](../../../examples/smoke/src/content/topics/math/logarithms.mdx) | Smoke-side `audit_overrides` exemplar with orphan card |

## Migration touchpoint inventory

### Layer 1 — Net-new schema + content (5 files)

- `packages/core/src/schema/pedagogy-index-entries/inline-content.ts`
  + `inline-content.test.ts` (KeyInsightEntry.slug required).
- `packages/core/src/schema/pedagogy-index-entries/topic.ts` +
  `topic.test.ts` (TopicEntry.audit_overrides optional + inline
  rationale mirroring UnitSchema).
- `examples/smoke/src/content/topics/math/logarithms.mdx`
  (PRA-2 + audit_overrides demo: orphan card +
  `audit_overrides` Grain-2 entry covering it).

### Layer 2 — `@sophie/astro` pipeline (~20 files)

- **3 new audit invariants**: `invariants/key-insights.ts` +
  `.test.ts` (KI-slug-unique); `invariants/misconceptions.ts` +
  `.test.ts` (Misconception-slug-unique); `topic-consistency.ts`
  PRA-2-grain WARNING (Batch 2b).
- **3 extractor updates**: `extractors/key-insights.ts`
  + `extractors/misconceptions.ts` populate derived slug;
  `extractors/topic.ts` honors `audit_overrides` direction-B at
  the extractor seam (Batches 2 + 2b).
- **Resolver helper**: `renderTopicCardSlotsToHtml` exported
  from `skill-review-resolver.ts` for Task 8.4 inline render.
- **Audit-side honoring**: `runner.ts` + `topic-consistency.ts`
  direction-A consults `index.topics[topicId].audit_overrides`.
- **Container API setup** (Batch 3b): `test-setup.ts`,
  `vitest.config.ts` (jsdom + Astro pulls vite@7, vitest@4 pulls
  vite@8 — documented `as any` cast at the seam),
  `test-utils/container-axe.ts` helper,
  `test-fixtures/astro-project/` minimal project, README.
- **R6/R7/R9 hygiene** (Batches 0 + 0b): 4 R7 disposition
  comments on silent-skip sites + 2 more in Batch 0.5b (sites
  using `=== undefined`); R9-production NavChapter/NavModule
  import refactor; 2 broken `#L\d+` ADR anchors fixed.

### Layer 3 — Components (28 new + 6 modified)

- 1 new shell + 6 Course* refactors + 3 new CourseX OMIFlow
  rollups (Batches 3 + 4 + 5).
- 9 new `<XSpecContent>` inner components for Container-axe
  testability (Batches 7 + 8 + 8.4).
- CourseObjectives `aria-labelledby` landmark fix (Task 4.6) —
  caught by W4c's new axe coverage; W4b-era latent bug.
- 18+ new component-axe test files
  (`Course*.axe.test.ts` + `*SpecContent.axe.test.ts` +
  `LibraryCollectionShell.axe.test.ts`).
- `ModuleNav.astro` import refactor (R9-production).

### Layer 4 — Routes (12 files)

- 3 new rollup routes:
  `pages/library/{observables,models,inferences}.astro`.
- 8 new Spec routes: `pages/library/{equations,figures,
  glossary,key-insights,misconceptions,observables,models,
  inferences}/[slug].astro` (Topic at `topics/[topicId].astro`
  upgraded in Task 8.4 to render card body inline).
- Library hub `pages/library/index.astro`: 7 → 10 tiles.
- Smoke index updated to reflect 16 → 129 pages (W4b → W4c).

### Layer 5 — Tests (across the surface)

- `@sophie/core`: +8 new W4c-specific tests (slug schema +
  audit_overrides + cross-shape sanity in
  `pedagogy-index.test.ts`).
- `@sophie/astro`: ~88 new W4c-specific tests across schema
  populators (slug derivation), audit invariants (KI-uniq +
  Misc-uniq + PRA-2-grain), `audit_overrides` honoring branches
  in `topic-consistency.test.ts` and `retrieval-family.test.ts`,
  resolver helper for inline card body, 18+ component-axe specs.
- e2e: +2 specs — `library-rooms-axe.spec.ts` covers all 10
  rollups + Spec-page exemplars (Batch 3c).

### Layer 6 — Docs (6 files)

- ADR 0058 + 0070 + 0079 revision-history entries
  (Tasks 10.1–10.3).
- `chapter-components.md` Library section refresh
  (Task 10.4).
- `audit-baseline.md` rows for KI-slug-unique,
  Misconception-slug-unique, PRA-2-grain (Task 10.5).
- `status/validation.md` regen (Task 10.6).
- This pilot report (Task 10.7).

## Estimates vs. actuals

| Phase | Engineer-plan estimate | Actual |
|---|---|---|
| Phase-1 enumeration (design + plan + audit) | 3 docs | 3 docs (design + plan + post-W4b audit) |
| Batch 0 + 0b — pre-W4c hygiene (R6/R7/R9) | "1–2 commits" | 11 commits (6 R7 disposition expansions, 2 R6 anchor fixes, 2 R9 refactors, 1 R9-test convergence) |
| Batches 1 + 1b + 2 + 2b — schema + audit core | ~500 LOC, ~12 files | ~700 LOC, 14 commits (slug + audit_overrides + 3 invariants + bidirectional PRA-2) |
| Batch 3 + 3b + 3c — shell + Container API + e2e gate | "shell + tests" (1 day) | 4 commits + Container API infra (~250 LOC scaffolding) + e2e axe gate (~150 LOC) |
| Batches 4 + 5 — Course* refactor + OMIFlow rollups | ~9 commits | 9 commits (6 refactor + 3 new) |
| Batches 6 + 7 + 8 — routes (3 rollup + 8 Spec + Topic upgrade) | ~12 routes | 12 routes / 12 commits + 9 SpecContent inner components |
| Batch 9 — smoke fixture demo | 1 commit | 1 commit (after YAML-prose-leak fix; see Surprise #10) |
| Batch 10 — docs sweep + pilot report | 7 tasks | 7 task commits in flight |
| Plan-patch (mid-execution) | Not estimated | 1 commit (`e5241d2`) correcting plan-path and test-command defects (see Surprise #11) |
| Sub-batches added scope (0b, 1b, 2b, 3b, 3c, plan-patch) | 0 sub-batches | 6 sub-batches at Anna's directive |
| Total LOC | ~5–7K insertions | ~9.3K insertions / 405 deletions, 116 files, 47 commits |
| Smoke build | 16 → ~100 pages | 16 → 129 pages |

The biggest delta vs. plan: **the W3 "clean up your own mess"
discipline expanded to a full pre-W4c hygiene sweep (Batches 0 +
0b)** — what the plan logged as "address R6/R7/R9 follow-ups
inline" became 11 commits closing two prior R6 violations, six
R7 disposition gaps, the NavChapter/NavModule R9-production
case, and an R9-test convergence across 6 test files. Surfaced
the doctrine bump: R7 grep pattern must cover `=== undefined`,
not just `!`-prefixed conditions.

Second-biggest delta: **a11y structural cleanup multiplied**.
W4c's new Container-axe coverage (Batch 3b infrastructure)
immediately caught three latent W4b landmark bugs at the
component seam — `<LibraryCollectionShell>` initially used
`<main>` (would have triggered duplicate-landmark violations
across 14 routes if Batch 4 had multiplied it); `CourseObjectives`
had a `<div>` parent with nameless inner `<section>`;
`TopicSpecContent` opened with `<article>` not a landmark. All
three were same-root-cause (Surprise #5).

## Doctrine review

### W3 R1 — Multi-pattern Phase-1 enumeration ✓

W4c's design doc + plan + post-W4b audit enumerated touchpoints
across shell, refactor adoptions, new OMIFlow rollups, per-entry
Spec routes, schema slug derivation, audit invariants, demo
fixture, Container API infra, e2e gate, docs sweep. The estimate
matched actuals on file count (±20%); LOC came in well above
estimate because of the unplanned hygiene sweep (Batches 0/0b)
and the Container API scaffolding (Batch 3b).

### W3 R2 — Structural disambiguator on rewrites ✓ (mostly N/A)

W4c is dominantly net-new + extract-into-shell; the Course*
refactor (Batch 4) is the closest renaming-style move and used
the W3 clean-rewrite shape (rewrite the consumer, drop the old
inline chrome, ship the import together).

### W3 R3 — JSX value-expression caveat ✓ (N/A)

W4c included no `prop={var}` rewrites.

### W4a R4 — `docs/website/` in Phase-1 scope ✓

Applied at design-doc time. Batch 10 docs sweep landed all 6
doc files in the same PR per
[`feedback_docs_no_drift`](../../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_docs_no_drift.md).

### W4a R5 — Verify cited ADRs by reading ✓

Phase 1 read ADR 0053, 0058, 0064, 0068, 0070, 0079 in full
before locking scope.

### R6 — MyST anchor verification ✓ (with one residual)

Applied throughout. Batch 0 fixed two prior W4b-era violations
(`#L\d+` GitHub line-anchors). Batch 10.1–10.3 caught four
fresh cross-ref warnings introduced by the docs sweep and fixed
inline before commit. **One residual finding**: the ADR 0079
revision-history `#audit_overrides-chapter-frontmatter` xref
target on ADR 0053 doesn't resolve cleanly under MyST's
auto-slug rules (the heading uses `_` which MyST renders as a
literal in the slug, but `audit_overrides` as a column-header
in a markdown table doesn't generate an anchor at all). The
xref produces a plain-link fallback rather than failing the
build. Pre-existing class of issue; not in W4c scope to fix
per W3 (would require restructuring ADR 0053 itself).

### R7 — Silent-skip extractor disposition ✓ (with bump)

Applied; Batch 0 added disposition comments to 4 silent-skip
sites (`topic.ts`, `inline-refs.ts`, `retrieval-prompt.ts`,
`skill-review.ts`). Batch 0.5b found two more sites that the
Phase-A grep missed: they used `if (X === undefined)` /
`if (X === null)` rather than the `if (!X)` shape the grep
matched. **Doctrine bump (proposed)**: R7 grep pattern extends
to cover both negation shapes — see "Doctrine refinements"
below.

### R8 — Module-scoped MDX cache HMR strategy ✓ (N/A)

No new module-scoped caches in W4c. The W4b resolver caches
(topic AST + chapter→topic dep map) are still in force; W4c's
Task 8.4 reuses the existing `renderTopicCardSlotsToHtml`
helper without adding new cache layers.

### R9-production — one canonical declaration per interface ✓

Applied; Batch 0 fixed the NavChapter/NavModule import
refactor (`ModuleNav.astro` was redeclaring the local types
that already had a canonical home in `module-nav-helpers.ts`).
Drop unjustified re-export shim.

### R9-test — canonical import preference in tests ✓ (with sweep)

Codified in Batch 0.3 (AGENTS.md R9-test addition). Batch 0b
cleaned up six test files that had been declaring local
test-mock interfaces drifting from the canonical types (post-
W4b audit A2-R9 finding); all six now import canonical.

## Surprises

### Surprise #1: The W4b R6 self-application (Batch 0.3)

While codifying R6 + R7 + R8 + R9 into AGENTS.md as standing
PR-review discipline, the commit itself contained a broken
tilde-path link (`~/.claude/projects/...`) that R6 would have
caught — the new doctrine and its first violation shipped in
the same commit. Caught at next-step review. Fix landed in
`72a3d98` ("close Task 0.3 follow-throughs"). **Lesson**:
doctrine codification is itself subject to the doctrine being
codified; re-read the codifying commit against its own rules
before merge.

### Surprise #2: Vite 7/8 augmentation drift in @sophie/astro vitest (Batch 3b)

Setting up Container API + jsdom + axe in `@sophie/astro`'s
vitest config triggered a TS augmentation collision: Astro
pulls `vite@7`, vitest@4 pulls `vite@8`, and their respective
`UserConfig` augmentations don't structurally merge. The
intersection is `never` at the type level. **Fix**: `as any`
cast at the config seam with an inline removal-trigger comment
(remove once Astro upgrades to vite@8 or vitest backports the
augmentation shape). Not fixable from Sophie; documented as a
known seam. Post-W4c hardening candidate: investigate
vitest-axe migration as a way to skip the Container vitest
seam entirely.

### Surprise #3: jsdom 29 + Node 25 TextEncoder/Uint8Array realm invariant (Batch 3b)

jsdom 29 creates `TextEncoder` and `Uint8Array` in its own JS
realm; esbuild's internal `instanceof Uint8Array` checks then
fail because the jsdom-realm typed array is not an instance of
the Node-realm `Uint8Array`. Symptom was opaque: "Invalid
input" or "Cannot read properties" inside esbuild during MDX
compile under vitest. **Fix**: `test-setup.ts` re-aligns global
`TextEncoder` + `Uint8Array` to the Node realm before any test
loads. Documented as a known multi-realm gotcha.

### Surprise #4: `.exclude("astro-island")` silently disables axe `landmark-no-duplicate-main` rule (Batch 3c)

While wiring the new e2e axe gate, the natural shape
`AxeBuilder.exclude("astro-island")` (copied from the 17
pre-W4c specs) silently dropped the
`landmark-no-duplicate-main` rule from the default rule set —
because Axe's exclusion semantics drop rules whose targets are
entirely inside the excluded subtree, and `astro-island`
covers the page chrome where Astro's hydration root lives.
**Fix in the new spec**: switch to
`.withTags("wcag21aa", "best-practice")` for explicit rule
inclusion; verify rule presence by tag, not by subtree. The
17 existing axe-in-e2e specs ship with this gap and would all
benefit from the same sweep — flagged as W4d candidate;
out-of-scope for W4c per W3.

### Surprise #5: 3 latent W4b a11y bugs caught by W4c axe coverage (Batches 3 + 4.6 + 7)

Three same-root-cause landmark bugs surfaced as soon as W4c
added component-axe coverage:

- `<LibraryCollectionShell>` initial draft used `<main>` for
  the region landmark. Because the Astro layout already owns
  `<main>`, this would have triggered
  `landmark-no-duplicate-main` violations across the
  14-Library-route blast radius — caught BEFORE Batch 4 + 5
  multiplied it. Fix: `<section aria-labelledby={titleId}>`
  (commit `8d5db58`).
- `CourseObjectives` had a `<div>` parent with a nameless
  inner `<section>` — neither participated as a landmark.
  Fix: hoist label to `<section aria-labelledby>` (Task 4.6;
  W4b-era latent bug, never caught because W4b lacked
  component-axe coverage).
- `TopicSpecContent` opened with `<article>` not a landmark;
  same fix shape (`<section aria-labelledby>`).

All three are the same pattern: when a component nests under a
known parent landmark, the right region landmark is
`<section aria-labelledby>` — not `<main>` (which collides
with the layout's `<main>`) and not `<article>` (which is not
a landmark element). **Doctrine refinement R10 proposed**
(see below).

### Surprise #6: Container API doesn't cover full-page routing (Batch 7)

The Container API renders components but not full Astro
`getStaticPaths` routes. To get axe coverage on per-entry Spec
pages, the W4c shape extracted **9 `<XSpecContent>` inner
components** — the route file is a thin layout wrapper, the
inner component is what the Container axe test exercises.
Pattern: route → layout → inner-content component →
Container-renderable. Documented as the Container's design
boundary; the wrapper-route pattern lets W4c's a11y gate cover
all 9 Spec pages without spinning up a full Astro dev server.

### Surprise #7: Cross-ref `refKey` matching rules differ per inline-ref type (Batch 7)

While wiring the 8 Spec routes, three different cross-ref
matching rules surfaced:

- `<GlossaryTerm>` slugifies refKey before lookup
  (`GLOSSARY-coverage` audit).
- `<FigureRef>` raw-matches refKey against the registry id
  (`FIG-coverage` audit).
- `<EquationRef>` direct-id-matches against the registry id
  (`EQREF-coverage` audit).

Each Spec route's per-entry lookup had to mirror the
corresponding audit's source-of-truth or risk
audit↔route drift. Each route's subagent traced back to the
invariant's matcher before wiring the lookup; no drift shipped.
Possible future consolidation (post-W4c) is `lookupByRefKey`
helper per inline-ref kind.

### Surprise #8: Figure registry timing in getStaticPaths (Batch 7.4)

`FigureRegistry` is populated by `TextbookLayout` AT SLOT
RENDER TIME — it's a build-time-accumulator pattern where the
layout walks its children and registers each `<Figure>`.
`getStaticPaths` runs BEFORE any layout renders, so calling
`registry.list()` inside the FigureSpec route returns empty.
**Fix**: enumerate from `content/figures.ts` directly (the
file the registry would have populated from). Pattern
divergence documented; post-W4c hardening candidate is to
expose the registry-tier at build-time via the same
accumulator.

### Surprise #9: turbo --force race in typecheck pipeline (Batches 0, 2)

`pnpm turbo run check-types --force --filter=...` invalidates
the cached outputs of dependent packages, and cross-package
`.d.ts` consumption can race because turbo doesn't serialize
type-emitter → type-consumer the way it serializes `build` →
`test`. Symptom: one transient "Cannot find module
'@sophie/core'" failure per batch on first attempt; immediate
retry passes clean. Known turbo issue (not Sophie's to fix);
documented as a "rerun once" disposition.

### Surprise #10: YAML frontmatter prose leaks into JSX scan (Batch 9.3)

Building the smoke PRA-2 + audit_overrides demo fixture
revealed a real MDX-compile fragility: a literal
`<SkillReview.Card id="X">` text reference inside a YAML
`reason: |` block triggered the MDX compiler's JSX scan
because the MDX parser doesn't reliably bound YAML frontmatter
against the body. The angle-bracket text was interpreted as an
unbalanced JSX tag. **Fix**: drop the angle brackets in the
prose; reference cards as `SkillReview.Card[id="X"]` instead.
Real platform fragility, not just a fixture issue; post-W4c
hardening candidate is a YAML-fence escape doc or a parser
fence.

### Surprise #11: Plan path defects + biome per-file discipline (Batches 1, 2)

The W4c plan's Batch 1 + 2 paths pointed at
`packages/core/src/schema/pedagogy-index-entries/key-insight.ts`
— but the actual file is `inline-content.ts` (KeyInsightEntry
lives there alongside other inline content entries). Plan's
test command was `pnpm test` (no `--filter`), which exits 0
without running anything. Both defects caught at first attempt
to execute the plan; corrected inline in commit `e5241d2`
("patch plan defects surfaced during execution"). **Lesson**:
plan-time path verification + plan-time test-command
verification belong in the plan-writing skill, not just at
execution.

### Surprise #12: Missing package.json exports for Batch 5 components (Batch 6)

The 3 new CourseX components (Batch 5) shipped without
matching entries in `@sophie/astro`'s `package.json` exports
map. Discovered at Batch 6 when wiring the new routes — the
typecheck step failed on `import { CourseObservables } from
'@sophie/astro'`. **Minimum-scope fix inline** per W3
("clean up your own mess"): added the three missing exports
in the same Batch 6 commit. Reminder: when adding a component
in batch N, verify the export map in the same batch — don't
defer to the consumer-wiring batch.

## Doctrine refinements

### R10 (proposed) — Landmark choice when nested under a parent landmark

W4c Surprise #5 surfaced three same-root-cause landmark bugs
across the W4b and W4c surface. The pattern:

- When a component nests under a layout that owns `<main>`
  (i.e., almost every Astro page component), the right region
  landmark for an internal section is
  `<section aria-labelledby={headingId}>` — **not** `<main>`
  (collides), **not** `<article>` (not a landmark),
  **not** `<div>` (nothing for the SR to announce).

R10 rule (proposed): when a new component is designed to live
inside another landmark, declare its landmark element as
`<section aria-labelledby={...}>` unless there's a documented
reason to use a different element. The named-region pattern
is the default; deviations require a sibling comment.

Apply during component design and review. Codification belongs
in `feedback_review_rules_r6_r9.md` follow-on; not codified in
this PR.

### R7 grep pattern extension

Batch 0.5b found 2 silent-skip sites that the original R7
grep missed because they used the equality-check shape
(`if (X === undefined)` / `if (X === null)`) instead of the
negation shape (`if (!X)`). The grep pattern that closes R7
disposition must cover all three. Proposed extended pattern:

```
grep -rE "if \(!(\w+)\)|if \((\w+) === undefined\)|if \((\w+) === null\)" \
  packages/astro/src/lib/pedagogy-index/extractors/
```

Codification belongs in `feedback_review_rules_r6_r9.md`
follow-on; not codified in this PR.

These two refinements belong with the existing R6–R9 rule
family in the memory note; not codified in this PR per W3
(separate-cleanup commit later).

## R+CR findings + resolutions

R+CR runs in Batch 12 (`superpowers:requesting-code-review`
subagent against the W4c diff). Critical + Important findings
will be addressed inline before PR merge; Minor findings
disposition table will land here as a Batch 12 update to this
file before merge. The pre-merge update commits to this
section under the conventional `docs(W4c): R+CR resolutions
table fill-in` message.

## Handoff to post-W4c (Wedge B-followup closes)

W4c is the final sub-wedge of Wedge B-followup per the W4
meta-plan. The Library room story is now end-to-end complete:
URL conventions (W4a), affordances + Topics tile + PRA-1
graduation (W4b), and chrome + OMIFlow rollups + per-entry
Spec routes + PRA-2 audit_overrides honoring (W4c).

**Next milestone (separate session):** ADR 0064 chapter pilot
in `/Users/anna/Teaching/sophie/astr201-sp26/`. Curriculum-side
work, separate repo per ADR 0001. The pilot exercises the full
Library + bridge + topic-registry + SkillReview-resolver +
Library Spec routes against real curriculum content. Per ADR
0064 §4 rotation, the next pilot's structural density should
differ from W4c's chrome-extraction-heavy profile —
likely "high-physics-density Reasoning OS chapter" exercising
the Reasoning OS thesis affordances.

**Carry-forward to post-W4c (Wedge D / W4d candidates):**

1. **Structural option-b fix for I1** (post-W4b carry-forward):
   AuditOverrideSchema per-invariant anchor-required validation
   via discriminated union on `invariant` field. Broader ADR
   0053 amendment discussion: which audits demand Grain-2/3
   anchors and which accept Grain-1 sweeps.
2. **17 existing axe-in-e2e specs sweep** (W4c Surprise #4):
   add `.withTags("wcag21aa", "best-practice")` to all
   pre-existing axe-in-e2e specs so that
   `landmark-no-duplicate-main` and related best-practice
   rules don't silently drop when `astro-island` is excluded.
3. **Container API setup hardening** (W4c Surprise #2):
   investigate fixing vite@7/8 augmentation upstream; consider
   vitest-axe migration as a way to skip the Container vitest
   seam entirely.
4. **Back-link linkification across 9 Spec routes** (deferred
   from W4c): awaiting the Unit→URL mapping lock so back-links
   to "first section that cites this entry" resolve to a stable
   URL shape.
5. **Figure registry getStaticPaths timing** (W4c Surprise #8):
   expose `FigureRegistry` at build-time via accumulator so
   `getStaticPaths` doesn't need to enumerate from
   `content/figures.ts` directly.
6. **YAML frontmatter prose leak into JSX scan** (W4c
   Surprise #10): document YAML-fence escape rules for prose
   referencing JSX-shaped tokens, or harden the MDX parser
   fence.
7. **R10 codification** (W4c Surprise #5): add the
   `<section aria-labelledby>` landmark rule to the R6–R9
   memory note as R10.
8. **R7 grep pattern extension** (W4c Batch 0.5b): cover
   `=== undefined` / `=== null` negation shapes.
9. **3 deferred Library rooms** (Assumption / Approximation /
   Numerical): wait until ADR 0058 role-tagging extends per
   ADR 0058 §4.

Per the W4 meta-plan: Wedge B-followup CLOSES on this PR's
merge. The platform side of the prereq-pedagogy + Library-room
story is complete; the next milestone moves to the curriculum
side.
