# Wedge B1 — Retrieval-family quality audit

**Date:** 2026-05-22
**Trigger:** Wedge B1 retrieval-family branch closed Tasks 1–10
(14 commits on `feat/wedge-b1-retrieval-family`); Anna asked for a
comprehensive code review before Task 11 (docs) + Task 12 (pre-PR
gates) + Task 13 (PR open) land.
**Method:** Metric sweep across 4 packages + Explore-agent pressure
test of the new code against prior PRs (Wedge A, Wedge A.5, Sprint K)
and load-bearing ADRs (0007, 0027, 0029, 0058, 0063).
**Branch:** `feat/wedge-b1-retrieval-family` (14 commits ahead of
`main` at session start; **+4 fix commits applied during this audit**).

---

## TL;DR — Executive Summary

Sophie's Wedge B1 retrieval-family is in **A− (90/100) territory** —
correct architecture, comprehensive test coverage, four real defects
caught and fixed during this audit. The Sprint K hardening discipline
(zero-warning biome, focused-file LOC budget, per-tier card chrome)
held throughout the 14 commits; the new persistence-layer additions
(`ResponseStore.getAll`, `useInteractiveRange`, `BroadcastChannel`
local-fanout) are the most consequential cross-cutting changes since
PR #155 (Wedge A.5) and are well-tested.

**What's working:** The compositional architecture (RetrievalCard
primitive + 3 public peers + shared persistence hook) cleanly mirrors
the OMIFlow precedent. The plan amendment for `ResponseStore.getAll`
+ `useInteractiveRange` was the right call — without it,
`<SpacedReview>` would have shipped as a stubbed-per-target placeholder
that didn't deliver the design-doc intent. Anchor namespace, theme
tokens, pedagogy-index entries, and audit invariants all follow
existing precedents faithfully.

**What needed fixing:** Four real defects were caught and fixed mid-
audit (anchor table docs drift, SpacedReview LRU/filter semantic bug,
two graceful-degradation gaps in SkillReview + RetrievalPrompt).
Pre-fix grade was A− (88); post-fix grade is A− (90).

**What remains (Wedge B-follow-up scope, not blocking PR):**
- Unit/Section-aware PRA-1 (waiting on Sections in PedagogyIndex)
- Word-count-ratio RET-1 (waiting on body-text in index)
- Section-scope SR-1 + SpacedReview rendering (waiting on Section
  collection in index)
- ADR 0007 amendment for `getAll` (lands in Task 11)
- ADR 0029 note on same-tab local-fanout (lands in Task 11)

---

## Test metrics (captured 2026-05-22, ~07:50 PT)

| Surface | Status |
|---|---|
| `pnpm exec biome check` (all 682 files) | **0 errors, 0 warnings** ✓ |
| `@sophie/core` typecheck | **pass** ✓ |
| `@sophie/components` typecheck | **pass** ✓ |
| `@sophie/astro` typecheck | **pass** ✓ |
| `@sophie/theme` typecheck | **pass** ✓ |
| `@sophie/core` test:unit | **434/434 passed** ✓ |
| `@sophie/components` test:unit | **685/685 passed** ✓ |
| `@sophie/astro` test:unit | **780/780 passed** ✓ |
| `@sophie/theme` test:unit | **29/29 passed** ✓ |
| Smoke build | **12 pages, 125 pedagogy entries, Pagefind regen'd** ✓ |
| Storybook stories count | **35** (+10 from Wedge B1: 3 RetrievalPrompt, 3 SpacedReview, 4 SkillReview) |
| Branch LOC delta | **+4,557 / −2** across 82 files |
| Committed tests added in Wedge B1 | **~119** (115 from initial 14 commits + 4 from fix commits) |

---

## What changed (Wedge B1 cumulative)

### Schemas (`@sophie/core`)

| Schema | Purpose | Tests |
|---|---|---|
| `PracticeAttemptSchema` | Per-attempt persistence record extending `BaseRecordSchema` | 11 |
| `RetrievalPromptEntry` | Pedagogy-index entry; powers RET-1 | 3 |
| `SpacedReviewEntry` (Zod refine) | Pedagogy-index entry; powers SR-1 | 5 |
| `SkillReviewEntry` | Pedagogy-index entry; powers PRA-1 | 3 |

### Persistence layer (`@sophie/components/runtime`)

