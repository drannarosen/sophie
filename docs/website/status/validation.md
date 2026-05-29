---
title: Validation status
short_title: Validation
description: Build-generated dashboard of every ADR + reference doc's validation status (ADR 0056).
tags: [private]
---

<!-- GENERATED FILE — DO NOT EDIT BY HAND.
     Produced by @sophie/astro's pagefind-postbuild hook
     (packages/astro/src/lib/validation/index-generator.ts).
     Re-run `pnpm tsx scripts/regenerate-validation-index.mts` from the
     repo root to regenerate. Suppressed when SOPHIE_DOCS_INCLUDE_VALIDATION=0.
     (The smoke build's cwd has no docs/website/, so its pagefind-postbuild
     pass is a no-op; the explicit script is the canonical regeneration path.) -->

# Validation status

Snapshot of every ADR and reference doc's `validation:` frontmatter
block (ADR 0056) and page-level `status:` field (ADR 0062). Regenerated
on every build; suppressed when `SOPHIE_DOCS_INCLUDE_VALIDATION=0`.

## Status summary

| Status | Count |
|---|---|
| Validated | 36 |
| In progress | 21 |
| Unvalidated | 61 |
| Re-validation needed | 0 |
| Missing block | 0 |
| Total | 118 |

## Lifecycle summary

| Lifecycle | Count |
|---|---|
| Shipped | 69 |
| Accepted design | 39 |
| Mixed | 1 |
| Future package split | 9 |
| No status | 0 |
| Total | 118 |

## Evidence kinds

| Kind | Count |
|---|---|
| test | 124 |
| chapter | 9 |
| review | 31 |
| deployment | 76 |
| audit | 9 |
| manual | 40 |

## Extractor findings

_No extractor findings (V0 + V8) surfaced during this build._

## Contracts

### ADRs

