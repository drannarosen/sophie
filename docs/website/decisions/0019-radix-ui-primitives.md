---
date: 2026-05-09T00:00:00.000Z
tags:
  - components
  - accessibility
  - radix
  - primitives
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0019: Radix UI primitives for accessible interactive components

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's interactive pedagogy components — the `<Prediction>`
confidence slider, future `<MisconceptionDialog>`, `<Example>` tabs
between worked/anti/applied variants, glossary tooltips,
`<MoreYouKnow>` collapsibles, the v2 dev-overlay sidebar dialog —
all need correct keyboard navigation, ARIA roles, focus management,
and live regions. WCAG 2.1 AA from day one
([ADR 0004](../decisions/0004-component-contract-revisions.md)).

Without a primitives library, every interactive component
re-implements focus trapping, ARIA wiring, keyboard handlers, and
collisions with screen readers. axe-core catches some of these,
not all. The cost of getting it wrong: real students with real
disabilities can't use the platform.

## Decision

**Radix UI primitives** (`@radix-ui/react-*`) are the foundation
for Sophie's interactive components. Radix ships unstyled, headless
React primitives with WCAG-correct keyboard navigation, ARIA, and
focus management. Sophie supplies the styling via CSS Modules
referencing
[design tokens](../decisions/0005-theming-three-layers.md).

Specific primitives in scope for v1:

- `@radix-ui/react-slider` — confidence slider in `<Prediction>`.
- `@radix-ui/react-tabs` — `<Example>` worked/anti/applied tabs.
- `@radix-ui/react-collapsible` — `<MoreYouKnow>`.
- `@radix-ui/react-tooltip` — glossary term hovers, audit
  warnings.

Phase 2+:

- `@radix-ui/react-dialog` — `<MisconceptionDialog>` (v3),
  dev-mode sidebar (v2).
- `@radix-ui/react-popover` — inline component metadata, audit
  hints.
- `@radix-ui/react-select` — profile switcher in dev sidebar,
  any future custom-select needs.

## Rationale

- **WCAG-correct out of the box.** Radix primitives ship with
  industry-standard keyboard patterns (slider arrow keys with home/
  end, tab role-switching, dialog focus trap, popover dismissal),
  ARIA attributes, and live-region wiring. Component authors get
  this for free instead of re-implementing.
- **Headless = composable with our design system.** Radix renders
  no styles; Sophie styles via CSS Modules. No fight with
  inherited theme; no `eslint-config-radix-prettier`-style shims.
- **Per-primitive packages.** Tree-shakable: a chapter using only
  `<Prediction>` doesn't ship `react-dialog`. Aligns with
  [ADR 0002](../decisions/0002-renderer-astro-mdx.md)'s per-island
  hydration discipline.
- **Mature.** Maintained by WorkOS; used by Vercel, Linear,
  Liveblocks, and most of the modern React ecosystem. Stable APIs.
- **Composable with Sophie's `useInteractive` hook.** Radix
  primitives accept controlled state; pair naturally with
  `useInteractive` from
  [ADR 0004](../decisions/0004-component-contract-revisions.md).

## Alternatives considered

- **Headless UI** (Tailwind Labs). Pros: similar headless
  philosophy. Cons: smaller scope (fewer primitives); slower
  release cadence than Radix; weaker accessibility track record on
  the harder primitives (combobox, slider). Rejected.
- **Ariakit** (formerly Reakit). Pros: similar headless approach;
  good a11y. Cons: smaller community; less battle-tested; some
  primitives missing. Rejected — Radix is the de-facto standard.
- **shadcn/ui.** Pros: built on Radix, ships beautiful styled
  components. Cons: ships its own Tailwind-coupled styling that
  conflicts with our framework-pure CSS Modules approach
  ([ADR 0005](../decisions/0005-theming-three-layers.md)). We can
  *learn from* shadcn's component patterns but won't *adopt* it as
  a dependency. Rejected as a dependency; valuable as a reference.
- **MUI / Mantine / Chakra.** Pros: full UI kits. Cons: opinionated
  styling baked in; bundle size; conflicts with our design system.
  Rejected.
- **Hand-rolled primitives.** Pros: total control, no deps. Cons:
  re-implementing accessibility correctly is research-grade work.
  Rejected — this is exactly what Radix exists to prevent.

## Consequences

**Easier:**

- Interactive components ship with correct keyboard nav, ARIA, and
  focus management without per-component re-implementation.
- axe-core tests pass more easily because the primitives are
  pre-validated.
- Future v2/v3 components (`<MisconceptionDialog>`, dev sidebar)
  get the same primitives library, no new infrastructure.

**Harder:**

- Each primitive is a separate `@radix-ui/react-*` package; the
  number of dependencies grows. Mitigated by tree-shaking and by
  declaring them in `@sophie/components` so consumer course repos
  see one entry point.
- Radix's API is sometimes terse; component authors need to learn
  the asChild / composition patterns.
- Some Radix primitives have small bundle weight that adds up;
  prefer client-island lazy-loading where the cost is
  user-perceived.

**Triggers:**

- `@sophie/components` declares the four v1 Radix peer deps from
  Phase 1.
- The `<Prediction>` worked example in
  [the component contract](../reference/component-contract.md)
  uses `@radix-ui/react-slider` for the confidence slider.
- Storybook stories test Radix-grounded primitives via axe-core
  in addition to component-level tests; the primitives are pre-
  validated, but composition is ours to verify.
- `shadcn/ui` is **referenced as a learning source** in the
  `<Name>.stories.tsx` and component-design conventions, **not**
  adopted as a dependency.

## References

- [Radix UI documentation](https://www.radix-ui.com/primitives).
- [ADR 0004](../decisions/0004-component-contract-revisions.md) —
  axe-core mandate that Radix helps satisfy.
- [ADR 0005](../decisions/0005-theming-three-layers.md) — CSS
  Modules + design tokens that style the unstyled primitives.
- [shadcn/ui](https://ui.shadcn.com) — reference patterns for
  component composition (not a dependency).
