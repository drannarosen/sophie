---
date: 2026-05-09T00:00:00.000Z
tags:
  - theming
  - design-tokens
  - css
  - tailwind
status: shipped
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0005: Three-layer theming (TS tokens → CSS vars + Tailwind preset; CSS Modules in components)

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie inherits a custom design system from the existing courses:
`tokens.scss`, `design-tokens.scss`, `callouts.scss`,
`lecture-cards.scss`, `nav-markers.scss`, `dashboard.scss`,
`glossary.scss`, `collapsible-cards.scss`. The roadmap correctly says
"port this, not reinvent it." But *how* to port it is the question.

Three layers need to be designed independently:

1. **The single source of truth** for design tokens.
2. **How platform components style themselves.**
3. **How chapter authors style their prose.**

Mixing these conflates concerns and forces consumers into platform
choices.

## Decision

Three layers, separately designed:

1. **`@sophie/theme/tokens.ts`** — TypeScript object with colors,
   spacing, typography, motion, focus, light/dark variants. Single
   canonical source.

2. **Build emits**:
   (a) `theme.css` — CSS custom properties keyed by `data-theme`.
   (b) Tailwind preset consuming the same tokens.

3. **Platform components style themselves via CSS Modules** referencing
   CSS custom properties. Components remain framework-pure and
   re-themable without rebuilding the platform.

4. **Chapter authors get Tailwind preset by default** (enabled in the
   `starter-textbook` template). Consumers may swap.

## Rationale

- **TS tokens as source:** type safety, IDE autocomplete, build-time
  check that token names referenced in components exist. Emit both
  CSS vars and Tailwind preset from one source — no two-source drift.
- **CSS custom properties for theme switching:** dark mode and
  reduced-motion / high-contrast preferences resolve via
  `:root[data-theme="dark"]` and `@media (prefers-*)` overrides, no
  JS toggle needed at the value level.
- **CSS Modules for component styling:** scoped class names without
  runtime cost; components stay framework-pure (work in React/Astro/
  anything); no class-name collisions with consumer styles.
- **Tailwind for chapter prose:** authoring rapid layout in MDX is
  much faster with utility classes; the Tailwind preset auto-consumes
  Sophie's tokens so chapter authors get the design system "for free."
  Consumers who don't want Tailwind can swap.

## Alternatives considered

- **Tailwind for platform components too.** Pros: ecosystem
  familiarity, smaller learning curve. Cons: forces Tailwind on
  consumers; class names become public API; consumer overrides
  become brittle. Rejected: platform should not dictate consumer
  toolkit.

- **Vanilla Extract / Panda CSS.** Type-safe, zero-runtime CSS-in-TS.
  Pros: more SoTA. Cons: adds a build dependency consumers see;
  toolchain becomes part of the API. Rejected: too heavy for a
  published platform.

- **CSS-in-JS (Stitches, Emotion).** Runtime cost; less SoTA in 2026.
  Rejected.

- **Pure CSS Modules with no Tailwind anywhere.** Pros: minimum
  dependencies. Cons: chapter authors lose utility-class authoring
  speed. Rejected: that speed is real.

## Consequences

**Easier:**

- Re-themable without rebuilding the platform — consumer overrides CSS
  vars in their own stylesheet; everything else just works.
- Tailwind users happy: preset auto-consumes tokens.
- Non-Tailwind users not forced into it.
- Component CSS scoped, no collisions with consumer styles.
- Dark mode / a11y preferences free via custom properties.
- Type safety on token names for component code that references them
  programmatically.

**Harder:**

- Two artifacts to keep in sync (CSS vars + Tailwind preset). Mitigated
  by both being generated from `tokens.ts`.
- Components can't use Tailwind class names (would force consumers
  into Tailwind), so prose-y inline-style helpers aren't available
  to component code. Acceptable: components are styled deliberately,
  not on-the-fly.

**Triggers:**

- SCSS-to-tokens.ts port in Phase 1 (mechanical, ~1-2 weeks).
- Tailwind preset published in `@sophie/theme`.
- `data-theme` toggling via a `<ThemeToggle />` component shipped
  in `@sophie/components`.
- Per-component token namespacing convention: `--color-<kind>-*`,
  `--space-<kind>-*`, `--radius-<kind>-*`. Audit catches collisions.

## References

- Brainstorming session, theming Q (May 2026).
- Existing course SCSS at `astr101-sp26/`, `astr201-sp26/`,
  `comp536-sp26/`.
- [reference/component-contract.md §8.11](../reference/component-contract.md)
  — Prediction's theming as worked example.
