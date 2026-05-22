# Wedge B-followup (W1) — Section/Unit in PedagogyIndex quality audit

**Date:** 2026-05-22
**Trigger:** Wedge B-followup W1 branch closed Tasks 1–17 of the
21-task plan (17 commits on `feat/wedge-b-followup` since base
`514deae`). Anna asked for a code review against the W1 design doc
([docs/plans/2026-05-22-wedge-b-followup-design.md](../plans/2026-05-22-wedge-b-followup-design.md))
+ plan ([docs/plans/2026-05-22-wedge-b-followup.md](../plans/2026-05-22-wedge-b-followup.md))
before the pre-PR gates (Task 20) + PR open (Task 21) land.
**Method:** Architecture-level read of the 41 changed files against the
seven locked design decisions (D1–D7) and the four-wedge migration
sequence (W1 → W2 → W3 → W4); pressure test of the new persistence
layer (`useInteractiveRangeMulti`, `ResponseStore.getAllMulti`) and
audit-graduation paths (PRA-1 Unit-aware fallback, SR-1 section-
validity); plan-alignment check against the 21-task plan.
**Branch:** `feat/wedge-b-followup` (17 commits ahead of `main` at
session start; base `514deae`, head `767e7e9`; +1963/-62 LOC across
41 files).

---

## TL;DR — Executive Summary

