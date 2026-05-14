---
date: 2026-05-12
tags: [layout, astro, slots, ux]
---

# ADR 0034: Empty layout slots collapse to 0 width via `Astro.slots.has()`

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

PR 1 (Bucket B) shipped layout primitives following the
compound-component pattern of
[ADR 0031](0031-compound-component-layout-primitives.md). In PR 1's
default usage, the sidebar (PR 3 will fill) and right column
(PR 4 + 6 will fill) had no content. Their containers still
reserved 280 px each — visible empty gray columns that consumed
~39% of a 1440 px viewport for chrome with no content.

Anna's audit feedback ("the visualization looks much worse now")
captured a real perception bug: structural primitives that look
"finished" by reserving their full width but contain nothing
advertise their incompleteness.

Three responses were viable:

1. Don't ship the structural primitives until they have content.
2. Render them at full width (the broken state).
3. Detect empty slots at Astro render time and collapse the grid
   tracks to 0 width via CSS variables.

## Decision

Sophie's layout primitives that own grid tracks **collapse to 0
width when their named slots are empty.** The detection happens
at Astro render time via `Astro.slots.has("<name>")`, which sets
the corresponding CSS variable to 0 inline:

```astro
---
const hasSidebarSlot = Astro.slots.has("sidebar");
const hasRightSlot = Astro.slots.has("right");
const collapsedVars = [
  hasSidebarSlot ? null : "--sophie-sidebar-w: 0",
  hasRightSlot ? null : "--sophie-right-w: 0",
].filter(Boolean).join(";");
---
<div class='sophie-shell' style={collapsedVars || undefined}>
  ...
</div>
```

The structural primitives (`<Sidebar>`, `<RightColumn>`) still
render in DOM so consumers can compose them later, but the grid
tracks reserve no space.

## Rationale

- **Best UX in the interim.** Sophie's component library is
  shipped incrementally (Bucket B is 10 PRs). Each PR ships
  primitives that won't be filled until later. Empty visible
  containers communicate "broken, missing piece"; collapsed
  containers communicate "structurally ready, nothing to render
  yet."
- **Pattern reuses across all layout primitives.** Same approach
  applies to PR 4's in-page ToC (collapses if MDX has no
  headings), PR 6's margin asides (collapses if no `<Aside>`
  uses), future Phase 5 dual-profile annotations.
- **Structural existence is preserved.** Tests can still assert
  the primitives are `toBeAttached` even when collapsed; the
  contract "the layout has these slots" survives the visual
  collapse.
- **CSS-variable swap is cheap.** Same mechanism the sidebar
  toggle uses; no special JS layer; degrades to gracefully
  invisible if JS is disabled.

## Alternatives considered

- **Defer shipping the structural primitives until they have
  content.** Rejected: blocks the compound-component-pattern
  benefit; consumers can't compose the right column custom-
  content until PR 4 + 6 land otherwise.
- **Visible empty containers.** Rejected per Anna's audit: looks
  unfinished and consumes viewport budget the chapter content
  could use.
- **`display: none` on the empty container.** Rejected: doesn't
  collapse the grid track size; the track still reserves 280 px
  when its child is `display: none`.
- **Conditional `{hasSidebarSlot && <Sidebar>...}` rendering.**
  Rejected: makes the structural primitive disappear from DOM,
  breaking `toBeAttached` assertions and any consumer that
  queries `.sophie-sidebar` for late-binding content.

## Consequences

**Easier:**

- PRs 3 (sidebar nav), 4 (in-page ToC), 6 (margin asides) each
  *expand* a column simply by passing the matching named slot.
  No additional CSS changes needed in those PRs.
- Test contracts stay stable: `toBeAttached` for structural
  existence; `clientWidth === 0` for "empty and collapsed";
  `clientWidth > 0` for "filled and visible" (PRs 3+ assertions).

**Harder:**

- Consumers who ship a custom `Sidebar.astro` (replacing the
  default primitive) must remember to use the same
  `Astro.slots.has()` pattern — or accept that their custom
  sidebar always reserves space.
- The detection runs at render time; consumers populating slots
  via JS (post-render) won't trigger column expansion. v1 ships
  no such pattern.

**Triggers:**

- PRs 3, 4, 6 each ship a primitive that fills a previously-
  empty slot. Each PR's tests must assert the pre-existing
  collapse-when-empty test still passes when the slot is
  intentionally empty (regression guard).
- A future ADR may extend the pattern to other layout-affecting
  metadata (e.g., chapter `frontmatter.layout: "wide"` collapsing
  the right column unconditionally).

## References

- [PR #29](https://github.com/drannarosen/sophie/pull/29) — fix-up
  commit `358a231` introduced the pattern.
- [overview.md §18](../overview.md) — book-theme layout intent.
- [ADR 0031](0031-compound-component-layout-primitives.md) —
  compound-component pattern that this collapse rule supports.
- [Astro docs — `Astro.slots`](https://docs.astro.build/en/reference/api-reference/#astroslots)
  — official `Astro.slots.has()` semantics.
