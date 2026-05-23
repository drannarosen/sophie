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
| Validated | 14 |
| In progress | 15 |
| Unvalidated | 76 |
| Re-validation needed | 0 |
| Missing block | 0 |
| Total | 105 |

## Lifecycle summary

| Lifecycle | Count |
|---|---|
| Shipped | 61 |
| Accepted design | 34 |
| Mixed | 1 |
| Future package split | 9 |
| No status | 0 |
| Total | 105 |

## Evidence kinds

| Kind | Count |
|---|---|
| test | 42 |
| chapter | 7 |
| review | 21 |
| deployment | 13 |
| audit | 5 |
| manual | 29 |

## Extractor findings

_No extractor findings (V0 + V8) surfaced during this build._

## Contracts

### ADRs

| Contract | Status | Lifecycle | Last validated | Evidence | Notes |
|---|---|---|---|---|---|
| [docs/website/decisions/0001-platform-not-monorepo.md](/platform-not-monorepo/) | validated | shipped | 2026-05-16 | manual, review | Repo-shape contract is structurally enforced: any course importing @sophie/\* is by definition a separate consumer. The smoke example exercises that consumer relationship in-repo. |
| [docs/website/decisions/0002-renderer-astro-mdx.md](/renderer-astro-mdx/) | validated | shipped | 2026-05-16 | chapter, review, test | Astro 6 + MDX confirmed across the bucket B+C smoke build; the renderer-choice contract held under the smoke chapters and the components matrix. |
| [docs/website/decisions/0003-zod-as-source-of-truth.md](/zod-as-source-of-truth/) | validated | shipped | 2026-05-16 | review, test | Every load-bearing data shape in @sophie/core is a Zod schema; downstream packages type-infer via z.infer. No drift detected in the audit. |
| [docs/website/decisions/0004-component-contract-revisions.md](/component-contract-revisions/) | validated | shipped | 2026-05-16 | chapter, review, test | Component contract (serialize separate from render, axe-core mandatory, useInteractive for persistence, composition rules) confirmed across every shipped component as of the bucket B+C audit. |
| [docs/website/decisions/0005-theming-three-layers.md](/theming-three-layers/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0006-slides-revealjs.md](/slides-revealjs/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0007-persistence-indexeddb.md](/persistence-indexeddb/) | validated | shipped | 2026-05-22 | chapter, deployment, review, test | Build-time + smoke-environment validation complete; multi-cohort outcomes deferred to ASTR 201 fa26. |
| [docs/website/decisions/0008-cosmic-playground-protocol.md](/cosmic-playground-protocol/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0009-i18n-deferred.md](/i18n-deferred/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0010-myst-for-design-docs.md](/myst-for-design-docs/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0011-pnpm-package-manager.md](/pnpm-package-manager/) | validated | shipped | 2026-05-16 | manual, review | pnpm is the only sanctioned JS package manager (per CLAUDE.md); enforcement is by convention + CI lockfile-frozen install. |
| [docs/website/decisions/0012-uv-python-tooling.md](/uv-python-tooling/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0013-biome-lint-format.md](/biome-lint-format/) | validated | shipped | 2026-05-16 | manual, review | Biome replaces ESLint + Prettier; 0-error/0-warning discipline enforced per PR (CLAUDE.md conventions). |
| [docs/website/decisions/0014-turborepo-monorepo-orchestration.md](/turborepo-monorepo-orchestration/) | validated | shipped | 2026-05-16 | manual, review | Turborepo orchestrates 5+ packages cleanly. Open follow-up (PR #50 review I1) tracks docs/website/ workspace-promotion + turbo dependsOn for the validation-admonition plugin's dist/ import. |
| [docs/website/decisions/0015-dev-preview-workflow.md](/dev-preview-workflow/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0016-react-flow-for-concept-maps.md](/react-flow-for-concept-maps/) | unvalidated | future package split | — | — |  |
| [docs/website/decisions/0017-rename-sophia-to-sophie.md](/rename-sophia-to-sophie/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0018-codemirror-6-for-codecell.md](/codemirror-6-for-codecell/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0019-radix-ui-primitives.md](/radix-ui-primitives/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0020-shiki-syntax-highlighting.md](/shiki-syntax-highlighting/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0021-observable-plot-data-viz.md](/observable-plot-data-viz/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0022-tsup-library-builds.md](/tsup-library-builds/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0023-vertical-slice-build-order.md](/vertical-slice-build-order/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0024-license-agpl.md](/license-agpl/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0025-phase-0-actual-scope.md](/phase-0-actual-scope/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0026-tailwind-v4-css-first.md](/tailwind-v4-css-first/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0027-mdx-render-boundary-prop-threading.md](/mdx-render-boundary-prop-threading/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0028-storybook-setup.md](/storybook-setup/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0029-broadcast-channel-last-write-wins.md](/broadcast-channel-last-write-wins/) | validated | shipped | 2026-05-22 | review, test | ADR 0007 refinement; LWW timestamping confirmed via the useInteractive + useInteractiveRange test suites. 2026-05-22 Wedge B1 amendment: same-tab local fan-out added to unblock sibling-hook same-tab sync (senderId guard preserves the no-self-echo semantic). No cross-tab production cohort data yet (deferred to fa26). |
| [docs/website/decisions/0030-audience-and-ai-author-model.md](/audience-and-ai-author-model/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0031-compound-component-layout-primitives.md](/compound-component-layout-primitives/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0032-vanilla-js-chrome-state.md](/vanilla-js-chrome-state/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0033-is-inline-outside-react-island.md](/is-inline-outside-react-island/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0034-empty-slot-collapse-pattern.md](/empty-slot-collapse-pattern/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0035-token-naming-flat-kindless.md](/token-naming-flat-kindless/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0036-define-preference-factory-pattern.md](/define-preference-factory-pattern/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0037-cross-bundle-dom-attribute-observation.md](/cross-bundle-dom-attribute-observation/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0038-pedagogy-index-pattern.md](/pedagogy-index-pattern/) | validated | shipped | 2026-05-16 | audit, chapter, review, test | The pedagogy-index pattern is the load-bearing reference architecture for ADRs 0042/0043/0044/0045/0056; pattern itself is validated, downstream consumers ship in tranches (see 0044/0045/0046 in-progress). |
| [docs/website/decisions/0039-lucide-two-adapter-convention.md](/lucide-two-adapter-convention/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0040-teaching-decision-records.md](/teaching-decision-records/) | in progress | accepted design | 2026-05-16 | deployment, review | Contract spec'd + cross-referenced; tooling + TDR-coverage audit invariant not yet wired. Code lands in a follow-up PR (separate from the validation tracker rollout). |
| [docs/website/decisions/0041-teaching-move-library.md](/teaching-move-library/) | in progress | accepted design | 2026-05-16 | deployment, manual, review | Taxonomy spec'd in reference doc; no automated audit of move IDs against pedagogy-contract.reasoning\_style yet. Code follow-up tracked. |
| [docs/website/decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md](/pedagogy-contract-and-ai-contribution-ledger/) | in progress | accepted design | 2026-05-16 | deployment, manual, review | Schema + reference docs are stable; runtime renderer + audit invariants land in follow-up work. |
| [docs/website/decisions/0043-notation-registry-multirep-alignment-audit.md](/notation-registry-multirep-alignment-audit/) | in progress | accepted design | 2026-05-17 | deployment, manual, review | Schema + reference shape stable; 2026-05-17 design hardening locks the v1 ship-shape (3 Rep children, framed-card+grid render, epistemic\_role on registry); audit + runtime code lands in Phase 3 sprint PRs α–ε. |
| [docs/website/decisions/0044-misconception-graph-and-intervention-library.md](/misconception-graph-and-intervention-library/) | in progress | shipped | 2026-05-17 | audit, deployment, manual, test | Graph schema + first audit pair shipped; 2026-05-17 design hardening locks the v1 ship-shape (12 canonical interventions, sub-card render, no PR-α/PR-ε); intervention runtime + MG3/MG4/I1–I3 audit invariants land in Phase 3 sprint PRs β–δ. |
| [docs/website/decisions/0045-pedagogical-diff-curriculum-ci.md](/pedagogical-diff-curriculum-ci/) | in progress | accepted design | 2026-05-16 | deployment, manual, review | Contract + taxonomy stable; CLI implementation + CI enforcement land in follow-up PRs. |
| [docs/website/decisions/0046-equation-biography.md](/equation-biography/) | in progress | shipped | 2026-05-17 | deployment, manual, test | Schema + reference doc stable; 2026-05-17 design hardening locks the v1 ship-shape (6 biography children with hardcoded epistemicRole const, bundled render updates in PR-β, Wien's law smoke fixture); runtime biography surface + E7/E8/E9 audit invariants land in Phase 3 sprint PRs α–δ. |
| [docs/website/decisions/0047-empirical-validation-plan.md](/empirical-validation-plan/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0048-sophie-lds-content-plugins.md](/sophie-lds-content-plugins/) | in progress | future package split | 2026-05-16 | deployment, manual | Contract spec'd; runtime plugin system implementation deferred until first cross-course consumer surfaces a concrete need. |
| [docs/website/decisions/0049-sophie-refactor-cli.md](/sophie-refactor-cli/) | unvalidated | future package split | — | — |  |
| [docs/website/decisions/0051-chapter-status-course-versioning.md](/chapter-status-course-versioning/) | validated | shipped | 2026-05-16 | audit, test | Chapter status shipped end-to-end (PR #49: feat(core,astro): chapter.status frontmatter + draft-exclusion). Sibling status surface to ADR 0056 validation status — see reference/validation-tracker.md \`See also\` block. |
| [docs/website/decisions/0052-scheduled-publication-visibility.md](/scheduled-publication-visibility/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0053-conformance-failure-modes.md](/conformance-failure-modes/) | in progress | accepted design | 2026-05-18 | review, test |  |
| [docs/website/decisions/0054-course-schedule-calendar.md](/course-schedule-calendar/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0055-squash-merge-for-code-prs.md](/squash-merge-for-code-prs/) | validated | shipped | 2026-05-16 | deployment, manual | Status promoted from in-progress → validated on 2026-05-16 after the squash-merge-guard CI workflow + repo-settings change both landed. Two layers are required: settings prevent UI accidents (the \`Create a merge commit\` and \`Rebase and merge\` buttons are gone); the CI workflow catches API-level bypass of the merge-commit shape. Together they cover all three GitHub merge strategies. |
| [docs/website/decisions/0056-validation-tracker.md](/validation-tracker/) | validated | shipped | 2026-05-16 | audit, deployment, manual, review, test | All six PRs (#43 schema, #44 bulk migration, #50 admonition, #51 audit, #52 index, this PR curated-pass + reference doc + V1/V2 promotion) shipped. Self-referential validation complete; tracker is the source of truth for every ADR + reference doc's validation state as of 2026-05-16. |
| [docs/website/decisions/0057-visual-regression-baseline.md](/visual-regression-baseline/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0058-epistemic-component-contract.md](/epistemic-component-contract/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0059-linked-representation-state-primitive.md](/linked-representation-state-primitive/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0060-registry-ecosystem.md](/registry-ecosystem/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0061-ai-optimized-codebase-design.md](/ai-optimized-codebase-design/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0062-page-status-frontmatter-enum.md](/page-status-frontmatter-enum/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0063-omiflow-composite-primitive.md](/omiflow-composite-primitive/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0064-chapter-migration-playbook.md](/chapter-migration-playbook/) | unvalidated | shipped | — | — |  |
| [docs/website/decisions/0065-lti-1-3-integration.md](/lti-1-3-integration/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0066-pseudonymous-first-data-model.md](/pseudonymous-first-data-model/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0067-section-level-artifacts.md](/section-level-artifacts/) | in progress | shipped | 2026-05-22 | manual |  |
| [docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md](/bridge-rooms-and-prereq-pedagogy/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0069-fsrs-spaced-repetition-engine.md](/fsrs-spaced-repetition-engine/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0070-library-room-and-registry-spec-pages.md](/library-room-and-registry-spec-pages/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0071-pyodide-computational-labs.md](/pyodide-computational-labs/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0072-three-tier-build-priority.md](/three-tier-build-priority/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0073-unified-assessment-schema.md](/unified-assessment-schema/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0074-instructor-authoring-cost-metric.md](/instructor-authoring-cost-metric/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0075-student-ux-cognitive-load-governance.md](/student-ux-cognitive-load-governance/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0076-student-learning-cockpit.md](/student-learning-cockpit/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0077-ai-authoring-packets.md](/ai-authoring-packets/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0078-reasoning-trace-composition.md](/reasoning-trace-composition/) | unvalidated | accepted design | — | — |  |
| [docs/website/decisions/0079-topic-registry-and-resolution-pattern.md](/topic-registry-and-resolution-pattern/) | in progress | accepted design | 2026-05-23 | deployment, review, test |  |

### Reference docs

| Contract | Status | Lifecycle | Last validated | Evidence | Notes |
|---|---|---|---|---|---|
| [docs/website/reference/ai-contribution-schema.md](/ai-contribution-schema/) | unvalidated | accepted design | — | — |  |
| [docs/website/reference/audit-baseline.md](/audit-baseline/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/chapter-components.md](/chapter-components/) | in progress | shipped | 2026-05-22 | chapter, review, test |  |
| [docs/website/reference/cli.md](/cli/) | unvalidated | mixed | — | — |  |
| [docs/website/reference/component-contract.md](/component-contract/) | in progress | shipped | 2026-05-22 | manual, review, test |  |
| [docs/website/reference/content-schema.md](/content-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/course-schedule.md](/course-schedule/) | unvalidated | accepted design | — | — |  |
| [docs/website/reference/equation-biography-schema.md](/equation-biography-schema/) | unvalidated | shipped | — | — |  |
| [docs/website/reference/equation-registry-schema.md](/equation-registry-schema/) | unvalidated | shipped | — | — |  |
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
