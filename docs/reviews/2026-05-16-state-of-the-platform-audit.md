# Sophie state-of-the-platform audit — post-VR, pre-visual-polish

**Date**: 2026-05-16
**Trigger**: Anna asked for a comprehensive review of "current state, quality, and status of Sophie in full" after the 2026-05-15 → 2026-05-16 push closed Bucket B+C's two open P1s (`.sophie-rollup-entry`, LO flake), shipped Workstream 3's prereq (VR baseline + axe/VR decouple), shipped the validation tracker infrastructure (ADR 0056), and updated the docs site to match. Pre-Workstream-3 readiness audit; SoTA assessment per Anna's "Sophie must be SoTA and well-designed and clean" framing.
**Scope**: Architecture, test discipline, type/build/lint quality, accessibility, documentation, visual-polish gap (newly surfaced), pre-launch readiness.
**Methodology**: Fresh metric runs (typecheck, unit, biome, build all green via Turborepo cache + uncached test-case counts via grep); three parallel `Explore` subagent dives (architecture/ADR coherence, component-library coverage, docs+tooling); spot-reads of 4 VR baseline PNGs (Aside, LearningObjectives, KeyEquation, Reflection, ComprehensionGate) for visual-quality assessment; cross-reference to prior six audits' findings. Skill scaffolding from [`reviewing-project-quality`](file:///Users/anna/.claude/skills/reviewing-project-quality) adapted to Sophie's 5-dimension rubric (test / design / domain / a11y / architecture).
**Verdict**: **A (94/100)** — held from the 2026-05-15 audit, but the score composition shifted: the two named structural debts closed (`+2`), and a previously-unmeasured **visual-polish gap** formally surfaced (`-2`). Pre-Workstream-3 readiness: **GREEN with one strategic call** — define a MyST-comparison visual target *before* component CSS iteration begins, or Workstream 3 PRs drift toward "make it slightly different" rather than "make it match a specified standard."

---

## Section 1: What changed since the 2026-05-15 audit

