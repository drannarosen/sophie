---
title: Unit-level axe coverage audit
date: 2026-05-25
type: audit
authors:
  - Claude (audit)
  - Anna Rosen (prompt)
scope: "@sophie/components unit-level a11y test coverage per ADR 0004"
trigger: A+ closure backlog P3 (post-sprint follow-up)
---

## What I'm auditing

[ADR 0004](../decisions/0004-component-contract.md) says
**"axe-core tests are mandatory on every component PR."** This audit
grounds that claim by enumerating every component + figure +
interactive primitive under `@sophie/components` and bucketing its
unit-level axe coverage.

Method:

- Enumerate every directory under
  `packages/components/src/{components,figures,interactive,primitives}`.
- For each one, identify the primary render test file
  (`<Name>.test.tsx`).
- Grep each test file for an axe signal:
  `axe | toHaveNoViolations | axeAccessible | AxeBuilder | @axe-core`.
- Bucket: ✓ has axe / ⚠ has tests but no axe / ✗ no test file /
  ◯ chrome-only (none in this audit; chrome layout primitives like
  `TextbookLayout`, `TopBar`, `ContentColumn` live in `@sophie/astro`,
  not `@sophie/components` — they're outside this audit's scope per
  ADR 0001's framework-purity rule).

Hook-only test files (`useLinkedParameter.test.tsx`, runtime hook
tests under `runtime/`, store tests under `intervention/` and
`_physics/`) are excluded from axe bucketing — axe operates on
rendered DOM, not on pure hook state machines.

## Coverage by component

### `src/components/` (38 entries)

| Component             | Test file (primary)                              | Axe |
| --------------------- | ------------------------------------------------ | --- |
| Aside                 | `Aside.test.tsx`                                 | ✓  |
| Assumption            | `Assumption.test.tsx`                            | ✓  |
| BreaksWhen            | `BreaksWhen.test.tsx`                            | ✓  |
| Callout               | `Callout.test.tsx`                               | ✓  |
| Card                  | `Card.test.tsx`                                  | ✓  |
| ChapterRef            | `ChapterRef.test.tsx`                            | ✓  |
| CommonMisuse          | `CommonMisuse.test.tsx`                          | ✓  |
| ComprehensionGate     | `ComprehensionGate.test.tsx`                     | ✓  |
| ConfidenceCheck       | `ConfidenceCheck.test.tsx`                       | ✓  |
| DerivationStep        | `DerivationStep.test.tsx`                        | ✓  |
| Dropdown              | `Dropdown.test.tsx`                              | ✓  |
| EffortLog             | `EffortLog.test.tsx`                             | ✓  |
| EquationRef           | `EquationRef.test.tsx`                           | ✓  |
| EquationRef (biography sub) | `EquationRef.biography-summary.test.tsx`   | ✓ (added in this PR) |
| Figure                | `Figure.test.tsx`                                | ✓  |
| FigureRef             | `FigureRef.test.tsx`                             | ✓  |
| GlossaryTerm          | `GlossaryTerm.test.tsx`                          | ✓  |
| Grid                  | `Grid.test.tsx`                                  | ✓  |
| InteractiveCheckbox   | `InteractiveCheckbox.test.tsx`                   | ✓  |
| Intervention          | `Intervention.test.tsx`                          | ✓  |
| KeyEquation           | `KeyEquation.test.tsx`                           | ✓  |
| LearningObjectives    | `LearningObjectives.test.tsx`                    | ✓  |
| MultiRep              | `MultiRep.test.tsx`                              | ✓  |
| OMIFlow               | `OMIFlow.test.tsx`                               | ✓  |
| Objective             | `Objective.test.tsx`                             | ✓  |
| Observable            | `Observable.test.tsx`                            | ✓  |
| Predict               | `Predict.test.tsx`                               | ✓  |
| Reflection            | `Reflection.test.tsx`                            | ✓  |
| RepEquation           | `RepEquation.test.tsx`                           | ✓  |
| RepFigure             | `RepFigure.test.tsx`                             | ✓  |
| RepVerbal             | `RepVerbal.test.tsx`                             | ✓  |
| RetrievalPrompt       | `RetrievalPrompt.test.tsx`                       | ✓  |
| Search/ChipStrip      | `ChipStrip.test.tsx`                             | ✓  |
| Search/ResultCard     | `ResultCard.test.tsx`                            | ✓  |
| Search/ResultList     | `ResultList.test.tsx`                            | ✓  |
| Search/SearchModal    | `SearchModal.test.tsx`                           | ✓  |
| SkillReview           | `SkillReview.test.tsx`                           | ✓  |
| SpacedReview          | `SpacedReview.test.tsx`                          | ✓  |
| Tabs                  | `Tabs.test.tsx`                                  | ✓  |
| Units                 | `Units.test.tsx`                                 | ✓  |
| WorkedExample         | `WorkedExample.test.tsx`                         | ✓  |
| internal/RetrievalCard | `RetrievalCard.test.tsx`                        | ✓ (added in this PR) |

Excluded from this section as not user-facing UI:
`_shared/Tier3Card.module.css` (CSS only); `retrieval/*` (pure
hooks + utilities — `humanLabel`, `lruScheduler`,
`useRetrievalAttempt`).

### `src/figures/` (2 entries)

| Component                      | Test file                       | Axe |
| ------------------------------ | ------------------------------- | --- |
| figures/BlackbodyExplorer      | `BlackbodyExplorer.test.tsx`    | ✓  |
| figures/BlackbodyExplorer (InlineMath sub) | `InlineMath.test.tsx`    | ✓  |

### `src/interactive/` (2 render entries + 1 hook test)

| Component                  | Test file                | Axe |
| -------------------------- | ------------------------ | --- |
| interactive/ParameterCursor | `ParameterCursor.test.tsx` | ✓  |
| interactive/ParameterSlider | `ParameterSlider.test.tsx` | ✓  |
| `useLinkedParameter` hook   | `useLinkedParameter.test.tsx` | — hook-only (no DOM) |

### `src/primitives/` (1 entry)

| Component                 | Test file                | Axe |
| ------------------------- | ------------------------ | --- |
| primitives/ChromeTitleBar | `ChromeTitleBar.test.tsx` | ✓  |

## Summary

| Bucket                       | Count (after fixes) |
| ---------------------------- | ------------------- |
| ✓ Has axe coverage           | 44                  |
| ⚠ Has tests but no axe       | 0                   |
| ✗ No test file               | 0                   |
| ◯ Chrome-only (not in scope) | 0 in `@sophie/components` |

**Coverage: 44 / 44 = 100% of user-rendered components in
`@sophie/components`.**

## ADR 0004 claim verification

**Verdict: held (after this PR's targeted fix).**

Two quiet gaps existed pre-audit:

1. `components/internal/RetrievalCard/RetrievalCard.test.tsx` —
   internal primitive that powers `<RetrievalPrompt>`,
   `<SpacedReview>`, and `<SkillReview>`. Each public wrapper had axe
   coverage on the composed surface, but the primitive itself owned
   the disclosure / textarea / reveal / self-assess UI without
   dedicated unit-level a11y testing. The primitive is the actual
   rendered DOM — composition does not transfer a11y guarantees
   automatically.

2. `components/EquationRef/EquationRef.biography-summary.test.tsx` —
   secondary render test for the `<BiographySummary>` sub-component
   imported by `<EquationRef>` for popover content. Parent
   `EquationRef.test.tsx` axe-tested the full popover; the sibling
   test file had nine render assertions without axe.

Both gaps were trivial to close (single `import { axe } from
"jest-axe"` + a parametric `it.each` block exercising the rendered
states). Per the closure backlog protocol's "0–2 trivial gaps:
fix in same PR" rule, both were closed in this PR rather than
deferred to a sweep.

**The ADR 0004 mandate is now actually true rather than aspirationally
true.** Pre-PR, the claim was 42 / 44 = 95.5% held; post-PR, 44 / 44 =
100%.

## Gaps + recommendations

- **Closed in this PR (2 sites).** See `Summary` above.
- **No remaining gaps.** Standing R6–R10 review rules already cover
  drift prevention; consider whether a new R11 — "every
  `.test.tsx` file under `@sophie/components` that calls `render()`
  must also call `axe()` at least once" — would be worth adding as a
  pre-merge grep gate to lock 100% in place against regressions. A
  candidate grep, run from worktree root, that lists candidate
  drift sites:

  ```sh
  for f in $(find packages/components/src -name "*.test.tsx"); do
    grep -q "render(" "$f" || continue
    grep -q "axe\\b" "$f" || echo "MISSING AXE: $f"
  done
  ```

  Worth promoting to a CI lint if the audit catches drift in a
  future P-series follow-up; not in scope for P3.

## Judgment calls

- **Hook tests excluded.** `useLinkedParameter.test.tsx` calls
  `render()` on a probe component but the test surface is the hook
  return value, not the DOM. Axe wouldn't add signal there. Same
  rationale excludes the runtime hook tests under `src/runtime/`.

- **Sub-component test files counted separately.** Both
  `EquationRef.biography-summary.test.tsx` and
  `BlackbodyExplorer/InlineMath.test.tsx` test sibling sub-components
  that own their own DOM regions. Each is bucketed as a separate
  axe-coverage row because each test file owns its own
  rendering surface independent of the parent.

- **Internal primitives are in scope.** `RetrievalCard` lives under
  `components/internal/` and is not exported publicly — but it is
  the actual rendered DOM students interact with via the three
  public wrappers. Per ADR 0004, axe-core is mandatory on the
  rendered surface, not on the export surface.

- **No chrome-only rows.** Layout primitives (TextbookLayout, TopBar,
  ContentColumn, etc.) live in `@sophie/astro`, not
  `@sophie/components`. Per ADR 0001, `@sophie/components` is
  framework-pure pedagogy/UI — everything in scope here is
  user-rendered and merits axe. The "◯ chrome-only" bucket the
  audit protocol allows is empty by construction.
