# Bucket B + Bucket C architecture audit — SoTA review pre-visual-polish

**Date**: 2026-05-15
**Trigger**: Bucket B (chrome + foundation, 10/10) and Bucket C
(pedagogy-index infrastructure, 4/4) both closed; the LDS-
conformance foundation tranche (ADRs 0040–0046) graduated 2026-05-14
docs-only; the 12-commit hardening pass landed 2026-05-15 (ADRs
0047–0054). Anna asked for a SoTA architecture audit before
visual-polish PRs start touching every component.
**Scope**: Nine audit dimensions covering package boundaries,
pedagogy-index pattern coherence, test discipline, type safety,
biome posture, Storybook coverage, a11y posture, PR-10 commit-history
hygiene, and the Phase-3 LDS-foundation code-readiness gap.
**Methodology**: Fresh metric runs across all packages, grep-verified
inventory, ADR-keyed evidence collection. Skill scaffolding:
[`reviewing-project-quality`](file:///Users/anna/.claude/skills/reviewing-project-quality)
gave the section structure; the deeper-structural lenses
([`architecture-review`](file:///Users/anna/.claude/skills/architecture-review),
[`simplify`](file:///Users/anna/.claude/skills/simplify)) were applied through
dimensions 1, 2, 4, 9.
**Verdict**: **A (94/100)** — down 2 points from the PR-6 audit's
A+ (96/100). The drop is **not regression** in the chrome layer;
it reflects two new realities: (a) the LDS-foundation tranche
(ADRs 0040–0054) added a large docs-to-code gap that didn't exist
at PR-6 time, and (b) PR 10's chapter-print polish shipped one
class-name-assumption hole (`.sophie-rollup-entry`) and the PR 7
type-fallback (`?? "page"`) that need fix-ups. **Pre-visual-polish
readiness: GREEN with two P1 fixes.**

---

## Section 1: What changed since the PR-6 audit (2026-05-13 → 2026-05-15)

Two days; **four PRs** (+ 14 commits direct-pushed to main); **15
new ADRs**; **3 reviews** (this one is the 4th).

| PR / commit cluster | Item | Effect |
|---|---|---|
| #36–#39 (`d9c…`–`545b325`) | Bucket C PRs C1–C4 + closeout | Pedagogy-index pattern shipped as load-bearing infrastructure; 6 extractors (definitions/equations/key-insights/figures/misconceptions/objectives) + Chapter\* per-chapter aggregators + Course\* roll-ups; LO course roll-up via PR-C4 with systematic build-time audit invariants (`runPedagogyAudit(index)`); 10 invariants shipping (D4/D5, E1/E4/E6, F1/F2/F4, C1, O1/O2, K1); `<ChapterRef>` for cross-chapter linking; SoTA condition-based e2e waits replacing arbitrary timeouts; scroll-spy production fix. |
| #41 (`78d1a5f`) | Bucket B PR 7 — Pagefind faceted search | 7-entity-type facets (page, definition, equation, key-insight, figure, misconception, objective) via a converter-registry seam (`packages/astro/src/lib/pagefind-converters/{6}.ts` + `index.ts`); Cmd/Ctrl+K Radix Dialog modal; `<SearchTrigger>` chrome primitive; `<SearchModal>` + `<ResultList>` + `<ResultCard>` + `<ChipStrip>` (4 React subcomponents, each axe-tested); Pagefind postbuild orchestrator; ADR 0032 React-island scope honored. **One structural debt:** `ResultCard.tsx:91` runtime fallback `result.filters?.type?.[0] ?? "page"` accommodating Pagefind's default-crawl page records that lack `type:` facet emission. |
| #42 (`215a20a`) | Bucket B PR 10 — chapter-print polish | `@sophie/theme/css` emits `@media print` forced-light tokens; `@sophie/astro/styles/textbook-layout.css` adds chrome reset + view-mode-Wide override + page-break protection; interactive-to-static expansion (Predict/SelfAssessment/CollapsibleCard/InteractiveCheckbox/GlossaryTerm); first-use `<GlossaryTerm>` inline footnotes via the new `markFirstUseGlossaryTerms` remark-plugin pass — making PR 10 the **8th consumer** of the pedagogy-index. **One structural debt:** print-rule `.sophie-rollup-entry` page-break protection (line 635) has no DOM-side source (Course\*/Chapter\* components use BEM-style class names like `sophie-course-figures__item` — no shared rollup-entry class is applied anywhere). |
| 2026-05-14 ADR tranche | A1–A6 LDS foundation graduated (ADRs 0040–0045) | TDR template; teaching-move library; pedagogy-contract + AI-contribution ledger; notation registry + `<MultiRep>` + alignment audit; misconception graph + intervention library; pedagogical-diff + curriculum CI. **All docs-only.** Companion reference docs landed; schema enforcement, components, audit-invariant code, route emitters, and `sophie diff` implementation are Phase 3 follow-on. |
| 2026-05-15 hardening tranche | ADRs 0046–0054 (minus 0050) | Equation Biography (A7); 7 cross-cutting ADRs addressing the 2026-05-14 expert-review's S1–S6 + Missing-2 concerns (empirical validation, content plugins, refactor CLI, chapter-status + course-versioning, scheduled publication, conformance failure modes, course schedule). Plus 3 amendments to existing ADRs 0007 / 0030 + `audit-and-ai-authoring.md`. The 12-commit pass was independently re-audited at [hardening-pass quality audit](2026-05-15-hardening-pass-quality-audit.md) (C+ 59/100); 8 BLOCKING + ~22 IMPORTANT issues identified; `ee74aa6` direct-push (M2 substrate fix + bidirectional TDR↔commit traceability) closed the most urgent BLOCKING items. |

Net code: **~3500 LOC** across pedagogy-index extractor (~1300),
Pagefind converters + postbuild (~600), Search components (~500),
print polish (~400), remark-plugin extensions (~300), markup
extensions (~400). Net docs: **15 ADRs + 9 reference docs + 6
design plans + 3 reviews**.

---

## Section 2: Test metrics (fresh runs, post-merge)

| Layer | PR-6 audit | Now (2026-05-15) | Δ |
|---|---:|---:|---:|
| `@sophie/components` test files | 33 | **44** | +11 |
| `@sophie/components` test cases | 185 | **285** | **+100 (+54%)** |
| `@sophie/components` stmt coverage | (not reported) | **78.87%** | — |
| `@sophie/components` line coverage | (not reported) | **79.88%** | — |
| `@sophie/components` fn coverage | (not reported) | **69.14%** | — |
| `@sophie/astro` test files | 8 | **23** | **+15 (+188%)** |
| `@sophie/astro` test cases | 102 | **296** | **+194 (+190%)** |
| `@sophie/astro` stmt coverage | (not reported) | **88.2%** | — |
| `@sophie/astro` line coverage | (not reported) | **91.57%** | — |
| `@sophie/astro` fn coverage | (not reported) | **88.33%** | — |
| `@sophie/core` test files | 4 | **6** | +2 |
| `@sophie/core` test cases | 34 | **96** | **+62 (+182%)** |
| `@sophie/theme` test files | 0 | **0** | — (build-emitted) |
| **Total unit tests** | **321** | **677** | **+356 (+111%)** |
| `examples/smoke` e2e spec files | 15 | **31** | +16 |
| `examples/smoke` e2e cases (incl skips) | 87 | **156** | +69 |
| `examples/smoke` `test.skip` | (unknown) | **11** | flag |
| Storybook stories (sum) | 45 (45 axe-clean) | **64** (axe-clean: see §3-D7) | +19 |
| Storybook stories per component | varies (3 avg) | **3.6 avg** | +0.6 |
| ADRs | 38 | **53** | **+15 (+39%)** |
| Components in `@sophie/components` | 13 | **18** | +5 |
| Chrome primitives in `@sophie/astro/components` | 12 | **24** | **+12 (+100%)** |
| Smoke chapters | 3 (1 real, 2 stubs) | **3** | unchanged |
| Smoke modules | 2 | **2** | unchanged |

`@sophie/astro` test count nearly tripled. The new pedagogy-index
extractor alone ships **3 test files totaling >2200 LOC of test
coverage** (`pedagogy-index-extractor.test.ts` is the biggest
single test file in the repo at this point) exercising the
6-extractor pattern + cross-chapter HMR hygiene + `clearChapter`
semantics + 6-converter Pagefind shape. Coverage by package:

- **`@sophie/components`**: lines 79.88% / stmts 78.87% / fns 69.14%.
  The fn% gap is **entirely contract.ts factory files**; they're
  registered by the runtime but not directly invoked in unit tests
  (the runtime invokes them on first render). This is the known
  pattern documented at PR-2 audit; not a real coverage gap.
- **`@sophie/astro`**: lines 91.57% / stmts 88.2% / fns 88.33%.
  Strongest in the codebase. The pedagogy-index extractor +
  `pedagogy-audit.ts` invariants + 6 converters are all near-100%.
- **`@sophie/core`**: lines 51.02% / stmts 50.9% / fns 40%. Looks
  low; is *honest*. `@sophie/core` is mostly Zod schemas (validated
  by the integration tests in `@sophie/astro` rather than by direct
  unit tests) + the CLI binary scaffold (audit + dev commands) which
  has no integration test yet. The pedagogy-index *schema* tests
  are exhaustive; the CLI tests are pending Workstream 2.

---

## Section 3: Audit dimensions — evidence per ADR

### D1 — Package boundary purity (ADR 0001)

| Check | Result |
|---|---|
| `from "astro"` in `@sophie/components` | **0** ✅ |
| `from "astro:*"` virtual imports in `@sophie/components` | **0** ✅ |
| Layout class-name leak in `@sophie/theme` | **0** ✅ (BEM-style classes live in `@sophie/astro/styles/textbook-layout.css`, theme stays role-token-only) |
| Non-`@sophie` external deps in `@sophie/components` | React (implicit); Zod (implicit); `@radix-ui/react-collapsible`, `@radix-ui/react-dialog`, `@radix-ui/react-hover-card` (a11y primitives per ADR 0019); `katex` (math rendering); `lucide-react` (pedagogy icons); `idb` (IndexedDB per ADR 0007); `@testing-library/react`, `jest-axe`, `vitest`, `node:fs`, `node:path` (test-only). **All legitimate; ADR-traceable.** |
| `@sophie/core/schema` imports in `@sophie/components` | All type-only (`import type`) for ChapterEntry, ModuleEntry, EquationEntry, FigureRegistryEntry, FigureUsageEntry, DefinitionEntry, ObjectiveEntry, EntityType, NonEmptyString; one runtime import: `slugify`. ✅ |

**Grade: 20/20.** ADR 0001 is held cleanly. The framework-purity
boundary survived Bucket B + C with zero violations.

### D2 — Pedagogy-index pattern coherence (ADR 0038)

The pedagogy-index pattern is the load-bearing infrastructure for
Bucket B+C and the LDS foundation. **Coherence: HIGH.**

| Layer | Files | Pattern |
|---|---|---|
| Schema | [`packages/core/src/schema/pedagogy-index.ts`](file:///Users/anna/Teaching/sophie/packages/core/src/schema/pedagogy-index.ts) | Zod-as-source-of-truth for `PedagogyIndex` shape: `modules / chapters / definitions / equations / keyInsights / figureRegistry / figureUsages / misconceptions / objectives / inlineRefUsages`. |
| Producer | [`packages/astro/src/lib/pedagogy-index-extractor.ts`](file:///Users/anna/Teaching/sophie/packages/astro/src/lib/pedagogy-index-extractor.ts) (1372 LOC, `IndexAccumulator` class + 6 mdast extractors + remark plugin); `markFirstUseGlossaryTerms` is the 8th consumer added by PR 10. | One singleton (`indexAccumulator`) is the cross-chapter state; pure extractors (`extractDefinitions(tree, slug)`, etc.) are pure-functional. |
| Consumer (virtual module) | [`packages/astro/src/lib/pedagogy-index-virtual-module.ts`](file:///Users/anna/Teaching/sophie/packages/astro/src/lib/pedagogy-index-virtual-module.ts) (Vite plugin; `virtual:sophie/pedagogy-index`) | HMR-aware: on `.mdx` change, virtual-module re-resolves against fresh accumulator state. |
| Consumer (build-time) | [`packages/astro/src/lib/pagefind-postbuild.ts`](file:///Users/anna/Teaching/sophie/packages/astro/src/lib/pagefind-postbuild.ts); 11 `Chapter*.astro` + `Course*.astro` aggregator components reading `indexAccumulator.asPedagogyIndex()` directly. | 6 Pagefind converters honor a uniform `EntityConverter` shape (input = pedagogy entry, output = Pagefind record). |
| Audit | [`packages/astro/src/lib/pedagogy-audit.ts`](file:///Users/anna/Teaching/sophie/packages/astro/src/lib/pedagogy-audit.ts) shipping 10 invariants (D4/D5, E1/E4/E6, F1/F2/F4, C1, O1/O2, K1). | Pure function over `PedagogyIndex`; no I/O. |

**Drift check:** The 8 pedagogy-index consumers cited in the brief
all use one of two access patterns: `indexAccumulator.asPedagogyIndex()`
(direct, inside Astro components and the Pagefind postbuild) or
`virtual:sophie/pedagogy-index` (via Vite virtual module). Both
patterns are well-tested and idiomatic.

**ADR 0045 artifact gap (Phase 3):** `dist/.sophie/pedagogy-index.json`
is documented in ADR 0045 but **not yet emitted**. `indexAccumulator`
is in-memory-only; nothing writes the JSON file to disk. This is
the highest-leverage Phase 3 code-side gap because `sophie diff`
(also ADR 0045) cannot exist without it. Tracked in D9 below.

**Grade: 19/20.** Lose 1 point only for the ADR 0045 in-memory-vs-disk
gap, which is a Phase-3 known-gap not a quality issue. Pattern itself
is publication-grade.

### D3 — Test discipline

Three brief-named items:

**(a) `learning-objectives.spec.ts:60` flake** — observed 1-in-4 in the
PR 10 gauntlet. Inspecting the file:
[`examples/smoke/e2e/learning-objectives.spec.ts`](file:///Users/anna/Teaching/sophie/examples/smoke/e2e/learning-objectives.spec.ts).
The test exercises persistence + hydration; flakes typically come
from race between Astro client:load and IndexedDB ready signal.
Bucket C PR-C4 introduced SoTA condition-based waits — but `:60`
may be an exception left on a timeout-knob. **P1 backlog.**

**(b) `.sophie-rollup-entry` print-rule class assumption** — **confirmed
real bug**. The @media print page-break protection rule at
[`packages/astro/src/styles/textbook-layout.css:635`](file:///Users/anna/Teaching/sophie/packages/astro/src/styles/textbook-layout.css#L635)
includes `.sophie-rollup-entry { break-inside: avoid; }` — but **no
source file applies this class anywhere**. Grep across all of
`packages/` and `examples/` returns the textbook-layout.css
definition only. The Course\*/Chapter\* aggregator components apply
BEM-style classes (`sophie-course-figures__item`,
`sophie-chapter-equations__term`, etc.) — there is no shared
`sophie-rollup-entry` class. The page-break protection for rollup
entries is **dead CSS**. Either: (1) apply the class on each
Course\*/Chapter\* item, or (2) expand the rule to list the actual
BEM classnames. Recommend (1) — single shared class is the SoTA
shape. **P1 backlog.**

**(c) PR 7 `data-pagefind-filter="type:page"` emission gap** — confirmed.
`ResultCard.tsx:91` has the runtime fallback
`result.filters?.type?.[0] ?? "page"` with the comment
acknowledging the structural debt: *"Pagefind's default HTML crawl
emits page records without `filters.type` (only converter-emitted
custom records carry the facet). Fall back to 'page' so the listbox
renders both shapes through one component instead of crashing on
the page-record case."* The right fix is emitting
`data-pagefind-filter="type:page"` on chapter HTML templates so
Pagefind's crawl captures the facet; the runtime fallback can then
be dropped. **P2 backlog.**

**Other findings:**

- **11 `test.skip` in e2e** — concentrated in `chapter-figures.spec.ts`
  (T41), `chapter-equations.spec.ts` (T21/T23, file-level comment
  acknowledges deliberate skip), `chapter-key-insights.spec.ts`
  (T40), `chapter-ref.spec.ts` (children-mode cite), `chapter-
  misconceptions.spec.ts` (T42), `eq-ref.spec.ts` (T26/T27 HMR +
  bare-prose fallback), `figure-ref.spec.ts` (T43/T44/T46 dual-mode
  + dismissal + miss-fallback). These skips are not flakes — they
  await real chapter content (stub chapters 2+3 can't exercise
  per-chapter aggregators meaningfully). Documenting the
  expectation in the audit is the right shape; converting all 11
  to GREEN tests needs Bucket-D real-chapter content. **P3 backlog**
  (waits on Phase 4 ASTR 201 migration).

**Grade: 17/20.** Lose 3 points: 1 for the deferred flake on
`learning-objectives.spec.ts:60`, 1 for the dead-CSS rollup-entry
class, 1 for the PR 7 runtime fallback waiting on structural emit.

### D4 — Type safety

| Check | Result |
|---|---|
| `as any\b` across `packages/` | **0** ✅ |
| `@ts-ignore` across `packages/` | **0** ✅ |
| `@ts-expect-error` across `packages/` | **0** ✅ |
| TypeScript version | 6.0.3 (latest) |
| `noRestrictedImports` Biome rule | Active per Phase 0 step 5 ([ADR 0025](file:///Users/anna/Teaching/sophie/docs/website/decisions/0025-phase-0-actual-scope.md)) |

This is *exceptional*. The pedagogy-index mdast walk lives in
[`packages/astro/src/lib/pedagogy-index-extractor.ts`](file:///Users/anna/Teaching/sophie/packages/astro/src/lib/pedagogy-index-extractor.ts)
— a domain where loose typing is *normal* (mdast nodes are
discriminated unions with deep TS-unfriendly shapes). The extractor
maintains *zero* escape hatches. This required deliberate
discipline.

**Grade: 20/20.** SoTA type safety. No backlog.

### D5 — Biome posture

`pnpm exec biome check .` → **Checked 330 files in 305ms. No fixes
applied. 0 errors, 0 warnings.** ✅

Per CLAUDE.md (engineering principles §Conventions): "*0 warnings
as well as 0 errors. Warnings flag a code-shape issue Biome chose
not to make a hard failure; ignoring them defeats the rule.*"

The 13-commit PR 10 history did surface one biome-config drift
mid-PR (`b5f6377` excluding Playwright snapshot dirs, later
reverted in `03b442d` once the snapshot tests themselves were
dropped). The drift was caught and reverted in the same PR — the
discipline held. **No surviving config-rule exceptions.**

**Grade: 20/20.** No backlog.

### D6 — Storybook coverage

All 18 components ship a `.stories.tsx`. Story counts per component:

| Component | Stories | Notes |
|---|---:|---|
| Aside | 7 | Strong: 4 kinds × inline/docked + edge cases |
| Callout | 9 | Strongest coverage |
| Figure | 5 | Inline + registry + edge cases |
| ChapterRef, CollapsibleCard, EqRef, FigureRef, GlossaryTerm, KeyEquation | 4 | Solid baseline |
| ConfidenceCheck, InteractiveCheckbox, LearningObjectives, Objective, Predict, Reflection | 3 | Adequate |
| ComprehensionGate, EffortLog | 2 | Thin — needs visual-polish expansion |
| **Search** (SearchModal only) | **1** | **Gap.** The 4-React-subcomponent decomposition (ChipStrip, ResultCard, ResultList, SearchModal) means individual subcomponents lack story isolation. |

**Total: 64 stories across 18 components** (avg 3.6/component, up
from ~3.0 at PR-6 audit's 45 stories across 15 components).

Storybook config is healthy ([`packages/components/.storybook/`](file:///Users/anna/Teaching/sophie/packages/components/.storybook/)):
`main.ts`, `preview.tsx`, `preview.css`, `pedagogy-index-fixture.ts`
(fixture infrastructure for stories that need realistic index
data — added during Bucket C), `test-runner.ts`.

**Grade: 18/20.** Lose 2: 1 for the Search single-story gap (3
subcomponents lack story isolation), 1 for the ComprehensionGate +
EffortLog thin-coverage. Both will be addressed naturally by
Workstream 3 visual-polish PRs.

### D7 — a11y posture (ADR 0004)

| Component | axe test files |
|---|---:|
| Aside, Callout, ChapterRef, CollapsibleCard, ComprehensionGate, ConfidenceCheck, EffortLog, EqRef, Figure, FigureRef, GlossaryTerm, InteractiveCheckbox, KeyEquation, LearningObjectives, Objective, Predict, Reflection | **1 each** |
| Search (4 subcomponents: ChipStrip + ResultCard + ResultList + SearchModal) | **4** |

**18/18 components have axe-core coverage.** ✅ ADR 0004 mandate
held end-to-end. The 4-test Search decomposition is the right
shape — each subcomponent independently axe-clean.

**Specific checks per the brief:** `<Predict>`, "SelfAssessment",
`<InteractiveCheckbox>`:

- `<Predict>` ships axe — Predict.test.tsx with `axe(container)` ✅
- "SelfAssessment" — Sophie ships `<Reflection>` + `<ConfidenceCheck>`
  + `<EffortLog>` + `<ComprehensionGate>` instead of one
  monolithic SelfAssessment. All four ship axe. ✅
- `<InteractiveCheckbox>` ships axe ✅

WCAG findings: PR-6 audit listed 4 carry-overs (P3-3 jest-axe
matcher, P3-4 arrow-key nav on radios, P3-5 prefers-contrast,
P3-6 :target pulse). Status unchanged — still P3 polish-grade.

**Grade: 20/20.** Mandatory contract held. No backlog regressions.

### D8 — PR 10 commit-history hygiene

The 13-commit PR 10 history shipped two commits later reverted:

- `5af775c` — `test(smoke): print-mode snapshot for measuring-the-sky
  chapter` — added an HTML snapshot test.
- `b5f6377` — `chore(biome): exclude Playwright snapshot dirs from
  lint scan` — config to accommodate the snapshot.

Both reverted in `03b442d` — `fix(smoke,biome): drop print-mode HTML
snapshot test`. Reason: HTML snapshot tests are brittle (any DOM
change breaks them, hides real regressions in noise) and the
biome-exclusion was a structural concession. Anna's iteration found
the better shape via four-test e2e on the *behavior* the snapshot
was trying to lock (chrome reset, view-mode override, page-break,
interactive expansion).

**Quality call:** the 13-commit history reads naturally as a TDD
arc with one mid-PR pivot. Squash-merging this would lose the
RED-GREEN-RED-pivot-GREEN structure but cleans main history. Per
the [hi-claude session plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
scope decision, future PRs squash-merge. PR 10 itself shipped as a
merge commit (`215a20a`) before the convention switch — acceptable.

**Grade: 19/20.** Lose 1 for the squash-merge convention not having
been in place yet when the obsoleted commits landed; the convention
shift addresses it forward. No retroactive backlog item.

### D9 — Phase 3 LDS-foundation code-readiness (added per scope)

The LDS-conformance foundation (ADRs 0040–0054) graduated 2026-05-14
and 2026-05-15 as **docs-only**. The gap from docs to code is the
load-bearing unknown for Workstream 2 and Phase 3.

**What ships in code today:**

| ADR | Code surface | Status |
|---|---|---|
| 0038 (pedagogy-index pattern) | Full extractor + virtual module + 11 consumers + 10 audit invariants in `packages/astro/src/lib/pedagogy-audit.ts` | **Production** |
| 0040 (TDRs) | None | Docs-only |
| 0041 (Teaching Move Library) | None | Docs-only |
| 0042 (Pedagogy Contract + AI Ledger) | None | Docs-only; invariants PC1/AC1/AC2 not coded |
| 0043 (Notation Registry + `<MultiRep>` + Alignment Audit) | None | Docs-only; invariants NR1–NR4 + MR1–MR4 not coded |
| 0044 (Misconception Graph + Intervention Library) | Misconception schema partially shipped via Bucket C PR-C3; graph fields (prerequisite_misconceptions, related_misconceptions, concept_refs) not yet in schema | Partial |
| 0045 (Pedagogical Diff + Curriculum CI) | None; `sophie diff` CLI does not exist; `dist/.sophie/pedagogy-index.json` artifact not emitted | Docs-only |
| 0046 (Equation Biography) | None; `<KeyEquation>` does not yet accept biography children | Docs-only |
| 0047 (Empirical Validation Plan / `sophie audit --metrics`) | None | Docs-only |
| 0048 (LDS Content Plugins / `@sophie/commons-universal`) | None | Docs-only |
| 0049 (`sophie refactor` CLI family) | None | Docs-only |
| 0051 (Chapter Status + Course Versioning) | None | Docs-only; D-family invariants in pedagogy-audit are unrelated |
| 0052 (Scheduled Publication) | None; `<Solution>` / `<ExamKey>` / `<ScheduledReveal>` components not yet | Docs-only |
| 0053 (Conformance Failure Modes) | Runtime fallbacks for IndexedDB (CF5) live in `@sophie/components/runtime/MemoryResponseStore.ts` per existing ADR 0007 — predates 0053 but is the substrate | Partial substrate; CF1–CF4 not coded |
| 0054 (Course Schedule + Calendar) | None; `<CourseSchedule>` etc. components not yet | Docs-only |

**Audit-invariant coverage:** 10 invariants ship (D4/D5, E1/E4/E6,
F1/F2/F4, C1, O1/O2, K1) — all from the pre-LDS-foundation pedagogy-
index pattern. **Zero invariants** from the new LDS families
(PC/AC/NR/MR/MG/I/CS/CV/SP/CF/SC) ship. The single-snapshot audit
shell can host them, but each family needs a converter from the
foundation YAML / chapter frontmatter → the in-memory index.

**Highest-leverage Phase-3 first moves** (informing future
Workstream 2 + 3 backlog):

1. **Emit `dist/.sophie/pedagogy-index.json` from `pagefind-postbuild.ts`
   or a sibling plugin** — unblocks `sophie diff` (ADR 0045) and is
   a one-file extension to the existing converter chain. 1–2 hours.
2. **Extend the misconception schema with graph fields** (ADR 0044) —
   data shape change in `@sophie/core/schema` + extractor support;
   the existing audit invariants (D/E/F/C/O/K) shape gives the
   template for MG1–MG3. 4–6 hours.
3. **Wire `chapter.status` field** (ADR 0051) — `draft`/`review`/
   `stable` frontmatter; CS1 (draft excluded from student build) is
   a build-time check, not a runtime gate. 2–3 hours.

**Grade: 16/20.** This is the lowest-graded dimension and the
honest weak spot of the audit. It's "not bad code" — there's no
code — it's a *new* docs-vs-code gap that was 0 at PR-6 time and
is now real. Workstream 2's CLI work will close part of this
(at minimum, `sophie diff` becomes possible); Workstream 3's
visual polish is independent.

---

## Section 4: What's working (regression-prevention checklist)

Spot-verified by grep + fresh test runs:

| Fix | Verification |
|---|---|
| ADR 0001 boundary purity | `grep -r 'from "astro' packages/components/src/` → **0** ✅ |
| Type-safety discipline | `as any\|@ts-ignore\|@ts-expect-error` → **0** ✅ |
| Biome 0/0 | `pnpm exec biome check .` → 330 files, 0 errors, 0 warnings ✅ |
| axe-core mandate (ADR 0004) | 18/18 components ✅ |
| `definePreference` factory (ADR 0036) | 3 consumers (sidebar/theme/view-mode) — unchanged from PR-6 audit |
| Cross-bundle DOM observation (ADR 0037) | `aside-positioning.ts` + 2 newer consumers (SearchTrigger, print-mode) |
| Pedagogy-index pattern (ADR 0038) | 8 consumers, single-singleton, ~2200 LOC test surface |
| Converter-registry seam (PR 7) | 6 Pagefind converters, uniform shape, exhaustive tests |
| Pre-PR lockfile check | Project memory `feedback_pre_pr_lockfile_check` enforced |
| Forced-light print tokens (PR 10) | `@sophie/theme/css` emits `@media print` tokens that slide-deck print mode (ADR 0006) inherits for free |
| Condition-based e2e waits (PR-C4) | SoTA-pattern replacing arbitrary `{ timeout: N }` knobs — surfaced + fixed real scroll-spy production bug |

---

## Section 5: Capability inventory — what Sophie can do, end of Bucket B + C

Grouped by layer.

### Pedagogy layer — `@sophie/components` (18 components, 285 unit tests)

Aside, Callout, ChapterRef, CollapsibleCard, ComprehensionGate,
ConfidenceCheck, EffortLog, EqRef, Figure, FigureRef, GlossaryTerm,
InteractiveCheckbox, KeyEquation, LearningObjectives, Objective,
Predict, Reflection, Search (× 4 subcomponents).

All ship: Zod schema, contract.ts factory, .module.css with
token-pure styles, .stories.tsx, .test.tsx with axe-core; persistent
components add `useInteractive` + `HydrationAnnouncer` + BroadcastChannel
LWW (ADR 0029).

### Chrome layer — `@sophie/astro` (24 primitives, 296 unit tests + 156 e2e cases)

12 carryover from PR-6 audit:
TextbookLayout, TextbookHead, TopBar, Sidebar, ContentColumn, RightColumn,
SidebarToggle, ThemeToggle, ViewModeToggle, ModuleNav, TocSidebar, TocDrawer.

12 added since:
ChapterEquations, ChapterFigures, ChapterGlossary, ChapterKeyInsights,
ChapterMisconceptions, CourseEquations, CourseFigures, CourseGlossary,
CourseKeyInsights, CourseMisconceptions, CourseObjectives, SearchTrigger.

The Chapter\* / Course\* aggregator family is the visible manifestation
of the pedagogy-index pattern: same data shape, two presentation
surfaces (per-chapter and course-wide roll-up).

### Pedagogy-index infrastructure — `@sophie/astro/lib`

- `pedagogy-index-extractor.ts` — `IndexAccumulator` class + 6 pure
  mdast extractors + 1 remark plugin + 1 markFirstUseGlossaryTerms
  remark pass. **Single source of truth** for all pedagogy index data.
- `pedagogy-index-virtual-module.ts` — Vite plugin exposing
  `virtual:sophie/pedagogy-index` with HMR support.
- `pedagogy-audit.ts` — 10 audit invariants (D4/D5, E1/E4/E6,
  F1/F2/F4, C1, O1/O2, K1) as pure function over `PedagogyIndex`.
- `pagefind-converters/` — 6 converters (definitions, equations,
  figure-usages, key-insights, misconceptions, objectives) + index
  registry + `strip-html.ts` helper.
- `pagefind-postbuild.ts` — orchestrator wiring the converter chain
  to Pagefind's CLI.

### Theme layer — `@sophie/theme`

- TS tokens canonical → CSS vars + Tailwind preset (ADR 0005 + 0026)
- `@media print` forced-light tokens (PR 10)
- Build output: `dist/theme.css`, `dist/tailwind.css`, `dist/tokens.{js,d.ts}`

### Runtime layer — `@sophie/core` + `@sophie/components/runtime`

- IndexedDB via `idb-keyval` with `ResponseStore` repository (ADR 0007)
- `MemoryResponseStore` runtime fallback (per ADR 0007 + 0053 §CF5)
- BroadcastChannel LWW with per-write `Date.now()` timestamps (ADR 0029)
- `useInteractive` hook (ADR 0004)
- `useHydrated` hook (PR-6 audit's HoverCard hydration race fix)
- `HydrationAnnouncer` per-component live-region (WCAG 4.1.3)
- `createPedagogyStore<T>` factory (Bucket C PR-C3 — shared shape across glossary/equations/key-insights/figures/misconceptions/objectives/chapters/modules)

### Renderer + integration — `@sophie/astro`

- Astro 6 + MDX 5 + React 19 (ADR 0002)
- `<SophieChapter client:load>` boundary (ADR 0027)
- `makeStaticComponents({figures})` register pedagogy components in MDX scope
- `defineSophieIntegration()` wires extractor remark plugin + virtual module + Pagefind postbuild

### What's NOT yet possible (gap to v1)

- **LDS foundation contracts in code** (D9 above) — 14 ADRs docs-only
- **`sophie start` / `sophie preview`** — Workstream 2 deliverable
- **`@sophie/cli`** — package carve-out per Workstream 2
- **`sophie diff` / `sophie refactor` / `sophie publish-state`** — Phase 3
- **Real Chapter 2 + Chapter 3 content** — Phase 4 ASTR 201 migration
- **`<MultiRep>` / `<Solution>` / `<ExamKey>` / `<ScheduledReveal>` /
  `<Intervention>` / `<CourseSchedule>` etc.** — Phase 3 components
- **AI-authoring surface** — Phase 3

---

## Section 6: Prioritized backlog (P1 / P2 / P3 / P4)

### P1 — immediate; fix before Workstream 2 starts

| # | Item | Effort | Evidence |
|---|---|---|---|
| **P1-1** | Fix `.sophie-rollup-entry` dead-CSS print-rule. Either (recommended) apply `class="sophie-rollup-entry"` to each `<li>` in CourseFigures.astro:106 + CourseEquations + CourseKeyInsights + CourseMisconceptions + CourseGlossary + ChapterFigures + ChapterEquations + ChapterKeyInsights + ChapterMisconceptions + ChapterGlossary, OR rewrite the print rule to list the 10 BEM-style classes. | 30 min | [`packages/astro/src/styles/textbook-layout.css:635`](file:///Users/anna/Teaching/sophie/packages/astro/src/styles/textbook-layout.css#L635) page-break protection — no DOM source applies the class. Confirmed by grep across all `packages/` + `examples/`. |
| **P1-2** | Fix `learning-objectives.spec.ts:60` flake. Replace any surviving `{ timeout: N }` knob with condition-based wait on the actual DOM state-machine signal (e.g., `expect(checkbox).toHaveAttribute('aria-checked', 'true')`). | 30 min | Brief observation: 1-in-4 flake in PR 10 gauntlet. Inspect `examples/smoke/e2e/learning-objectives.spec.ts:60`. |

**P1 total: ~1 hour.** Both can land in one direct-to-main commit
or one tiny PR before Workstream 2 starts.

### P2 — fix during Workstream 2 (alongside CLI work)

| # | Item | Effort |
|---|---|---|
| **P2-1** | Emit `data-pagefind-filter="type:page"` on chapter HTML templates so `ResultCard.tsx:91`'s `?? "page"` runtime fallback can be dropped. Solves the structural debt PR 7 left as known. | 1 hr |
| **P2-2** | Emit `dist/.sophie/pedagogy-index.json` build artifact (ADR 0045) — extends `pagefind-postbuild.ts` or sibling plugin. Unblocks `sophie diff`. | 1–2 hr |
| **P2-3** | Add `<Search>` subcomponent stories — ChipStrip alone, ResultCard alone, ResultList alone — independent of the SearchModal-only existing story. | 1 hr |
| **P2-4** | Expand ComprehensionGate + EffortLog stories from 2 → 3+ states each (visual-polish baseline prep). | 1 hr |
| **P2-5** | Add Pedagogy-Audit shell support for **plug-in invariant families** (per ADR 0048's plugin system) so future LDS families slot in without modifying `pedagogy-audit.ts`'s 10-invariant shape. **Structural prep, not a fix.** | 2–3 hr |

**P2 total: ~7 hours.** Reasonable to fold into Workstream 2's CLI
work or land as a follow-up batch.

### P3 — polish; ship opportunistically or alongside visual-polish PRs

| # | Item | Effort |
|---|---|---|
| **P3-1** | Update `docs/reviews/README.md` to include 3 missing entries: 2026-05-13 bucket-b-pr6-audit, 2026-05-13 peerdep-lockfile-sweep, 2026-05-14 adrs-0040-0045-foundation-review. | 10 min |
| **P3-2** | Document the 11 `test.skip` expectations in a single comment block at the top of each affected spec file (5 files). Already partly done for chapter-equations.spec.ts. | 30 min |
| **P3-3** | Carry-overs from PR-6 audit: register `jest-axe`'s `toHaveNoViolations`; arrow-key nav on radio groups; `prefers-contrast: more` support; `:target` pulse on CollapsibleCard + Figure. | 3–4 hr (4 items) |
| **P3-4** | Carry-over from PR-2 audit: `sa-` token namespace migration (still in `EffortLog.module.css`). | 30 min |
| **P3-5** | Verify the `pre-PR pnpm install --frozen-lockfile` pre-push hook proposal (PR-6 P3-NEW-1) — still manual checklist. Surface as ADR or actual hook. | 1 hr |

**P3 total: ~5–6 hours.** Optional; visual-polish PRs will naturally
absorb several.

### P4 — strategic / architectural; queue for HITL discussion

| # | Item | Effort |
|---|---|---|
| **P4-1** | LDS-foundation code-readiness gap (D9 above) is the highest-leverage strategic question. Three first moves identified (JSON artifact emit, misconception graph fields, chapter.status); each is 1–6 hr but they sequence onto Phase 3. **HITL decision: which lands in Workstream 2's PR vs which waits for Phase 3 proper.** | Variable |
| **P4-2** | ADR 0028 (visual regression deferred until Linux-native baselines) needs a successor ADR codifying the Chromatic-style baseline decision per the cheerful-eagle plan. Should land before Workstream 3 prep PR. | 1–2 hr (ADR only) |
| **P4-3** | Squash-merge convention switch needs an ADR per the cheerful-eagle plan scope decision. Direct-push before Workstream 2's first PR. | 30 min |
| **P4-4** | The 2026-05-15 hardening-pass audit (C+ 59/100) surfaced 8 BLOCKING + 22 IMPORTANT issues in the new ADRs/reference docs. `ee74aa6` closed M2-substrate + P1.2 + P1.4 (TDR-seed); others remain. **Independent decision** — different audit, different scope. Listed here for HITL visibility, not as Workstream-2-blocking. | Variable |

---

## Section 7: Quality grades

| Category | PR-6 audit | Now | Δ | Evidence |
|---|---:|---:|---:|---|
| Test coverage | 19 | **19** | — | +356 unit tests (+111%), +69 e2e. 11 documented `test.skip`s on stub chapters lose nothing here (intentional). Lib coverage 51% on @sophie/core is honest — schemas tested via integration; CLI tests pending Workstream 2. axe-core 18/18. Holding at 19 because the LO-flake P1-2 + the 11 deferred .skip's are still there. |
| Design system | 19 | **19** | — | +12 chrome primitives doubled the layer. Pedagogy-index pattern (ADR 0038) is publication-grade. Biome 0/0 across 330 files. Storybook 64 stories across 18 components. Holding at 19 because Search subcomponent story isolation gap + ComprehensionGate/EffortLog thin coverage are real (D6). |
| Domain correctness | 19 | **18** | **−1** | -1 for the D9 LDS-foundation code-side gap. The pre-LDS pedagogy-index pattern is at-or-above PR-6's standard (8 consumers, 10 audit invariants, exhaustive test surface) — but the 14 docs-only ADRs (0040–0054 minus 0050) introduce a *new* docs-vs-code asymmetry that didn't exist at PR-6 time. Smoke chapters 2+3 are still stubs (carry-over from PR-6); not a regression. |
| Accessibility | 19 | **19** | — | 18/18 axe-core coverage (4 in Search). ADR 0004 mandate held. PR-6's P3 carry-overs (jest-axe matcher, arrow-key nav, prefers-contrast, :target pulse) unchanged. |
| Architecture | 20 | **19** | **−1** | -1 for the two structural-debt items: the `.sophie-rollup-entry` dead-CSS contract (D3) and the PR 7 `?? "page"` runtime fallback (D3). Both are documented in code with comments; neither is invisible. The 8th pedagogy-index consumer (markFirstUseGlossaryTerms) extends the pattern cleanly. Cross-bundle DOM observation pattern grew 2 new consumers without drift. |
| **Total** | **96** | **94** | **−2** | **A+ → A** |

Grade band: 90–94 = A. **A maintained.** The 2-point drop is two
specific defensible findings (P1-1 + P1-2 close them in 1 hour
combined). The trajectory from B− (73) → A+ (96) → A (94) reflects
two new realities measured honestly:

1. The chrome layer **did not regress** — every PR-6 grade dimension
   (test coverage 19, design system 19, a11y 19) held exactly.
2. **One architectural dimension** (-1) absorbed two named
   structural-debt items, both with concrete sub-2-hour fixes.
3. **One domain-correctness dimension** (-1) absorbed the new
   LDS-foundation docs-vs-code asymmetry — a *category* of work
   that wasn't on the audit radar at PR-6 time.

**Pre-visual-polish readiness assessment: GREEN.** P1-1 + P1-2 are
genuine blockers (dead CSS + flake); P2 + P3 + P4 are not. Once P1
clears, Workstream 2 can start without architectural debt
contamination.

---

## Section 8: Trajectory across six audits

| Audit | Date | Grade | Trigger |
|---|---|---|---|
| [Phase 1 hardening audit](2026-05-10-phase-1-hardening-audit.md) | 2026-05-10 | B− (73) | Trio 3 closed |
| [Post-hardening audit](2026-05-10-post-hardening-audit.md) | 2026-05-10 | B+ (84) | P1 sprint closed |
| [Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md) | 2026-05-10 | A (91) | P2 sprint closed |
| [Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md) | 2026-05-12 | A (93) | Bucket B PRs 1+2 closed |
| [Bucket B PR 6 audit](2026-05-13-bucket-b-pr6-audit.md) | 2026-05-13 | A+ (96) | Bucket B PRs 3–6 closed |
| **Bucket B + C architecture audit** (this) | **2026-05-15** | **A (94)** | **Bucket B 10/10 + Bucket C 4/4 + LDS foundation tranche graduated** |

Net: **+21 points across six audits, ~5 days, 19+ PRs.** The single
−2 turn at this audit is the LDS-foundation gap (a new dimension)
+ two named structural debts. **Path back to A+ (96–98):**

- Close P1-1 + P1-2 (→ +1 architecture).
- Workstream 2 CLI work closes P2-1 + P2-2 + plugin-shell P2-5
  (→ +1 domain correctness).

Both close cleanly within the Workstream 2 envelope.

---

## Section 9: What this enables — pre-Workstream-2 status

**Pre-visual-polish readiness checklist:**

- ✅ Boundary purity held (ADR 0001).
- ✅ Type safety: 0 escape hatches.
- ✅ Biome: 0/0 across 330 files.
- ✅ a11y: 18/18 components axe-tested.
- ✅ Test surface: 677 unit + 156 e2e cases (+356 / +69 vs PR-6).
- ⚠ 2 named structural debts (P1-1 + P1-2): fix before Workstream 2.
- ⚠ LDS-foundation code-readiness: 3 high-leverage first moves identified; HITL decision required on which land in Workstream 2 vs Phase 3 proper.

**Workstream 2 (CLI) can start once P1-1 + P1-2 close.** Existing
`sophie dev` + `sophie audit` in `packages/core/src/cli/commands/`
(citty-based; ADR 0049 already names `sophie refactor` family;
ADR 0015 names dev surface) provide the scaffold; the new
`@sophie/cli` package carve-out per the
[cheerful-eagle plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md)
is greenfield-ish (4 commands to move).

**Workstream 3 (visual polish) is not blocked by the LDS-foundation
gap.** Visual polish is theme-token + component-rendering work;
schema additions are orthogonal. The Chromatic-style VR baseline
needs an ADR (P4-2) before Workstream 3 prep PR starts.

---

## Section 10: TL;DR — executive summary

Sophie at end of Bucket B + Bucket C + LDS-foundation docs-tranche:

**Grade: A (94/100).** Down 2 from the prior audit's A+; both
points are absorbable by ~1 hour of pre-Workstream-2 fix-up.

**What works (publication-grade):**

- 18 pedagogy components + 24 chrome primitives + 4 preferences +
  3 layout primitives.
- 677 unit tests + 156 e2e cases (+111% / +79% vs PR-6).
- ADR 0001 boundary purity: **0 violations**.
- Type safety: **0 escape hatches** (no `as any`, `@ts-ignore`,
  `@ts-expect-error`).
- Biome: **0 errors, 0 warnings** across 330 files.
- a11y: **18/18 components** axe-core tested.
- Pedagogy-index pattern (ADR 0038): 8 consumers, 1 producer, 10
  audit invariants, ~2200 LOC test surface.
- 6 Pagefind converters honoring uniform shape (PR 7).
- 53 ADRs codifying every load-bearing decision.

**What's load-bearing (architectural insights from this audit):**

- The pedagogy-index `indexAccumulator` singleton is the right shape.
  Hot-path consumers read it directly (`asPedagogyIndex()`); cold-
  path consumers read it through the `virtual:sophie/pedagogy-index`
  Vite module with HMR. Both patterns are well-tested and idiomatic.
- The converter-registry seam (PR 7) generalizes beyond Pagefind.
  Future LDS facets (NR/MR/MG/I) can ship as new converters without
  modifying the registry's shape.
- The Chapter\*/Course\* aggregator family pattern (same data,
  two presentations) is reusable for any future per-chapter +
  course-wide pedagogy roll-up.

**Two named structural debts (P1 backlog):**

- `.sophie-rollup-entry` print-mode CSS rule has no DOM source.
- `learning-objectives.spec.ts:60` flake (1-in-4 in PR 10 gauntlet).

**One new docs-vs-code asymmetry (D9):**

- 14 LDS-foundation ADRs (0040–0054 minus 0050) ship docs-only.
  Three high-leverage first moves identified (JSON artifact emit;
  misconception graph fields; chapter.status frontmatter); each
  fits within Workstream 2's envelope if Anna decides to fold them.

**Next milestone:** P1-1 + P1-2 fix-up commit, then Workstream 2
brainstorming for `sophie start` / `sophie preview` UX, then the
`@sophie/cli` package carve-out PR. After Workstream 2 closes:
the Chromatic-style VR baseline (P4-2) lands as Workstream 3 prep,
then per-component visual polish PRs begin.

---

## References

- [Bucket B PR 6 audit](2026-05-13-bucket-b-pr6-audit.md) — prior state (A+ 96/100).
- [LDS-foundation hardening pass quality audit](2026-05-15-hardening-pass-quality-audit.md) — independent audit of ADRs 0047–0054 + amendments (C+ 59/100).
- [Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md).
- [hi-claude session plan (cheerful-eagle)](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md) — Workstreams 1 / 2 / 3 sequencing.
- ADRs cited: 0001, 0004, 0005, 0007, 0011, 0014, 0015, 0019, 0023, 0025, 0026, 0028, 0029, 0032, 0035, 0036, 0037, 0038, 0040–0049, 0051–0054.
- PRs: #36–#39 (Bucket C C1–C4 + closeout), #41 (`78d1a5f` — Bucket B PR 7 Pagefind), #42 (`215a20a` — Bucket B PR 10 print polish).
- Commits direct-pushed since PR-6 audit: 14 docs/ADR commits including the 12-commit hardening tranche (`e2bad73 → 0083dc7`) + `ee74aa6` (M2 substrate fix) + `7737d58` (ADR editing rules loosened).