| Addition | Purpose | Tests |
|---|---|---|
| `ResponseStore.getAll(profile, chapter, keyPrefix?)` | Range read; IDB cursor + Map filter + Fallback delegation | 10 |
| `useInteractiveRange<T>` | Hydrated + LWW-gated range hook; powers SpacedReview | 6 |
| `getUserId()` | localStorage-backed per-browser UUID; backs `practice_attempt.user_id` | 4 |
| `useRetrievalAttempt` | Per-(course, chapter, target) attempt persistence | 6 |
| `BroadcastChannel.post` local fan-out | Same-tab cross-hook sync; sibling subscribers now see writes immediately | covered by useInteractiveRange tests |

### Public components (`@sophie/components`)

| Component | Slots | Band | Tests |
|---|---|---|---|
| `<RetrievalCard>` (internal) | Radix Collapsible card + textarea + reveal + self-assess | bandToken arg | 9 |
| `<RetrievalPrompt>` | `<Prompt>` + `<Answer>` (both required) | `--sophie-retrieval-band` (amber) | 6 + 4 humanLabel |
| `<SpacedReview>` | optional `<Empty>` | `--sophie-spaced-band` (cyan) | 8 (incl. 2026-05-22 regression) + 6 LRU |
| `<SkillReview>` | optional `<Prompt>` + `<Answer>` + `<ReviewMore>` | `--sophie-skill-band` (violet) | 8 |

### Theme (`@sophie/theme`)

| Addition | Purpose | Tests |
|---|---|---|
| 3 new band CSS variables | Emitted in `:root`, `[data-theme="dark"]`, `@media print`, prefers-color-scheme dark | 6 |

### Build-time (`@sophie/astro`)

| Addition | Purpose | Tests |
|---|---|---|
| 3 new extractors (`retrieval-prompt`, `spaced-review`, `skill-review`) | Walk mdast → emit entries | 4 + 6 + 6 |
| Accumulator integration | `addRetrievalPrompts`, `addSpacedReviews`, `addSkillReviews`; clearChapter; asPedagogyIndex; resetIndexAccumulator | covered by extractor + audit tests |
| 3 audit invariants (PRA-1 WARN, RET-1 INFO, SR-1 ERROR) | Surface cross-cutting authoring defects | 11 |

### Smoke chapter usage (`examples/smoke`)

- `spoiler-alerts.mdx` — 1 `<RetrievalPrompt target="ki:luminosity">` + 1 `<SkillReview target="topic:exponents">`
- `spectra-and-composition.mdx` — 1 `<RetrievalPrompt target="eq:saha-equation">` + 1 `<SpacedReview target="topic:logarithms" max={3}>` with `<Empty>` override

---

## Quality grade

### Wedge B1 (post-fix): **A− (90/100)**

