# Project Review: Post-PR-A codebase audit (ADR 0060 registry ecosystem)

**Date:** 2026-05-18
**Scope:** State of `main` after PR-A (the ADR 0060 registry-ecosystem
build for equations) merged. Identifies fixes + refactor candidates
*beyond* the already-locked Session-7 backlog (B1 NR4, B2
Stefan-Boltzmann, B3 chapter-components doc, C1 extractor split, C2
audit split).
**Commits:** `2a89ab1` (PR #101, squash-merge of 15 branch commits;
+4,136 / -2,152 across 114 files)
**Status:** PR-A green and merged. Local gates clean post-merge. Two
classes of debt surfaced that the locked plan does not cover: (a)
post-rename documentation drift in `docs/website/`, (b) the
validation-* lib cluster has the same "single-orchestrator that grew
by accretion" shape as the C1/C2 targets and would benefit from the
same grouping treatment.

---

## Section 1: What Changed (PR-A recap)

Nine batches across `@sophie/core`, `@sophie/components`,
`@sophie/astro`, smoke target, and docs:

| Batch | Commit | Scope |
|---|---|---|
| 1+2  | `37ae209` | `registry-base` + `equation-registry` Zod schemas + `<DerivationStep>` Tier-3 biography child |
| 0    | `22dbc38` | Strict registry-base validation + stale fixture sweep |
| 3    | `896342f` | Registry-shaped `EquationEntry` + `EquationCitationEntry` + Astro `equations` content collection |
| 4    | `f18df5f` | Extractor split for registry MDX support + `IndexAccumulator` rework + audit migration |
| 4b   | `ae035eb` | Test fixture cascade + walker / accumulator unit tests |
| 5a   | `3378ecc` | `<EqRef>` → `<EquationRef>` hard rename (`slug` → `refId`); EqRef directory deleted |
| 5b   | `3081c61` | `<KeyEquation>` refactor to `refId`-only authoring; citation-driven aggregators |
| 6    | `dcc7607` | Three equation biographies migrated to registry MDX; R1–R4 audit invariants |
| 7    | `f9a6e17` | Smoke build closes + e2e migration + registry frontmatter loaded from disk + `equation-registry-schema.md` reference doc |

**Plus the in-PR cleanup commits**:
- `caf6a09` — VR baseline regen (24 new baselines)
- `efe26bd` — Drop 16 orphaned `<EqRef>` + old `<KeyEquation>` baselines (post-rename cleanup)
- `f225086` — TextbookLayout eager-render equations collection (dev-mode R1 fix)
- `ed36ac6` — MyST TOC: add ADR 0060 + equation-registry-schema (I5 fix)
- `6298668` — Proving-chapter e2e count 53 → 36 (post-rewrite)

**New components / features**

| Component / module | Role |
|---|---|
| `<DerivationStep>` | Tier-3 biography child (epistemicRole `"model"`); collapsed-by-default derivation rows |
| `<EquationRef refId>` | Inline citation; replaces `<EqRef slug>` |
| `<KeyEquation refId>` | Block-level registry citation; chapter-side authoring shape |
| `registry-base` schema | Shared Zod base for *all* future registries (figures, misconceptions, etc.) |
| `equation-registry` schema | Equation-specific registry frontmatter shape |
| `equations` content collection | New Astro content collection at `examples/smoke/src/content/equations/` |
| R1–R4 audit invariants | Cross-reference integrity (decl/citation mismatch, duplication, orphan related-refs) |
| `equation-registry-schema.md` | Authoring reference doc (in MyST TOC) |

**Code removed**

