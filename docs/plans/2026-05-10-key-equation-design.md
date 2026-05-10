# KeyEquation — Design

**Date**: 2026-05-10
**Status**: Validated; ready for implementation
**Trio**: 3 (component #2 of 3)
**Authors**: Anna (collaborator), Claude (drafter)
**Source plan**: [docs/plans/2026-05-10-phase-1-component-trios.md § Equation explainer → KeyEquation](2026-05-10-phase-1-component-trios.md)

## Purpose

Owns the "named equation" pattern: a substantive content block that
presents a specific equation by name, with framing prose, variable
definitions, and key insights. Distinct from inline `$$...$$` blocks
(bare KaTeX renders) and from Callouts (tangential notes).

## Scope correction from the source plan

The original trio-plan estimated ~7 migrations of "equation-explainer
Callouts" in the smoke chapter. Inspecting the actual content showed
those 7 span three genres — only 2 are true named-equation blocks.
This PR ships **KeyEquation + 2 migrations** (Inverse-Square Law,
Wien's Law). The other 5 stay as Callouts for now; if a real component
shape emerges for "worked example" or "concept note", we add them as
follow-up.

## Decisions

1. **Content, not persistence-bearing**. No `course/chapter` props.
   No `client:load` directive in MDX — flows through Astro's static
   `<Content components={...}>` map.
2. **Required `id` prop** for stable hash anchors + future
   cross-references. Matches Sophie's standing convention that
   chapter-content components require explicit author-supplied ids.
3. **Simple-container API**: `id`, `title`, `children`. No structured
   slots for `equation`, `variables`, or `insight` — author writes
   the body as flowing MDX. Mirrors Callout's ergonomics.
4. **Region landmark + non-heading title**. `<section role="region"
   aria-labelledby="...">` with the title rendered as `<p>` rather
   than a heading. Equation blocks are substantive content (warrants
   `region` over `note`), but adding a real heading inside KeyEquation
   would fight the chapter's `### Spoiler N` (h3) section structure.
5. **Violet accent** (`--sophie-brand-violet`). Distinct from Callout's
   teal info-tone and Predict's rose elicitation-tone. Three components,
   three accents — visual coding helps students scan a chapter.

## API surface

```ts
export interface KeyEquationProps {
  id: string;     // outer DOM id — hash anchor + future cross-ref target
  title: string; // equation name — visible label + accessible name
  children: React.ReactNode;
}
```

**MDX usage**:

```mdx
<KeyEquation id="inverse-square-law" title="The Inverse-Square Law">
We'll develop this properly in a later lecture...

$$ F = \frac{L}{4\pi d^2} $$

where $F$ is flux, $L$ is luminosity, $d$ is distance.

**The key insight:** Flux falls off as $1/d^2$.
</KeyEquation>
```

No `client:load`. The component renders identically server-side and
client-side; the existing `<Content components={...}>` map in
[examples/smoke/src/pages/chapters/[slug].astro](../../examples/smoke/src/pages/chapters/[slug].astro)
will pick it up once added to the map.

## Internal structure

```tsx
import { useId } from "react";
import styles from "./KeyEquation.module.css.js";

export function KeyEquation({ id, title, children }: KeyEquationProps) {
  const titleId = useId();
  return (
    <section
      id={id}
      role="region"
      aria-labelledby={titleId}
      className={styles.section}
    >
      <p id={titleId} className={styles.title}>
        {title}
      </p>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
```

**Why this shape**:

- `<section role="region">` with `aria-labelledby` — substantive content
  landmark; screen-reader users can navigate equation-by-equation.
- `<p>` for the title — visible label without polluting the document
  outline (chapter sections already use h3).
- `useId()` for the labelledby link — stable per-instance React id;
  pairs with the author-supplied `props.id` (outer DOM id for hash
  anchors). The two ids serve different purposes.
- No client state, no hooks beyond `useId`. Cheapest possible
  component, structurally.

## Styling

CSS Module — new design (no SCSS source to port). Key choices:

- Violet accent (`--sophie-brand-violet`) + serif title font
  (`--sophie-font-serif`) — visually distinct from Callout/Predict.
  Serif title cues "named mathematical object" the way textbooks do.
- 4px left border (thicker than CollapsibleCard's 3px) — signals
  "substantive content, stop and read."
- `:target` outline highlight when the URL is `#wiens-law` — makes
  cross-references feel responsive.
- `scroll-margin-block-start` — hash-link jumps have breathing room
  from the viewport top.
- `.katex-display` styling — equation block gets margin + horizontal
  overflow scroll for wide equations on narrow viewports.
- Logical properties throughout (`margin-block`,
  `border-inline-start`, `padding-block`).
- Per-component token override hooks (`--color-ke-accent`,
  `--space-ke-pad-y`, etc.) for chapter-level theme overrides without
  forking the component.

See section 3 of the brainstorming transcript for the full CSS body.

## Smoke chapter migration

Two `<Callout variant="info" title="...">` blocks convert:

| Line (approx) | id | Title |
|---|---|---|
| ~244 | `inverse-square-law` | "The Inverse-Square Law" |
| ~1033 | `wiens-law` | "Wien's Law" |

**Smoke chapter count drift**:

- `role="note"` Callouts: 31 → 29.
- `role="region"` landmarks: +2 (the two new KeyEquations).

**Components map**: add `KeyEquation` to the static map in
[examples/smoke/src/pages/chapters/[slug].astro](../../examples/smoke/src/pages/chapters/[slug].astro)
alongside `Callout`, `Figure`. No `client:load` needed in MDX.

**Imports**: add `KeyEquation` to the chapter's existing `import {...}
from "@sophie/components"` statement.

## Exports

`packages/components/src/index.ts`: add `KeyEquation` +
`KeyEquationProps` + `KeyEquationPropsSchema` + `keyEquationContract`,
alphabetically after `Figure` and before `InteractiveCheckbox`.

## Testing scope

**Unit tests** (`KeyEquation.test.tsx`):

1. Renders the title as visible text + an `aria-labelledby` region.
2. Sets the outer DOM `id` to the prop value (hash-anchor support).
3. Renders children verbatim (including a `$$` block placeholder
   simulating a KaTeX render).
4. Rendered as `<section role="region">` (not `role="note"`).
5. Two instances with different ids don't share DOM ids (sanity).
6. Axe-core: zero structural violations.

**E2E test** (`examples/smoke/e2e/key-equation.spec.ts`):

1. Both KeyEquations render on `/chapters/spoiler-alerts` with their
   titles visible.
2. Hash navigation: visiting `/chapters/spoiler-alerts#wiens-law`
   scrolls Wien's Law into view.
3. KaTeX renders inside KeyEquation: the `.katex-display` element is
   present in both.
4. Axe-core: zero structural violations on the spoiler-alerts chapter
   (`disableRules(["color-contrast"])` per Sophie's standing posture).

**Storybook story** (`KeyEquation.stories.tsx`):

- ShortForm — "Wien's Law" body (compact).
- LongForm — "Inverse-Square Law" body (rich).
- EquationFirst — minimal framing.
- WithBlockMath — hand-crafted `.katex-display` markup to exercise
  the CSS rule (Storybook doesn't process MDX, so KaTeX-rendered HTML
  is mocked).

Per ADR 0028: test-runner runs axe-only on the 4 stories. No
persistence, no namespacing pattern needed.

**Expected test counts after this PR**:

- Unit: 88 → 94
- E2E: 15 → 19
- Storybook: 36 → 40

## Out of scope (intentionally deferred)

- **Equation numbering** ("Equation 3.4") and a `<EquationRef
  id="wiens-law" />` cross-reference component. Real future need;
  smoke doesn't yet require it. Adding numbering later is non-breaking
  given `id` is already required.
- **Worked-example component** (`<WorkedExample>` or similar). The
  smoke Callouts "Visible Light Frequencies" and "Comparing Photon
  Energies" are a distinct genre — present a question, walk through
  calculation. Track as a Trio 4+ candidate.
- **Concept-note component**. "What Planck's Constant Means" is pure
  prose about a constant, no equation block. Stays a Callout for now;
  if a third instance appears in another chapter, the pattern can be
  named.
- **Multi-render-mode support** (slide, print). Read-mode only for v1
  per ADR 0015's deferred render modes.

## Verification

Per superpowers:verification-before-completion, the PR is green when:

- `pnpm exec turbo run typecheck test:unit build` clean.
- `pnpm test:e2e` includes the new spec, 19 specs total all pass.
- `pnpm test:storybook` against the static build — 40 stories
  axe-clean.
- `pnpm lint` + `pnpm format` clean (Biome).
- 6 required CI checks green on first push.

## References

- [ADR 0001](../website/decisions/0001-platform-not-monorepo.md) — framework-pure React components.
- [ADR 0003](../website/decisions/0003-zod-as-source-of-truth.md) — schema mirrors props.
- [ADR 0005](../website/decisions/0005-theming-three-layers.md) — design tokens + CSS Modules.
- [ADR 0027](../website/decisions/0027-mdx-render-boundary-prop-threading.md) — content components flow through `<Content components={...}>`; only persistence-bearing need `client:load`.
- [ADR 0028](../website/decisions/0028-storybook-setup.md) — test-runner axe-only.
- [docs/plans/2026-05-10-phase-1-component-trios.md](2026-05-10-phase-1-component-trios.md) — Trio 3 overall.
- coding-standards.md § Tests — Vitest + jest-axe per component.
