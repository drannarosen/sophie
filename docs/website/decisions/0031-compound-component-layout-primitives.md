---
status: accepted
date: 2026-05-12
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [layout, components, astro, api-design]
---

# ADR 0031: Compound-component pattern for layout primitives

## Context

PR 1 of Bucket B
([feat/layout-shell-foundation, merged in PR #29](https://github.com/drannarosen/sophie/pull/29))
shipped Sophie's book-theme layout shell (top bar, sidebar, content
column, right column). Three packaging shapes were viable:

1. A single black-box `<TextbookLayout>` Astro component
   (one-line consumer integration; rigid customization).
2. Layout primitives — `<TopBar>`, `<Sidebar>`, `<ContentColumn>`,
   `<RightColumn>` — that consumers compose (flexible; verbose
   common case).
3. CSS-only utilities (maximum flexibility; re-implements
   semantics in every consumer).

The 2026-05-12 brainstorm chose neither option in isolation:
shipping *both* the assembled component AND its primitives matches
how Radix UI, React Aria, and Astro Starlight all package layout +
form primitives.

## Decision

`@sophie/astro` ships layout chrome as **compound components**:
both an assembled `<TextbookLayout>` (one-line default) AND the
underlying primitives (`<TopBar>`, `<Sidebar>`, `<ContentColumn>`,
`<RightColumn>`, `<SidebarToggle>`, `<TextbookHead>`). Default
usage is one line; sophisticated consumers compose primitives
directly when defaults don't fit.

```astro
---
// Default (one line; what AI scaffolds; ~95% of consumers):
import TextbookLayout from "@sophie/astro/components/TextbookLayout.astro";
import TextbookHead   from "@sophie/astro/components/TextbookHead.astro";
---
<head><TextbookHead /></head>
<body><TextbookLayout><slot /></TextbookLayout></body>
```

```astro
---
// Custom composition (escape hatch; rare):
import { TopBar, Sidebar, ContentColumn, RightColumn, SidebarToggle }
  from "@sophie/astro/components/...";
---
```

## Rationale

- **Best for all three audience priorities** per
  [ADR 0030](0030-audience-and-ai-author-model.md). Anna + AI
  scaffolding gets the one-line default. External instructors get
  the same plus an escape hatch for legitimate customization.
  Future-Anna gets primitives when special chapters need a
  non-default layout.
- **Each primitive is independently testable** (one axe-clean
  story per primitive vs. testing the whole layout monolithically).
- **Extension is non-breaking.** Adding `<Breadcrumb>` later is a
  new primitive, optionally composed by `<TextbookLayout>`. No
  prop-balloon on the assembled component.
- **Marginal cost is small.** ~6 primitive files vs. 1 monolithic
  file; ~150 LOC delta. ROI on customization flexibility outweighs
  the upfront cost.
- **Industry-standard pattern.** Radix UI, React Aria, Astro
  Starlight all use compound components for layout / form
  primitives. Sophie joins the convention.

## Alternatives considered

- **Monolithic `<TextbookLayout>` only.** Rejected: prop surface
  balloons as features land (PRs 2–10 each add chrome features);
  customization requires forking; AI scaffolding loses the
  "one-line" benefit anyway as props grow.
- **Primitives only (no assembled component).** Rejected: too much
  friction for the default case; AI scaffolding becomes verbose;
  external instructors must learn composition before they can
  ship.
- **CSS-only theme utilities.** Rejected: re-implements layout
  semantics in every consumer; no invariants enforced; bug surface
  large.

## Consequences

**Easier:**

- Future Bucket B PRs (2–10) each add ONE more primitive and wire
  it into the assembled component. Cleaner sprint shape; smaller
  diffs per PR; easier review.
- Visual regression and axe-clean tests can target individual
  primitives in Storybook.
- External-instructor docs ("get started in 60 seconds")
  demonstrate the one-line default; advanced docs show composition.

**Harder:**

- Two surfaces to maintain (assembled + primitives). Primitive
  prop changes ripple through the assembled component.
- Documentation must show both default and composition modes.

**Triggers:**

- Phase 7 `templates/starter-textbook/` uses the one-line default
  in the demo content.
- All Bucket B primitives (PRs 2–10) follow the same pattern:
  primitive + composed-into-assembled.

## References

- [PR #29](https://github.com/drannarosen/sophie/pull/29) —
  initial implementation of `<TextbookLayout>` + primitives.
- [docs/plans/2026-05-12-layout-shell-foundation-design.md](../../plans/2026-05-12-layout-shell-foundation-design.md)
  — full brainstorm of the three options.
- [overview.md §18](../overview.md) — book-theme layout + view
  modes design intent.
- [ADR 0019](0019-radix-ui-primitives.md) — Radix UI as the
  precedent for compound components in Sophie.