- `<EqRef>` directory deleted entirely (rename, not deprecation)
- 16 orphaned baseline PNGs (jest-image-snapshot doesn't clean up on rename)
- `<KeyEquation>` legacy `id title symbols={[...]}` chapter-inline shape — gone
- Per-equation `<Units>` biography children in the migrated equations — handled by notation registry §R10

---

## Section 2: Test Metrics

### Current counts table

| Layer | Test files | Tests | Source LOC (non-test) |
|-------|-----------:|------:|----------------------:|
| `@sophie/core` (schemas) | 14 | 290 | ~1,800 |
| `@sophie/components` (React + axe) | 67 | 548 | ~6,000 |
| `@sophie/astro` (extractor/audit/integration) | 41 | 678 (+1 docs-build-gated) | ~5,930 in lib |
| **Subtotal: unit + integration** | **122** | **1,516+1** | — |
| `examples/smoke` Playwright e2e | (not enumerated here) | — | — |
| Storybook visual regression | (CI-baseline) | — | — |

**Note**: the +1 docs-build-gated test is the I5 dashboard-href
resolver. It requires `npx mystmd build --html` to have run before
vitest; CI's `unit` job orchestrates this via turbo. Locally it
fails unless the docs are built first. **Not a regression** — this
gate has existed since ADR 0056 PR 5.

### Largest source modules (top 15)

| File | LOC | Status |
|---|---:|---|
| `packages/astro/src/lib/pedagogy-index-extractor.ts` | **2,454** | **C1 split target (locked)** |
| `packages/astro/src/lib/pedagogy-audit.ts` | **1,478** | **C2 split target (locked)** |
| `packages/core/src/schema/pedagogy-index.ts` | 420 | C4 investigate; recommendation below: do NOT split |
| `packages/theme/scripts/generate-css.ts` | 334 | Build-time script, out of scope |
| `packages/astro/src/lib/validation-index-generator.ts` | 320 | **C5 candidate (new, see backlog)** |
| `packages/components/src/index.ts` | 293 | Barrel (74 export statements) — healthy |
| `packages/theme/src/anchors.ts` | 289 | Token anchors — out of scope |
| `packages/astro/src/lib/validation-admonition-plugin.ts` | 282 | **C5 candidate** |
| `packages/astro/src/lib/aside-positioning.ts` | 259 | C7 candidate (borderline; see backlog) |
| `packages/components/src/runtime/useInteractive.ts` | 238 | Runtime helper — out of scope |
| `packages/components/src/intervention/intervention-index.ts` | 202 | Index module — fine |
| `packages/astro/src/lib/validation-extractor.ts` | 183 | **C5 candidate** |
| `packages/astro/src/lib/pagefind-postbuild.ts` | 167 | Build-time hook — out of scope |
| `packages/components/.storybook/test-runner.ts` | 164 | Storybook plumbing |
| `packages/astro/src/preferences/define.ts` | 163 | Preference factory (ADR 0036) |

### Largest test files (top 10)

| File | LOC | Notes |
|---|---:|---|
| `packages/astro/src/lib/pedagogy-index-extractor.test.ts` | 2,540 | **C3 split (locked)** |
| `packages/astro/src/lib/pedagogy-audit.test.ts` | 1,685 | **C3 split (locked)** |
| `packages/astro/src/lib/pedagogy-audit.biography.test.ts` | 933 | Already partitioned (pre-existing) |
| `packages/core/src/schema/pedagogy-index.test.ts` | 910 | Mirrors schema source — fine |
| `packages/astro/src/lib/transform-equation-biography.test.ts` | 646 | Folds into C3 (biography-walker test) |
| `packages/astro/src/lib/pedagogy-audit.multirep.test.ts` | 600 | Already partitioned |
| `packages/astro/src/lib/validation-admonition-plugin.test.ts` | 448 | Co-locates if C5 moves cluster |
| `packages/core/src/schema/equation-biography.test.ts` | 427 | Schema test — fine |
| `packages/astro/src/lib/transform-intervention.test.ts` | 421 | Folds into C3 |
| `packages/astro/src/lib/transform-multirep.test.ts` | 388 | Folds into C3 |

### Quality metrics

- **Biome**: 0 errors / 0 warnings / 0 info across 517 files. ✅
- **Typecheck**: 11/11 packages, FULL TURBO cached.
- **TODOs/FIXMEs**: 6 across all source code (1 actionable in `pedagogy-audit.ts:386` — see backlog).
- **Console.warn / console.error in production code**: ~12, all intentional dev-mode authoring-drift signals (per the dev-warn-then-audit-elevation pattern). Each has its corresponding audit invariant. Healthy.
- **Cruft**: 0 (.DS_Store, .swp, .bak — none).
- **A11y**: every cross-ref component pair (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`) carries an axe-core test in storybook; PR-A added one for `<EquationRef>` + retained the existing pattern for `<KeyEquation>`. 0 violations.
- **Storybook test-runner + Playwright VR**: ADR 0057 self-hosted; PR-A regenerated baselines via the `vr-update.yml` workflow successfully.

---

## Section 3: Quality Grade

### Score table

| Category | Score | Notes |
|----------|------:|-------|
| Test coverage | 19/20 | 1,516 unit tests across schema/component/integration layers. Storybook VR + e2e add real-browser coverage. -1: e2e count assertions still hardcode structural shape (proving-chapter `[role='note']`) — fragile under registry-style refactors. |
| Architecture cleanliness | 17/20 | Single-responsibility holds *almost* everywhere: 11/13 lib files under 300 LOC. -3: the two locked C1/C2 targets are 2,454 + 1,478 LOC. The validation-* cluster (4 files, 835 LOC) is also under-organized — same accretion pattern as the locked targets. |
| Documentation health | 16/20 | ADR coverage is comprehensive (0001–0060 all present, with frontmatter validation per ADR 0056). -4: post-rename doc drift — 12 references to `<EqRef>` or pre-rename `<KeyEquation id title>` shape across vision, explanation, decisions, overview docs. The B3 entry covers ONE (chapter-components.md). |
| Accessibility | 19/20 | axe-core mandatory per ADR 0004; all components green. Radix primitives (ADR 0019). -1: keyboard-nav coverage on the new `<KeyEquation>` popover is implicit via Radix Collapsible; explicit Playwright keyboard-nav test absent. |
| Code quality | 19/20 | 0 biome warnings, 0 dead code, 6 well-documented TODOs. -1: 1 actionable stale TODO (M3 deferral pre-dates PR-C4 shipping — needs decision). |

**Total: 90/100 — A**

### What earns the grade

- **Massive test coverage discipline.** 1,516 unit + integration tests, growing in lockstep with the source (PR-A added +75 tests net while net-adding +2k LOC). Storybook VR baselines auto-regenerate via the `vr-update.yml` workflow. Three component types (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`) follow a parallel test contract — copy-paste-like cohesion makes new components mechanical to add tests for.
- **ADR-driven discipline holds under pressure.** PR-A's nine batches each cited the ADR they implement; the merge commit cites ADR 0060 as primary + 0046/0055/0057/0058 as supporting. The session-6 audit decisions (e.g., NR4-as-Bucket-B because §R10 obsoletes its logic) were traced back to specific ADR clauses, not opinion.
- **Hard-rename + atomic migration delivered cleanly in code.** Batch 5a deleted `<EqRef>` and migrated every callsite in the same commit. The orphan-baseline cleanup (Session 7) finished the contract: 16 stale PNGs deleted alongside the rename.
- **Dev/prod parity engineered, not assumed.** The TextbookLayout eager-render fix is the right SoTA shape: mirror chapters' pattern for equations, document the pattern as recurring (figures/misconceptions next), comment the architectural reason. Saved a deferred "this only manifests under `sophie start`" bug from sitting in `main` for weeks.

### What keeps it from higher

- **Documentation drift is the largest source of points lost.** 12 doc files still describe `<EqRef slug>` (the pre-rename shape) or `<KeyEquation id title>` (the pre-ADR-0060 inline shape). The hard-rename was atomic in code; in docs, it shipped piecemeal across multiple PRs and accumulated. ADR 0045 even uses `<EqRef slug="drake-equation">` in its examples (lines 61, 182, 243, 249) — the ADR's own diff-CI examples should match the renamed shape.
- **The two locked refactor targets (C1/C2) are real but not unique.** The validation-* cluster — `validation-extractor.ts` (183) + `validation-index-generator.ts` (320) + `validation-admonition-plugin.ts` (282) + `validation-index-writer.ts` (50) — totals 835 LOC across 4 alphabetized-flat-in-lib files with a single caller (`TextbookLayout.astro:22`). Same SoTA-grouping-treatment win the C1/C2 plan describes.
- **Hardcoded structural counts in e2e tests are brittle.** `proving-chapter.spec.ts:37` needed updating from 53 → 36 because `<KeyEquation refId>` lazy-renders its biography children in a Radix Collapsible popover. Future registry-shape refactors will face the same churn unless we move to function-of-content assertions ("every Observable child in the resolved biography appears in the popover graph"). Not a 1-PR fix; an architectural shift.

---

## Section 4: Backlog (priority-ordered, **beyond** locked B1/B2/B3/C1/C2/C3)

### Priority 1: Doc-drift sweep (catchable before B/C)

The hard-rename `<EqRef>` → `<EquationRef>` and the ADR-0060 `<KeyEquation>` shape change are atomic in code but not in docs. Twelve doc references still use the pre-rename shapes:

| File | Line(s) | Current shape | Should be |
|---|---|---|---|
| `docs/website/overview.md` | 437 | `<EqRef>` in list | `<EquationRef>` |
| `docs/website/explanation/scientific-reasoning-os.md` | 106, 148, 165, 179 | `<EqRef>`, `<KeyEquation id title>` example | `<EquationRef>`, `<KeyEquation refId>` |
| `docs/website/explanation/why-not-myst-for-sophie.md` | 122 | `<EqRef>` | `<EquationRef>` |
| `docs/website/explanation/textbook-use-cases.md` | 128 | `<EqRef>` | `<EquationRef>` |
| `docs/website/vision/design/theme-token-audit.md` | 58 | EqRef in token table | EquationRef |
| `docs/website/explanation/audit-and-ai-authoring.md` | 76 | `<EqRef>` | `<EquationRef>` |
| `docs/website/vision/design/registry-ecosystem.md` | 120 | `<EqRef>` (the *registry ecosystem* vision page!) | `<EquationRef>` |
| `docs/website/vision/features/accepted.md` | 227 | `<EqRef>` hover-summary | `<EquationRef>` |
| `docs/website/decisions/0045-pedagogical-diff-curriculum-ci.md` | 61, 182, 243, 249 | `<EqRef slug="drake-equation">` (ADR examples!) | `<EquationRef refId="drake-equation">` |
| `packages/core/src/schema/pedagogy-index.ts` | 279, 300 | Schema docstring | `<EquationRef>` |
| `packages/components/src/components/CommonMisuse/CommonMisuse.schema.ts` | 21-30 | Authoring example | `<KeyEquation refId="wiens-law">` |

**Effort**: ~30–45 min (mechanical sed-driven, but each callsite needs human-verified to confirm the surrounding sentence still parses).

**Why P1 not deferred**: ADR 0045 and the registry-ecosystem vision page are *load-bearing strategy docs*; landing Bucket B/C with these stale undermines the ADR-driven discipline that earns this codebase its grade. Cheap win; do it first.

### Priority 2: Validation cluster grouping (C5; mirrors C1/C2 shape)

**New refactor candidate to add to the Bucket-C arc**, structurally identical to C1/C2 but smaller and more contained:

```
packages/astro/src/lib/validation/
├── index.ts                    (barrel)
├── extractor.ts                (from validation-extractor.ts; 183 LOC)
├── index-generator.ts          (from validation-index-generator.ts; 320 LOC)
├── admonition-plugin.ts        (from validation-admonition-plugin.ts; 282 LOC)
├── index-writer.ts             (from validation-index-writer.ts; 50 LOC)
└── (test files co-locate)
```

**Why this fits the C-arc**:

- Same shape: 4 flat files in `lib/` that form a single subsystem.
- Single caller (`TextbookLayout.astro:22` imports `extractContractValidations`), so renames are safe.
- Total LOC moved: ~835. Tests co-locate (the existing `.test.ts` files: 448 + 290 + 67 + 50 → mirrors structure).
- ADR 0056 already names this subsystem ("validation tracker") — the grouping makes the ADR's vocabulary more navigable.
- Doesn't depend on C1/C2 landing; can execute in parallel or before.

**Effort**: ~1–1.5 hours (smaller blast radius than C1/C2). 

### Priority 3: Stale TODO + post-PR-C4 hygiene

| Item | Where | Decision needed |
|---|---|---|
| **M3 misconception-orphan invariant** | `packages/astro/src/lib/pedagogy-audit.ts:386` | TODO says "PR-C4 follow-up" — PR-C4 shipped in Session 4. Either implement M3 (add a `<MisconceptionRef>` component + invariant) or move the deferral to an ADR amendment / GitHub issue and remove the TODO. **Recommend: issue + remove TODO** (since `<MisconceptionRef>` is a v2 feature, not v1). |
| **Add `vision/design/registry-ecosystem.md` to MyST TOC** | `docs/website/myst.yml` | The companion vision page is missing (only the ADR is in TOC). MyST file-name collision (both → `/registry-ecosystem/`) is a *real* risk; needs path-disambiguation via `short_title` or a wrapper redirect. **Investigate before adding.** |
| **Document the eager-render pattern** | New ADR section or comment | The TextbookLayout `Promise.all(equationEntries.map((e) => render(e)))` pattern (PR-A Session-7 fix) will recur for figures, misconceptions, etc. Document it: either as a comment-block at line 86-96 of TextbookLayout pointing to a new how-to, or as a §"Registry collection loading" addition to ADR 0060. **Recommend ADR 0060 amendment.** |

**Effort**: ~30 min for the TODO move + ADR amendment, plus investigation time for the vision-page TOC.

### Priority 4: Aside-positioning + transform-* test co-location (C6, C7)

Lower priority because:

- **C6 — transform-* tests** (`transform-equation-biography.test.ts` 646 LOC, `transform-intervention.test.ts` 421, `transform-multirep.test.ts` 388) currently test functions that aren't *publicly* exported from `pedagogy-index-extractor.ts` — they get there via test-local shims (Batch 4b). After C1 splits the extractor into `pedagogy-index/transforms/*.ts`, the test files can co-locate as `pedagogy-index/transforms/*.test.ts`. **Wait for C1 to land**, then mechanical.
- **C7 — Aside positioning** (`aside-positioning.ts` 259 LOC) does pure-computation + DOM lifecycle + view-mode subscription. Splitting `compute-aside-placements.ts` (pure, deterministic, easy to unit-test) from `install-aside-positioning.ts` (DOM mutation, lifecycle) would clarify the seam. Borderline — only worth doing if Bucket C is already lifting under inspection. **Defer** until the C-arc has surfaced more lifecycle-side-effect modules that would benefit from the same split.

### Priority 5: e2e assertion philosophy (architectural; long-term)

Hardcoded structural counts in `proving-chapter.spec.ts` had to be updated 53 → 36 for PR-A. They'll need updating again the next time `<KeyEquation>` or any registry component's render shape evolves. The structural-shape-encoding-in-tests pattern is a long-term liability. Two SoTA shapes to consider:

1. **Function-of-content assertions**: "every Observable in the resolved biography appears as an aside somewhere in the popover graph" — driven by `indexAccumulator.asPedagogyIndex()`. The test passes the index in, asserts every entry has a rendered correspondence. Survives shape refactors.
2. **Component-level (Storybook + VR) coverage extension**: pull what's currently asserted in e2e into per-component VR stories (the asides ALREADY do this). The chapter-level e2e then asserts higher-order invariants (e.g., "this chapter renders without crashing, contains all expected anchors, axe-clean").

**Effort**: A real architectural shift; deferred until at least one more rename-class refactor reveals the same fragility.

### Priority 6: Per-file LOC budget (P5; future maturity)

Once C1+C2+C5 land, no source file in `@sophie/astro/src/lib/` will be over ~400 LOC. Worth adding a **soft LOC budget** as a Biome custom rule or a CI gate: any source file growing past 600 LOC triggers a warning suggesting a split. Catches the "single orchestrator grows by accretion" failure mode before it reaches the 2,000+ LOC threshold C1/C2 are addressing.

---

## Section 5: Files (PR-A delta + this audit)

PR-A squash-merge `2a89ab1`: **114 files changed, +4,136 / -2,152**.

By package:

| Package | Files touched | Net LOC |
|---|---:|---:|
| `@sophie/core` (new registry schemas) | ~12 | net add |
| `@sophie/components` (KeyEquation rewrite, EquationRef rename, DerivationStep new) | ~30 | net add minus EqRef directory delete |
| `@sophie/astro` (extractor + audit + integration) | ~25 | net add (extractor +500, audit +200, registry frontmatter loader new) |
| `examples/smoke` (registry MDX + e2e + spoiler-alerts spec) | ~15 | net add |
| `docs/website` (reference doc + validation.md + myst.yml + ADR 0060 wiring) | ~10 | net add |
| Snapshot images (VR regen + orphan cleanup) | ~40 | +24 / −16 |

This audit:

| File | Action | Lines |
|---|---|---:|
| `docs/reviews/2026-05-18-post-pr-a-codebase-audit.md` | Created | (this file) |
| `docs/reviews/README.md` | Update needed | +1 row |

---

## Sequencing recommendation

If executing the backlog in a single Session-7-or-8 arc, the
priorities map cleanly onto bucket structure:

```
Bucket B (locked):
├── B1 — NR4 invariant per ADR 0046 §R10
├── B2 — Stefan-Boltzmann registry entry
├── B3 — chapter-components.md update
└── B4 (NEW — P1) — Doc-drift sweep (12 files; ~45 min)

Bucket C (locked + expanded):
├── C1 — Split pedagogy-index-extractor.ts (2,454 LOC)
├── C2 — Split pedagogy-audit.ts (1,478 LOC)
├── C3 — Test-file restructuring (post-C1/C2)
├── C4 — schema/pedagogy-index.ts: DO NOT SPLIT (recommend skip)
├── C5 (NEW — P2) — Validation cluster grouping (~835 LOC; ~1.5h)
├── C6 (NEW — P4) — transform-* test co-location (post-C1)
└── C7 (NEW — P4, optional) — Aside positioning seam split

Bucket D (NEW — P3, before/after B+C):
├── D1 — M3 TODO: move to issue, remove from code
├── D2 — Vision-page registry-ecosystem TOC (with collision investigation)
└── D3 — Document eager-render pattern (ADR 0060 amendment)
```

Bucket B4 (doc-drift sweep) is the **highest-leverage immediate
follow-up** — it's mechanical, it's directly downstream of PR-A's
atomic rename, and leaving it undone undermines the ADR-driven
discipline that the rest of the codebase is built on.
