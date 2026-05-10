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
| Roadmap / Summary / Section markers | 5× | `<LectureCard>` | `lecture-cards.scss` |
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

### `<LearningObjectives>` (chapter primitive)

**Purpose.** Renders the standard "By the end of this lecture, you
will be able to: 1. **Verb** ..." block at the top of every chapter.
Course-wide pedagogical convention.

**Props (proposed).**

```ts
interface LearningObjectivesProps {
  objectives: ReadonlyArray<{
    verb: string;        // e.g., "State"
    body: string;        // e.g., "the course thesis in one sentence: ..."
  }>;
  heading?: string;      // override default "Learning Objectives"
}
```

**State.** None. Pure structural component.

**A11y.** Render as `<section>` with `aria-labelledby` pointing at
the heading; objectives in an `<ol>`; the verb wrapped in
`<strong>` per existing prose convention.

**SCSS port.** None — new design. Tokens from `@sophie/theme`.

**Smoke change.** Replace lines 11–19 of `spoiler-alerts.mdx`
(the markdown-list version) with `<LearningObjectives objectives={[...]} />`
or with an MDX-friendly children-only API if the structured props
feel too rigid for AI-author DX. To decide during implementation;
default to structured props.

### `<LectureCard>` (structural)

**Purpose.** Section-marker / roadmap / summary blocks. Currently
approximated by `<Callout title="Roadmap..." variant="info">`.

**Props (proposed).**

```ts
interface LectureCardProps {
  variant: "roadmap" | "summary" | "section-marker" | "key-epoch";
  title: string;
  children: React.ReactNode;
}
```

**State.** None.

**A11y.** Section landmark (`<section>`); heading at the right
level (component renders an `<h3>` by default; configurable via
`as` prop).

**SCSS port.** `astr101-sp26/assets/theme/lecture-cards.scss` →
`packages/components/src/components/LectureCard/LectureCard.module.css`.
Map classroom SCSS variables to `@sophie/theme` tokens; surface
any missing tokens via PR-time additions to `@sophie/theme`.

**Smoke change.** Migrate ~5 Callouts (titles starting with
"Roadmap", "Summary", "Course Arc", "Key Epochs") from
`<Callout variant="info" title="...">` to
`<LectureCard variant="roadmap" title="...">`. PR description
includes a before/after screenshot.

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

- **MDX author DX for `<LearningObjectives>`**: structured props
  (`objectives={[{verb, body}, ...]}`) vs children-as-list
  (`<LearningObjectives>` wrapping a markdown numbered list, with
  the component parsing children). Decide during implementation;
  default to structured props for AI-authoring clarity.
- **`<LectureCard>` `as` prop**: should the heading level default
  to `h3` and be configurable, or follow MDX heading depth
  automatically via remark plugin? Default to `h3` for v1.
- **`<Predict>` confidence scale default**: 5-point Likert or
  7-point? Existing classroom convention if Anna has one;
  otherwise default to 5.

## See also

- [Phase 1 plan §4](../status/phase-1-plan.md#4-phase-1-priorities-updated-2026-05-10) — the priority list this design satisfies.
- [ADR 0023](../decisions/0023-vertical-slice-build-order.md) — vertical-slice-first, reconfirmed for each trio.
- [ADR 0027](../decisions/0027-mdx-render-boundary-prop-threading.md) — per-instance hydration pattern; Predict is the second proof point.
- `~/.claude/plans/we-re-starting-sophie-phase-twinkling-dusk.md` — Phase 1 step 1 plan and execution trail.
