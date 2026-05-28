# Platform hardening audit — state of Sophie (2026-05-28)

**Scope.** End-to-end quality / correctness / SoTA-shape audit of the
Sophie platform on `main` (post PR #209, the compound-island transform +
formative-with-reveal v1, commit `c17ceb6`). Method: fresh deterministic
gate run (biome / typecheck / lint:axe-render / frozen-install / test:unit
/ smoke build / MyST — chained, serialized) **plus** five parallel
read-only deep-audit agents (architecture+packaging, pedagogy-audit
wiring, code-quality+R-rules, tests+a11y, docs-drift+deps). All numbers
below come from this session's runs, not memory.

This is an **AUDIT → propose → (approval) → harden → features** cycle.
No code has been changed. The backlog below awaits scope approval.

---

## 1. Headline findings

1. **The pedagogy audit DOES run in real consumer builds** (the lead to
   chase). Static trace: `ChapterLayout.astro:207` *wraps*
   `TextbookLayout`, which calls `runAuditOncePerProcess` at
   `TextbookLayout.astro:216` (once-per-process via
   `audit-cache.ts:64`). Build evidence: the fresh smoke build printed
   `Pedagogy audit: 0 errors, 17 warnings, 9 infos` with real AS-2 / AS-3
   / O2 / D5 findings. **The feared P1 correctness gap does not exist** —
   the stale episodic-memory snapshot ("tests-only") was wrong; the live
   code is authoritative. *Residual:* the trigger is layout-coupled (not
   an `astro:build:done` hook) and the report is `console.log`-only.

2. **`pnpm turbo run test:unit` fails locally out-of-the-box** — but it is
   a **build-order fragility, not a regression** (CI is green). The
   `index-generator.integration.test.ts` I5 href-resolution test failed on
   two hrefs (`/compound-island-transform/`, `/formative-assessment-authoring/`)
   because it ran against a **stale `_build/html/`** predating PR #209. A
   fresh MyST build produces both artifacts (verified: both
   `index.html` now exist; both pages are in `myst.yml:95,244`). The
   test's fail-loud guard checks the build dir *exists*, not that it is
   *fresh*. This is the top "trustworthy-local-green" hardening item.

3. **Distributability is the weakest area.** The dual-React-instance
   hardening (`optimizeDeps.include`, `resolve.dedupe`, `sideEffects`)
   lives **consumer-side** (duplicated in both astr201 + packed-smoke
   configs, both annotated "belongs upstream eventually") instead of in
   `defineSophieIntegration`. Every new consumer re-discovers React #418
   the hard way. Pre-launch is the moment to fix this.

4. **Two ADRs carry stale post-PR-#209 claims** (docs-no-drift miss):
   ADR 0019 still says "six Radix subpackages incl. `@radix-ui/react-tabs`"
   and cites the **deleted** `Tabs/Tabs.tsx`; ADR 0073's body table still
   says MCQ/MultiSelect are "built on react-radio-group/react-checkbox."

5. **One ADR-0087 standing-rule gap:** `<MultiRep>` (rendered 4× in smoke
   fixtures) has **no build-level render+axe assertion** — the exact
   RTL-passes/build-empty island-boundary class that PR #209 was created
   to defend against.

---

## 2. Fresh gate metrics (2026-05-28, this session)

| Gate | Result |
|---|---|
| `biome check` | **973 files, 0 errors / 0 warnings** ✓ |
| `turbo run typecheck` | **11 / 11** ✓ |
| `lint:axe-render` (R11) | **64 / 64** render-calling files call axe ✓ |
| `install --frozen-lockfile` | **no drift** ✓ |
| `turbo run test:unit` | **2736 / 2737 pass; 1 local-only fail** (I5, build-order; CI-green) |
| smoke `build` | **132 pages, Complete, 0 errors**; audit fired 0E / 17W / 9I |
| MyST `build --html` | **0 ⚠** ✓ |

Unit test breakdown (fresh):

