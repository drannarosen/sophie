---
title: LO checkbox interactivity fix via remark-extraction (overview)
date: 2026-05-14
status: design-locked (5-section brainstorm complete)
phase: 2 (Bucket C follow-up, post-PR-C4)
predecessor: PR-C4 (#40) + chore/post-bucket-c-followups (#41)
---

# LO checkbox remark-extraction — overview

`<LearningObjectives>` ships a broken interactive checkbox in production
MDX-rendered chapters. The PR-C3 children-mode design — parent owns
`useInteractive`, injects `checked` and `onToggle` into each `<Objective>`
child via `React.Children.map` + `cloneElement` — assumes the React island
receives `<Objective>` ReactElements as children. Astro's island system
does not pass children that way: the JSX children at the island boundary
become server-rendered HTML inside an `<astro-slot>` wrapper, and the
React component sees the slot, not the objects. The cloneElement guard
`child.type !== Objective` fails open. Every objective renders in
display-only mode. Zero checkboxes in the built HTML.

This document locks the design for the fix. The fix ships as a
**remark-extraction pattern**: the remark plugin walks
`<LearningObjectives><Objective>` trees at MDX-parse time, harvests each
Objective into a JS array, and rewrites the parent AST node so the React
island receives `<LearningObjectives objectives={[...]} />` with no
children. Authors keep writing nested JSX in source; React sees a
prop-driven component. The pattern generalizes to every future
`<Parent><Child>` source-component pair Sophie ships.

## Why this exists

The handoff from the Bucket-C-close session flagged this as the
"most user-facing follow-up." Empirical verification in this
brainstorm confirmed the failure mode by reading the built smoke HTML
at `examples/smoke/dist/chapters/measuring-the-sky/index.html`:

- Zero `<input type="checkbox">` in the entire chapter.
- The LO island markup contains `<ul><astro-slot><li class="...displayOnly_84DEi">` — Objective primitive renders in its
  display-only fallback class, because cloneElement never reached it.
- Serialized hydration props on the island element contain `course`,
  `chapter`, `id`, `heading` only — not the children. Astro renders
  children server-side as slot HTML; the React tree never receives them.

The unit tests at
[LearningObjectives.test.tsx:62](../../packages/components/src/components/LearningObjectives/LearningObjectives.test.tsx#L62)
pass green because Vitest renders plain React, where children-as-JSX
flows the way the children-mode design assumed. The bug lives at the
MDX→Astro→React boundary, which only manifests in a real Astro build.

This pattern choice sets precedent. Every future `<Aside><AsideTitle>`,
`<KeyInsight><Step>`, or `<Misconception><Correction>`-shaped source
component faces the same boundary problem.

## Decisions locked

The brainstorm settled five design choices:

1. **Approach: remark-extraction.** Two alternatives considered:
   object-prop authoring (`objectives={[{...}, ...]}` literal in MDX —
   rejected as AI-unfriendly), and per-Objective islands (each Objective
   gets its own `client:load` + IDB record — rejected because it
   N-multiplies storage records per chapter and breaks the aggregate-
   completion UX baked into ADR 0007).

2. **Tree-rewrite algorithm.** New function `transformLearningObjectives`
   runs alongside the existing `extractObjectives` in
   `pedagogy-index-extractor.ts`. Harvest runs first (so invariant errors
   abort before mutation); rewrite uses the same harvested data. Empty
   LO blocks **throw**. Non-`<Objective>` JSX siblings inside `<LearningObjectives>` **throw**. Silent drops would create
   invisible content regressions; loud failures are the right shape.

3. **Component contract change.** `<Objective>` becomes truly pure-display
   with `body: NonEmptyString` (HTML string) replacing `children`.
   Renders via `dangerouslySetInnerHTML` inside the existing
   `<span className={styles.body}>`. `<LearningObjectives>` reads
   `objectives: { id, verb, body }[]` from a remark-injected prop and
   renders each entry through `<Objective>`. The `children?: ReactNode`
   type stays on `LearningObjectives` for MDX-author type-checking but
   the runtime ignores it (the remark transform strips them before
   React sees them). JSDoc spells out the contract.

4. **Test layers.** Three failing-test layers committed first:
   (a) **Layer 1** — unit test on `transformLearningObjectives`, asserting
   harvested attribute shape + empty children + error cases.
   (b) **Layer 1.5** — snapshot test on
   `remark.parse → plugin → remark.stringify` round-trip, catching
   accidental mutations of unrelated mdast nodes.
   (c) **Layer 2** — Playwright e2e on the smoke build: navigate to a
   chapter, count checkboxes (>0), click, reload, assert persistence.
   We already proved Layer 2 fails on `main`. Three layers turn green
   together when the implementation lands.

5. **No premature helper.** The transform ships as a bespoke
   per-pair function alongside the existing `extractDefinitions`,
   `extractEquations`, etc. handlers. A generic
   `transformParentChildPair<T>(...)` helper extracts when the
   *second* `<Parent><Child>` pair lands. Per ADR 0023 and the
   "abstract after ≥2 callers" rule. The design doc names this as
   the planned next refactor, so future-Anna recognizes the trigger.

## Out of scope

- **Generic `<Parent><Child>` helper extraction.** Deferred until the
  second pair ships. Likely candidates flagged in the design doc:
  `<Aside>` (if it gains structured slots), `<KeyInsight>` (if step-
  ordering becomes a requirement), `<Misconception>` (if corrections
  become nested children).
- **mdast-aware body serialization.** The transform serializes Objective
  bodies as HTML strings via the existing `renderChildrenToHtml`. If a
  future objective needs inline `<GlossaryTerm>` or `<EqRef>` cross-refs
  inside its body text, the serializer upgrades to mdast-passing then.
  The transform pattern stays compatible.
- **Storybook-only adapters.** Stories pass `objectives={[...]}` directly,
  matching the component's actual contract. No test-only abstraction
  that pretends to be the remark transform — per the
  testing-anti-patterns skill.

## Verification plan (summary)

Detailed in the design doc. High-level gates that must all pass before
PR opens:

- Three test layers green (Layer 1 transform unit, Layer 1.5 snapshot,
  Layer 2 Playwright on smoke).
- 3× consecutive Playwright runs green (SoTA condition-based-waiting
  discipline from PR-C4).
- Manual interactive verification on smoke dev: click an LO checkbox,
  reload the page, observe the state persisted.
- Smoke production build HTML contains `<input type="checkbox">`
  markers inside each LO section.
- axe-core a11y tests green on `<Objective>` and `<LearningObjectives>`
  (ADR 0004 — mandatory on every component PR).
- `pnpm biome check` clean (zero errors, zero warnings).
- `pnpm turbo run typecheck` green across all packages.
- `pnpm install --frozen-lockfile` clean (pre-PR lockfile gate).

## Cadence

- This overview lands on `main` directly (docs/registry → main rule).
- Engineering-precision design doc follows, also direct to `main`.
- Implementation on branch `feat/lo-checkbox-remark-extraction`,
  via [superpowers:subagent-driven-development](../../packages/) —
  fresh subagent per task, code-review subagent between each, ~7 tasks.
- PR opens after all verification gates pass locally.

## Pattern precedent

The fix codifies the durable answer to the MDX-render-boundary problem
for `<Parent><Child>` source components. Subsequent components that face
the same shape (children-driven authoring, parent owns shared state)
follow the same path:

1. Remark plugin walks the parent tag, harvests attribute + body data
   from each child.
2. Plugin replaces children with `[]` and adds a synthetic prop on the
   parent containing the harvested array.
3. Parent component reads the prop, renders the visual primitive itself
   for each entry.
4. Child component becomes pure-display, usable independently in
   server-rendered roll-up pages.
5. Parent's `children?: ReactNode` type stays for author-side
   type-checking; runtime ignores it.

This is the architectural contribution. The LO checkbox fix is the
first concrete application.