24 hours; **5 PRs merged**; **3 new ADRs** (0055, 0056, 0057); **15+ commits direct-pushed to main**; **2 new follow-up issues filed** (#56, #57).

| PR / ADR / commit cluster | Item | Effect |
|---|---|---|
| #52 (validation-status index page) | ADR 0056 PR 5 — auto-generated `docs/website/status/validation.md` dashboard + per-page validation admonition plugin | Build-time staleness detection (integration test I3 asserts committed dashboard matches generator output); 25 reference + 57 ADR pages now carry `validation:` frontmatter; tracker is source-of-truth for contract state |
| #54 (validation tracker reference + initial pass) | ADR 0056 PR 6 — validation-tracker reference doc + curated initial pass + V1/V2→ERROR | Codifies the conformance language; promotes 2 contract invariants from WARNING to ERROR |
| #53 (VR baseline infrastructure) | ADR 0057 — self-hosted Playwright via `@storybook/test-runner` + CI Linux as canonical baseline environment | 68 baseline PNGs committed at `packages/components/__snapshots__/chromium/`; new `vr` CI job; manual `vr-update` workflow for regen; KeyEquation stories refactored to render real KaTeX (caught hand-mocked `<em>L = 4πR²σT</em><sup>4</sup>` markup, replaced with `katex.renderToString()`); supersedes ADR 0028's VR deferral |
| #58 (SKIP_VR decouple) | `process.env.SKIP_VR === "1"` gates screenshot block in `test-runner.ts`; `test:storybook` script bakes it in | Decouples axe + VR responsibilities so `pnpm test:storybook` runs axe-only and is Mac-runnable; `vr` CI job runs both gates; closes Issue #55 |
| #59 (validation-tracker follow-ups) | ADR 0056 hardening — schema refinements, plugin coverage, pedagogy-audit tightening, dashboard regen | Closes hardening items from the 2026-05-15 hardening-pass audit (C+ 59); brings validation infrastructure to publication-grade |
| direct-to-main (this session) | 5 docs commits — coding-standards trim + new how-to + new reference + nav update + adjacent updates (ADR 0028 cross-ref, phase-1 status, add-a-custom-component VR step, snapshots README cross-refs) | Three-tier Diátaxis shape for VR (rule + how-to + reference); 8 files touched, 402 LOC added, 28 removed; docs build green, no new cross-ref warnings |
| direct-to-main (other session) | `bd37f29` cherry-pick of `vr-update.yml` onto main (workflow_dispatch registration); ADR 0055 + 0056 + 0057 published; coding-standards + adr-0055 status flip | Workflow registration bootstrap (per ADR 0057 hands-on lesson: `workflow_dispatch` files must exist on default branch before they can be triggered) |

**Closed since prior audit:**

- **P1-1** (`.sophie-rollup-entry` dead CSS): RESOLVED. `ChapterFigures.astro` + `CourseFigures.astro` (+ 4 sibling rollup `<li>` components) now apply `class="sophie-chapter-figures__item sophie-rollup-entry"`. The print-mode `@media print` rule at `packages/astro/src/styles/textbook-layout.css:646` has DOM sources.
- **P1-2** (`learning-objectives.spec.ts:60` flake): RESOLVED. Line 60 reads `await expect(ul).toHaveAttribute("aria-busy", "false");` — condition-based wait on Radix's state-machine signal. Lines 85–88 also wait on `data-sophie-write-pending="false"` before reload (persistence-race guard). No arbitrary timeouts remain.
- **P4-2** (ADR for VR baseline): SHIPPED as ADR 0057.
- **P4-3** (squash-merge ADR): SHIPPED as ADR 0055.

**Net code**: ~800 LOC across test-runner extension + KaTeX story refactor + VR CI workflows + validation-tracker hardening. **Net binaries**: 68 baseline PNGs (~1.4 MB). **Net docs**: 3 new ADRs + 2 new docs-site pages + 5 adjacent doc updates + 8 page updates from validation-tracker follow-ups.

---

## Section 2: Test metrics (fresh runs, 2026-05-16)

| Layer | 2026-05-15 | Now (2026-05-16) | Δ |
|---|---:|---:|---:|
| `@sophie/components` test cases | 285 | **280** | -5 (minor refactor; counts via grep `^\s*(it\|test)(`) |
| `@sophie/astro` test cases | 296 | **410** | **+114 (+39%)** |
| `@sophie/core` test cases | 96 | **126** | +30 (+31%) |
| **Total unit cases** | **677** | **816** | **+139 (+21%)** |
| `examples/smoke` e2e cases | 156 | **147** | -9 (some converted to integration; .skip count 12) |
| Storybook stories | 64 | **68** | +4 |
| Components in `@sophie/components` | 18 | **18** | unchanged |
| VR baseline PNGs (chromium) | 0 | **68** | **+68 (new)** |
| ADRs | 53 | **56 files, 57 numbered** (0050 reserved) | +3 numbered (+0055/0056/0057) |
| Files biome-linted | 330 | **378** | +48 (mostly new docs + workflow YAML) |
| Files with biome warnings | 0 | **0** | maintained |
| Files with biome errors | 0 | **0** | maintained |
| Type-safety escape hatches (`as any` / `@ts-ignore` / `@ts-expect-error`) | 0 | **0** | maintained |
| Typecheck pass | 11/11 | **11/11** | maintained |
| Unit pass | 9/9 | **9/9** | maintained |
| Build pass | 7/7 | **7/7** | maintained |
| E2E pass on CI | green | **green** | maintained |
| Storybook a11y pass on CI | green | **green** | maintained |
| **Visual-regression pass on CI** | **n/a** | **green** | **NEW gate active** |

The `@sophie/astro` test growth (+114 cases) is largely the validation-tracker integration tests (I1/I2/I3 + plugin/extractor/audit invariant tightening per PRs #52/#54/#59). The `@sophie/core` growth (+30) is schema test additions for chapter.status (ADR 0051), validation block schema (ADR 0056), and pedagogy-index typing.

The `@sophie/components` count nominally dipped (-5); inspection shows this is restructuring within `Search/` subtree, not coverage loss. KeyEquation's 6 unit tests still pass after the PR #53.1 KaTeX refactor (verified `data-testid='math'` preserved on the new `<div>` wrapper).

---

## Section 3: Audit dimensions — evidence per ADR

### D1 — Package boundary purity (ADR 0001)

**Status**: ✅ HELD. `@sophie/components` imports only React, Zod, `@sophie/*`, and now `katex` + `jest-image-snapshot` (devDeps). No `astro:*` imports. The VR test-runner config (`packages/components/.storybook/test-runner.ts`) imports `@storybook/test-runner` + `axe-playwright` + `jest-image-snapshot` — all framework-pure dev tooling, not runtime.

The new `katex` import in KeyEquation **stories** (not the component itself) is correct: stories run in Storybook isolation, which is dev-only. Production `<KeyEquation>` consumes MDX content through the rehype-katex pipeline at the `@sophie/astro` layer; the component doesn't import katex directly.

### D2 — Pedagogy-index pattern coherence (ADR 0038)

**Status**: ✅ HELD. 8 consumers + 1 producer + 10 audit invariants (`pedagogy-audit.ts`). The validation-tracker (ADR 0056) extends the pattern cleanly: validation frontmatter on 82 pages (25 reference + 57 ADRs), build-time staleness detection via integration test I3 (`validation-index-generator.integration.test.ts`), per-page admonition plugin, dashboard regeneration. The 6-converter Pagefind shape (PR 7) remains coherent.

`dist/.sophie/pedagogy-index.json` build artifact (ADR 0045's prerequisite, prior audit P2-2) **shipped** via `packages/astro/src/lib/pagefind-postbuild.ts`. This unblocks `sophie diff` and `sophie refactor` for Phase 3.

### D3 — Test discipline

**Status**: ✅ STRONG. 816 unit cases (+21%) + 147 e2e + 68 VR baselines. axe-core mandatory per ADR 0004: 18/18 components covered. Condition-based waits replacing arbitrary timeouts (LO flake fix; PR #53.1 inherited the discipline). Coverage:

- `@sophie/components`: lines ~80% / stmts ~79% / fns ~69%. Function-coverage gap is the known contract.ts factory pattern (registered, not directly invoked in unit tests; runtime invokes on first render).
- `@sophie/astro`: lines ~91.6% / stmts ~88.2% / fns ~88.3%. Strongest in the codebase. The new VR test-runner config covered by the runtime success of `vr` CI job + `vr-update` workflow round-trip.
- `@sophie/core`: lines ~51% / stmts ~51% / fns ~40%. Honest — schemas tested through `@sophie/astro` integration; CLI scaffold (audit + dev commands; refactor/diff still pending Phase 3).

**12 documented `test.skip`s** across 7 spec files (chapter-figures, figure-ref, chapter-equations, eq-ref, chapter-key-insights, chapter-misconceptions, chapter-ref). All intentional (stub chapters); the prior audit's P3-2 (document-the-skips-in-header) is partly done.

**One coverage gap formally noted post-VR**: `.storybook/` config files are NOT in `packages/components/tsconfig.json` `include` — a type error in `test-runner.ts` or `test-runner.d.ts` wouldn't be caught by `pnpm typecheck`. Tracked as Issue [#56](https://github.com/drannarosen/sophie/issues/56); 1-line fix.

### D4 — Type safety

**Status**: ✅ MAINTAINED. **0 escape hatches** across all packages (`grep "as any\|@ts-ignore\|@ts-expect-error"` returns 0 hits in source). 11/11 packages typecheck. The `test-runner.d.ts` ambient declaration for `jest-image-snapshot`'s matcher type augments `jest.Matchers` correctly via `@types/jest-image-snapshot`.

### D5 — Biome posture

**Status**: ✅ MAINTAINED. **378 files, 0 errors, 0 warnings**. Up from 330 files at prior audit (+48; mostly new docs pages + new workflow YAML + new test-runner-setup files that got deleted in the same PR cycle). The PR #58 `biome-ignore` suppression on `noDangerouslySetInnerHtml` for the KeyEquation story `TeX` helper follows CLAUDE.md path #2: per-line, with reason ("KaTeX output is trusted; story-only TeX input"). No file-wide suppressions.

### D6 — Storybook coverage

**Status**: ✅ ADVANCED. 68 stories across 18 components (avg 3.78/component). Up from 64 (+4). The PR #53.1 KaTeX story refactor caught a real coverage issue: KeyEquation stories had been **hand-mocking** rehype-katex output as `<em>L = 4πR²σT</em><sup>4</sup>` (italic plain text + Unicode superscript), not running real KaTeX. Post-#53.1: stories call `katex.renderToString()` so VR baselines reflect production rendering.

**Two open story coverage gaps** carry over from prior audit:

- ComprehensionGate + EffortLog only have 2 states each (need 3+ for visual-polish baseline prep). Prior P2-4.
- Search subcomponents (ChipStrip, ResultCard, ResultList) only render inside `SearchModal--default`; no isolated subcomponent stories. Prior P2-3.

**One new gap surfaced via VR**: `EqRef` baselines capture only the closed-popover trigger pill, not the KaTeX content inside. Modal-closed-default stories don't exercise the popover's visual contract. Tracked as Issue [#57](https://github.com/drannarosen/sophie/issues/57); fix is to add a Storybook `play()` function that opens the popover before the test-runner snapshots.

### D7 — a11y posture (ADR 0004)

**Status**: ✅ MAINTAINED. 18/18 components have axe-core tests. `color-contrast` axe rule disabled at the test-runner level (per project posture — design-system review handles contrast, not per-feature gate). The new `SKIP_VR=1` decouple (PR #58) **separated axe from VR cleanly**: `test:storybook` script runs axe-only locally on Mac (Mac users get fast a11y feedback); `vr` CI job runs both gates.

Pre-existing P3 carry-overs from PR-6 audit still open:

- Register `jest-axe`'s `toHaveNoViolations` matcher globally (vs the current `toMatchObject` pattern).
- Arrow-key nav on radio groups (ComprehensionGate, ConfidenceCheck).
- `prefers-contrast: more` support.
- `:target` pulse animation on CollapsibleCard + Figure focus.

None are regressions; all are polish items.

### D8 — Architecture / decision audit trail

**Status**: ✅ STRENGTHENED. 56 ADRs on disk + 0050 reserved (= 57 numbered slots), all coherent. ADR 0028's "Visual regression deferral" section correctly marked superseded by ADR 0057 (bidirectional reference + the deferral-resolved note we added this session). ADR 0055 (squash-merge) and ADR 0056 (validation tracker) are new in this 24-hour window; both are well-locked and have shipped infrastructure.

**The validation-tracker (ADR 0056) is a load-bearing meta-decision**: it adds `validation: { status, last_validated_date, evidence }` frontmatter to every contract-bearing page, and a build-time integration test that catches dashboard staleness. This is exactly the SoTA shape (per Anna's "build the best now" preference): instead of "manually check whether docs match code," the *test* fails if they drift.

**Two minor architectural process gaps surfaced this session**:

1. **GITHUB_TOKEN doesn't fire `pull_request: synchronize`** — the `vr-update` workflow's bot push needed close+reopen to fire a fresh CI run. Documented in the new how-to but not in CI workflow files themselves. Worth a small inline comment in `vr-update.yml`.
2. **`workflow_dispatch` workflows must be on the default branch before triggering** — we hit this when `vr-update.yml` was only on `feat/vr-baseline`. Fixed by cherry-picking to main (commit `bd37f29`). Documented in the VR reference page. This pattern affects any future `workflow_dispatch` addition.

### D9 — Phase 3 LDS-foundation code-readiness

**Status**: ⚠ PARTIAL IMPROVEMENT. Of the prior audit's gap items:

| Item | Prior status | Now |
|---|---|---|
| `dist/.sophie/pedagogy-index.json` artifact (ADR 0045) | docs-only | ✅ SHIPPED |
| Chapter.status frontmatter (ADR 0051) | docs-only | ✅ SHIPPED |
| Misconception graph fields (ADR 0044) | docs-only | ⚠ Partial — schema defined, test coverage pending |
| `sophie refactor` CLI (ADR 0049) | docs-only | ❌ Not implemented |
| `sophie diff` CLI (ADR 0045) | docs-only | ❌ Not implemented |
| Equation biography routes (ADR 0046) | docs-only | ❌ Not implemented |
| Pedagogy-audit plugin shell (ADR 0048) | docs-only | ❌ Not implemented |

The gap narrowed from ~6 unblocked items to ~4. Net architectural improvement: the **bootstrap artifact** (pedagogy-index.json on disk) lands first, which unblocks the CLI work whenever it starts.

---

## Section 4: Visual-polish gap — formally surfaced this audit

Anna raised this directly during the audit-prep brainstorming: "the chapters look mediocre and have formatting issues — I want them to look more like MyST." This is the first audit to formally surface visual polish as a measurable dimension, enabled by the VR baselines that this session shipped.

### Evidence (spot-checked PNGs from `packages/components/__snapshots__/chromium/`)

I read 5 baselines spanning component categories: `aside--note`, `learningobjectives--three-objectives`, `keyequation--with-block-math` (post-KaTeX fix), `comprehensiongate--default`, `reflection--long-form-prompt`. Common visual language:

- Every pedagogy component renders as a **rounded card with a colored left border** on a cream background. Aside (teal), LearningObjectives (teal), KeyEquation (periwinkle), Reflection (rose), ComprehensionGate (teal). The colors vary but the **card chrome is uniform** — every callout, every objective list, every reflection prompt looks like a separately-bounded UI panel.
- Vertical rhythm WITHIN each card is consistent; vertical rhythm BETWEEN cards is undefined (since stories render in isolation, but in production chapters cards will stack).
- Body type is system-sans (acceptable but unconsidered); headings are serif. The mismatch between heading + body is a deliberate-looking design choice that hasn't been validated.
- KaTeX math (post-#53.1) renders correctly — italic with proper math kerning, real Greek glyphs, horizontal fraction bars. The math is the strongest visual element in the library.
- Cards lack a typographic hierarchy: a `<KeyEquation>` looks roughly as "important" as a `<Reflection>` prompt visually, even though they're different cognitive types.

### Reference target — MyST / JupyterBook style

What MyST does well that Sophie doesn't yet:

- **Tight vertical rhythm via paragraph spacing**, not via cards.
- **One unified body type** (system stack, readable at ~17px, measure ~65ch).
- **Restrained color use** — one accent, plenty of whitespace.
- **Math integrates with prose flow** — KaTeX baselines align with surrounding text, equations feel like part of the paragraph, not boxed off.
- **Asides feel like typography** (italic, indent, or thin rule) rather than UI panels.
- **Callouts/admonitions use weight + color**, not heavy card chrome.

### Strategic implication

VR baselines exist **now**. Workstream 3's polish PRs can iterate against them with a defined target. Without a target, polish drifts. With a target, every baseline-update tells you whether you got closer.

**Recommended pre-Workstream-3 action**: a half-hour MyST-comparison session that produces a short reference document (`docs/website/vision/design/visual-polish-target.md` or similar) listing:

- Typography scale + font choices.
- Spacing rhythm.
- Callout/admonition visual language (typography-first vs card-first decision).
- Per-component visual contract — which components keep cards, which dissolve into prose flow.

This is a P1 item this audit creates. See [§6 P1-1](#p1--immediate-before-workstream-3-starts).

---

## Section 5: What's working (regression-prevention checklist)

- ✅ ADR 0001 boundary purity: 0 violations.
- ✅ Type safety: 0 escape hatches.
- ✅ Biome: 0 errors / 0 warnings across 378 files.
- ✅ Typecheck: 11/11 packages pass.
- ✅ Unit tests: 816 cases pass across 9 packages.
- ✅ Build: 7/7 packages build.
- ✅ E2E: green on CI (147 cases, 12 documented `.skip`s on stub chapters).
- ✅ Storybook test-runner (axe): 18/18 components covered.
- ✅ Visual-regression CI job: **NEW — active and green on main**.
- ✅ MyST docs build: success; only expected `validation` frontmatter warnings + 6 pre-existing cross-ref warnings in unrelated files.
- ✅ Pedagogy-index pattern: 8 consumers + 1 producer + 10 audit invariants.
- ✅ Validation tracker (ADR 0056): 82 contract pages instrumented; integration test I3 catches dashboard staleness.
- ✅ Squash-merge convention (ADR 0055): empirically held on PRs #43–#59.
- ✅ Cross-bundle DOM attribute observation (ADR 0037): 2+ consumers, no drift.

---

## Section 6: Prioritized backlog

### P1 — immediate; before Workstream 3 starts

| # | Item | Effort | Why |
|---|---|---|---|
| **P1-1** | **Define a MyST-comparison visual target.** ~30-minute session: open MyST/JupyterBook reference pages side-by-side with Sophie chapter renders, identify the typography/spacing/callout-shape choices to import, write target to `docs/website/vision/design/visual-polish-target.md`. | 30–45 min | Without this, Workstream 3 PRs drift toward "slightly different" rather than "match a specified standard." Anna's framing: chapters look mediocre vs MyST. VR baselines now exist; the loop only closes if the *target* is defined. |
| **P1-2** | Issue [#56](https://github.com/drannarosen/sophie/issues/56) — Add `.storybook/` to `packages/components/tsconfig.json` `include`. | 1 line + verify | Closes typecheck coverage gap on test-runner config files. Surface gap; future edit to `.storybook/test-runner.ts` could ship a type error caught only at runtime. |

**P1 total: ~1 hour.** Both can land before any component-CSS work begins.

### P2 — fold into Workstream 3 visual-polish PRs

| # | Item | Effort | Why |
|---|---|---|---|
| **P2-1** | Issue [#57](https://github.com/drannarosen/sophie/issues/57) — EqRef popover-open VR coverage. Add a `play()` function that opens the popover before the test-runner snapshots. Bundle with EqRef visual polish PR. | 1 hr | The popover (where KaTeX math lives) defaults closed; current baseline captures only the trigger pill. The math contract is uncovered. |
| **P2-2** | Pre-existing prior audit P2-3 — Search subcomponents (`<ChipStrip>`, `<ResultCard>`, `<ResultList>`) need isolated stories independent of `<SearchModal>`. | 1 hr | Polish gates each subcomponent independently. |
| **P2-3** | Pre-existing prior audit P2-4 — ComprehensionGate + EffortLog stories from 2 → 3+ states. | 1 hr | Visual-polish baseline prep needs state variants per component. |
| **P2-4** | Pre-existing prior audit P2-1 — Emit `data-pagefind-filter="type:page"` on chapter HTML templates so `ResultCard.tsx:91`'s `?? "page"` runtime fallback can be dropped. | 1 hr | Removes named structural debt from PR 7. |
| **P2-5** | Pre-existing prior audit P2-5 — Pedagogy-audit shell support for plug-in invariant families (ADR 0048). | 2–3 hr | Future LDS facets (notation registry, multirep, misconception, intervention) need this shape before they slot in. |
| **P2-6** | **NEW** — Add an automated regenerate-validation-index step (lefthook pre-commit or CI auto-regen). Twice in 24h we've hit dashboard staleness in CI; an editor/hook would prevent it. | 1–2 hr | Manual `pnpm tsx scripts/regenerate-validation-index.mts` is fragile; happened on both Anna's main pushes and my docs push. |

**P2 total: ~7–9 hours.** Folds naturally into Workstream 3's component polish or a small follow-up batch.

### P3 — opportunistic; alongside polish PRs or quick wins

| # | Item | Effort |
|---|---|---|
| **P3-1** | Pre-existing carry-overs from PR-6 audit: register `jest-axe`'s `toHaveNoViolations` matcher globally; arrow-key nav on radio groups; `prefers-contrast: more` support; `:target` pulse animation on CollapsibleCard + Figure. | 3–4 hr (4 items) |
| **P3-2** | Pre-existing carry-over from PR-2 audit: `sa-` token namespace migration in `EffortLog.module.css`. | 30 min |
| **P3-3** | **NEW** — Document the GITHUB_TOKEN `pull_request: synchronize` non-firing gotcha in `.github/workflows/vr-update.yml` itself (currently documented in `docs/website/how-to/run-visual-regression-locally.md` and `reference/visual-regression.md` but not in the workflow source). | 5 min |
| **P3-4** | **NEW** — Document the `workflow_dispatch`-must-be-on-default-branch constraint in `.github/workflows/vr-update.yml` header comment. | 5 min |
| **P3-5** | Document 12 `test.skip` expectations in spec-file headers (5 files now have them; 2 files have inline comments per prior P3-2 partial). | 30 min |
| **P3-6** | Pre-existing prior P3-5 — Pre-PR `pnpm install --frozen-lockfile` check as a lefthook pre-push or CI gate. | 1 hr |

**P3 total: ~5–6 hours.** Optional; opportunistic.

### P4 — strategic; queue for HITL discussion

| # | Item | Effort | Why |
|---|---|---|---|
| **P4-1** | **Phase 3 LDS implementation sequencing.** `sophie refactor` CLI (ADR 0049), `sophie diff` CLI (ADR 0045), misconception-graph enforcement (ADR 0044), equation-biography routes (ADR 0046), pedagogy-audit plugin shell (ADR 0048). All depend on the now-shipped `dist/.sophie/pedagogy-index.json`. Decision: which lands first; does plugin shell come before or after CLIs. | Variable | Highest strategic leverage. The bootstrap artifact is there; the next step is yours. |
| **P4-2** | **Decouple storybook + vr CI jobs more fully.** Currently OK via `SKIP_VR=1` env var (PR #58), but a future refactor might prefer two separate test-runner configs to make the responsibilities visually obvious. Defer until the coupling causes friction. | 1–2 hr | Already functional. Not blocking. |
| **P4-3** | **Phase 2 (CLI) start** per [cheerful-eagle plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md). 4 commands move from `packages/core` to `@sophie/cli`. Phase 2 can run in parallel with Workstream 3 since the dimensions are orthogonal. | Multi-PR | Anna's call on sequencing vs Workstream 3. |
| **P4-4** | **2026-05-15 hardening-pass audit (C+ 59/100) remaining items.** ADRs 0046–0054 had 8 BLOCKING + ~22 IMPORTANT issues. PR #59 closed the validation-tracker portion. Other items (TDR template, equation biography, etc.) await independent decisions. | Variable | Listed for HITL visibility; not blocking Workstream 3. |

---

## Section 7: Quality grades

| Category | 2026-05-15 audit | Now (2026-05-16) | Δ | Evidence |
|---|---:|---:|---:|---|
| Test coverage | 19 | **19** | — | +139 unit cases (+21%); +68 VR baselines; 12 documented `.skip`s (up 1); axe 18/18 maintained; coverage stable. Holding at 19 — 4 prior audit items still open (Search subcomponent stories, ComprehensionGate/EffortLog state expansion, jest-axe matcher, `.skip` documentation). |
| Design system | 19 | **19** | — | 18 components, 24 chrome primitives, pedagogy-index 8/1, biome 0/0 across 378 files. Visual-polish gap **formally surfaced as separate dimension** (§4) but doesn't count as a regression in design *system* — it's forward work, not backward drift. The structural strength held; the polish target wasn't measured before. |
| Domain correctness | 18 | **18** | — | LDS-foundation gap narrowed (2 sub-items shipped: pedagogy-index.json artifact, chapter.status; 4 still open). Validation tracker (ADR 0056) is a structural improvement that *reveals* docs-vs-code asymmetry through tests. Net zero — improvement absorbed by remaining-gap visibility. |
| Accessibility | 19 | **19** | — | 18/18 axe-core coverage. ADR 0004 mandate held. SKIP_VR decouple (PR #58) **improves** the local axe loop (Mac-runnable now); doesn't bump the dimension because the structural mandate was already met. Prior P3 carry-overs unchanged. |
| Architecture | 19 | **20** | **+1** | **Both P1 items resolved.** `.sophie-rollup-entry` DOM application + LO flake fix. Two new ADRs (0055, 0057) cleanly extend the locked set. VR infrastructure ships without violating ADR 0001 boundaries. Validation-tracker is a structural-test pattern that prevents the kind of drift that contaminated D9 last audit. The two new process gaps (GITHUB_TOKEN sync; workflow_dispatch-on-default-branch) are documented; -0 because both are pinned in P3 with concrete fixes. |
| **Total** | **94** | **94** | — | **A held** |

Grade band: 90–94 = A. **A maintained.** The 1-point Architecture bump is offset by the explicit visual-polish gap surfacing — which doesn't deduct from any existing dimension but DOES create a new P1 strategic call. Net flat; trajectory neutral with one clear forward action.

---

## Section 8: Trajectory across seven audits

| Audit | Date | Grade | Trigger |
|---|---|---|---|
| [Phase 1 hardening audit](2026-05-10-phase-1-hardening-audit.md) | 2026-05-10 | B− (73) | Trio 3 closed |
| [Post-hardening audit](2026-05-10-post-hardening-audit.md) | 2026-05-10 | B+ (84) | P1 sprint closed |
| [Sprint-to-A audit](2026-05-10-sprint-to-a-audit.md) | 2026-05-10 | A (91) | P2 sprint closed |
| [Bucket B PR 2 audit](2026-05-12-bucket-b-pr2-audit.md) | 2026-05-12 | A (93) | Bucket B PRs 1+2 closed |
| [Bucket B PR 6 audit](2026-05-13-bucket-b-pr6-audit.md) | 2026-05-13 | A+ (96) | Bucket B PRs 3–6 closed |
| [Bucket B + C architecture audit](2026-05-15-bucket-b-c-architecture-audit.md) | 2026-05-15 | A (94) | Bucket B 10/10 + Bucket C 4/4 + LDS foundation tranche graduated |
| **State-of-the-platform audit** (this) | **2026-05-16** | **A (94)** | **Post-VR, post-validation-tracker; pre-visual-polish SoTA assessment** |

Net: **+21 points across seven audits, ~6 days, 22+ PRs.** The −0 turn at this audit is **two structural P1s closed offset by one strategic dimension (visual polish) formally surfacing**. **Path to A+ (96–98):**

- P1-1 (visual target document) → unlocks measurable Workstream 3 progress (→ +1 design system on next audit, once polish PRs land).
- P2-1/2/3/4 close (→ +1 test coverage).
- P4-1 sequencing decision → starts Phase 3 LDS code work (→ +2 domain correctness over the next several audits).

Both close cleanly within Workstream 3 + Phase 2 envelopes.

---

## Section 9: Pre-Workstream-3 readiness

**Checklist:**

- ✅ Boundary purity held (ADR 0001).
- ✅ Type safety: 0 escape hatches.
- ✅ Biome: 0/0 across 378 files.
- ✅ a11y: 18/18 components axe-tested; local Mac axe loop unblocked via SKIP_VR (PR #58).
- ✅ Test surface: 816 unit + 147 e2e cases + 68 VR baselines.
- ✅ VR infrastructure operational: `vr` CI job + `vr-update` workflow + dual-purpose (regression gate + review surface).
- ✅ Documentation three-tier shape for VR shipped this session.
- ⚠ **Visual-polish target undefined** (P1-1) — workstream can technically start without it, but quality will drift.
- ⚠ One typecheck coverage gap (Issue #56) — 1-line fix.
- ⚠ LDS-foundation code-readiness gap persists (4 items) — orthogonal to Workstream 3.

**Workstream 3 can start once P1-1 + P1-2 close.** Estimated total: ~1 hour. The VR baseline review-surface workflow (`Read` the PNG, describe what's rendered, propose CSS changes) is the dev loop ADR 0057 §3 named explicitly — it works *today*, just needs a target to iterate toward.

**Workstream 2 (CLI carve-out) is not blocked by Workstream 3.** Both can run in parallel — Phase 2's CLI work is at the `@sophie/core → @sophie/cli` package-boundary level; Phase 3's visual polish is at the `@sophie/components` + `@sophie/theme` level. Different surface areas, no overlap.

---

## Section 10: TL;DR — executive summary

Sophie at the end of 2026-05-16:

**Grade: A (94/100).** Held from the prior audit. Composition shifted: 2 structural debts closed (+2 architecture), 1 strategic dimension surfaced (-2 design system in spirit, though held at 19 because it's forward work, not regression).

**What works (publication-grade as of today):**

- 18 pedagogy components + 24 chrome primitives + 3 layout primitives + 4 preferences.
- 816 unit tests + 147 e2e cases + 68 VR baselines (+139 unit, +68 VR vs prior).
- ADR 0001 boundary purity: **0 violations**.
- Type safety: **0 escape hatches**.
- Biome: **0 errors / 0 warnings** across **378 files**.
- a11y: **18/18 components** axe-tested; local Mac axe loop unblocked (PR #58).
- **Visual regression: 68 baselines + CI gate + manual regen workflow** (NEW this session).
- Pedagogy-index pattern (ADR 0038): 8 consumers, 10 audit invariants, ~2200 LOC test surface.
- Validation tracker (ADR 0056): 82 contract pages instrumented; integration test catches docs-vs-code drift.
- 57 ADRs codifying every load-bearing decision.

**What's load-bearing (architectural insights from this audit):**

- The validation-tracker pattern (ADR 0056) is a model for catching docs-vs-code asymmetry. Builds test-time staleness detection into the docs site itself. Should generalize to other dimensions (e.g., chapter-status conformance, schema-vs-runtime drift).
- The VR dual-purpose framing (regression gate + review surface) pays off **during polish**, not just after. The review-surface role gives Anna + Claude a multimodal channel for design iteration RIGHT NOW; the regression gate matures as baselines stabilize.
- The KaTeX story refactor (PR #53.1) caught a real quality bug — stories were hand-mocking math output. VR baselines being a *review surface* surfaced the issue; the regression gate alone wouldn't have caught it.

**One strategic question (P1-1):**

- **Define a MyST-comparison visual target** before Workstream 3's component CSS work begins. Without a defined target, polish PRs drift; with one, each baseline update measures progress toward a known goal. Half-hour task.

**Two open follow-up issues** (filed this session, both deferred-by-design):

- [#56](https://github.com/drannarosen/sophie/issues/56) — `.storybook/` tsconfig include (1-line fix; P1-2 in this audit's backlog).
- [#57](https://github.com/drannarosen/sophie/issues/57) — EqRef popover-open VR coverage (P2-1 in this audit's backlog; bundle with EqRef polish PR).

**Pre-Workstream-3 verdict: GREEN with one strategic call.** Define the visual target, do the 1-line tsconfig fix, then iterate component polish with VR baselines as the feedback signal.

---

## References

- [Prior audit — Bucket B + C architecture audit (2026-05-15)](2026-05-15-bucket-b-c-architecture-audit.md) — baseline this audit measures against.
- [Hardening-pass quality audit (2026-05-15)](2026-05-15-hardening-pass-quality-audit.md) — independent audit of the ADR 0046–0054 tranche; remaining items in P4-4.
- [ADR 0055](../website/decisions/0055-squash-merge-for-code-prs.md) — squash-merge convention (NEW since prior audit).
- [ADR 0056](../website/decisions/0056-validation-tracker.md) — validation tracker (NEW since prior audit).
- [ADR 0057](../website/decisions/0057-visual-regression-baseline.md) — visual regression baseline (NEW since prior audit).
- [VR baseline how-to](../website/how-to/run-visual-regression-locally.md) — NEW this session.
- [VR reference](../website/reference/visual-regression.md) — NEW this session.
- [cheerful-eagle session plan](file:///Users/anna/.claude/plans/hi-claude-this-session-cheerful-eagle.md) — Phase 2 (CLI) + Phase 3 (visual polish) scoping.
- [Issue #56](https://github.com/drannarosen/sophie/issues/56), [Issue #57](https://github.com/drannarosen/sophie/issues/57) — open follow-ups.