| Package | Files | Tests | Result |
|---|---|---|---|
| `@sophie/core` | 37 | 561 | ✓ |
| `@sophie/cli` | 9 | 33 | ✓ |
| `@sophie/theme` | 1 | 29 | ✓ |
| `@sophie/components` | 111 | 928 | ✓ |
| `@sophie/astro` | 122 | 1186 | 1185 ✓ / 1 fail (I5 build-order) |
| e2e specs | 38 | — | not re-run (PR #209 green); analyzed statically |
| VR snapshots | 376 PNG | — | — |

Non-failing noise observed in the run (all benign, all candidate
cleanups): vitest V8 coverage glob walks into `.worktrees/` and throws
3× `RolldownError` trying to parse `__fixtures__/*.yaml`; React
`act(...)` warnings (SpacedReview, BlackbodyExplorer/ParameterSlider,
Dropdown, LearningObjectives, HydrationAnnouncer); `--localstorage-file
… without a valid path` node warnings; vite esbuild→oxc/rolldown
deprecation warnings; a stale **merged** worktree
`.worktrees/formative-parents-bundle/` still on disk.

---

## 3. Quality grade — B+ (83 / 100)

Honest read: the **core engineering is A/A+** (package graph, framework
purity, schema-as-source-of-truth, R-rule discipline, ~2737 tests, zero
biome warnings, the audit firing in production). The composite is pulled
to a high B+ by **distributability** (hardening lives consumer-side),
**docs-drift** (two stale ADRs), and the **trustworthy-local-green**
test-infra fragility. None of the deductions are broken-in-production
correctness bugs; all are pre-launch-addressable.

| Category | Grade | Evidence |
|---|---|---|
| Architecture & boundaries | **19/20 (A)** | clean core→components→astro graph, no cycles; `astro:` import grep empty (ADR 0001); `choiceSlug`/`findFillBlankSlots` shared by construction between extractor + transform; Zod source-of-truth; `.contract.ts` consistent (ADR 0004) |
| Dependency hygiene | **19/20 (A)** | single `react@19.2.6` as peerDep; 3 removed Radix deps gone from lockfile; only cosmetic transitive dupes (`@types/estree`, `semver`) |
| Code quality & conventions | **17/20 (A−)** | R6/R8/R10/R12 all PASS; exemplary `biome-ignore` hygiene; docked for 1 R9 dup (`VitePluginLike`), 2 over-ceiling non-exempt files, `.astro` LOC blind spot, 1 issue-less TODO |
| Tests | **17/20 (A−)** | 2737 tests; bare-timeout debt 19→~0; 6 `expect.poll` + 65 `toHaveCount`; clean anti-patterns; docked for MultiRep island-axe gap, no vitest worker caps, I5 order-fragility |
| Pedagogy-system correctness | **17/20 (A−)** | audit fires in prod (0E/17W/9I); artifact-scoped accumulator correct (ADR 0038 A3); R7 zero bare silent-skips; data-flow clean; docked for layout-coupled trigger + console-log-only report |
| Accessibility | **16/20 (B+)** | R11 64/64; single justified `label` rule-disable (math MathML); docked for zero reduced-motion e2e + no MathML accessible-name solution (#210) |
| Docs / ADR integrity | **15/20 (B)** | validation.md current; docked for ADR 0019 (4 stale claims incl. deleted-file `ref`), ADR 0073 body-table drift, 2 pre-existing broken cross-refs |
| Distributability / packaging | **13/20 (B−)** | sound pnpm-override strategy + packed-smoke regression harness; docked because optimizeDeps/dedupe/sideEffects hardening lives in consumer configs, not the integration |

Composite: 133 / 160 = **83.1 → B+**. (Prior 2026-05-25 "state of
Sophie" was A− (85); the fresh-run-exposed test:unit failure +
distributability + ADR-0019 drift account for the honest dip.)

---

## 4. Backlog (prioritized)

### P1 — correctness / standing-rule / blocks trustworthy-green

- **P1.1 — MultiRep build-level render+axe assertion (ADR 0087 standing
  rule).** `<MultiRep>` renders 4× in smoke (`spoiler-alerts/reading.mdx`
  :482/:778/:1208, `measuring-the-sky/reading.mdx:51`) with **no**
  build-level render+axe test — the same island-boundary class the
  compound-island transform was built to defend. Add an assertion to
  `examples/smoke/e2e/` (extend `formative-render.spec.ts` or a sibling).
  *Also wire EquationBiography into smoke; add Solution/Hint/SelfAssessment
  build-level coverage (could be P2).*
  - **Partial (2026-05-28):** the distributability PR
    (`feat/figures-subpath-plot-bundling`) added build-level render coverage
    for `<BlackbodyExplorer>` — the sole Plot consumer, previously absent
    from any e2e — in `examples/packed-smoke/e2e/blackbody-figure-render.spec.ts`
    (render + hydration + zero-error; a11y already covered by its
    component-level jest-axe test). The `<MultiRep>` build-level render+axe
    assertion in `examples/smoke/` remains **open**.

### P2 — hardening with real pre-launch value

- **P2.1 — Hoist the dual-React/CJS-interop hardening into the
  integration.** Inject `optimizeDeps.include` (the
  `@sophie/components > @observablehq/plot > interval-tree-1d` chain) +
  `resolve.dedupe: ['react','react-dom']` in
  `defineSophieIntegration`'s `updateConfig.vite` block
  (`integration.ts:~113`); delete the duplicated blocks in astr201 +
  packed-smoke configs (closes the "belongs upstream eventually" TODO
  both carry). HITL: touches the public integration contract — confirm
  shape first.
  - **Status (2026-05-28, `feat/figures-subpath-plot-bundling`):** the
    `optimizeDeps` half is **superseded, not hoisted** — `@sophie/components`
    now bundles Plot at the source (tsup `noExternal`) + isolates it to the
    `@sophie/components/figures` subpath, so no consumer or integration needs
    `optimizeDeps` at all. packed-smoke's block is deleted; astr201's is a
    follow-up there. The `resolve.dedupe: ['react','react-dom']` half
    **shipped** in `integration.ts`. See
    [ADR 0022 Amendment 1](../website/decisions/0022-tsup-library-builds.md#amendments)
    + [design doc](../plans/2026-05-28-distributability-design.md).
- **P2.2 — Fix I5 build-order fragility (trustworthy local green).**
  `index-generator.integration.test.ts` fails locally against a stale
  `_build/html`. Options: (a) add a turbo `dependsOn` edge so astro
  `test:unit` requires `@sophie/docs#build`; (b) make the fail-loud guard
  detect *staleness* (mtime vs source), not just existence; (c) split I5
  into a post-build integration task. Recommend (a) or (b).
- **P2.3 — Add `"sideEffects": ["**/*.css","*.css"]`** to
  `@sophie/components` (and `@sophie/theme`) `package.json` so CSS-bundling
  vs JS-tree-shaking is explicit for distributed consumers.
  - **Status (2026-05-28):** **shipped** in
    `feat/figures-subpath-plot-bundling` on both packages (load-bearing for
    the figures-subpath tree-shaking; ADR 0022 Amendment 1).
- **P2.4 — Audit report → on-disk artifact + (optional)
  `astro:build:done` trigger.** Today the report is `console.log`-only
  (prints concatenated into a page: `…index.htmlPedagogy audit:`), and
  the trigger is layout-coupled so a spec-projection-only build would skip
  it. Emit `dist/.sophie/pedagogy-audit.json` + move/duplicate the
  trigger into the integration's build-done hook. HITL: new build
  artifact + integration behavior — propose before implementing.
- **P2.5 — ADR 0019 docs-drift fix.** Add an Amendment; correct the
  "six Radix subpackages / `@radix-ui/react-tabs`" claims (now 5) and the
  deleted-file `ref` (`Tabs/Tabs.tsx` → `TabsController.tsx`); demote its
  `validation: validated` overclaim. Same-PR with any code touch per
  docs-no-drift.
- **P2.6 — ADR 0073 body-table fix** (`:330-331`): MCQ/MultiSelect no
  longer "built on react-radio-group/react-checkbox" — supersede with the
  native-controls note per ADR 0087.
- **P2.7 — `prefers-reduced-motion` e2e coverage.** CSS exists across
  Tabs/Hint/Dropdown/Objective but is never asserted via
  `emulateMedia({ reducedMotion: "reduce" })`.

### P3 — quality / DX

- **P3.1 — R9 violation:** extract the duplicated `VitePluginLike`
  interface (`figures-virtual-module.ts:12` + `course-spec-virtual-module.ts:13`)
  to a shared local type (R9-production is a hard rule, no isolation
  exception).
- **P3.2 — Vitest worker caps + serial axe Playwright project** so local
  green is trustworthy: add `poolOptions.threads.maxThreads` (or
  `pool:"forks"`) to the per-package vitest configs; split a
  `fullyParallel:false` axe project in `playwright.config.ts`. (CI stays
  authoritative.)
- **P3.3 — LOC gate covers `.astro`** (`scripts/loc-budget.ts:108` only
  scans `.ts`/`.tsx`; `TextbookLayout.astro` at 540 is unenforced). Extend
  the gate or document the exclusion.
- **P3.4 — Split or grandfather the two over-ceiling files:**
  `compound-expand.ts` (630) + `sophie-auto-imports.ts` (571) exceed the
  500 ceiling and are not exempt (sub-800 = warning band per ADR 0061).
- **P3.5 — Coverage excludes `.worktrees/**` + `**/__fixtures__/**`** so
  V8 coverage stops throwing RolldownError on YAML fixtures (kills 3×
  error-noise that erodes trustworthy green).
- **P3.6 — Broken ADR cross-ref filenames** in `chapter-components.md`
  (:196/:197/:593/:594) + `formative-assessment-authoring.md` (:296/:297):
  `0004-component-contract.md` → `…-revisions.md`,
  `0007-indexeddb-persistence.md` → `0007-persistence-indexeddb.md` (R6 /
  link-check). Pre-existing, not PR #209.

### P4 — cleanup / hygiene

- **P4.1 — Prune the stale merged worktree** `.worktrees/formative-parents-bundle/`
  (PR #209 is merged). HITL: confirm before `git worktree remove`.
- **P4.2 — React `act(...)` warnings** in SpacedReview /
  BlackbodyExplorer / Dropdown / LearningObjectives / HydrationAnnouncer
  tests — wrap async state updates.
- **P4.3 — `integration.ts:83` TODO** lacks an issue link (convention).
- **P4.4 — `formative-assessment-authoring.md:208`** still shows
  `<QuickCheck>` "*(Coming in PR 5)*" though shipped.
- **P4.5 — Broaden `react`/`react-dom` peer ranges** to `^19` +
  `peerDependenciesMeta`; replace the shell-`cp` asset copy in
  `@sophie/astro`'s build with a glob/bundler step.

### P5 — nice-to-have / future ADR

- **P5.1 — Platform LaTeX→speech (speech-rule-engine / MathJax SRE)** so
  axe's `label` rule stays strict everywhere and spoken math is enriched
  across equations + prose + choices (closes the lone rule-disable;
  tracks #210). Deserves its own ADR + dependency decision.
- **P5.2 — Document the accumulator collision-loop invariant** (unit ids
  contain no `#`; `accumulator.ts` reconstruct logic assumes it).
- **P5.3 — `pnpm dedupe`** to collapse cosmetic transitive dupes.

---

## 5. What this audit confirmed is healthy (don't re-litigate)

- Package-graph boundaries + `@sophie/components` framework purity (ADR 0001).
- The compound-island transform design (ADR 0087): shared `choiceSlug`,
  run-last ordering, controller-island pattern — coherent and well-applied.
- Artifact-scoped pedagogy index (ADR 0038 A3): keying correct, serialized
  shapes unchanged, well-tested.
- R7 silent-skip discipline (zero bare skips), R6/R8/R10/R12 compliance.
- Dependency hygiene: single React instance, removed deps gone.
- Condition-based-waiting adoption (bare-timeout debt effectively retired).

---

## 6. Recommended execution order (pending approval)

1. **Trustworthy-green batch** (P2.2 + P3.2 + P3.5 + P4.1) — make
   `pnpm turbo run test:unit` pass locally out-of-the-box and de-noise the
   run. Low-risk, high-DX-value, no public-contract changes.
2. **Distributability batch** (P2.1 + P2.3 + P4.5) — harden packaging
   before more consumers exist. HITL on the integration contract.
3. **ADR-0087 coverage + docs-drift batch** (P1.1 + P2.5 + P2.6 + P3.6).
4. **Audit-robustness batch** (P2.4) — propose ADR-shaped before code.
5. Remaining P3/P4/P5 as capacity allows; P5.1 (LaTeX→speech) is its own
   ADR + sprint.

Code-review (superpowers:requesting-code-review or
`/code-review`) between batches per the standing flow.
