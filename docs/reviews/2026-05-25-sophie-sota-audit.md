---
title: Sophie SoTA audit — state-of-the-project pass (post-#177)
date: 2026-05-25
type: state-of-platform
authors:
  - Claude (audit)
  - Anna Rosen (prompt)
scope: full platform after PR sequence #172 → #177
baseline: docs/reviews/2026-05-25-state-of-sophie.md (commit 5c55f5c, pre-#172)
---

## What I'm reviewing

Anna asked for a comprehensive code-review + architecture audit of
the Sophie platform, grading the codebase against SoTA design /
architecture / features / capabilities and producing a prioritized
refactor backlog. This audit refreshes the
[2026-05-25 state-of-sophie baseline](2026-05-25-state-of-sophie.md)
(graded **A− / 85 of 100** at commit `5c55f5c`) by reporting the
delta after the PR sequence #172 → #177:

- **PR #172** — fix React #418 hydration mismatch in packed consumers
- **PR #173** — drop `typeof document` guards + hydrated ternaries
- **PR #174** — CL1 audit invariant (missing `client:*` on store-backed)
- **PR #175** — ADR-0082 `ChapterLayout` + reading route → `@sophie/astro`
- **PR #176** — packed-smoke consumer + hydration-mismatch CI gate (PR-D1)
- **PR #177** — post-PR-172 template skeleton + `expect.poll` / defs audits

The platform is stable, all 8 CI gates green, astr201 (the second
consumer at `/Users/anna/Teaching/astr201`) is fully migrated.

## Audit methodology

Three parallel `Explore` agents + one `Plan` agent under the
strict HITL mandate from AGENTS.md:

- **Agent A** — package-shape + LOC-budget sweep (ADR 0061 Rule 3)
- **Agent B** — ADR-vs-code drift map across 81 ADRs (0001–0082, 0050 gap)
- **Agent C** — test-infra + CI shape audit
- **Plan agent** — backlog structuring + refactor-shape proposals

Two Agent-B claims were spot-checked and **corrected**:

1. Agent B reported ADR 0061 Rule 3 as "documented but unimplemented."
   Direct read of `scripts/loc-budget.ts` shows `process.exit(1)`
   on non-exempt ERROR breaches; CI lint job invokes it. **The rule
   IS enforced.** Real drift is in the script's own comment for
   `accumulator.ts` ("between WARNING and ERROR") — the file is
   now 907 LOC, above ERROR (script comment is stale).
2. Counts were ground-truthed: 19 bare `{ timeout: N }` across 12
   spec files (Agent C said 21 across 7); 22 of 35 smoke specs use
   axe-core (63%); 0 specs use `expect.poll(count).toBeGreaterThan(N)`.

## Inventory delta vs. baseline

| Metric | Baseline (5c55f5c) | Today (HEAD ee5fb61) | Delta |
|---|---|---|---|
| Packages | 5 | 5 | — |
| Total TS LOC across `packages/*/` (incl. tests) | ~29,600 src-only | ~69,625 incl. tests | restated metric |
| Components | 37 | **40** (+3 net; PR #168 chrome, PR #175 layout extraction) | +3 |
| ADRs | 79 | **82** (0080 Course Spec, 0081 Worked Example, 0082 Chapter Layout) | +3 |
| Unit test files | (in 206 total) | **221** | +15 |
| Unit test blocks | (in 2,148 total) | **2,125** | restated metric |
| E2E spec files | 35 (Playwright) | **36** (+1 packed-smoke) | +1 |
| Audit invariant source files | (14 invariants) | **20 files / 17+ named invariants** (+CL1 +OF-3 +misc) | +3 named |
| CI workflow jobs | 7 | **8** (+packed-smoke / PR-D1) | +1 |
| Lint sub-gates | (4 inside `lint`) | 4 (biome / lint:loc / lint:links / lint:status) | — |
| Standing review rules | R6–R10 | R6–R10 | — |
| MyST warnings | 0 | 0 | — |
| Biome warnings | 0 | 0 | — |

The "restated metric" rows reflect that the baseline's "~29,600 LOC
TypeScript across `packages/*/src/`" was src-only; the
all-package-files count (incl. tests) is ~69,625 LOC. That puts
@sophie/astro at 30,082 LOC, @sophie/components at 26,616 LOC, and
the small packages (core/cli/theme) under 10K combined. No code
deletion happened; the metric definition shifted.

## Quality grade (per reviewing-project-quality rubric)

| Category | Baseline | This audit | Evidence |
|---|---|---|---|
| Test coverage | 18/20 | **17/20** | 2,125 unit + 160 e2e + 17+ audit invariants; +CL1 + OF-3 are class-of-issue defenses. **−1** vs. baseline: 19 bare `{ timeout: N }` across 12 specs + 0 specs adopt `expect.poll(count)` are net new latent flakes the baseline didn't surface. |
| Design system | 18/20 | **19/20** | Chrome/epistemic split (PR #168) now in production for 14 days; PR #177 `_template/` skeleton is exemplary authoring affordance (TDD-floor + ADR-cited). **+1** vs. baseline: copy-template convention closes the "AI author has to remember the gate" gap. |
| Scientific correctness | 15/20 | **16/20** | 14 → 17+ named audit invariants (CL1 from PR #174; OF-3; misc). **+1** vs. baseline: each new invariant is class-of-issue defense, not instance fix. Still capped at 16: pilot count remains 1 (m2-l3); class-of-issue defenses are theoretically rich but chapter-scale validation is shallow. |
| Accessibility | 18/20 | **17/20** | axe-core mandatory at unit level (45/86 component test files); R10 landmark rules formalized. **−1** vs. baseline: e2e axe coverage is **22/35 smoke specs (63%)** — ADR 0004 claims "mandatory on every component PR" but the chapter-scale a11y story is patchy. |
| Architecture | 16/20 | **18/20** | PR-D1 packed-smoke is the strongest structural class-of-issue gate the project has shipped; ADR 0082 chapter-layout extraction is clean; CL1 invariant + `_template/` skeleton + Amendment 2 close the React #418 regression class. **+2** vs. baseline: this PR sequence is the textbook example of "structural fix over targeted patch." |

**Total: 87/100 → A−** (baseline 85 → +2)

The letter grade is unchanged but the underlying mix has improved:
two architectural advances pay for two new test-infra gaps the baseline
didn't surface. The PR #172–#177 sequence shipped exactly what it
intended (close the React #418 regression class), and the gaps this
audit surfaces — bare timeouts, expect.poll non-adoption, e2e axe
patchiness — were pre-existing, not introduced.

## Section 1 — Design quality

**LOC budget compliance (ADR 0061 Rule 3).** `pnpm lint:loc` runs in
CI's `lint` job and exits non-zero on non-exempt ERROR-tier breaches.
The grandfathered allowlist in [`scripts/loc-budget.ts`](../../scripts/loc-budget.ts)
acknowledges 8 over-budget files as accepted tech debt:

| File | LOC | Tier | Disposition |
|---|---|---|---|
| `packages/astro/.../pedagogy-audit/runner.test.ts` | 1,763 | TEST-ERROR | split planned (per-invariant suites) |
| `packages/astro/.../pedagogy-index/accumulator.test.ts` | 1,354 | TEST-ERROR | split planned (per-extractor suites) |
| `packages/astro/.../pedagogy-audit/invariants/biography.test.ts` | 928 | TEST-WARN | umbrella accepted |
| `packages/astro/.../pedagogy-index/accumulator.ts` | **907** | **SRC-ERROR** | grandfathered as "cohesive role-aggregation unit" (ADR 0038); **script comment is stale** ("between WARNING and ERROR" — file is now above ERROR) |
| `packages/core/src/schema/pedagogy-index.test.ts` | ~1,166 | TEST-ERROR | grandfathered (one-describe-per-entry shape) |
| `packages/astro/.../pedagogy-audit/invariants/multirep.test.ts` | 585 | TEST-WARN | umbrella accepted |
| `packages/astro/.../pedagogy-index/extractors/biography.test.ts` | 655 | TEST-WARN | grandfathered |
| `packages/components/.../BlackbodyExplorer.tsx` | 556 | SRC-WARN | grandfathered (interactive figure) |

**Design observations.**

- Package shape is healthy. `@sophie/cli` (1,189 LOC) and
  `@sophie/theme` (609 LOC) are tight; `@sophie/components` (337
  files, median 52 LOC) is the cleanest. `@sophie/astro` is the
  largest at 30,082 LOC, driven by the pedagogy-index + audit
  surface area — the test files dominate the LOC count, not the
  source.
- No cross-package DRY violations. `useHydrated` lives in one
  place (`@sophie/components/runtime`); the pedagogy store factory
  pattern is centralized; chrome state primitives don't duplicate
  across packages.
- Naming is consistent: `*-store.ts` for store modules;
  `ComponentName.{contract,schema,stories,test}.tsx` for component
  satellites. No drift found.
- `BlackbodyExplorer` (556 LOC) is the only **warn-tier source file**
  outside grandfathered territory. Two future callers
  (`SpectralLineExplorer`, `HRDiagramExplorer`) are visible on the
  roadmap; SoTA-over-simple says extract physics-utils now.
- One stale comment: [`scripts/loc-budget.ts:80`](../../scripts/loc-budget.ts)
  area says `accumulator.ts` sits "between WARNING (500) and ERROR
  (800)." File is 907 LOC, above ERROR. One-line fix; the
  grandfathering itself is still correct.

## Section 2 — Architecture quality

**ADR catalog health.** 82 ADR IDs (0001–0082 with 0050 a reserved
gap = 81 files). Drift survey:

| Tag | Count |
|---|---|
| ✓ in-sync | 45 |
| ⚠ minor drift | 2 (ADR 0038 evidence path; loc-budget.ts comment) |
| ✗ major drift | 0 |
| ◯ accepted-design (expected; not drift) | 35 |
| ⊘ future-package-split | 9 |

**Drift list (only ⚠ entries).**

- **ADR 0038 (pedagogy-index pattern)** — evidence block names
  `packages/astro/src/lib/pedagogy-index-extractor.ts` (single
  file); has been refactored into the
  `packages/astro/src/lib/pedagogy-index/` directory per ADR 0061
  Rule 1. One-line update to the evidence block.
- **`scripts/loc-budget.ts` comment** — stale claim about
  `accumulator.ts` LOC tier. One-line fix.

**Three latent ADRs needed.** Load-bearing decisions that PRs
#174–#177 made implicit but never explicit:

1. **CL1 audit invariant** (PR #174) — "store-backed inline-ref
   components must carry a `client:*` directive." Currently lives
   inside ADR 0038 Amendment 2 + the invariant's source comment;
   no standalone ADR.
2. **Packed-smoke CI gate** (PR #176, PR-D1) — tarball-pack consumer
   test as structural defense against workspace-resolution masking
   React #418 hydration mismatches. Strongest structural gate the
   project has; needs an ADR for the rationale.
3. **`_template/` skeleton convention** (PR #177) — `cp -r _template
   components/<Name>` is now the authoring affordance for new
   store-backed components. README is at
   [`packages/components/src/_template/README.md`](../../packages/components/src/_template/README.md);
   no ADR.

**39 shipped-but-unvalidated ADRs.** Lifecycle `shipped` + status
`unvalidated` in [`status/validation.md`](../../docs/website/status/validation.md).
The keystones (highest leverage to backfill evidence on): **0030
(AI author model), 0023 (vertical-slice), 0061 (AI-optimized
codebase)**. High-reuse second tier: 0019 (Radix), 0021 (Observable
Plot), 0026 (Tailwind v4).

**Package boundaries.** The framework-purity constraint on
`@sophie/components` is enforced by Biome `noRestrictedImports`
([`biome.json:96-121`](../../biome.json#L96-L121)) — any `astro:*` /
`@astrojs/*` / `astro/*` import fails the lint job. ADR 0001 is
structurally enforced, not just documented. Same pattern for ADR
0064 sub-folder boundaries inside `@sophie/core` (lines 48-94).

**Schema-as-source-of-truth (ADR 0003).** Zod schemas in
`@sophie/core/src/schema/` are the canonical contract. Downstream
packages use `z.infer<typeof Schema>` rather than parallel type
declarations. Spot-check: holds for `pedagogy-index.ts`,
`component-contract.ts`, `course-spec.ts`. No drift.

## Section 3 — Features / capabilities

**Reasoning OS coverage (ADR 0058).** 7 of 8 epistemic roles have
shipped component instances:

| Role | Component example | Status |
|---|---|---|
| Observable | `<Observable>` in equation biographies | ✓ shipped |
| Model | `<KeyEquation>` + biographies | ✓ shipped |
| Inference | OMI flow + `<Inference>` slot | ✓ shipped |
| Assumption | `<Assumption>` biography child | ✓ shipped |
| Approximation | `<BreaksWhen>` biography child | ✓ shipped |
| Uncertainty | A10 `<UncertaintyLens>` | ◯ accepted-design (not shipped) |
| Numerical | code cells + worked examples (ADR 0081) | ✓ shipped |
| Misconception | `<MisconceptionAlert>` + 12 interventions | ✓ shipped |

The one missing role (Uncertainty) is the only C-tier component
not yet implemented; A11 linked-representation primitive is its
architectural prerequisite. Both tracked in
[`docs/website/vision/reasoning-os/`](../../docs/website/vision/reasoning-os/index.md).

**Audit invariants per epistemic role.** 20 invariant files in
`packages/astro/src/lib/pedagogy-audit/invariants/`. Each file
houses one invariant family (e.g., `inline-refs.ts` houses CL1, D4,
E4, F1, F2, C1). The count of *named* invariants is ~25–30+; the
baseline's "14 invariants" was the 2026-04 count.

**Doc-vs-code drift.** Two minor items above. No major drift —
the `docs/website/reference/` corpus tracks `@sophie/components` /
`@sophie/astro` shape well. The validation dashboard
([`docs/website/status/validation.md`](../../docs/website/status/validation.md))
is regenerated on every build and was last updated 2026-05-25.

## Section 4 — SoTA reference points

Sophie's SoTA test/architecture pattern adoption, with file:line citations:

| Pattern | Adoption | Canonical example |
|---|---|---|
| `renderToString` SSR-snapshot tests | **6 files** ✓ | [`packages/components/src/_template/Template.test.tsx`](../../packages/components/src/_template/Template.test.tsx) |
| `useHydrated`-gate at top of render | **5 store-backed components** ✓ | [`packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx`](../../packages/components/src/components/GlossaryTerm/GlossaryTerm.tsx); pattern is ADR 0038 Amendment 2 |
| Condition-based waits (`aria-busy`, `data-state`) | **15+ specs** ⚠ partial | [`examples/smoke/e2e/learning-objectives.spec.ts:63`](../../examples/smoke/e2e/learning-objectives.spec.ts#L63) |
| `expect.poll(count).toBeGreaterThan(N)` | **0 specs** ✗ MISSING | Pattern invented for PR-D1 but not yet adopted anywhere |
| Bare `{ timeout: N }` (anti-SoTA) | **19 occurrences across 12 specs** ⚠ | latent flakes; replace with condition-based waits |
| Virtual modules for consumer→platform handoff | ✓ canonical | `figuresVirtualModule` + `pedagogyIndexVirtualModule` in `@sophie/astro` |
| Build-time audit invariants | ✓ canonical | 20 invariant files; CL1 is the prototype for client-directive class |
| `injectRoute` for platform-owned routes | ✓ canonical | ADR 0082 `ChapterLayout` + `reading.astro` route |
| `noRestrictedImports` for package boundaries | ✓ canonical | `biome.json` ADR 0001 + 0064 enforcement |
| Biome zero-warnings (exit code verified) | ✓ enforced | CI lint job; AGENTS.md doctrine |
| LOC budget (300/500/800 source; 500/800/1200 test) | ✓ enforced | `scripts/loc-budget.ts:exit(1)`; CI lint job |

**SoTA gaps surfaced this audit:**

1. `expect.poll(count).toBeGreaterThan(N)` adoption is 0 specs.
   The pattern exists in the documentation (AGENTS.md mentions it,
   PR-D1 invented it) but the e2e suite hasn't adopted it.
2. 19 bare `{ timeout: N }` in 12 specs is the largest latent-flake
   vector. Affected files: `deep-dive-callout`, `predict`,
   `equation-ref`, `figure-ref`, `proving-chapter`, `keyboard-focus`,
   `glossary-term-prose-integrity`, `self-assessment`, `key-equation`,
   `glossary-term`, `chapter-ref`, `textbook-layout`.
3. E2E axe-core coverage is 22/35 = 63%. ADR 0004 claims "mandatory
   on every component PR"; the chapter-scale a11y story is patchy.

## Section 5 — Cross-cutting health

**CI workflow.** 8 jobs total in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

| Job | Trigger | Defense class | Required |
|---|---|---|---|
| `lint` | push/PR | code quality + LOC budget + link integrity + page status | ✓ |
| `typecheck` | push/PR | type safety (tsc full workspace) | ✓ |
| `unit` | push/PR | audit invariants + SSR snapshots + store trees | ✓ |
| `build` | push/PR | production asset shape | ✓ |
| `e2e` | push/PR | smoke chapter feature matrix (35 specs) | ✓ |
| `storybook` | push/PR | component visual + interaction (39 stories) | ✓ |
| `vr` | push/PR | jest-image-snapshot regression per story | ✓ |
| **`packed-smoke`** | push/PR | **workspace-vs-packed regression class** (NEW; PR #176 / PR-D1) | ✓ |

Plus two ancillary workflows:
[`squash-merge-guard.yml`](../../.github/workflows/squash-merge-guard.yml)
(ADR 0055) and
[`vr-update.yml`](../../.github/workflows/vr-update.yml).

**Biome doctrine.** Linter is enabled with `"recommended": true` +
package-boundary overrides via `noRestrictedImports`. The
recommended rule set surfaces errors only (no warning-noise tier),
so the AGENTS.md "tail-only is insufficient" precaution is
addressed at the config layer — `pnpm exec biome check .` exits 0
only when clean.

**Docs-no-drift discipline.** The MyST docs site builds clean (0
⚠ warnings); the validation tracker regenerates on every build
(suppressed via `SOPHIE_DOCS_INCLUDE_VALIDATION=0`). Two minor
drift items above are the only finds.

**Memory hygiene.** 24 memory files at
`~/.claude/projects/-Users-anna-Teaching-sophie/memory/`. R6–R10
standing review rules are documented + applied. No memory cleanup
needed; the index in `MEMORY.md` is current.

## Section 6 — Prioritized backlog

22 items: 5 must-fix, 9 should-fix, 5 nice-to-have, 3 document-only.

| Priority | Category | Item | Effort | Risk | ADR refs |
|---|---|---|---|---|---|
| must-fix | cross-cutting | Replace 19 bare `{ timeout: N }` in 12 e2e specs with condition-based waits | M | low | AGENTS.md SoTA; ADR 0038 A2 |
| must-fix | cross-cutting | Adopt `expect.poll(count).toBeGreaterThan(N)` for parallel-hydration suites (0 → many) | M | low | AGENTS.md SoTA; PR-D1 |
| must-fix | architecture | Promote CL1 audit invariant to its own ADR | S | low | PR #174; ADR 0038 A2 |
| must-fix | architecture | Write ADR for packed-smoke CI gate | S | low | PR #176, PR-D1 |
| must-fix | architecture | Write ADR for `_template/` skeleton convention | S | low | PR #177 |
| should-fix | cross-cutting | Lift e2e axe-core coverage 63% → 100% via `expectChapterA11y(page)` helper | M | low | ADR 0004 |
| should-fix | architecture | Promote `lint:status` validation-block freshness from informational to fail-loud | S | low | ADR 0061; W4 |
| should-fix | architecture | Add CI gate for back-compat shim detection (`@deprecated` / `// SHIM` etc.) | S | med | AGENTS.md "pre-launch, no back-compat" |
| should-fix | architecture | Promote EqRef/glossary doc-drift extractors to a CI gate | M | low | EqRef 2026-05-18 incident |
| should-fix | design | Extract `BlackbodyExplorer` physics-utils → `_physics/` | S | low | ADR 0061 Rule 1 |
| should-fix | features | Split `pedagogy-audit/runner.test.ts` (1,763 LOC) into per-invariant suites | M | med | ADR 0061 grandfathered |
| should-fix | features | Split `pedagogy-index/accumulator.test.ts` (1,354 LOC) into per-extractor suites | M | med | ADR 0061 grandfathered |
| should-fix | architecture | Backfill validation evidence for keystone ADRs 0030, 0023, 0061 | M | low | ADRs 0030, 0023, 0061 |
| should-fix | cross-cutting | Codify SoTA test patterns under `examples/smoke/e2e/_patterns/` | S | low | AGENTS.md epistemic legibility |
| nice-to-have | architecture | Fix stale comment in `scripts/loc-budget.ts` re: `accumulator.ts` LOC tier | S | low | ADR 0061 |
| nice-to-have | architecture | Update ADR 0038 evidence path to `pedagogy-index/` directory | S | low | ADRs 0038, 0061 |
| nice-to-have | features | Refactor `BlackbodyExplorer` per extracted physics-utils | S | low | ADR 0061 |
| nice-to-have | cross-cutting | Audit unit-level axe coverage on `@sophie/components` (verify the asserted 100%) | S | low | ADR 0004 |
| nice-to-have | architecture | Backfill validation evidence for high-reuse ADRs 0019, 0021, 0026 | M | low | ADRs 0019, 0021, 0026 |
| document-only | architecture | Consolidate CL1 + packed-smoke + `_template/` ADRs under an "ADR 0038 family" cross-reference | S | low | ADR 0038 |
| document-only | design | Document `_template/` skeleton contract inside the new ADR | S | low | PR #177 |
| document-only | architecture | Note the corrected Agent-B claim on ADR 0061 Rule 3 enforcement in any future audit referencing it | S | low | ADR 0061 |

## Section 7 — Refactor-shape proposals

Five shape-level proposals. SoTA-over-simple invoked explicitly
where it overrides the "wait for 3rd caller" YAGNI rule.

### Refactor 1 — SoTA test-pattern backfill (cross-cutting)

Three-prong mechanical refactor + one helper extraction.

- Replace 19 bare `{ timeout: N }` calls (12 spec files) with
  condition-based waits using `aria-busy` / `data-state` attributes.
  Canonical: [`learning-objectives.spec.ts:63`](../../examples/smoke/e2e/learning-objectives.spec.ts#L63).
- Adopt `expect.poll(count).toBeGreaterThan(N)` in every
  parallel-hydration suite (0 today).
- Extract `expectChapterA11y(page)` helper; mandate use in all 36
  e2e specs (63% → 100% axe coverage).
- Codify all three patterns under `examples/smoke/e2e/_patterns/`
  with one README per pattern + a gold-example link.

**ADR refs.** ADR 0004 (axe-core mandatory); AGENTS.md W2 + the
"condition-based waiting over timeouts" SoTA principle.

**SoTA-over-simple?** Yes — extract the helper NOW even though the
existing 22 specs already do their own axe call. The inconsistency
is the cost; the helper is the invariant.

**Effort.** M. **Risk.** low (mechanical refactor; no production code touched).

**Sequencing.** Independent of the others; can land as one PR per
spec family. The helper extraction is a precondition for the
axe-coverage prong.

### Refactor 2 — Promote three latent decisions to ADRs (architecture)

Write three new ADRs as a single PR triplet cross-referenced under
the "ADR 0038 family":

- **CL1 audit invariant** — missing `client:*` on store-backed
- **Packed-smoke CI gate** — tarball-pack consumer test
- **`_template/` skeleton convention** — copy-template authoring affordance

Plus the two one-line evidence fixes (ADR 0038 path drift; stale
comment in `scripts/loc-budget.ts`).

**ADR refs.** ADR 0038 (parent); PRs #174, #176, #177.

**SoTA-over-simple?** No — pure documentation hygiene against the
existing SoTA. The decisions are already locked in code; the ADRs
just give the next AI author a citation chain.

**Effort.** S (each ADR is small; cross-ref work is the meta-decision).
**Risk.** low.

**Sequencing.** Precondition for Refactor 4 (CI gate hardening) —
the new ADRs are the citation targets for the new gates.

### Refactor 3 — Decompose `BlackbodyExplorer` + extract physics-utils (design)

Extract Planck function, Wien displacement, and color-temperature
mapping into `packages/components/src/_physics/` (new module).
`BlackbodyExplorer` becomes the presentation shell consuming the
new module. Two future callers visible on the roadmap
(`SpectralLineExplorer`, `HRDiagramExplorer`).

**ADR refs.** ADR 0061 Rule 1 (LOC budget); ADR 0038 (component template).

**SoTA-over-simple?** Yes — extract NOW with 1 caller because (a)
the file is warn-tier, (b) two future callers are visible, (c) the
physics math has independent test value.

**Effort.** S. **Risk.** low (component is well-tested; the math is pure).

**Sequencing.** Independent; can land any time after Refactor 2's
`_template/` ADR (constrains where shared modules live).

### Refactor 4 — Promote structural gates from advisory to enforced (architecture)

Three new CI gates (or sub-gates of the existing `lint` job):

- ADR validation-block freshness — promote `lint:status` from
  informational (validation-block-without-status currently
  informational per [`ci.yml:54-55`](../../.github/workflows/ci.yml#L54-L55))
  to fail-loud.
- Back-compat shim detection — grep for `@deprecated`, `// COMPAT`,
  `// SHIM` and fail on any hit (zero-shim pre-launch invariant).
- Documentation drift — promote EqRef/glossary extractors to a CI gate.

**ADR refs.** ADR 0061 (LOC budget enforcement pattern as
precedent); AGENTS.md W4; "epistemic legibility is first-class."

**SoTA-over-simple?** Yes — three gates at once, all sharing the
"advisory → enforced" lift pattern. Serial would triple the CI churn.

**Effort.** S+S+M. **Risk.** med on back-compat (need grep audit
precondition to confirm zero existing shims).

**Sequencing.** Depends on Refactor 2 (the new ADRs are citation
targets). Independent of Refactors 1 + 3.

### Refactor 5 — Split the two grandfathered test megafiles (features)

Two parallel splits using the per-entry / per-invariant shape
already proven in `pedagogy-index.test.ts`:

- `pedagogy-audit/runner.test.ts` (1,763 LOC) → one suite per
  invariant under `pedagogy-audit/invariants/*.test.ts`
- `pedagogy-index/accumulator.test.ts` (1,354 LOC) → one suite per
  extractor under `pedagogy-index/extractors/*.test.ts`

Remove both from the `GRANDFATHERED` allowlist post-split.

**ADR refs.** ADR 0061; existing `biography.test.ts` umbrella shape
as precedent.

**SoTA-over-simple?** No — paying down acknowledged tech debt to
the existing SoTA shape.

**Effort.** M each. **Risk.** med (test-only churn but large
surface; mitigated by running old + new tests in parallel for one PR).

**Sequencing.** Independent of all others. Lowest-priority refactor
— the grandfathering already de-risks the LOC budget.

## Section 8 — Top-3 executive takeaways

1. **Worst gap.** 19 bare `{ timeout: N }` calls across 12 e2e
   specs + zero `expect.poll(count)` adoption are the largest
   latent-flake vectors and directly contradict AGENTS.md's
   condition-based-waiting SoTA principle. The hydration regression
   class was just closed; the timing regression class is wide open.

2. **Cheapest high-value fix.** Three small ADRs (CL1, packed-smoke,
   `_template/`) + two one-line evidence-block fixes close the
   entire ADR-drift surface and give the next AI author a citation
   chain for the three load-bearing decisions PRs #174–#177
   established. Effort: ~half-day total.

3. **Most important refactor for the next sprint.** **Refactor 1
   (SoTA test-pattern backfill).** Pays down the worst gap, lifts
   e2e axe coverage to 100%, and codifies the canonical patterns
   under `examples/smoke/e2e/_patterns/` so the SoTA stops being
   tribal knowledge.

## Recommended next steps

In order, with HITL gate at each per-item approval:

1. **Refactor 2 first** (three small ADRs + two fixes). Lowest risk,
   highest hygiene value, unblocks Refactor 4.
2. **Refactor 1 in parallel.** Mechanical; no architectural decisions.
3. **Refactor 3 standalone.** Small, sets physics-utils precedent for
   future spectral demos.
4. **Refactor 4 after #2.** CI gate hardening once new ADRs are in.
5. **Refactor 5 last.** Pure tech-debt pay-down; lowest urgency.

After all five land, the platform is positioned for the next sprint
surface: Course Spec consumption (ADR 0080), Reasoning OS A8
`<OMIFlow>` C-tier ship, and the ASTR 201 migration capstone (per
ADR 0064's structural-density-rotation rule, next pilot must differ
from m2-l3).

## Files referenced in this audit

| File | Purpose |
|---|---|
| `/Users/anna/Teaching/sophie/AGENTS.md` | HITL mandate, W1–W4, SoTA principles, R6–R10 |
| `docs/website/decisions/0001-*.md` … `0082-*.md` | 81 ADRs, 0050 reserved gap |
| `docs/website/status/validation.md` | validation dashboard, last regenerated 2026-05-25 |
| `docs/website/vision/reasoning-os/index.md` | Reasoning OS thesis |
| `docs/website/strategy/positioning.md` | platform positioning |
| `docs/reviews/2026-05-25-state-of-sophie.md` | baseline audit (commit 5c55f5c) |
| `packages/components/src/_template/README.md` | PR #177 skeleton convention |
| `.github/workflows/ci.yml` | 8-job CI workflow |
| `scripts/loc-budget.ts` | LOC budget enforcement (exit 1 on non-exempt ERROR) |
| `biome.json` | package-boundary enforcement via `noRestrictedImports` |