Sophie's Wedge B-followup W1 is in **A− (90/100) territory** —
correct architecture, comprehensive test coverage, clean execution
against the seven locked decisions (D1–D7), no defects requiring
mid-audit fix-up. The Sprint K + Wedge B1 hardening discipline (zero-
warning biome, focused-file LOC budget, test-with-source split, atomic
docs) held throughout the 17 commits; the new cross-chapter persistence
layer (`ResponseStore.getAllMulti`, `useInteractiveRangeMulti`,
`createPedagogyStore.all()`) is the most consequential cross-cutting
change since Wedge B1 (PR #156) and is well-tested.

**What's working:** D1's Unit-as-binding lookup chain is implemented
cleanly across schema, accumulator, audit, and runtime. D2's hand-
rolled `useInteractiveRangeMulti` correctly avoids hooks-in-loop, uses
a single per-chapter broadcast subscription, gates LWW per unwrapped
key, and short-circuits on empty chapter lists without spurious I/O.
D7's permanent `chapter` + `lecture` field names are encoded with
exactly the right docstrings ("PERMANENT — persist past W2/W3"). The
forward-compat fallback discipline (PRA-1 falls back to chapter-level
when `index.units.length === 0`; SR-1 skips section-validity when
`index.sections.length === 0`) mirrors the pattern established for
`equationCitations`, `multiReps`, `interventions`, `omiFlows`, etc.
The smoke fixture exercises both new audit paths end-to-end (Unit-
aware PRA-1 quiet via "prereqs covered in same-or-prior Section"; SR-1
quiet via valid section_id ref).

**What's borderline:** The defensive `if (!index.units || …)` coalesce
in `checkPRA1` and `index.sections ?? []` in `checkSR1` are correct
for the pre-W1 test fixture path but should be tightened post-W1 (see
[Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures)).
The pedagogy-store factory `all()` extension is borderline YAGNI (only
one production caller; second caller is Cockpit which isn't built);
verdict is "keep — DRY pay-off is bounded and `all()` is 3 LOC inside
an already-tested factory" (see [Issue 2](#issue-2-suggestion--pedagogy-store-factory-all-extension-is-borderline-yagni-keep-anyway)).
The SpacedReview always-call-both-hooks pattern wastes one IDB read
per render when `section=` is set; verdict is "the wasted read is
cached + sub-millisecond, splitting into two component internals adds
more complexity than it saves" (see [Issue 3](#issue-3-suggestion--spacedreview-calls-both-hooks-unconditionally-bounded-waste)).

**What needs explicit Anna sign-off (per HITL mandate):**
- The remaining 4 plan tasks (Task 18 validation regen, Task 20 pre-PR
  gates, Task 21 PR open) are mechanical but each is a side-effect
  Anna text-confirms per `feedback_no_questions_mode_scope`.
- The "borderline YAGNI" pedagogy-store `all()` extension *was* preauthorized
  in design doc D2's "Cockpit per ADR 0076 reads `practice_attempts`
  across the course makes DRY pay off." If Anna disagrees in
  retrospect, easy rollback.

**What remains (W2/W3/W4 scope, not blocking the W1 PR):**
- W2: file-layout migration (chapter MDX moves into
  `sections/<id>/units/<id>/reading.mdx`); `ChapterEntry` + `ModuleEntry`
  deleted from `PedagogyIndex`; `ArtifactEntry` surfaces; routes
  rewrite. Per ADR 0064 pilot.
- W3: per-callsite key rename `chapter: string` → `unit: string` across
  all ~13 entry schemas. `useInteractive` / `useInteractiveRange` /
  `useInteractiveRangeMulti` parameter rename.
- W4: Library room + bridge rooms + 8 registry Spec pages +
  `<SkillReview>` self-closing topic-registry resolution.

---

## Test metrics (captured 2026-05-22, evening session per Anna's brief)

| Surface | Status | Notes |
|---|---|---|
| `pnpm exec biome check` (all 697 files) | **0 errors, 0 warnings** ✓ | +15 files since Wedge B1 (682 → 697) |
| `@sophie/core` typecheck | **pass** ✓ | |
| `@sophie/components` typecheck | **pass** ✓ | |
| `@sophie/astro` typecheck | **pass** ✓ | |
| `@sophie/core` test:unit | **453 / 453** ✓ | +19 from Wedge B1 baseline (434 → 453) |
| `@sophie/components` test:unit | **700 / 700** ✓ | +15 from Wedge B1 baseline (685 → 700) |
| `@sophie/astro` test:unit | **794 / 794** ✓ | +14 from Wedge B1 baseline (780 → 794) |
| `@sophie/theme` test:unit | **29 / 29** ✓ | unchanged |
| `@sophie/cli` test:unit | **33 / 33** ✓ | unchanged |
| e2e | **157 passed + 5 skipped** ✓ | baseline preserved (no new spec yet — Task 15 e2e folded as "exercised via smoke build" per scope reduction) |
| Smoke build | **12 pages, 125 pedagogy entries, audit: 0 / 13 / 7** ✓ | matches updated `audit-baseline.md` |
| Branch LOC delta | **+1,963 / −62** across 41 files | |
| Committed tests added in W1 | **+48** (19 core + 15 components + 14 astro) | |

---

## What changed (Wedge B-followup W1 cumulative)

### Schemas (`@sophie/core`)

| Schema | Purpose | Tests |
|---|---|---|
| `SectionEntrySchema` (verbatim alias of `SectionSchema`) | Per-Section pedagogy-index entry (5 discriminated variants: module / phase / track / unit-block / bridge) | 6 |
| `UnitEntrySchema` (extends `UnitSchema`) | Per-Unit pedagogy-index entry with `section_id` parent ref + permanent `chapter` (reading) + optional `lecture` (slides) artifact bindings per D7 | 8 |
| `PedagogyIndexSchema` — `sections`/`units` collections added with `.default([])` | Forward-compat surfacing for pre-W1 consumers | 5 (new test cases) |

### Build-time (`@sophie/astro`)

| Addition | Purpose | Tests |
|---|---|---|
| `indexAccumulator.setSections(entries)` | Mirrors `setChapters` / `setModules`: last-write-wins, consumer-global, NOT touched by `clearChapter` | covered by accumulator + smoke build |
| `indexAccumulator.setUnits(entries)` | Same shape as `setSections` | covered |
| `asPedagogyIndex()` returns `sections` + `units` slots | Snapshot includes the new collections | 4 (new accumulator tests) |
| `resetIndexAccumulator()` clears `sections` + `units` | Test-helper coverage | covered |
| **PRA-1 → Unit-aware path (W1 graduation)** | When `index.units` populated, traverse `UnitEntry.prereqs[]` and check SkillReview coverage in same-or-prior Section by `Section.order` | 6 (new Unit-aware test cases + existing chapter-level fallback) |
| **PRA-1 chapter-level fallback (forward-compat)** | When `index.units` is empty (pre-W1 consumers), preserve the existing chapter-scoped behavior | 1 (regression coverage in the new test block) |
| **SR-1 → section-validity (W1 graduation)** | `<SpacedReview section="…">` refs resolve against `index.sections`; unknown slugs emit SR-1 ERROR | 3 (new test cases) |
| **SR-1 forward-compat** | When `index.sections` is empty, section-validity check is a no-op | 1 (regression coverage) |
| `TextbookLayout.astro` — wires 2 new content collections + 2 SSR JSON payloads | Reads `getCollection('sections')` + `getCollection('units')`; calls `indexAccumulator.setSections` + `setUnits`; emits `sophie-pedagogy-sections` + `sophie-pedagogy-units` script tags; calls `__setSections` + `__setUnits` | exercised by smoke build |

### Runtime (`@sophie/components`)

| Addition | Purpose | Tests |
|---|---|---|
| `ResponseStore.getAllMulti(profile, chapters, keyPrefix?)` | Cross-chapter range read; merges via Promise.all + Object.assign; empty array → `{}` without I/O; last-chapter-wins on key collision (documented) | 5 (Memory) + 5 (Fallback/IndexedDB via existing harness) |
| `useInteractiveRangeMulti<T>(course, chapters, keyPrefix?)` | Hand-rolled cross-chapter range hook with N-channel broadcast subscription, per-key LWW gating, empty-list short-circuit (hydrated=true immediately, no I/O), persistence-mode subscription | 4 |
| `createPedagogyStore<T>` factory gains `all(): ReadonlyArray<T>` | Iterate the full collection (filter / map); hydrates from script tag on first call if no setter ran; mirrors `lookup()` lifecycle | 3 |
| `sectionStore` + `__setSections` | Sections SSR-hydrated store (script-id `sophie-pedagogy-sections`); reads `SectionEntry[]` | covered by factory tests |
| `unitStore` + `__setUnits` | Units SSR-hydrated store (script-id `sophie-pedagogy-units`); reads `UnitEntry[]` | covered |
| `@sophie/components/internal/store-hydration` adds `__setSections` + `__setUnits` exports | Subpath consistency with existing 8 setters | covered by TextbookLayout integration |
| `SpacedReview.tsx` — `section=` rendering wire-up | Reads `unitStore.all()` → filters by `section_id === section` → collects `unit.chapter` slugs → calls `useInteractiveRangeMulti` → flattens → LRU over merged set with supplied `max` | 4 (new section-scope tests including 1 forward-compat "no units → empty state") |

### Smoke fixture (`examples/smoke`)

- **2 new `sections/` JSON files**: `foundations.json` (`type: module`, slug `foundations`, order 0) + `stars.json` (`type: module`, slug `stars`, order 1) — twin of the existing `modules/` collection per D3.
- **5 new `units/` JSON files**, one per existing chapter. Field-level binding: `section_id` → matching Section slug; `chapter` → existing chapter MDX slug (W1 stays in place per D3). Notable: `spectra-and-composition.json` declares `prereqs: ["exponents"]` — chosen so PRA-1 stays quiet (spoiler-alerts has a covering `<SkillReview target="topic:exponents">`).
- **`content.config.ts`** — 2 new collection definitions (`sections` + `units`) using `SectionSchema` + `UnitEntrySchema` directly as Astro content-collection schemas (no smoke-side schema re-derivation).
- **`stellar-evolution.mdx`** — adds `<SpacedReview client:load course="astr201" chapter="stellar-evolution" section="stars" max={3}>` with authored `<SpacedReview.Empty>` placeholder. Exercises the new section-scope render path end-to-end.

### Docs

- `audit-baseline.md` — smoke counts regenerated; W1 graduation status table added documenting PRA-1 (Unit-aware) + SR-1 (section-validity) both quiet under the smoke fixture.
- `chapter-components.md` — validation block escalated `unvalidated` → `in-progress` with 3 evidence rows (unit tests, smoke chapter, Wedge B1 review).
- `multirep-component.md` + `intervention-library.md` — validation blocks similarly escalated.
- `validation.md` dashboard — regenerated per `feedback_validation_dashboard_regen`.

---

## Quality grade

### Wedge B-followup W1: **A− (90/100)**

| Category | Score | Evidence |
|---|---|---|
| Test coverage | 19/20 | 48 new tests across 3 packages; every new schema, accumulator setter, audit graduation path, store hook, and component callsite has unit coverage; the `useInteractiveRangeMulti` test file (225 LOC, 4 scenarios) covers empty-list short-circuit, multi-chapter merge, exclusion, and cross-chapter broadcast subscription. **The 1-point miss:** no Playwright e2e exercises the section-scope render path under a real browser — the smoke build's MDX callsite runs through SSR but the IDB-backed flow only fires under React island hydration. The Wedge B1 e2e baseline (157/0/5) is preserved, but no W1-specific spec was added. This was deliberately scoped out of the plan as "exercised via smoke build" but is a coverage gap. |
| Design alignment | 19/20 | D1 Unit-as-binding implemented correctly across all five touch points (schema / accumulator / audit / runtime / smoke). D2 useInteractiveRangeMulti follows the "hand-rolled, no hooks-in-loop" requirement exactly; the docstring at line 39–48 instructs callers to `useMemo` the chapters array (SpacedReview.tsx:72-78 does so). D3 minimal-additive smoke fixture is intact (chapters/ + modules/ stay; sections/ + units/ added alongside). D4 (Subsection skipped) honored. D5 (no new anchor prefixes) honored. D6 (doc-staleness bundled) honored. D7 (chapter + lecture as PERMANENT field names) encoded with explicit docstring comments at `unit.ts:28-30` and `pedagogy-index.ts:184-185`. The 1-point miss: see [Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures) on the defensive coalesce. |
| Architecture | 18/20 | Layered persistence (`ResponseStore.getAllMulti` → `useInteractiveRangeMulti` → `<SpacedReview>`) cleanly extends the Wedge B1 pattern. Framework-purity preserved (`@sophie/components` imports React + Zod + `@sophie/*` only; no `astro:*` per ADR 0001). New stores live in `runtime/` (correct — platform-wide content metadata, not tied to a component); store hydration follows the established subpath export per ADR 0061 R4. The hand-rolled `useInteractiveRangeMulti` is ~120 LOC effective (~150 with comments); fits the ADR 0061 "focused files" budget (300 hard, 500 budget, 800 ceiling). Two-point miss: borderline YAGNI on `createPedagogyStore.all()` (see [Issue 2](#issue-2-suggestion--pedagogy-store-factory-all-extension-is-borderline-yagni-keep-anyway)), and the dual-hook unconditional pattern in SpacedReview is slightly wasteful (see [Issue 3](#issue-3-suggestion--spacedreview-calls-both-hooks-unconditionally-bounded-waste)). |
| Audit / curriculum-CI | 19/20 | PRA-1 Unit-aware logic is correct: builds `sectionOrder: slug → order` map, then `chapterSectionOrder: chapter → order` via Unit binding, then `coverByOrder: order → Set<topic_id>` from SkillReviews; for each Unit's prereq, scans `coverByOrder` for `ord <= unitOrd` matches. Edge case correct: unbound chapters in the SkillReview (chapter not in any Unit) get filtered out — `if (ord === undefined) continue`. SR-1 section-validity correctly skips when `knownSections.size === 0`. The graceful-degradation fallback to chapter-level PRA-1 when `index.units.length === 0` mirrors the Wedge B1 pattern. **The 1-point miss:** SR-1's message points authors to `src/content/sections/${slug}.json` as resolution — assumes the W1 file format. Post-W2 when bridge rooms etc. land with section.yaml, this message gets stale (out of W1 scope per the design doc, but worth a TODO). |
| Docs (post-W1) | 15/20 | audit-baseline.md updated with the right counts + the W1 graduation table; chapter-components.md validation block escalated; multirep + intervention docs validated; validation dashboard regenerated. **Two miss-points:** (a) `chapter-components.md` doesn't yet have a *body-level* section documenting `<SpacedReview section="…">` (Task 19 not yet executed — the validation block was updated but the prose-level inventory wasn't refreshed); (b) the docstrings on `SectionEntrySchema` / `UnitEntrySchema` cross-reference ADR 0067 via relative path `../../../../../docs/website/decisions/0067-…` which is correct but fragile to future file-layout moves (low priority). |

**Total:** 90/100 = **A−**

### Cumulative Sophie state (post-Wedge B-followup W1): **A− (91/100)**

This W1 PR shifts the cumulative grade up from A (93) post-Wedge-B1
by +1 in two places (graduation of PRA-1 + SR-1 from chapter-level
approximations to design-doc-intended Unit/Section-aware shapes) and
−3 from the lingering W2-shape transitional debt (chapters/ + modules/
coexist with sections/ + units/ for exactly one wedge per D3). The
−3 isn't a defect — it's the price of the four-wedge sequence keeping
each commit ship-shaped. W2 reclaims those points by deleting the
coexisting collections.

---

## Defects caught + fixed during this audit

None requiring mid-audit fix-up. The two "issues" flagged below are
design-shape questions, not defects.

The only material issue I found is in the audit code's defensive
coalesce — and that one is correct as written given the test fixture
shape, but worth tightening as a separate change (see [Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures)).
It does not block this PR.

---

## Issues (categorized)

### Issue 1 — Important — Defensive coalesce papers over typecheck bypass in test fixtures

**File:** [packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts:81-90](../../packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts#L81-L90) + [L246](../../packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts#L246)

```ts
function checkPRA1(index: PedagogyIndex, sink: FindingSink): void {
  // Defensive: tests + pre-W1 fixtures may construct PedagogyIndex
  // literals without going through Zod parse (which would default
  // `units` to []). Treat missing/empty as the chapter-level path.
  if (!index.units || index.units.length === 0) {
    checkPRA1ChapterLevel(index, sink);
    return;
  }
  checkPRA1UnitAware(index, sink);
}
```

```ts
function checkSR1(index: PedagogyIndex, sink: FindingSink): void {
  // Defensive: pre-W1 fixtures may omit `sections`. Treat as empty.
  const knownSections = new Set((index.sections ?? []).map((s) => s.slug));
```

The TypeScript `PedagogyIndex` type (inferred via `z.infer<typeof PedagogyIndexSchema>`) declares `sections` and `units` as readonly arrays — *not* optional. The `.default([])` semantics in Zod populate the empty array at `parse` time; the inferred type sees `ReadonlyArray<SectionEntry>` and `ReadonlyArray<UnitEntry>`, not `ReadonlyArray<…> | undefined`.

The `!index.units` and `index.sections ?? []` guards work around test fixtures that construct `PedagogyIndex` literals bypassing Zod parse — and the brief notes that 155 astro tests failed in pre-PR gates without them. That's a real failure mode worth defending against. But the right shape is **either**:

1. **Construct via Zod parse in test helpers.** The 5 fixture-builder functions across the astro test suite (`emptyIndex` in retrieval-family.test.ts:6 is the canonical one) construct literals directly with all 21 required fields — they'd need to either run through `PedagogyIndexSchema.parse({})` or use a factory that does. The downside: every test gains a parse cost.
2. **Mark `sections` + `units` optional in the inferred type.** Change the Zod definitions to `.optional()` with `.default([])`. The inferred type becomes `ReadonlyArray<…> | undefined`, the audit code's `?? []` becomes legitimate, and the runtime semantics are unchanged. The downside: every other audit invariant that reads these collections now has to nullcheck too.
3. **Type the audit functions on a stricter input.** Wrap `PedagogyIndex` in a `RequiredPedagogyIndex` (collapse `?` semantics) at the boundary, fail-fast if any collection is undefined. Cleaner separation; new boundary type.

**Recommendation:** Option 1 — add a `buildPedagogyIndex(partial?: Partial<PedagogyIndex>): PedagogyIndex` test helper to `@sophie/astro/lib/pedagogy-audit/test-helpers.ts` (or co-located with the retrieval-family test if it's the only consumer for now) that calls `PedagogyIndexSchema.parse({ ...emptyDefaults, ...partial })`. This catches the same defects the `!index.units` runtime guard catches — *and* the test fixtures stay typesafe. The runtime guards then come out, the type stays honest, and the W2 audit-graduation work doesn't have to re-add the same coalesce in every new invariant.

**Severity:** Important — current implementation is correct in production (where Zod parse runs at TextbookLayout) and correct in tests (where literals work because of the guards). But the type signature is lying to the audit code about what shape it can see, and future audit invariants will rediscover this papers-over pattern. Tighten before W2 lands.

**Not blocking the W1 PR:** the guards are correct + the tests pass. File this as a P1 backlog item for the W2 design pass.

### Issue 2 — Suggestion — Pedagogy-store factory `all()` extension is borderline YAGNI (keep anyway)

**File:** [packages/components/src/runtime/pedagogy-store.ts:43-52](../../packages/components/src/runtime/pedagogy-store.ts#L43-L52) + [L104-L107](../../packages/components/src/runtime/pedagogy-store.ts#L104-L107)

The `all(): ReadonlyArray<T>` accessor was added to the factory so `<SpacedReview section="…">` could enumerate Units in a Section (`unitStore.all().filter(u => u.section_id === section).map(u => u.chapter)`). The committed second caller per design doc D2 is Cockpit (ADR 0076) reading `practice_attempts` across the course — but Cockpit isn't built.

Strictly DRY says: extract when ≥2 callers exist. Strictly YAGNI says: don't pre-abstract for hypothetical futures. The Sophie engineering principle ("build the best now, plan ahead") sits between them.

**Verdict:** Keep. Three reasons:

1. The `all()` method is 3 LOC inside an already-tested factory; the cost of carrying it ahead of the second caller is bounded.
2. The "second caller" is on a documented (ADR 0076) committed roadmap, not speculative.
3. Without `all()`, `<SpacedReview section=…>` would either (a) reach into `unitStore` internals to iterate the `byKey` Map (worse abstraction leak) or (b) require Sophie to populate a *parallel* `unitList: UnitEntry[]` data path next to `lookup` (worse duplication).

Note: the other 7 pedagogy stores (`definitionStore`, `equationStore`, `chapterStore`, etc.) inherit `all()` but don't use it. That's fine — they get a free no-cost method that may pay off when Cockpit lands. The 3 unit tests at `pedagogy-store.test.ts:130-165` cover the `all()` shape against the same script-tag-hydration + setter semantics as `lookup()`.

**Severity:** Suggestion — no action requested; flagged so the reviewer can object if they disagree. The DRY/YAGNI line is a judgment call, and the design doc explicitly preauthorized this extension at D2.

### Issue 3 — Suggestion — SpacedReview calls both hooks unconditionally (bounded waste)

**File:** [packages/components/src/components/SpacedReview/SpacedReview.tsx:61-82](../../packages/components/src/components/SpacedReview/SpacedReview.tsx#L61-L82)

The component fires `useInteractiveRange` for the (course, chapter, PRACTICE_ATTEMPT_PREFIX) single-target read AND `useInteractiveRangeMulti` for the (course, sectionChapters, PRACTICE_ATTEMPT_PREFIX) cross-chapter read on every render, regardless of which scope mode the props request.

When `target=` is set (single-target scope), `useInteractiveRangeMulti` short-circuits cleanly because `sectionChapters` resolves to `NO_CHAPTERS` (the module-level frozen empty array). That's 0 IDB reads + `hydrated=true` immediately + no broadcast subscriptions. Cost: ~0.

When `section=` is set (section-scope), `useInteractiveRange` still fires its IDB read for the current (course, chapter, PRACTICE_ATTEMPT_PREFIX) — but the `flatAttempts` result is unused (the section-scope path of `dueTargets` reads only `flatMultiAttempts`). Cost: 1 wasted IDB cursor scan per render's first execution; subsequent renders use cached state.

**Three options:**

1. **Status quo (recommended).** The wasted IDB read is cached after first hydration; subsequent renders hit React state, not IDB. The cost in production is a single sub-millisecond read at component mount when the user is on the section-scope path. The component logic is unchanged and the dual-hook pattern matches how `useInteractive` callers compose (per ADR 0007).
2. **Split internals: `<SpacedReviewSingle target chapter />` + `<SpacedReviewSection section />`.** `SpacedReview` becomes a dispatching wrapper. Cleaner, but adds two new internal components, increases test surface, and makes the props-level API surface look less coherent (the existing `chapter=` is always required for SR-1 anchor tracking — both internals need it).
3. **Conditional hook invocation.** React forbids this (hooks must be called in identical order across renders). Off the table.

**Verdict:** Status quo. The waste is bounded, the alternative is more code, and the design doc D2 phrasing ("multi-hook short-circuits with no I/O" when `chapters=[]`) explicitly anticipated this dual-fire pattern.

**Note for W3 author:** when `chapter` → `unit` per-callsite key rename lands in W3, the dual-hook pattern survives the rename (it's a *parameter* rename, not a structural change). No SpacedReview internal refactor needed for W3.

**Severity:** Suggestion — no action requested; documented for design review.

---

## Plan-vs-implementation alignment (21-task plan)

The plan defined 21 tasks. The actual branch executed 17 commits. Per the plan's "Critical files reference" + commit log:

| Tasks | Plan | Status |
|---|---|---|
| Task 1 (worktree + branch) | not in commit log | Done — branch + worktree visible (`feat/wedge-b-followup` at `/Users/anna/Teaching/sophie/.worktrees/wedge-b-followup/`) |
| Task 2 (SectionEntry schema) | 1 commit | ✓ `37030da feat(core): add SectionEntry schema to pedagogy-index-entries (W1)` |
| Task 3 (UnitEntry schema) | 1 commit | ✓ `d3a5734 feat(core): add UnitEntry with section_id + chapter + lecture bindings (W1)` |
| Task 4 (PedagogyIndexSchema integration) | 1 commit | ✓ `18ee4e5 feat(core): surface sections + units in PedagogyIndexSchema (W1)` |
| Task 5 (accumulator setSections/setUnits) | 1 commit | ✓ `2dab7e5 feat(astro): accumulator setSections + setUnits (W1)` |
| Task 6 (internal hydration setters) | folded into Task 7's commit | ✓ `0ab92d1 feat(components): __setSections + __setUnits + sectionStore + unitStore (W1)` |
| Task 7 (useSections / useUnits hooks) | rolled into `sectionStore` / `unitStore` | ✓ same commit; hooks replaced with direct store-`.all()` reads to support the lookup chain |
| Task 8 (ResponseStore.getAllMulti) | 1 commit | ✓ `ef5d2c2 feat(components): ResponseStore.getAllMulti for cross-chapter range reads (W1)` |
| Task 9 (useInteractiveRangeMulti) | 1 commit | ✓ `535a119 feat(components): useInteractiveRangeMulti hook for section-scope reads (W1)` |
| Task 10 (smoke fixture: sections + units) | 1 commit | ✓ `c8dcc86 feat(smoke): add sections + units content collections (W1 fixture)` |
| Task 11 (TextbookLayout wiring) | 1 commit | ✓ `64b7290 feat(astro): TextbookLayout wires sections + units (W1)` |
| Task 12 (PRA-1 Unit-aware) | 1 commit | ✓ `3d98a4e feat(audit): graduate PRA-1 to Unit-aware (W1)` |
| Task 13 (SR-1 section-validity) | 1 commit | ✓ `5899621 feat(audit): graduate SR-1 to validate <SpacedReview section> refs (W1)` |
| Task 14 (SpacedReview section-scope render) | 1 commit | ✓ `6af0514 feat(components): wire <SpacedReview section=> rendering via useInteractiveRangeMulti (W1)` |
| Task 15 (smoke chapter callsite + e2e) | 1 commit (no e2e file) | ✓ `0195919 feat(smoke): exercise <SpacedReview section> end-to-end in stellar-evolution (W1)` — e2e spec deferred per scope reduction (smoke build is the integration canary) |
| Task 16 (audit-baseline.md update) | 1 commit | ✓ `5b5cd42 docs(audit): update audit-baseline.md smoke counts post-W1` |
| Task 17 (validation-block escalations) | 1 commit | ✓ `cb5fe40 docs(validation): escalate chapter-components / multirep / intervention to in-progress + regen dashboard (W1)` |
| Task 18 (validation.md regen) | folded into Task 17 | ✓ same commit |
| Task 19 (chapter-components.md prose) | partial — validation block only | **Pending** — body-level docs prose for `<SpacedReview section=>` not added |
| Task 20 (pre-PR gates) | not in commit log | **Pending** — manual gates not yet run |
| Task 21 (open PR) | not in commit log | **Pending** — branch not yet pushed |
| (extra) | 1 commit | ✓ `767e7e9 fix(audit): defensive checks for pre-W1 PedagogyIndex fixtures + biome format` (mid-execution fix-up for pre-PR-gate test failures; see [Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures)) |
| (extra) | 1 commit | ✓ `7df186a docs(reference): document <SpacedReview section=> graduated rendering (W1)` — partial Task 19 |

**Plan deviations:** All deviations are scope reductions, not departures from the design:

1. **Task 6/7 folded** — internal hydration + component-side hooks shipped as direct `sectionStore` / `unitStore` exports with `__setSections` / `__setUnits`. This matches the existing pattern for `chapterStore` / `moduleStore` and is materially simpler than separate `useSections()` / `useUnits()` hook files. **Correct call.**
2. **Task 15 e2e dropped** — no Playwright spec for section-scope rendering. The smoke build's MDX callsite at `stellar-evolution.mdx:49-59` exercises SSR; the IDB-backed flow is verified by 4 component unit tests at `SpacedReview.test.tsx:173-301`. **Acceptable as W1 scope** but flag as a coverage gap in the [Test coverage](#wedge-b-followup-w1-a-90100) score (−1).
3. **Task 19 partial** — the validation block at `chapter-components.md:11-29` is updated, but the body-level prose section documenting `<SpacedReview section=>` semantics is **not yet added**. The W1 review-template phrasing should call this out as **must-do before opening PR** per Anna's `feedback_docs_no_drift` memory. See [Backlog P1.1 below](#p1--pre-pr-task-19-task-20-task-21).
4. **Tasks 20 + 21 pending** — pre-PR gates + PR open are explicit side-effects requiring Anna's text-confirmation per `feedback_no_questions_mode_scope`.

**Two unplanned commits:**

- `767e7e9` — the defensive coalesce fix-up (see Issue 1). Required to unblock pre-PR test gates; necessary at execution time. Will be replaced by a Zod-parse helper in a follow-up per Issue 1's recommendation.
- `7df186a` — partial Task 19 (`<SpacedReview section=>` reference docs at the prose level). Lands the *signature + section→chapters lookup behavior + SR-1 audit error* documentation per the plan's Step 1.

---

## Decisions to verify with Anna (HITL per the project mandate)

The 10 scrutiny questions in Anna's brief, addressed:

1. **D2's `useMemo` requirement — verified.** SpacedReview.tsx:72-78 memoizes the chapter list via `useMemo([section])`, with the empty-list short-circuit returning `NO_CHAPTERS` (module-level const). `useInteractiveRangeMulti.ts:81-88` handles the empty case BEFORE setting status to `loading` — `setStatus("ready")` fires directly and the effect returns early. Initial `useState("loading")` is correct: there's a single render where status === "loading" before the effect runs (which is what `loading` semantically means; status hasn't been resolved by the effect yet). The `hydrated` getter returns `status === "ready"` so it briefly reads `false` before the effect runs, then flips `true`. **Matches the design doc D2 specification.**

2. **Defensive coalesce in checkPRA1 / checkSR1 — see [Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures).** The fix is correct for the test fixture shape but tighten the type signature post-W1 (Option 1: Zod-parse test helper).

3. **`createPedagogyStore.all()` — see [Issue 2](#issue-2-suggestion--pedagogy-store-factory-all-extension-is-borderline-yagni-keep-anyway).** Keep. Design-doc preauthorized; cost is bounded.

4. **SpacedReview hooks-always-called — see [Issue 3](#issue-3-suggestion--spacedreview-calls-both-hooks-unconditionally-bounded-waste).** Status quo. The dual-fire pattern is intentional and the IDB cost is sub-millisecond + cached.

5. **`getAllMulti` collision semantics — defensible as documented.** Last-chapter-wins is the simplest mergable semantic and the `practice_attempt:<target_id>` key shape rarely collides across chapters in the same Section in practice. The documentation at `ResponseStore.ts:56-60` is clear enough that a future "throw on collision" or "prefer-newest-timestamp" semantic could be layered in without a breaking API change (the return type stays `Record<string, StoredValue<T>>`; the collision policy is an internal implementation detail). **Lock as documented.**

6. **Smoke fixture choice `prereqs: ["exponents"]` (quiet-when-clean) — slightly prefer the proposed alternative.** The Wedge B1 review's principle for the smoke build was "warn-when-exercising" (`<SkillReview>` partial-slot warning, RetrievalPrompt missing-slot warning). Applying that principle to W1 says: the smoke fixture should fire PRA-1 WARN on `topic:logarithms` to verify the audit graduation actually surfaces — *not* stay quiet. The "quiet" choice tests that PRA-1 doesn't false-positive on a covered prereq; the "WARN" choice tests that it DOES fire on an uncovered one. Both are useful. **Recommend:** change `prereqs: ["exponents"]` → `prereqs: ["logarithms"]` (uncovered) in `spectra-and-composition.json`. Update audit-baseline.md to "0 errors / 14 warnings / 7 infos" with `PRA-1 (Unit-aware) | 1 | Wedge B-followup W1 — covers the uncovered "logarithms" prereq from spectra-and-composition's UnitEntry`. Verifies the graduation actually fires. Alternative: ADD a second Unit `prereqs: ["logarithms"]` in addition to keeping the existing `["exponents"]` — exercises BOTH paths. **Action for Anna:** confirm before merge.

7. **Per-callsite `chapter` field staying — correct.** Every entry schema (`RetrievalPromptEntry`, `SpacedReviewEntry`, `SkillReviewEntry`, all the other 10+ chapter-keyed entries) keeps `chapter: string` per the plan. W3 will do the per-callsite rename to `unit`. The `UnitEntry.chapter` field has a **different meaning** (it's the artifact-binding per D7, not a parent-ref) and stays. **No preemptive rename needed in W1.**

8. **Four-wedge sequence shape (W1 → W2 → W3 → W4) — looks correct.** W2's file-layout migration depends on W1 having the `sections` + `units` collections in place (so the moved `reading.mdx` files have parent refs); W3's per-callsite rename depends on W2's file layout existing (the rename's mechanical sed-script targets the new file paths); W4's Library room consumes the registry pages that W2 places. Cross-wedge dependency chain looks clean. The one risk is that W3's "mechanical rename" is mechanical *only if* W2 finished cleanly — if W2 leaves any partial-move state, W3's sed will produce broken refs. Mitigate by closing W2 with a full audit pass before W3 starts. **No structural issue in this PR.**

9. **Doc-staleness coverage — partial.** `chapter-components.md` validation block updated (correct); `component-contract.md` already updated on main per `812104e`. Two docs are missing references to the W1 surface: `docs/website/decisions/0067-section-level-artifacts.md` (the ADR itself doesn't mention W1's PedagogyIndex integration — could add a Revisions note); `docs/website/status/course-website-roadmap.md` (the 27-decision plan doesn't yet mark the PedagogyIndex Section/Unit surfacing as shipped). **Lower priority** — not blocking. Optional cleanup pass at PR open.

10. **General code shape — clean.** LOC budgets respected: `useInteractiveRangeMulti.ts` at 150 LOC is well under the 300-soft / 500-budget / 800-hard ceiling per ADR 0061; the test file at 225 LOC is sibling-split per the established convention; `SpacedReview.tsx` grew from ~140 to 193 LOC (still under 300). Framework purity preserved. Test-with-source convention honored. No back-compat shims (per `feedback_no_backcompat_prelaunch`). No commented-out code. No TODO without an issue link. **Passes Sophie's engineering principles.**

---

## Backlog (prioritized P1–P5, not blocking the W1 PR)

### P1 — pre-PR (Task 19, Task 20, Task 21)

- **P1.1** — Finish Task 19: add body-level prose section in `chapter-components.md` documenting `<SpacedReview section=>` (signature, slot rules, section→units→chapters lookup behavior, LRU-across-chapters semantics, SR-1 audit error). The validation block update is necessary but insufficient per `feedback_docs_no_drift`. Estimated effort: <30 min.
- **P1.2** — Apply Anna's call on smoke fixture exercise (point 6 above): either change `spectra-and-composition.json` prereqs to `["logarithms"]` (uncovered) OR add a second Unit's `prereqs: ["logarithms"]` to exercise the WARN path. Update audit-baseline.md accordingly.
- **P1.3** — Run Task 20 pre-PR gates: `pnpm install --frozen-lockfile` (lockfile drift check per `feedback_pre_pr_lockfile_check`); `pnpm exec biome check` (zero-warning baseline); `pnpm turbo run build` (full); `pnpm turbo run test:unit` (full); `lsof -ti:4321 | xargs -r kill -9; pnpm test:e2e` (full, per `project_local_dev_pagefind_e2e_pitfall`).
- **P1.4** — Open PR via Task 21. Per `feedback_no_questions_mode_scope`, side-effect requires Anna's text-confirmation.

### P2 — post-merge cleanup

- **P2.1** — Tighten audit type signature per [Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures): introduce `buildPedagogyIndex(partial?: Partial<PedagogyIndex>)` test helper using `PedagogyIndexSchema.parse`; remove the `!index.units` and `index.sections ?? []` defensive guards from `retrieval-family.ts`. Estimated effort: 1 hour (~5 test fixture builders to migrate; remove 2 guards from `checkPRA1` + `checkSR1`).
- **P2.2** — Update `audit-baseline.md` SR-1 message resolution string to reference both `.json` (W1) and `.yaml` (W2+) per [grade rubric note](#wedge-b-followup-w1-a-90100). Belongs in the W2 design doc anyway; defer.
- **P2.3** — Add Revisions note to ADR 0067 referencing PedagogyIndex W1 integration; update `course-website-roadmap.md` row for Section/Unit surfacing (mark shipped).

### P3 — W2 design prep (separate sprint)

- **P3.1** — Open W2 design doc (`docs/plans/2026-05-XX-wedge-b-followup-w2-file-layout-migration-design.md`) per ADR 0064 template. Scope: chapter MDX moves into `sections/<id>/units/<id>/reading.mdx`; `ChapterEntry` + `ModuleEntry` deletion; routes rewrite; `ArtifactEntry` surfaces; W2 pilot per ADR 0064.
- **P3.2** — Confirm with Anna whether the bundled W2 pilot should be the W1 pilot's structural-density partner (per ADR 0064 §"no two consecutive pilots exercise the same dominant component-density profile").

### P4 — W3 design prep (separate sprint)

- **P4.1** — Per-callsite `chapter: string` → `unit: string` rename across all ~13 entry schemas. Schedule: post-W2 close.
- **P4.2** — `useInteractive` / `useInteractiveRange` / `useInteractiveRangeMulti` parameter rename to mirror the per-callsite shift.

### P5 — W4 / speculative

- **P5.1** — `<SkillReview>` self-closing topic-registry resolution (Wedge C / Library room land).
- **P5.2** — Replace LRU stub with FSRS scheduler (Wedge D).
- **P5.3** — `<SpacedReview>` rich-card preview rendering (looks up the original prompt prose from `RetrievalPromptEntry`); current option (1) "Review: <target>" anchor-only is correct for W1.

---

## Files changed in this branch (cumulative W1)

### Schemas (`@sophie/core`)

| File | Status | LOC delta |
|---|---|---:|
| `packages/core/src/schema/pedagogy-index-entries/section.ts` | new | +25 |
| `packages/core/src/schema/pedagogy-index-entries/section.test.ts` | new | +69 |
| `packages/core/src/schema/pedagogy-index-entries/unit.ts` | new | +37 |
| `packages/core/src/schema/pedagogy-index-entries/unit.test.ts` | new | +111 |
| `packages/core/src/schema/pedagogy-index-entries/index.ts` | modified | +8 |
| `packages/core/src/schema/pedagogy-index.ts` | modified | +23 |
| `packages/core/src/schema/pedagogy-index.test.ts` | modified | +83 |
| `packages/core/src/schema/index.ts` | modified | +4 |

### Build-time (`@sophie/astro`)

| File | Status | LOC delta |
|---|---|---:|
| `packages/astro/src/lib/pedagogy-index/accumulator.ts` | modified | +46 |
| `packages/astro/src/lib/pedagogy-index/accumulator.test.ts` | modified | +110 |
| `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.ts` | modified | +118 |
| `packages/astro/src/lib/pedagogy-audit/invariants/retrieval-family.test.ts` | modified | +271 |
| `packages/astro/src/components/TextbookLayout.astro` | modified | +50 |

### Runtime (`@sophie/components`)

| File | Status | LOC delta |
|---|---|---:|
| `packages/components/src/runtime/sections-store.ts` | new | +29 |
| `packages/components/src/runtime/units-store.ts` | new | +31 |
| `packages/components/src/runtime/useInteractiveRangeMulti.ts` | new | +150 |
| `packages/components/src/runtime/useInteractiveRangeMulti.test.tsx` | new | +225 |
| `packages/components/src/runtime/ResponseStore.ts` | modified | +26 |
| `packages/components/src/runtime/IndexedDBResponseStore.ts` | modified | +18 |
| `packages/components/src/runtime/FallbackResponseStore.ts` | modified | +16 |
| `packages/components/src/runtime/MemoryResponseStore.ts` | modified | +12 |
| `packages/components/src/runtime/MemoryResponseStore.test.ts` | modified | +82 |
| `packages/components/src/runtime/pedagogy-store.ts` | modified | +13 |
| `packages/components/src/runtime/pedagogy-store.test.ts` | modified | +41 |
| `packages/components/src/internal/store-hydration.ts` | modified | +14 |
| `packages/components/src/components/SpacedReview/SpacedReview.tsx` | modified | +61 |
| `packages/components/src/components/SpacedReview/SpacedReview.test.tsx` | modified | +139 |

### Smoke fixture (`examples/smoke`)

| File | Status | LOC delta |
|---|---|---:|
| `examples/smoke/src/content.config.ts` | modified | +25 |
| `examples/smoke/src/content/sections/foundations.json` | new | +7 |
| `examples/smoke/src/content/sections/stars.json` | new | +7 |
| `examples/smoke/src/content/units/measuring-the-sky.json` | new | +9 |
| `examples/smoke/src/content/units/misconception-fixture.json` | new | +9 |
| `examples/smoke/src/content/units/spectra-and-composition.json` | new | +9 |
| `examples/smoke/src/content/units/spoiler-alerts.json` | new | +9 |
| `examples/smoke/src/content/units/stellar-evolution.json` | new | +9 |
| `examples/smoke/src/content/chapters/02-stars/stellar-evolution.mdx` | modified | +22 |

### Docs

| File | Status | LOC delta |
|---|---|---:|
| `docs/website/reference/audit-baseline.md` | modified | +35 |
| `docs/website/reference/chapter-components.md` | modified | +21 |
| `docs/website/reference/intervention-library.md` | modified | +14 |
| `docs/website/reference/multirep-component.md` | modified | +14 |
| `docs/website/status/validation.md` | modified | +23 |

---

## Verdict

**Ready to merge after P1.1 + P1.2 + P1.3 (pre-PR docs / smoke
exercise / gates).** The implementation is correct against the seven
locked design decisions, the test surface is comprehensive (+48 new
tests across 3 packages with zero regressions), biome stays clean,
the smoke build's pedagogy-audit baseline matches the documented
expectation, and the four-wedge sequence's cross-dependencies are
honored. No defects required mid-audit fix-up.

The three flagged issues are all design-shape questions, not bugs:

- [Issue 1](#issue-1-important-defensive-coalesce-papers-over-typecheck-bypass-in-test-fixtures) — Important — defensive coalesce in audit code; correct as written but the type signature is lying. Backlog P2.1, not blocking.
- [Issue 2](#issue-2-suggestion--pedagogy-store-factory-all-extension-is-borderline-yagni-keep-anyway) — Suggestion — `createPedagogyStore.all()` extension; design-doc preauthorized; keep.
- [Issue 3](#issue-3-suggestion--spacedreview-calls-both-hooks-unconditionally-bounded-waste) — Suggestion — SpacedReview dual-hook always-call; bounded waste; status quo.

P1.1 (chapter-components.md body-level prose) and P1.2 (smoke fixture
WARN-when-exercising choice) are the two pre-PR items Anna's HITL
review should confirm before Task 21 fires.

---

## Notes for the next sprint

1. **The plan held.** 17 of 21 tasks shipped as commits; 4 deviations were all scope reductions (Task 6/7 fold, Task 15 e2e drop, Task 18 fold into Task 17, Task 19 partial). No structural surprises mid-execution. Good signal for the W2 plan size.

2. **The defensive-coalesce fix-up commit (`767e7e9`) is the W1 equivalent of Wedge B1's 4 mid-audit fixes.** The pre-PR gates exposed a real test-fixture-shape gap; the fix is correct but the type signature should be tightened post-W1. Worth capturing as a `feedback_zod_default_vs_inferred_optional` memory: collections with `.default([])` in Zod aren't automatically optional in the inferred type — test fixtures that construct PedagogyIndex literals must include the new fields or run through parse.

3. **The smoke fixture choice (point 6 above) is the only design-shape question that genuinely needs Anna's read.** Quiet-when-clean vs. WARN-when-exercising is a philosophy question with reasonable both-sides argument; I recommended WARN (adds a second Unit OR changes the existing one) and flagged it as P1.2 pre-PR. Anna's call.

4. **W2 / W3 / W4 unlock chain is solid.** W2 doesn't need to wait on anything from this PR's review; the design doc + Issue 1's "tighten audit type signature" cleanup can both proceed in parallel after W1 merges. W3 stays mechanical post-W2. W4 unlocks the Library room which has its own design questions (separate sprint).