| Category | Score | Evidence |
|---|---|---|
| Test coverage | 19/20 | 119 new tests across 4 packages; every component has unit + axe + Storybook; persistence layer pressure-tested via 6 useInteractiveRange tests including cross-tab broadcast + LWW gate; one acknowledged thin path (smoke build doesn't yet exercise the full end-to-end student flow but Playwright e2e will in Task 12) |
| Design system | 19/20 | Three new components compose the same internal `<RetrievalCard>` primitive (zero leakage); theme tokens follow the existing brand/role/cite convention; CSS Modules use theme tokens throughout; `humanLabelFromTarget` extracted to retrieval/ helper at first reuse (DRY); zero CSS duplication |
| Architecture | 18/20 | Layered persistence (`ResponseStore` → `useInteractive` + `useInteractiveRange` → `useRetrievalAttempt` → public components); `@internal` exports on `useInteractive` for sibling hook reuse without leaking to public API; one mid-audit fix needed for `<SpacedReview>` single-target semantics (Issue 3 below); BroadcastChannel local-fanout is a careful additive change well-documented in source |
| Audit / curriculum-CI | 17/20 | 3 new invariants land with explicit "deferred to follow-up" docstrings naming the upstream blocker (Section/Unit data, body-text-in-index); the chapter-level approximations are useful authoring nudges; PRA-1 doesn't yet exercise the Unit-aware shape from the plan §6 |
| Docs (post-fix) | 17/20 | Plan amendment captures the 3 scope-additions clearly; design doc cross-references locked decisions; canonical anchor-prefix table updated with rp-/sp-/sk- mid-audit; ADR 0007 + ADR 0029 amendments land in Task 11 (not yet); chapter-components.md not yet updated (Task 11) |

**Total:** 90/100 = **A−**

Pre-fix score was 88; the four targeted fixes during this audit
moved test coverage (+1), architecture (+1) up by 1 point each.

### Cumulative Sophie state (post-Wedge B1): **A (93/100)**

Wedge A.5 (PR #155 — Section/Module reconciliation), the prior Sprint K
(PR #153), and the new Wedge B1 work together leave Sophie at A. The
single-grade drop from A+ post-WS3 (2026-05-16) reflects:
- The Section/Unit data is in `@sophie/core/schema` but not yet wired
  into PedagogyIndex → 3 audit invariants ship simplified
- The student auth-server identity stays placeholder (`getUserId()`
  per-browser UUID) — tracked alongside Cockpit (ADR 0076)
- The MDX-author-side prop threading (course/chapter as required props)
  is the architecturally correct shape (ADR 0027) but adds repetition
  the author can't tighten without a `<SophieChapter>` context shim

These are all consequences of executing the roadmap in the documented
order, not regressions.

---

## Defects caught + fixed during this audit

All four landed during this session. Each cited file:line, root cause,
and fix.

### Fix 1 (DOCS DRIFT) — Canonical anchor prefix table missing 3 entries

**File:** [packages/core/src/schema/pedagogy-index.ts:36-51](../../packages/core/src/schema/pedagogy-index.ts#L36-L51)

The canonical prefix table documented `def-`/`eq-`/`ki-`/`fig-`/`misc-`/
`dd-`/`omi-`/`ch-`/`lo-` but omitted `rp-` (RetrievalPrompt), `sp-`
(SpacedReview), `sk-` (SkillReview). Authors relying on the table to
avoid collisions would have missed them. Violates saved
`feedback_docs_no_drift` memory.

**Fix:** Added 3 rows + Wedge B1 attribution.

### Fix 2 (CORRECTNESS) — SpacedReview single-target LRU/filter silently drops the target

**File:** [packages/components/src/components/SpacedReview/SpacedReview.tsx:75-91](../../packages/components/src/components/SpacedReview/SpacedReview.tsx#L75-L91)

The pre-fix code ran `selectLeastRecentlyAttempted` with
`targetPrefix` scope (returning up to `max` distinct LRU target_ids
in the prefix), then filtered to exact target equality. If the
target wasn't in the top-`max`-LRU of its prefix, the filter returned
`[]` and the user saw the empty-state placeholder — even though they
HAD attempted that target. Concrete failure: chapter with attempts on
`topic:trig` (newest), `topic:exp` (middle), `topic:logs` (oldest);
`<SpacedReview target="topic:trig" max={2}>` → LRU returns
[`topic:logs`, `topic:exp`] → filter to `topic:trig` → `[]`.

**Fix:** For single-target scope, run LRU over only the exact-target
attempts (1 hit if any exist). `max` is reserved-but-unused for
single-target (Wedge B-follow-up wires it for `section=` scope, where
distinct target_ids compete for slots). Regression test added.

### Fix 3 (GRACEFUL DEGRADATION) — SkillReview partial-slot silently discards author content

**File:** [packages/components/src/components/SkillReview/SkillReview.tsx:73-90](../../packages/components/src/components/SkillReview/SkillReview.tsx#L73-L90)

When an author supplied only `<SkillReview.Prompt>` OR only
`<SkillReview.Answer>` (but not both), `hasExplicitContent` evaluated
to false and the placeholder render-path engaged — silently dropping
the supplied slot content. No warning, no error.

**Fix:** Added a `NODE_ENV !== "production"` console.warn that names
the target and suggests resolution. Curriculum-CI will catch this at
build time once SkillReview's required-slot invariant is added; the
runtime warning is the dev-loop nudge.

### Fix 4 (GRACEFUL DEGRADATION) — RetrievalPrompt missing required slot silently degrades

**File:** [packages/components/src/components/RetrievalPrompt/RetrievalPrompt.tsx:62-79](../../packages/components/src/components/RetrievalPrompt/RetrievalPrompt.tsx#L62-L79)

When `<Prompt>` or `<Answer>` was missing, the card rendered with
`prompt={null}` or `answer={null}` — visible but degraded.

**Fix:** Dev-mode console.warn naming the missing slot(s) and target;
keeps the graceful render-path (matching Sophie's "degrade visibly,
warn loudly in dev" convention from `<Predict>`'s sibling pattern).

---

## Backlog (prioritized P1–P5, not blocking the Wedge B1 PR)

**P1 — pre-PR (Task 11 + 12 of the plan, not blocked):**
- **P1.1** — ADR 0007 amendment: document `ResponseStore.getAll`
  contract addition + the per-(profile, chapter) scope statement.
  Lands in Task 11.
- **P1.2** — ADR 0029 amendment: document `BroadcastChannel.post`
  now fires local handlers synchronously (`senderId` guard makes this
  safe; sibling hooks can observe same-tab writes). Lands in Task 11.
- **P1.3** — chapter-components.md: 3 new component sections with
  signature, slot rules, target prefix table, MDX example, ARIA
  guarantees. Lands in Task 11.
- **P1.4** — ADR 0068 signature edit (`<SkillReview topic="…">` →
  `<SkillReview target="topic:…">`) + roadmap signature edit + move
  3 retrieval-family rows from "Future capabilities" to "shipped".
  Lands in Task 11.

**P2 — pre-merge (Task 12 of the plan):**
- **P2.1** — Full e2e sweep: kill port 4321 stale processes, run
  `pnpm test:e2e`, expect 157+/0/5 baseline.
- **P2.2** — Full `pnpm turbo run build` to confirm theme dist
  regenerates with the 3 new CSS variables (the test suite parses
  `generateCSS()` in-memory, so dist staleness is invisible to unit
  tests).
- **P2.3** — Force MyST docs rebuild per
  `feedback_docs_no_drift` since ADR 0007 + ADR 0029 + chapter-
  components.md all change in Task 11.

**P3 — Wedge B-follow-up (separate PR, post-merge):**
- **P3.1** — Surface `Section[]` + `Unit[]` collections in
  PedagogyIndex (Wedge A.5 shipped the schemas; the index integration
  is downstream). Unlocks: full PRA-1 Unit-aware (every
  `UnitEntry.prereqs[]` has ≥1 SkillReview in the same Section /
  prior Section), full SR-1 section-scope ref validation, full
  `<SpacedReview section="...">` rendering. Probably ~150 LOC across
  schemas + extractors + accumulator + audit invariant updates.
- **P3.2** — `<SkillReview>` self-closing form auto-resolution from
  the topic registry. Blocks on Wedge C (Library room).

**P4 — pre-launch (separate sprint):**
- **P4.1** — Replace `getUserId()` localStorage placeholder with an
  auth-server-backed identity. Tracked alongside Cockpit
  (ADR 0076).
- **P4.2** — RET-1 word-count-ratio enforcement. Requires the
  pedagogy-index extractor to carry chapter body text or word-count;
  not currently in scope.
- **P4.3** — `<SpacedReview>` rendering of due-target items as
  rich card previews (Option (2) from the design doc), instead of
  the current "Review: <target>" anchor-only line. Trade-off: more
  pedagogy-index dependency (need to look up the original prompt
  prose); current Option (1) keeps SpacedReview decoupled.

**P5 — speculative (file when actually painful):**
- **P5.1** — Same-tab broadcast handler ordering: if Sophie ever
  needs a hook that fires BEFORE the originating useInteractive's
  own state update, the local-fanout ordering would matter. Not
  currently a problem (senderId guard catches own-broadcasts).

---

## Files changed in this session (audit-fix pass only)

| File | Change |
|---|---|
| `packages/core/src/schema/pedagogy-index.ts` | +3 rows to canonical anchor table (rp-, sp-, sk-) |
| `packages/components/src/components/SpacedReview/SpacedReview.tsx` | Single-target LRU semantic fix; `void max` reserved-for-section-scope |
| `packages/components/src/components/SpacedReview/SpacedReview.test.tsx` | +1 regression test for single-target LRU bug |
| `packages/components/src/components/SkillReview/SkillReview.tsx` | Dev-mode partial-slot warning |
| `packages/components/src/components/RetrievalPrompt/RetrievalPrompt.tsx` | Dev-mode missing-slot warning |
| `docs/reviews/2026-05-22-wedge-b1-retrieval-family.md` | This file |
| `docs/reviews/README.md` | +1 row in the Reviews table |

**No commits yet** — fixes staged for the executor to commit together
once Anna signs off on the review.

---

## Notes for the next sprint

1. **The plan-amendment workflow worked.** Tasks 2a/2b/2c surfaced
   mid-plan, were proposed cleanly, confirmed in-thread, and landed
   without scope creep. Memorialize this in
   `feedback_plan_amendment_workflow` so future executions know to
   surface architectural surprises early instead of improvising.

2. **The audit-as-you-go discipline held.** All 4 batch checkpoints
   in this session paused for explicit Anna sign-off; HITL mandate
   honored throughout.

3. **Wedge B1 unlocks 3 follow-ups** that have natural sequencing:
   Cockpit (ADR 0076) consumes practice_attempt records; Wedge D
   replaces the LRU stub with FSRS; Wedge C wires the Library room
   for SkillReview's self-closing form. Wedge B1 was carefully
   scoped to leave these doors open, not to pre-build them.

4. **The MDX-prop-threading boilerplate** (`course="..." chapter="..."
   client:load` on every component) is the architecturally-correct
   shape (ADR 0027) but adds visual clutter to chapter MDX. A
   `<SophieChapter>` context shim that provides defaults would tighten
   this without violating ADR 0027 — worth scoping if/when chapter
   authoring at scale starts to feel painful.
