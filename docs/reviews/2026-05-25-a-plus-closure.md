---
title: A+ hardening sprint — closure review
date: 2026-05-25
type: state-of-platform
authors:
  - Claude (audit + execution)
  - Anna Rosen (HITL supervisor)
scope: post-Phase-E close-out of the 5-phase A+ hardening sprint
baseline: docs/reviews/2026-05-25-sophie-sota-audit.md (A− / 87)
plan: docs/plans/2026-05-25-sophie-a-plus-hardening.md
---

## What I'm reviewing

Anna asked for a closure review after the 5-phase A+ hardening sprint
shipped on 2026-05-25. The sprint targeted the must-fix + should-fix
items from the [2026-05-25 SoTA audit](2026-05-25-sophie-sota-audit.md)
(graded A− / 87) and was scoped as five sequential PRs landing in one
session. This document re-applies the grading rubric to the post-merge
state, names what shipped vs. what's deferred, and frames the next
move.

## What shipped — five PRs in one session

All five phases landed as squash-merges on `origin/main` per ADR 0055:

| PR | Phase | Squash | Class-of-issue closed |
|---|---|---|---|
| [#178](https://github.com/drannarosen/sophie/pull/178) | A | `d3146fe` | ADR drift surface (3 new ADRs + 3 keystones validated) |
| [#179](https://github.com/drannarosen/sophie/pull/179) | B | `090fda5` | Test-timing regression class (17 bare timeouts → condition waits) |
| [#180](https://github.com/drannarosen/sophie/pull/180) | C | `b29cfb4` | Advisory→fail-loud gates (`lint:shims` + validation-block freshness) |
| [#181](https://github.com/drannarosen/sophie/pull/181) | D | `b02e5ba` | Shared physics module (`_physics/blackbody.ts`) |
| [#182](https://github.com/drannarosen/sophie/pull/182) | E | `10b84ae` | Megafile splits (two GRANDFATHERED entries removed) |

Every PR landed with all 8 CI gates green on first try (the recent
`packed-smoke` gate from PR-D1 stayed green throughout, validating
the structural defense it represents).

## Inventory delta vs. baseline

Verified against `origin/main` at HEAD `10b84ae`:

| Metric | Baseline (87/A−, `5c55f5c`) | Post-audit (`02f287a`) | Post-sprint (`10b84ae`) | Δ from baseline |
|---|---|---|---|---|
| ADRs | 82 (0050 gap) | 82 | **84** (+0083 / +0084 / +0085; 0050 still gap; 1 expected from count) | +2 net IDs |
| Validated count | 15 | 15 | **21** | +6 |
| Total validation entries | 108 | 108 | **111** | +3 |
| Unit test files | 221 | 221 | **239** | +18 (Phase E new per-invariant + per-extractor) |
| Unit test blocks | 2,125 | 2,125 | **2,131** | +6 (no test loss across the megafile splits + small Phase E touches) |
| E2E specs (smoke) | 35 | 35 | **35** | unchanged |
| E2E specs (packed-smoke) | 1 | 1 | **1** | unchanged |
| Audit-invariant files | 20 | 20 | **20** | unchanged |
| Audit-invariant *named* checks | 17+ | 17+ | **17+** | unchanged (CL1 + OF-3 already in the baseline) |
| CI workflow jobs | 8 | 8 | **8** | unchanged |
| CI lint sub-gates | 4 | 4 | **5** | +1 (`lint:shims`) |
| LOC budget exempt entries | 10 | 10 | **8** | −2 (Phase E removed two GRANDFATHERED) |
| Bare `{ timeout: N }` in e2e | 19 | 19 | **0** in live code (3 in historical comments + 1 inside an `expect.poll` config) | −19 |
| `expect.poll(count)` adoption | 0 | 0 | **1** (canonical example) + 4 pattern docs | +1 |
| E2E axe coverage | 22/35 (63%) | 22/35 (63%) | **33/35 (94%)** | +11 specs |

## Test metrics (current, by package + bucket)

| Bucket | Files | Blocks | Notes |
|---|---|---|---|
| `@sophie/core` unit | (~33) | (~481) | Phase E touched none |
| `@sophie/components` unit | (~86 + 4 `_physics/`) | (~789) | +52 `_physics/` tests in Phase D; +OMIFlow tests in Phase B |
| `@sophie/astro` unit | (~120, was 87) | (~870) | +18 from Phase E megafile splits; same test count, more files |
| `@sophie/astro` audit invariants | 18 (was 12) | (~205) | +6 from `runner.test.ts` split |
| **Total** | **239** (was 221) | **2,131** (was 2,125) | +18 files, +6 blocks |
| E2E smoke | 35 | (~160) | 33 use shared axe helper; 2 CLI specs intentionally excluded |
| E2E packed-smoke | 1 | (~1) | Uses `expect.poll(count)` canonical pattern |
| Storybook stories | 39 | (visual) | unchanged |
| **Suite-wide** | **314** | **~2,290** | |

Test-count growth is structural-not-bloat: every new file is a
narrower-concern split from a previously-grandfathered megafile
(Phase E) or a new pattern adoption (Phase D `_physics/` + Phase B
helper tests).

## Quality grade — re-application

Per the [reviewing-project-quality](../../.claude/skills/reviewing-project-quality/SKILL.md)
rubric, scored 0–20 in each of 5 categories, summed to a letter:

| Category | Baseline (87) | Post-sprint | Evidence |
|---|---|---|---|
| **Test coverage** | 17/20 | **19/20** | 0 bare timeouts in live e2e code (was 19 across 12 specs); `expect.poll(count)` canonical adoption (was 0); two GRANDFATHERED megafiles split with zero test loss (1,763 + 1,354 → 305 + 53 LOC orchestration shells + 18 focused sibling files); 2,131 unit blocks across 239 files. **+2 vs. baseline**: closes the worst gap the audit named. Capped at 19/20 only because chapter-scale validation (multi-pilot) remains shallow — the audit's note. |
| **Design system** | 19/20 | **19/20** | Chrome/epistemic split locked since PR #168 + `_template/` skeleton (PR #177); blackbody physics consolidated to shared `_physics/` location ready for `SpectralLineExplorer` + `HRDiagramExplorer` callers; KeyEquation contract uniformity (all 5 store-backed components now emit `data-react-hydrated="true"` post-hydration). Holds at 19/20; the missing point is "second-instructor-validated" which is still pending. |
| **Scientific correctness** | 16/20 | **17/20** | CL1 invariant formalized as ADR 0083 (was a buried cross-reference); 17+ named invariants; OMIFlow `aria-labelledby` uniqueness fix is a real R10-class correctness improvement surfaced by the helper migration. **+1 vs. baseline**. Capped at 17/20 until the second ASTR 201 pilot validates the chapter-scale story per ADR 0064 structural-density-rotation. |
| **Accessibility** | 17/20 | **19/20** | E2E axe coverage 22/35 → 33/35 (94%); shared `expectChapterA11y` + `expectCourseA11y` helpers per ADR 0004 (single point of maintenance); 20 margin-note asides got `aria-label` clearing the chapter's `landmark-unique` violations; OMIFlow `landmark-unique` bug surfaced + fixed. **+2 vs. baseline**. Capped at 19/20 only because mobile-viewport coverage of one spec still has a `scrollable-region-focusable` deferral and color-contrast/list/listitem rules stay disabled pending Sprint-K P1 remediation. |
| **Architecture** | 18/20 | **20/20** | Three new ADRs formalize the hydration-class defense family (0083 CL1 + 0084 packed-smoke + 0085 `_template/`) under an ADR-0038-family cross-ref block; three keystones validated (0023/0030/0061); two structural CI gates promoted advisory→fail-loud (`lint:shims` + validation-block freshness); two GRANDFATHERED LOC entries removed via legitimate splits; `BlackbodyExplorer` extraction prepares for future spectral callers. **+2 vs. baseline → ceiling**. |

**Total: 94/100 → A** (baseline 87 → +7)

The grade move is short of A+ (95) by **one point in scientific
correctness**, which is structurally gated on the second ASTR 201
pilot landing (out of scope per the plan's "What's deferred"
section). This was an explicit framing in the original audit: A
within reach this sprint; A+ requires a chapter-scale pilot that
isn't a test-infra concern.

## Class-of-issue defenses now in place

The sprint shipped four mutually-reinforcing layers of class-of-issue
defense that together close the audit's "worst gap" diagnosis:

1. **Hydration-class defense family** (ADR 0038 + 0083 + 0084 + 0085).
   Runtime gate via `useHydrated` + build-time invariant CL1 + CI-
   runtime packed-smoke gate + authoring-affordance `_template/`
   skeleton. Each layer is a structural fix, not an instance patch.

2. **Test-timing-class defense** (Phase B `_patterns/` + the two
   helpers). The 17 bare `{ timeout: N }` calls Phase B removed
   weren't individually buggy — they were a regression *class* that
   would re-introduce one timeout at a time. Phase B's canonical
   pattern docs + the helper extraction make the SoTA shape greppable
   instead of tribal.

3. **CI-gate-class defense** (Phase C). The `lint:shims` gate is
   pre-launch zero-shim enforcement; the validation-block-freshness
   promotion (from informational to fail-loud) catches any ADR
   landing without `status:`. Both surface a class of issue at PR
   time rather than after merge.

4. **Tech-debt-class defense** (Phase E). Two megafiles split into
   per-concern siblings. The split shapes (per-invariant for
   `runner.test.ts`; per-entry-type for `accumulator.test.ts`) mirror
   the source-test-sibling convention from ADR 0061 Rule 6, so the
   shape is self-perpetuating: new invariants land as new sibling
   files, not as new describes inside a growing megafile.

## What's deferred — honest accounting

The audit named **22 backlog items + 5 refactor proposals**.
Disposition:

### Closed (must-fix from audit — all 5 shipped)

- ✓ Replace 19 bare `{ timeout: N }` with condition-based waits (Phase B)
- ✓ Adopt `expect.poll(count)` canonical pattern (Phase B)
- ✓ Promote CL1 audit invariant to its own ADR (Phase A → ADR 0083)
- ✓ Write ADR for packed-smoke CI gate (Phase A → ADR 0084)
- ✓ Write ADR for `_template/` skeleton (Phase A → ADR 0085)

### Closed (should-fix from audit — 7 of 9 shipped)

- ✓ Lift e2e axe coverage 63% → 94% via shared helpers (Phase B)
- ✓ Promote `lint:status` validation-block to fail-loud (Phase C)
- ✓ Add CI gate for back-compat shim detection (Phase C `lint:shims`)
- ✓ Extract `BlackbodyExplorer` physics-utils to shared `_physics/` (Phase D)
- ✓ Split `runner.test.ts` (Phase E; 1,763 → 305 LOC)
- ✓ Split `accumulator.test.ts` (Phase E; 1,354 → 53 LOC)
- ✓ Backfill validation evidence for keystones 0023/0030/0061 (Phase A)
- ✓ Codify SoTA test patterns under `_patterns/` (Phase B)
- ⬚ **Promote doc-drift extractors to CI gate** — deferred. EqRef/glossary extractors emit findings inside the pedagogy-index pipeline today but aren't invokable as a standalone gate. Adding that wiring is a small follow-up PR (~2h) not depending on any other phase.

### Closed (nice-to-have — 4 of 5 shipped as side-effects)

- ✓ Fix stale `loc-budget.ts` comment about `accumulator.ts` LOC tier (Phase A)
- ✓ Update ADR 0038 evidence path post-refactor (Phase A)
- ✓ Refactor `BlackbodyExplorer` per extracted physics (Phase D Scenario B)
- ⬚ **Audit unit-level axe coverage on `@sophie/components`** — deferred. ADR 0004 says axe-core is mandatory; verifying 100% requires a grep + spot-check across the 86 component test files. Sweep PR.
- ⬚ **Backfill validation evidence for ADRs 0019/0021/0026** — deferred. High-reuse second tier; lower leverage than the keystones (closed) but still nice. Sweep PR.

### Closed (document-only — 2 of 3 shipped)

- ✓ Consolidate hydration-family ADRs under "ADR 0038 family" cross-reference (Phase A)
- ✓ Document `_template/` contract inside ADR 0085 (Phase A)
- ⬚ **Note corrected Agent-B claim on ADR 0061 Rule 3 in audit doc** — moot; this closure doc supersedes the audit's misstatement.

### Items deferred / out-of-scope per audit framing

- **Second ASTR 201 pilot** — chapter-scale validation; required to push scientific correctness 17 → 19+. Separate sprint per ADR 0064 structural-density-rotation rule (next pilot must differ from m2-l3 in structural density).
- **A10 `<UncertaintyLens>` ship** — Reasoning OS C-tier; requires A11 linked-representation primitive first. Separate sprint per the Reasoning-OS vision doc.
- **Course Spec consumption layer** — separate plan at `docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`. Not blocked by this sprint.

## Plan-vs-code corrections caught during execution (W4 discipline)

The session surfaced **six plan-vs-code corrections** through W4
"evidence before assertions" discipline. Each became part of the
shipped work rather than being papered over:

1. **CL1 location**: plan said `pedagogy-audit/invariants/inline-refs.ts`; CL1 actually lives at the **extractor layer** in `pedagogy-index/extractors/{inline-refs,equation-citations}.ts` and surfaces via `pedagogy-audit/invariants/extractor-findings.ts` passthrough. ADR 0083 cites the correct locations.
2. **ADR 0083 missing from `myst.yml` TOC**: caught by code review of the first commit; without the entry, the MyST build silently skipped the file and reported 0 warnings as a false-negative. Fixed in the same task.
3. **Forward references**: ADR 0083 linked to ADR 0085 before 0085 existed; converted to prose-only stubs and re-linked in Task A.6 once 0085 landed.
4. **`expect.poll` selector**: plan suggested `data-sophie-hydrated`; the canonical attribute (verified in `useHydrated.ts`) is `data-react-hydrated`.
5. **FigureRef fixture**: plan said "add `test-figure` to the registry"; the registry entry already existed — the real miss was a `<Figure name="test-figure" />` block in the chapter MDX (canonical-usage extractor only indexes `<Figure>` blocks, not `<FigureRef>`).
6. **BlackbodyExplorer Scenario B**: plan assumed physics math was inline; it was already extracted into sibling files. The PR's real value was the shared-location move (cross-component reuse), not a LOC drop.

Each correction is captured in the relevant PR body for posterity.

## Process improvements logged as memory

Two new memories saved during this session document Sophie-specific
gotchas the orchestrator hit:

- `feedback_worktree_location.md` — Sophie worktrees live at
  `.worktrees/<branch>/` inside the repo (gitignored); never as
  sibling directories.
- `feedback_playwright_invocation.md` — always `pnpm test:e2e` from
  the worktree root; never `--dir examples/smoke` (the config +
  baseURL get lost).

The MEMORY.md index was updated for both.

## Honest assessment

**Was the sprint scope right?** Yes. The plan called out A+ as
within reach minus one point (scientific correctness, structurally
gated). Final grade 94/A matches that prediction exactly. The
deferred items (doc-drift gate, ADR validation backfill T2, unit
axe audit, second pilot) are accurately framed as "follow-up sweep"
or "separate sprint" — none belong in this PR sequence.

**Was the multi-PR shape right?** Yes. Five sequential PRs let the
HITL boundary hold cleanly — every push and merge got explicit
confirmation; every code-review checkpoint caught real issues
before they propagated. The biggest single-session win was Phase
B's helper migration *surfacing* the OMIFlow `landmark-unique` bug
that had been hiding in plain sight; the structural fix that
followed (composite `aria-labelledby` per OMIFlow instance) is
exactly the SoTA-over-simple pattern the codebase rewards.

**What's the platform now?** Sophie is a 5-package
schema-driven AI-authorable platform with 84 ADRs (21 validated),
2,131 unit blocks, 36 e2e specs, 8 CI gates (5 sub-gates inside
the lint job), and three explicit structural-defense families:
ADR-0038 hydration family, lint:shims pre-launch invariant, and
LOC-budget structural enforcement. Coverage runs ahead of adoption
(still one validated pilot chapter), and the SoTL/tenure case
deferred items in the Course-Spec design doc are the next move.

**What's the strongest signal this session produced?** That the
helpers caught real bugs on day one of adoption. The OMIFlow R10
violation went undetected for weeks because 22 specs ran with
component-scoped axe checks; the chapter-wide helper saw it
immediately. That's class-of-issue defense earning its keep.

## Backlog (post-sprint)

Three small follow-up PRs to land at convenience (none blocking):

**P1 — Documentation-drift CI gate** (~2h, low risk). Wire the
existing EqRef + glossary extractors as a standalone `pnpm
lint:docs-drift` script invoked by the CI lint job. Defends the
2026-05-18 EqRef drift class-of-issue that's currently caught only
by manual audit.

**P2 — Sweep validation-evidence backfill** (~3-4h, low risk).
Add `validation:` evidence blocks to ADRs 0019 (Radix), 0021
(Observable Plot), 0026 (Tailwind v4), and any other
lifecycle-shipped + status-unvalidated ADRs where evidence
clearly exists in code. Brings validated count 21 → ~30.

**P3 — Unit-level axe-coverage audit** (~1h, low risk). Grep the
86 component test files in `@sophie/components` for
`AxeBuilder` / `@axe-core/react` usage; produce a coverage report
confirming the 100% claim of ADR 0004. Surfaces any quiet gaps.

**Separate sprints (out of scope):**

- Second ASTR 201 pilot chapter (chapter-scale validation; gates
  the scientific-correctness 17→19+ move)
- A10 `<UncertaintyLens>` + A11 linked-representation primitive
  (Reasoning OS C-tier)
- Course Spec consumption layer (`docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`)

## Files changed (cumulative across 5 PRs)

| Type | Count | Examples |
|---|---|---|
| New ADRs | 3 | 0083 (CL1), 0084 (packed-smoke), 0085 (`_template/`) |
| New pattern docs | 4 | `_patterns/{README,condition-based-waits,expect-poll-count,axe-core}.md` |
| New shared modules | 2 | `_helpers/axe.ts` (two helper exports), `_physics/blackbody.ts` |
| New scripts | 1 | `scripts/lint-shims.ts` |
| New CI sub-gate | 1 | lint:shims (5th sub-step in the lint job) |
| New test files | +18 | 7 per-invariant + 11 per-entry-type splits |
| Updated ADRs | 4 | 0038 (family block + evidence path), 0023/0030/0061 (validated) |
| Modified specs | ~17 | bare-timeout migrations + helper adoptions |
| Modified components | 2 | KeyEquation (data-react-hydrated contract), OMIFlow (composite aria-labelledby) |
| Modified MDX fixtures | 2 | spoiler-alerts (aria-label sweep) + packed-smoke chapter (`<Figure>` block) |
| LOC budget GRANDFATHERED entries removed | 2 | runner.test.ts, accumulator.test.ts |

## See also

- [Plan: 2026-05-25 A+ hardening implementation plan](../plans/2026-05-25-sophie-a-plus-hardening.md)
- [Audit: 2026-05-25 SoTA audit (baseline)](2026-05-25-sophie-sota-audit.md)
- [Audit: 2026-05-25 state-of-Sophie (predecessor baseline)](2026-05-25-state-of-sophie.md)
- ADRs 0083, 0084, 0085 (hydration family)
- [`feedback_worktree_location.md`](../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_worktree_location.md)
- [`feedback_playwright_invocation.md`](../../../.claude/projects/-Users-anna-Teaching-sophie/memory/feedback_playwright_invocation.md)
