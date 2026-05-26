---
date: 2026-05-09T00:00:00.000Z
tags:
  - theming
  - design-tokens
  - css
  - tailwind
status: shipped
validation:
  status: validated
  last_validated_date: "2026-05-25"
  evidence:
    - kind: deployment
      ref: packages/theme/src/tokens.ts
      date: "2026-05-25"
      notes: "Layer 1 (single source of truth) shipped — 130-line canonical TS token object exporting `tokens.color.*`, `tokens.spacing.*`, `tokens.font.*`, etc. Every CSS variable name flows from this file via the `v()` helper."
    - kind: deployment
      ref: packages/theme/scripts/generate-css.ts
      date: "2026-05-25"
      notes: "Layer 2 (delivery) — build-time generator emits `dist/theme.css` with CSS custom properties keyed by `:root` + `[data-theme=\"dark\"]`. The Tailwind `@theme` emit lives in the sibling `generate-tailwind.ts` script; refinement of 'Tailwind preset' → CSS-first is locked in ADR 0026."
    - kind: deployment
      ref: packages/components/src
      date: "2026-05-25"
      notes: "Layer 3 (consumption) — 45 `*.module.css` files across `@sophie/components` reference the CSS custom properties from Layer 2. Components remain framework-pure with no inline Tailwind dependency."
    - kind: test
      ref: packages/theme/src/tokens.test.ts
      date: "2026-05-25"
      notes: "Token table-driven tests verify the `--sophie-role-*` CSS variables are emitted with the expected oklch values in both `:root` and `[data-theme=\"dark\"]` scopes, exercising Layer 1 → Layer 2 flow."
    - kind: manual
      ref: AGENTS.md
      date: "2026-05-25"
      notes: "AGENTS.md 'Locked decisions' table cites ADR 0005 as the routine-reasoning ADR governing theming, and the SCSS-porting hard rule lists the eight source files this ADR was designed to absorb."
  notes: |
    The three-layer model is in active force across the codebase. Layer 1
    (`packages/theme/src/tokens.ts`) is the single TS source; Layer 2 is
    emitted at build time by the `generate-css.ts` + `generate-tailwind.ts`
    scripts; Layer 3 is realized in the 45 `*.module.css` files under
    `@sophie/components`. ADR 0026 amends Layer 2's delivery mechanism
    (CSS-first `@theme` rather than JS preset) without changing the
    three-layer concept.
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