| Contract | Status | Lifecycle | Last validated | Evidence | Notes |
|---|---|---|---|---|---|
| [docs/website/decisions/0001-platform-not-monorepo.md](/platform-not-monorepo/) | validated | shipped | 2026-05-16 | manual, review | Repo-shape contract is structurally enforced: any course importing `@sophie/*` is by definition a separate consumer. The smoke example exercises that consumer relationship in-repo. |
| [docs/website/decisions/0002-renderer-astro-mdx.md](/renderer-astro-mdx/) | validated | shipped | 2026-05-16 | chapter, review, test | Astro 6 + MDX confirmed across the bucket B+C smoke build; the renderer-choice contract held under the smoke chapters and the components matrix. |
| [docs/website/decisions/0003-zod-as-source-of-truth.md](/zod-as-source-of-truth/) | validated | shipped | 2026-05-16 | review, test | Every load-bearing data shape in `@sophie/core` is a Zod schema; downstream packages type-infer via z.infer. No drift detected in the audit. |
| [docs/website/decisions/0004-component-contract-revisions.md](/component-contract-revisions/) | validated | shipped | 2026-05-28 | chapter, review, test | Component contract (serialize separate from render, axe-core mandatory, useInteractive for persistence, composition rules) confirmed across every shipped component as of the bucket B+C audit. R-0090 (2026-05-28): math-bearing components consume prerendered html for build-time-knowable math; runtime KaTeX reserved for the runtime tail. |
| [docs/website/decisions/0005-theming-three-layers.md](/theming-three-layers/) | validated | shipped | 2026-05-25 | deployment, manual, test | The three-layer model is in active force across the codebase. Layer 1 (`packages/theme/src/tokens.ts`) is the single TS source; Layer 2 is emitted at build time by the `generate-css.ts` + `generate-tailwind.ts` scripts; Layer 3 is realized in the 45 `*.module.css` files under `@sophie/components`. ADR 0026 amends Layer 2's delivery mechanism (CSS-first `@theme` rather than JS preset) without changing the three-layer concept.  |
| [docs/website/decisions/0006-slides-revealjs.md](/slides-revealjs/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0007-persistence-indexeddb.md](/persistence-indexeddb/) | validated | shipped | 2026-05-22 | chapter, deployment, review, test | Build-time + smoke-environment validation complete; multi-cohort outcomes deferred to ASTR 201 fa26. |
| [docs/website/decisions/0008-cosmic-playground-protocol.md](/cosmic-playground-protocol/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0009-i18n-deferred.md](/i18n-deferred/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0010-myst-for-design-docs.md](/myst-for-design-docs/) | validated | shipped | 2026-05-25 | audit, deployment, manual | The MyST docs site is the substrate for every design doc in Sophie — ADRs, reference docs, plans, reviews, vision essays — and the validation-tracker audit pipeline reads its frontmatter directly. The "indefinitely deferred" migration to Sophie-self-hosted docs (per ADR 0023 vertical-slice-first) remains deferred; MyST is the operating reality.  |
| [docs/website/decisions/0011-pnpm-package-manager.md](/pnpm-package-manager/) | validated | shipped | 2026-05-16 | manual, review | pnpm is the only sanctioned JS package manager (per CLAUDE.md); enforcement is by convention + CI lockfile-frozen install. |
| [docs/website/decisions/0012-uv-python-tooling.md](/uv-python-tooling/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0013-biome-lint-format.md](/biome-lint-format/) | validated | shipped | 2026-05-16 | manual, review | Biome replaces ESLint + Prettier; 0-error/0-warning discipline enforced per PR (CLAUDE.md conventions). |
| [docs/website/decisions/0014-turborepo-monorepo-orchestration.md](/turborepo-monorepo-orchestration/) | validated | shipped | 2026-05-16 | manual, review | Turborepo orchestrates 5+ packages cleanly. Open follow-up (PR #50 review I1) tracks docs/website/ workspace-promotion + turbo dependsOn for the validation-admonition plugin's dist/ import. |
| [docs/website/decisions/0015-dev-preview-workflow.md](/dev-preview-workflow/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0016-react-flow-for-concept-maps.md](/react-flow-for-concept-maps/) | unvalidated | future package split | — | — |  |
| [docs/website/decisions/0017-rename-sophia-to-sophie.md](/rename-sophia-to-sophie/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0018-codemirror-6-for-codecell.md](/codemirror-6-for-codecell/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0019-radix-ui-primitives.md](/radix-ui-primitives/) | validated | shipped | 2026-05-28 | deployment, manual | Files across `@sophie/components` import from `@radix-ui/*` and five Radix subpackages ship as declared deps. The v1 primitives this ADR scoped (Slider, Collapsible, Tooltip, Dialog) are in active use, with `react-hover-card` substituting for `react-tooltip` for richer popover content. Phase-2 Dialog has landed via the search modal, consumer-facing. `@radix-ui/react-tabs` was removed when `<Tabs>` moved to a hand-rolled ARIA-tabs controller (Amendment 1 / ADR 0087).  |
| [docs/website/decisions/0020-shiki-syntax-highlighting.md](/shiki-syntax-highlighting/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0021-observable-plot-data-viz.md](/observable-plot-data-viz/) | validated | shipped | 2026-05-28 | deployment, test | Observable Plot is the data-viz substrate for `@sophie/components`. The BlackbodyExplorer figure is the canonical first consumer — it pairs Plot's grammar with a React-island parameter slider. Future v2 dashboards + `<CalibrationCurve>` (v3) inherit the same `@observablehq/plot` dep declaration without re-litigating the choice. Packaging amended 2026-05-28: Plot is bundled (devDependency) + isolated to the `@sophie/components/figures` subpath per ADR 0022 Amendment 1.  |
| [docs/website/decisions/0022-tsup-library-builds.md](/tsup-library-builds/) | validated | shipped | 2026-05-28 | deployment, test | All five published `@sophie/*` packages ship a `tsup.config.ts` and build via tsup. The bundler choice this ADR locks is uniform across the package graph; no package has migrated to webpack/rollup/Vite-library mode. The "~8 publishable packages" projection in the ADR Context now rolls up to 5 shipped packages — schema collapsed into `@sophie/core`; other planned packages remain pre-vertical-slice per ADR 0023.  |
| [docs/website/decisions/0023-vertical-slice-build-order.md](/vertical-slice-build-order/) | validated | shipped | 2026-05-25 | deployment, manual, review | The 2026-05-25 SoTA audit + companion state-of-platform review + the just-landed PR sequence #168-#177 collectively demonstrate the ADR is in active force. Each PR in the sequence extended Sophie's surface only after a concrete prior consumer surfaced the need — chrome after pedagogy; ChapterLayout extraction after smoke duplicated the route shape; the _template skeleton after the fifth store-backed component re-paid the gate-convention recall tax. AGENTS.md cites ADR 0023 as a routine-reasoning ADR that governs every PR scoping decision. No remaining lean-Phase-0 work pre-dates the refactor-outward step; no remaining package was speculatively pre-built under this ADR's authority.  |
| [docs/website/decisions/0024-license-agpl.md](/license-agpl/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0025-phase-0-actual-scope.md](/phase-0-actual-scope/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0026-tailwind-v4-css-first.md](/tailwind-v4-css-first/) | validated | shipped | 2026-05-25 | deployment, manual | Tailwind v4 with CSS-first `@theme` directive is in active force. The `generate-tailwind.ts` script emits a CSS file that opens with `@import "./theme.css";` then `@theme { ... }`. No `tailwind.config.{js,ts}` JS preset file exists in the repo, confirming the v3 escape hatch described in 'Alternatives considered' was rejected as designed. The three-layer model from ADR 0005 is preserved; this ADR refines Layer 2's delivery mechanism to CSS-first.  |
| [docs/website/decisions/0027-mdx-render-boundary-prop-threading.md](/mdx-render-boundary-prop-threading/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0028-storybook-setup.md](/storybook-setup/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0029-broadcast-channel-last-write-wins.md](/broadcast-channel-last-write-wins/) | validated | shipped | 2026-05-22 | review, test | ADR 0007 refinement; LWW timestamping confirmed via the useInteractive + useInteractiveRange test suites. 2026-05-22 Wedge B1 amendment: same-tab local fan-out added to unblock sibling-hook same-tab sync (senderId guard preserves the no-self-echo semantic). No cross-tab production cohort data yet (deferred to fa26). |
| [docs/website/decisions/0030-audience-and-ai-author-model.md](/audience-and-ai-author-model/) | validated | shipped | 2026-05-25 | audit, deployment, manual, review | The HITL mandate codified in AGENTS.md + the entire post-PR-#168 commit log (every commit AI-authored under Anna's review) + the just-landed family of ADRs 0083/0084/0085 (each AI-drafted under HITL supervision in this same Phase A PR) together constitute the operating evidence that the four-AI-role + supervisor model is in active force. The Design-system 18/20 grade in the state-of-platform review is a concrete output-quality signal. The pedagogy- audit runner is the structural-supervision infrastructure that makes instructor-as-supervisor tractable at the scale of an AI-primary-author codebase. Multi-cohort outcomes from the AI-author-as-content-author path (downstream ASTR 201 fa26 cohort) remain deferred to a future re-validation; the AI-author-of-platform-code path (ADR 0061 amendment) is fully shipped.  |
| [docs/website/decisions/0031-compound-component-layout-primitives.md](/compound-component-layout-primitives/) | validated | shipped | 2026-05-25 | deployment | All six primitives this ADR named (assembled TextbookLayout + the five underlying layout/chrome primitives) ship in `@sophie/astro`. The compound-component pattern is in active force — consumers can use the one-line `<TextbookLayout>` default OR compose the primitives directly, matching the Radix/React-Aria/Starlight packaging shape this ADR cited.  |
| [docs/website/decisions/0032-vanilla-js-chrome-state.md](/vanilla-js-chrome-state/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0033-is-inline-outside-react-island.md](/is-inline-outside-react-island/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0034-empty-slot-collapse-pattern.md](/empty-slot-collapse-pattern/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0035-token-naming-flat-kindless.md](/token-naming-flat-kindless/) | validated | shipped | 2026-05-25 | deployment, review, test | The flat kind-less naming convention is in active force at every layer: the canonical `tokens.ts` source, the generated CSS output, and the unit test surface. ADR 0005's original kind-infix sketch was never adopted; this ADR ratifies the as-shipped convention.  |
| [docs/website/decisions/0036-define-preference-factory-pattern.md](/define-preference-factory-pattern/) | validated | shipped | 2026-05-25 | deployment, test | The `definePreference` factory shipped and scaled to five consumers (sidebar, theme, view-mode, right-sidebar, disclosures), each as a singleton export with the factory-returned surface. Companion test files per consumer (`theme.test.ts`, `view-mode.test.ts`) exercise the invariants the ADR locks.  |
| [docs/website/decisions/0037-cross-bundle-dom-attribute-observation.md](/cross-bundle-dom-attribute-observation/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0038-pedagogy-index-pattern.md](/pedagogy-index-pattern/) | validated | shipped | 2026-05-28 | audit, chapter, review, test | The pedagogy-index pattern is the load-bearing reference architecture for ADRs 0042/0043/0044/0045/0056; pattern itself is validated, downstream consumers ship in tranches (see 0044/0045/0046 in-progress). Amendment 2 (2026-05-25) added the `useHydrated`-at-top SSR-gate convention covering the five store-gated components, defending the whole class against the packed-copy SSR-ordering hazard. |
| [docs/website/decisions/0039-lucide-two-adapter-convention.md](/lucide-two-adapter-convention/) | validated | shipped | 2026-05-25 | deployment | The two-adapter convention is in active force across both package boundaries: `@sophie/astro` declares `lucide-static` + re-exports through the icon barrel; `@sophie/components` declares `lucide-react` + imports directly from it (no re-export barrel) per the tree-shake discipline. The pedagogy half this ADR queued as a follow-up mechanical PR has landed and scaled to 10+ component consumers.  |
| [docs/website/decisions/0040-teaching-decision-records.md](/teaching-decision-records/) | in progress | accepted design | 2026-05-16 | deployment, review | Contract spec'd + cross-referenced; tooling + TDR-coverage audit invariant not yet wired. Code lands in a follow-up PR (separate from the validation tracker rollout). |
| [docs/website/decisions/0041-teaching-move-library.md](/teaching-move-library/) | in progress | accepted design | 2026-05-16 | deployment, manual, review | Taxonomy spec'd in reference doc; no automated audit of move IDs against pedagogy-contract.reasoning_style yet. Code follow-up tracked. |
| [docs/website/decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md](/pedagogy-contract-and-ai-contribution-ledger/) | in progress | accepted design | 2026-05-16 | deployment, manual, review | Schema + reference docs are stable; runtime renderer + audit invariants land in follow-up work. |
| [docs/website/decisions/0043-notation-registry-multirep-alignment-audit.md](/notation-registry-multirep-alignment-audit/) | in progress | accepted design | 2026-05-17 | deployment, manual, review | Schema + reference shape stable; 2026-05-17 design hardening locks the v1 ship-shape (3 Rep children, framed-card+grid render, epistemic_role on registry); audit + runtime code lands in Phase 3 sprint PRs α–ε. |
| [docs/website/decisions/0044-misconception-graph-and-intervention-library.md](/misconception-graph-and-intervention-library/) | in progress | shipped | 2026-05-17 | audit, deployment, manual, test | Graph schema + first audit pair shipped; 2026-05-17 design hardening locks the v1 ship-shape (12 canonical interventions, sub-card render, no PR-α/PR-ε); intervention runtime + MG3/MG4/I1–I3 audit invariants land in Phase 3 sprint PRs β–δ. |
| [docs/website/decisions/0045-pedagogical-diff-curriculum-ci.md](/pedagogical-diff-curriculum-ci/) | in progress | accepted design | 2026-05-16 | deployment, manual, review | Contract + taxonomy stable; CLI implementation + CI enforcement land in follow-up PRs. |
| [docs/website/decisions/0046-equation-biography.md](/equation-biography/) | in progress | shipped | 2026-05-17 | deployment, manual, test | Schema + reference doc stable; 2026-05-17 design hardening locks the v1 ship-shape (6 biography children with hardcoded epistemicRole const, bundled render updates in PR-β, Wien's law smoke fixture); runtime biography surface + E7/E8/E9 audit invariants land in Phase 3 sprint PRs α–δ. |
| [docs/website/decisions/0047-empirical-validation-plan.md](/empirical-validation-plan/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0048-sophie-lds-content-plugins.md](/sophie-lds-content-plugins/) | in progress | future package split | 2026-05-16 | deployment, manual | Contract spec'd; runtime plugin system implementation deferred until first cross-course consumer surfaces a concrete need. |
| [docs/website/decisions/0049-sophie-refactor-cli.md](/sophie-refactor-cli/) | unvalidated | future package split | — | — |  |
| [docs/website/decisions/0051-chapter-status-course-versioning.md](/chapter-status-course-versioning/) | validated | shipped | 2026-05-16 | audit, test | Chapter status shipped end-to-end (PR #49: feat(core,astro): chapter.status frontmatter + draft-exclusion). Sibling status surface to ADR 0056 validation status — see reference/validation-tracker.md `See also` block. |
| [docs/website/decisions/0052-scheduled-publication-visibility.md](/scheduled-publication-visibility/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0053-conformance-failure-modes.md](/conformance-failure-modes/) | in progress | accepted design | 2026-05-18 | review, test |  |
| [docs/website/decisions/0054-course-schedule-calendar.md](/course-schedule-calendar/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0055-squash-merge-for-code-prs.md](/squash-merge-for-code-prs/) | validated | shipped | 2026-05-16 | deployment, manual | Status promoted from in-progress → validated on 2026-05-16 after the squash-merge-guard CI workflow + repo-settings change both landed. Two layers are required: settings prevent UI accidents (the `Create a merge commit` and `Rebase and merge` buttons are gone); the CI workflow catches API-level bypass of the merge-commit shape. Together they cover all three GitHub merge strategies. |
| [docs/website/decisions/0056-validation-tracker.md](/validation-tracker/) | validated | shipped | 2026-05-16 | audit, deployment, manual, review, test | All six PRs (#43 schema, #44 bulk migration, #50 admonition, #51 audit, #52 index, this PR curated-pass + reference doc + V1/V2 promotion) shipped. Self-referential validation complete; tracker is the source of truth for every ADR + reference doc's validation state as of 2026-05-16. |
| [docs/website/decisions/0057-visual-regression-baseline.md](/visual-regression-baseline/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0058-epistemic-component-contract.md](/epistemic-component-contract/) | in progress | shipped | 2026-05-28 | deployment, test |  |
| [docs/website/decisions/0059-linked-representation-state-primitive.md](/linked-representation-state-primitive/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0060-registry-ecosystem.md](/registry-ecosystem/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0061-ai-optimized-codebase-design.md](/ai-optimized-codebase-design/) | validated | shipped | 2026-05-25 | deployment, manual, review, test | Rule 3's CI enforcement via `scripts/loc-budget.ts` + the `_template/` skeleton embodying Rules 1 + 6 (shipped in PR #177, formalized in just-landed ADR 0085) + the SoTA audit's verification of LOC-budget compliance constitute the concrete operating evidence. Rules 2 (Write-over-Edit), 4 (filename-as-routing), and 5 (atomic docs) are author-discipline rules — their enforcement is at the review-rules R6-R10 layer (AGENTS.md) rather than CI, and the post-#168 PR arc shows them in operating use (focused-files ADRs 0083/0084/0085; atomic doc updates landing in the same PRs as code under AGENTS.md's 'Docs don't drift from code' discipline rule). The validation-tracker pattern (ADR 0056) is the atomic-docs rule enacted at the contract layer.  |
| [docs/website/decisions/0062-page-status-frontmatter-enum.md](/page-status-frontmatter-enum/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0063-omiflow-composite-primitive.md](/omiflow-composite-primitive/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0064-chapter-migration-playbook.md](/chapter-migration-playbook/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0065-lti-1-3-integration.md](/lti-1-3-integration/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0066-pseudonymous-first-data-model.md](/pseudonymous-first-data-model/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0067-section-level-artifacts.md](/section-level-artifacts/) | in progress | shipped | 2026-05-22 | manual |  |
| [docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md](/bridge-rooms-and-prereq-pedagogy/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0069-fsrs-spaced-repetition-engine.md](/fsrs-spaced-repetition-engine/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0070-library-room-and-registry-spec-pages.md](/library-room-and-registry-spec-pages/) | in progress | accepted design | 2026-05-23 | deployment, test |  |
| [docs/website/decisions/0071-pyodide-computational-labs.md](/pyodide-computational-labs/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0072-three-tier-build-priority.md](/three-tier-build-priority/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0073-unified-assessment-schema.md](/unified-assessment-schema/) | in progress | accepted design | 2026-05-28 | deployment, review, test |  |
| [docs/website/decisions/0074-instructor-authoring-cost-metric.md](/instructor-authoring-cost-metric/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0075-student-ux-cognitive-load-governance.md](/student-ux-cognitive-load-governance/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0076-student-learning-cockpit.md](/student-learning-cockpit/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0077-ai-authoring-packets.md](/ai-authoring-packets/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0078-reasoning-trace-composition.md](/reasoning-trace-composition/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0079-topic-registry-and-resolution-pattern.md](/topic-registry-and-resolution-pattern/) | in progress | accepted design | 2026-05-23 | deployment, review, test |  |
| [docs/website/decisions/0080-course-spec-format-v0-1.md](/course-spec-format-v0-1/) | validated | shipped | 2026-05-26 | deployment, test |  |
| [docs/website/decisions/0081-worked-example-component.md](/worked-example-component/) | in progress | shipped | 2026-05-26 | manual, test |  |
| [docs/website/decisions/0082-chapter-layout-extraction.md](/chapter-layout-extraction/) | validated | accepted design | 2026-05-25 | chapter, deployment, review, test | PR-C consolidates ADR text + figures virtual module + shipped ChapterLayout + injected reading route + integration wiring + smoke migration into one branch (with sibling astr201 migration). Contract is locked; future routes (slides, intro/synthesis) extend by adding parallel injectRoute calls per ADR § Consequences. |
| [docs/website/decisions/0083-cl1-client-directive-invariant.md](/cl1-client-directive-invariant/) | validated | accepted design | 2026-05-25 | audit, deployment, test | Shipped as part of the post-PR-#172 hardening sequence; closes the "missing client:* directive" failure mode that ADR 0038 Amendment 2 defends structurally via the `useHydrated` gate. CL1 is the build-time defence; the gate is the runtime defence; together they form a defence-in-depth pair against the React #418 hydration mismatch class for store-backed components in packed consumers.  |
| [docs/website/decisions/0084-packed-smoke-ci-gate.md](/packed-smoke-ci-gate/) | validated | accepted design | 2026-05-25 | deployment, manual, test | Shipped in PR #176 (PR-D1) as the CI-runtime layer of the hydration- class defense family. Pairs with ADR 0038 Amendment 2 (runtime `useHydrated` gate) + ADR 0083 (build-time CL1 invariant) + future ADR 0085 (authoring-affordance `_template/` skeleton). The four layers together close the React #418 hydration regression class structurally; the packed-smoke gate is what catches the bug in the consumer-shape pnpm workspace resolution cannot exercise by construction.  |
| [docs/website/decisions/0085-component-template-skeleton.md](/component-template-skeleton/) | validated | accepted design | 2026-05-25 | deployment, manual, test | Shipped in PR #177 as the authoring-affordance layer of the React #418 hydration-class defense family. Pairs with ADR 0038 Amendment 2 (runtime `useHydrated` gate) + ADR 0083 (build-time CL1 invariant) + ADR 0084 (CI-runtime packed-smoke gate). The four ADRs collectively close the regression class: runtime structural defense, build-time static analysis, CI-runtime consumer-shape coverage, and authoring affordance.  |
| [docs/website/decisions/0086-multi-chapter-glossary-definitions.md](/multi-chapter-glossary-definitions/) | validated | accepted design | 2026-05-26 | test |  |
| [docs/website/decisions/0087-compound-island-transform.md](/compound-island-transform/) | in progress | shipped | 2026-05-28 | review, test |  |
| [docs/website/decisions/0088-pedagogy-audit-build-artifact.md](/pedagogy-audit-build-artifact/) | validated | shipped | 2026-05-28 | deployment, test | Shipped: build-done trigger + artifact + dev-only layout guard. Implemented via the accumulator-reading approach (the integration reads the already-populated index pagefind-style, extracts contract validations once at build-done). Originating audit item: P2.4 (docs/reviews/2026-05-28-platform-hardening-audit.md).  |
| [docs/website/decisions/0089-latex-speech-accessibility.md](/latex-speech-accessibility/) | validated | shipped | 2026-05-28 | test | Shipped in PR-B of the unified-math-rendering / LaTeX-speech sprint (plan: docs/plans/2026-05-28-latex-speech-a11y-implementation.md), built on ADR 0090's `renderMath`. The `math-speech` invariant (MA-1) is WARNING (non-fatal) for v1 per resolved-decision 1 — the deferred runtime/registry tail (MathText children-math, BlackbodyExplorer dynamic math, registry `rearranged_forms`/`constants`) means a zero-failure build is not yet guaranteed corpus-wide. ADR 0089 graduates MA-1 to ERROR once coverage of the build-time surfaces is stable; the validation status is `validated` for the WARNING contract that ships here.  |
| [docs/website/decisions/0090-unified-build-time-math-rendering.md](/unified-build-time-math-rendering/) | validated | shipped | 2026-05-28 | test | Shipped in PR-A of the unified-math-rendering / LaTeX-speech sprint (plan: docs/plans/2026-05-28-latex-speech-a11y-implementation.md). Enforceable invariant — the only build-time KaTeX site is `renderMath`; `grep -rn katex packages/components/src --include='*.tsx' --include='*.ts' \| grep -v test \| grep -v stories` resolves to ONLY the two runtime-tail files (render-text-with-math.ts, BlackbodyExplorer/InlineMath.tsx) plus the `katex/dist/katex.min.css` type declaration in css-modules.d.ts. PR-B (ADR 0089) extends `renderMath` with an SRE `speech` field and the coverage invariant; in-progress at time of this ADR.  |

### Reference docs

| Contract | Status | Lifecycle | Last validated | Evidence | Notes |
|---|---|---|---|---|---|
| [docs/website/reference/ai-contribution-schema.md](/ai-contribution-schema/) | unvalidated | accepted design | — | — |  |
| [docs/website/reference/audit-baseline.md](/audit-baseline/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/chapter-components.md](/chapter-components/) | in progress | shipped | 2026-05-22 | chapter, review, test |  |
| [docs/website/reference/cli.md](/cli/) | unvalidated | mixed | — | — |  |
| [docs/website/reference/component-contract.md](/component-contract/) | in progress | shipped | 2026-05-22 | manual, review, test |  |
| [docs/website/reference/content-schema.md](/content-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/course-info-schema.md](/course-info-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/course-schedule.md](/course-schedule/) | unvalidated | accepted design | — | — |  |
| [docs/website/reference/equation-biography-schema.md](/equation-biography-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/equation-registry-schema.md](/equation-registry-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/formative-assessment-authoring.md](/formative-assessment-authoring/) | in progress | shipped | 2026-05-28 | review, test |  |
| [docs/website/reference/glossary.md](/glossary/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/intervention-library.md](/intervention-library/) | in progress | shipped | 2026-05-22 | chapter, test |  |
| [docs/website/reference/misconception-graph-schema.md](/misconception-graph-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/multirep-component.md](/multirep-component/) | in progress | shipped | 2026-05-22 | chapter, test |  |
| [docs/website/reference/notation-registry-schema.md](/notation-registry-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/pedagogical-change-taxonomy.md](/pedagogical-change-taxonomy/) | unvalidated | accepted design | — | — |  |
| [docs/website/reference/pedagogy-contract-schema.md](/pedagogy-contract-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/plugin-api.md](/plugin-api/) | unvalidated | future package split | — | — |  |
| [docs/website/reference/sophie-diff-cli.md](/sophie-diff-cli/) | unvalidated | future package split | — | — |  |
| [docs/website/reference/sophie-metrics-cli.md](/sophie-metrics-cli/) | unvalidated | future package split | — | — |  |
| [docs/website/reference/sophie-plugin-system.md](/sophie-plugin-system/) | unvalidated | future package split | — | — |  |
| [docs/website/reference/sophie-publish-schedule-cli.md](/sophie-publish-schedule-cli/) | unvalidated | future package split | — | — |  |
| [docs/website/reference/sophie-refactor-cli.md](/sophie-refactor-cli/) | unvalidated | future package split | — | — |  |
| [docs/website/reference/tdr-template.md](/tdr-template/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/teaching-moves.md](/teaching-moves/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/validation-tracker.md](/validation-tracker/) | validated | shipped | 2026-05-16 | audit, manual, test | Reference doc shipped in PR 6 Workstream A; specifies the schema + admonition contract + audit invariants + dashboard workflow. Graduated to validated alongside ADR 0056 itself after the curated-pass + V1/V2 promotion landed in the same PR. |
| [docs/website/reference/visual-regression.md](/visual-regression/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/wcag-21-aa.md](/wcag-21-aa/) | unvalidated | shipped | — | — |  |
