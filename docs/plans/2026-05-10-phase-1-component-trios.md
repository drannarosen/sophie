---
title: Phase 1 component trios — design
short_title: Phase 1 component trios
description: Detailed design for the 9 v1 components Phase 1 will build, sequenced as three class-coverage trios using examples/smoke as the proving ground.
tags: [phase-1, components, design, planning]
date: 2026-05-10
---

# Phase 1 component trios — design

## Context

Phase 0 shipped three v1 components — `<Callout>`, `<Figure>`,
`<InteractiveCallout>` — proven against the trimmed ASTR 201 first
reading at `examples/smoke/src/content/chapters/spoiler-alerts.mdx`
(1198 lines; 30 Callouts, 19 Figures, 6 InteractiveCallouts).
Phase 1 step 1 (resolved 2026-05-10; see
[phase-1-plan.md §5.1](../status/phase-1-plan.md#51-linux-ci-build-job-fails-resolved-2026-05-10))
landed the consumer-side Vite/esbuild peerDeps + the
architectural fix that made Linux CI green for the first time.
Branch protection on `main` is now in force.

The original Phase 1 plan said `examples/smoke/` would be replaced
by a separate `drannarosen/astr201` consumer repo. Re-evaluating:
smoke is a *complete chapter* (1198 lines, real ASTR 201 content),
not a fixture stub. Standing up a second repo before any new
component lands is overhead with no proportional unblocking. We
defer `drannarosen/astr201` until smoke's content footprint
outgrows "single chapter" or there's external publishing pressure.
Smoke becomes the canonical Phase 1 proving ground.

This document specifies the 9 new v1 components Phase 1 will build,
sequenced as three class-coverage trios. Each trio validates a
different shape of the [ADR 0004 contract](../decisions/0004-component-contract-revisions.md)
+ [ADR 0027 hydration pattern](../decisions/0027-mdx-render-boundary-prop-threading.md):
structural primitives, content blocks, and persistence-bearing
interactives.

## Component survey (smoke chapter ground truth)

The 9 candidates emerged from cataloging every JSX usage and
every prose pattern in `spoiler-alerts.mdx`:

### Tier 1 (recurring JSX/Callout title patterns)

| Pattern | Smoke usages | Component | SCSS source |
|---|---|---|---|
| Deep Dive | 4× | `<CollapsibleCard>` | `astr101-sp26/assets/theme/collapsible-cards.scss` |
| Roadmap / Summary / Section markers | 6× | **Callout variant expansion** (`variant="roadmap"`, `variant="summary"`, `variant="key-insight"`) — NOT a new component | `callouts.scss` `.callout-roadmap` / `.callout-summary` / `.callout-key-insight` |
| Equation explainer | 7× | `<KeyEquation>` | New (no classroom SCSS) |

### Tier 2 (clear pattern, smaller scope)

| Pattern | Smoke usages | Component | Notes |
|---|---|---|---|
| Prediction Moment | 1× explicit | `<Predict>` | Persistence-bearing (predict-then-reveal) |
| Misconception Alert | 1× | `Callout variant="misconception"` | Variant extension, not new component |
| Checkpoint / Pause | 2× | `Callout variant="checkpoint"` | Variant extension |

### Tier 3 (prose patterns — discovered on second pass)

| Pattern | Smoke usages | Component | SCSS source |
|---|---|---|---|
| Learning Objectives block | 1× (every chapter) | `<LearningObjectives>` | New |
| Pull Quote | 2× | `<PullQuote>` | New |
| Mini-Glossary | 1× explicit (recurs in other chapters) | `<MiniGlossary>` | `glossary.scss` |
| Equation block (numbered + captioned) | 4× `$$` blocks | `<Equation>` (wrapper around KaTeX) | New |

## Trio 1 — chapter primitive + structural + persistence

Validates ADR 0027 across three contract classes early so the
pattern is de-risked before committing to 9 components.

### `<LearningObjectives>` (chapter primitive — persistence-bearing)

**SHIPPED 2026-05-10** (commit on phase-1/learning-objectives).

**Purpose.** Renders the standard "By the end of this lecture, you
will be able to: 1. **Verb** ..." block at the top of every chapter
**as a checkable task list**. Students mark which objectives they
feel confident about; per-objective state persists per
course/profile/chapter via `useInteractive`. Course-wide pedagogical
convention plus self-assessment affordance.

**Persistence-bearing scope-change.** This component's design
shipped persistence-bearing (Anna's request: students can check off
outcomes). The original design doc had this as pure-structural —
the upgrade means Trio 2 contains TWO persistence components
(LearningObjectives + Predict), not one. Even better de-risking of
ADR 0027's per-instance hydration pattern: two structurally
*different* persistence shapes (multi-checkbox list vs form +
gated reveal) in the same trio.

**Props (shipped).**

```ts
interface Objective {
  id: string;     // author-supplied stable key per objective
  verb: string;   // e.g., "State"
  body: string;   // e.g., "the course thesis in one sentence: ..."
}

interface LearningObjectivesProps {
  course: string;          // ADR 0027 per-instance hydration props
  chapter: string;
  id: string;              // unique per <LearningObjectives> instance
  objectives: Objective[];
  heading?: string;        // override default "Learning Objectives"
}
```

**State.** Per-objective checked state, written via `useInteractive`
under key `learning-objectives:${componentId}:${objectiveId}:checked`.
Each `<ObjectiveRow>` child calls `useInteractive` independently
(matches the InteractiveCallout pattern).

**Author-supplied id rationale.** Stable across edits/reorders. If
the key were the array index or a derived slug, any chapter
revision could silently corrupt students' previously-checked state.
Same reason `<InteractiveCallout>` and `<Predict>` require explicit
ids — pattern consistency.

**Disabled-while-loading hydration guard.** Each checkbox sets
`disabled={status === "loading"}` and `aria-busy={loading}` until
useInteractive reaches `"ready"`. Otherwise a click landing
between mount and IDB-fetch completion gets silently overwritten by
the fetch's `setLocalValue(persisted ?? initial)`. With multiple
useInteractive calls per LearningObjectives (one per objective),
the race surfaces ~30% of test runs without this guard. The
guard ALSO improves real UX (a click on a not-yet-hydrated control
isn't lost) and gives screen readers an honest "this control is
updating" signal. Tested by a `not.toBeDisabled()` waitFor before
clicking — 10/10 stable test runs after.

**A11y.** Render as `<section>` with an `<h2>` heading; objectives
in an `<ol>`; each row is `<input type="checkbox">` + `<label>`
properly associated by id. The verb is wrapped in `<strong>`.
`aria-busy` on each input while loading. Zero axe violations
verified by the unit test suite + the smoke e2e test.

**Smoke change.** Lines 11–19 of `spoiler-alerts.mdx` (the
markdown numbered list under `## Learning Objectives`) replaced by
a `<LearningObjectives client:load .../>` call with the same five
objectives keyed by stable ids (`thesis`, `inference`, `quantities`,
`fls`, `wavelength`). The chapter's `## Learning Objectives` h2 is
absorbed into the component's own heading (configurable via the
`heading` prop). The component sits in `examples/smoke/` as the
first Trio 2 component using the proving-ground rather than a
new consumer repo per [phase-1-plan §4.1](../website/status/phase-1-plan.md#41-component-build-sequence-class-coverage-trios).

### Callout variant expansion — replaces the originally-proposed `<LectureCard>`

**SHIPPED 2026-05-10** as Trio 2 component #2.

**Design correction.** The original design doc proposed a new
`<LectureCard>` component for in-chapter Roadmap/Summary blocks
and pointed at `astr101-sp26/assets/theme/lecture-cards.scss` as
the SCSS source. Inspection revealed two distinct concepts had
been conflated:

- **In-chapter section markers** (Roadmap, Summary, Course Arc,
  Key Epochs, Key Insight) → these are *Callout variants* in the
  existing classroom CSS (`callouts.scss` defines `.callout-roadmap`,
  `.callout-summary`, `.callout-key-insight`, and ~10 other
  pedagogical variants).
- **Course-level listing cards** (the actual `lecture-cards.scss`
  file) → these are GRID listings of lectures/homework/solutions
  with date+title+summary+link. Not used in chapter prose.

A new component was therefore the wrong shape. The right shape is
**extending Sophie's existing `<Callout>` with the section-marker
variants** the smoke chapter actually uses.

**What shipped:**

- `CalloutVariant` Zod enum extended from `["info","warning","tip","caution"]`
  to add `"roadmap"`, `"summary"`, `"key-insight"`.
- `variantTitles` map gains the defaults `"Roadmap"`, `"Summary"`,
  `"Key Insight"`.
- `Callout.module.css` adds `.roadmap`, `.summary`, `.key-insight`
  classes, each with `border-left-color` + tinted `background`
  (color-mix in oklab) + colored `.title`. Color tokens reuse the
  existing Sophie palette: `--sophie-text-muted` (roadmap; neutral
  navigational), `--sophie-status-success` (summary; recap), and
  `--sophie-status-warning` (key-insight; gold emphasis).
- Smoke chapter migrates 6 Callouts: 3 → `variant="roadmap"`
  (Your Roadmap, Spoiler Reel Roadmap, Course Arc Preview), 2 →
  `variant="summary"` (Spoiler Reel Summary, Key Epochs in Cosmic
  History), 1 → `variant="key-insight"` (The Core Insight,
  previously `variant="tip"`).

**Tests:** 3 added (renders-all-7-variants, default-title-per-new-variant,
axe-zero-per-new-variant). All existing Callout/InteractiveCallout
tests still pass. 33/33 unit, 6/6 e2e — no regressions.

**Deep-dive deferred.** Deep Dive blocks need *collapsible
behavior* (skippable on first read = the defining feature). A
non-collapsible "deep-dive" Callout variant is structurally a
different thing. Deep-dive lands with `<CollapsibleCard>` in
Trio 3 instead.

**No `<LectureCard>` component exists or will exist.** When a
future use case calls for course-level listing cards (browsing
lectures/homework/solutions), that's its own component and Sophie
will port `lecture-cards.scss` then. Not in scope until that
consumer appears.

### `<Predict>` (persistence-bearing)

**Purpose.** Predict-then-reveal pedagogical pattern. User commits
a prediction → reveals expected answer → user can self-assess.
Persistence so reloads remember the user's prediction and
confidence.

**Props (proposed).**

```ts
interface PredictProps {
  course: string;        // ADR 0027: per-instance hydration props
  chapter: string;
  id: string;            // unique per-instance key
  prompt: string;        // the question/prediction prompt
  children: React.ReactNode;  // the reveal content (rendered after commit)
  confidenceScale?: 5 | 7 | 10;  // default 5
}
```

**State (persisted via `useInteractive`).**

```ts
interface PredictState {
  prediction: string;
  confidence: number;    // 1..confidenceScale
  revealed: boolean;
  ts: number;
}
```

**A11y.** Form-shaped: `<fieldset>` + `<legend>` for the prompt;
labelled `<textarea>` for prediction; labelled radio group for
confidence; a "Reveal" button gates the reveal content. After
reveal, focus moves to the reveal section's heading via `tabIndex={-1}`
+ `ref.current?.focus()` per existing pattern in
`@sophie/components/src/runtime/useInteractive.ts`.

**SCSS port.** None — new design. Reuse Callout token palette for
the wrapper; new tokens for the form-control surfaces (matching
existing classroom Predict styling if Anna has it elsewhere).

**Smoke change.** The single explicit "Prediction Moment" Callout
(line 264) is migrated to `<Predict course="astr201" chapter="spoiler-alerts" id="course-thesis" prompt="..." />`.
Test: e2e exercises the predict → reveal → reload-persistence cycle
exactly as the InteractiveCallout test does.

**Why Predict in Trio 1.** It's the only persistence-bearing
component in the list, so it exercises ADR 0027 a second time.
Phase 0 proved the pattern for InteractiveCallout; Predict's
shape (form, multi-field state, gated reveal) is *different
enough* that a second proof point matters before we commit to
the rest of the trios.

## Trio 2 — structural + content + structural

Lower-risk than Trio 1; momentum trio after the contract pattern
is doubly proven.

- **`<CollapsibleCard>`** (Deep Dive). Skippable on first read;
  expands on demand. Persists the open/closed state per-instance
  via `useInteractive` (state is `{ open: boolean }`). SCSS port
  from `collapsible-cards.scss`. Smoke migrates 4 "Deep Dive"
  Callouts.
- **`<KeyEquation>`** (equation explainer). Equation + caption +
  framing prose, distinguished from inline `$$` blocks. New
  design. Smoke migrates 7 equation-explainer Callouts.
- **`<MiniGlossary>`** (orientation-only term cluster).
  Definition-list rendering with optional inline expansion. SCSS
  port from `glossary.scss` (subset; the full course-wide
  Glossary is Phase 2+). Smoke migrates the line-312 Mini-Glossary
  section.

## Trio 3 — content + content + variant-extension

- **`<PullQuote>`** (decorative blockquote). Multi-line attribution,
  decorative quote marks via CSS. Smoke migrates the Carl Sagan
  quote (lines 33–35) and the thesis quote (line 106).
- **`<Equation>`** (numbered + captioned KaTeX wrapper).
  Generates an equation number + caption + cross-reference id.
  Smoke applies retroactively to `$$` blocks; existing `$$`
  remains valid where numbering isn't needed.
- **Callout variants** — extend to `misconception`, `checkpoint`.
  No new component; just style + token additions to
  `Callout.module.css` and the variant prop's accepted values.

## SCSS porting playbook

Per [ADR 0005](../decisions/0005-theming-three-layers.md)'s "port
not redesign" rule and [ADR 0026](../decisions/0026-tailwind-v4-css-first.md)'s
v4 CSS-first commitment.

For each component PR:

1. Locate the source SCSS file under `astr101-sp26/assets/theme/`.
2. Translate to a CSS Module at
   `packages/components/src/components/<Name>/<Name>.module.css`.
3. Replace `$variable` SCSS lookups with `var(--token-name)` from
   `@sophie/theme`'s `@theme` block.
4. If the SCSS uses a token that doesn't exist in `@sophie/theme`,
   add it to `packages/theme/src/tokens.ts` (the canonical TS
   source) and re-emit `packages/theme/dist/theme.css`. New tokens
   in the same PR as the consuming component.
5. Apply mappings: `--color-callout-info-fg` → `--color-callout-fg`
   (the ASTR 101 dark/light variants come from
   `site-{light,dark}.scss` which already feed
   `@sophie/theme`'s light/dark variant blocks).

Shared SCSS files (`_design_tokens.scss`, `site-{light,dark}.scss`)
are *not* ported as a separate step — their token contents are
already in `@sophie/theme` from Phase 0. Component PRs add
component-specific SCSS contents only.

## Contract-test recipe (per component)

Every component PR includes:

1. **Contract conformance** — Vitest unit tests that exercise the
   component's props matrix and verify rendered output via
   `@testing-library/react`. Lives at
   `packages/components/src/components/<Name>/<Name>.test.tsx`.
2. **Axe-core a11y** — same `<Name>.test.tsx`, includes a
   `axe(container)` assertion per the
   [ADR 0004 mandate](../decisions/0004-component-contract-revisions.md).
3. **e2e in smoke** — at
   `examples/smoke/e2e/<name>-rendering.spec.ts`. Renders a smoke
   page that uses the component, asserts visible behavior + axe
   via `@axe-core/playwright`. For persistence-bearing
   components: also asserts persistence across reload (the
   `proving-chapter.spec.ts` test pattern).
4. **Storybook story** (Trio 1 component #3 onward) — at
   `packages/components/src/components/<Name>/<Name>.stories.tsx`.
   Variants by prop combination. Storybook itself is added in the
   Trio 1 component-#3 (Predict) PR.

## Open questions

- ~~**MDX author DX for `<LearningObjectives>`**: structured props
  vs children-as-list~~ — **resolved 2026-05-10**: structured props
  with author-supplied `id` per objective. Same explicit-id pattern
  as `<InteractiveCallout>`. Edit-resilient.
- ~~**`<LectureCard>` `as` prop**~~ — **resolved by design
  correction**: `<LectureCard>` was a phantom component; section
  markers are now Callout variants. Heading-level question moot
  (Callout uses an `<aside role="note">` with `aria-label`, not a
  semantic section heading).
- **`<Predict>` confidence scale default**: 5-point Likert or
  7-point? Existing classroom convention if Anna has one;
  otherwise default to 5.

## Lessons surfaced during Trio 2 (LearningObjectives)

- **The disabled-while-loading hydration guard pattern.** Any
  component that calls `useInteractive` more than once (or where
  user input could land between mount and IDB-fetch completion)
  needs an explicit "loading" gate on its interactive controls.
  Rationale: useInteractive's IDB-fetch effect calls
  `setLocalValue(persisted ?? initial)` unconditionally on
  resolution. A click before resolution gets local state set
  optimistically, then overwritten by the fetch. Test flakes
  ~30% without the gate; 10/10 stable with it. **All future
  persistence-bearing components in the trios should follow this
  pattern.** Predict, CollapsibleCard's open/closed state, etc.
- **Author-supplied id per persisted child.** When a component
  persists state for child elements (here: per-objective checked
  state), the keying *must* survive author edits. Array index =
  fragile; derived slug = fragile; explicit author-supplied id =
  stable. Make this a design rule for v1 components.
- **Trio 2's persistence-bearing count is now 2** (LearningObjectives
  + Predict), not 1. Even better de-risking of ADR 0027 — two
  structurally different persistence shapes get exercised in the
  same trio.

## See also

- [Phase 1 plan §4](../status/phase-1-plan.md#4-phase-1-priorities-updated-2026-05-10) — the priority list this design satisfies.
- [ADR 0023](../decisions/0023-vertical-slice-build-order.md) — vertical-slice-first, reconfirmed for each trio.
- [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md) — per-instance hydration pattern; Predict is the second proof point.
- `~/.claude/plans/we-re-starting-sophie-phase-twinkling-dusk.md` — Phase 1 step 1 plan and execution trail.
