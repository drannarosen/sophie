---
title: Add a custom pedagogy component
short_title: Custom component
description: Add a new pedagogy component to Sophie that satisfies the component contract.
tags: [components, plugin, customization]
---

# Add a custom pedagogy component

This how-to walks through adding a new pedagogy component that
satisfies the [component contract](../reference/component-contract.md).
Until Phase 1 produces a real worked example, this page is a stub —
the existing `<Prediction>` walkthrough in the contract reference
serves as the canonical reference.

:::{important} Earned in Phase 1
The full step-by-step recipe will be authored when the first custom
component is added (likely during Phase 1 of Sophie development). For
now, see:

- The [component contract](../reference/component-contract.md) — the
  full TypeScript shape every component fills in.
- [§9 Adding a new component (checklist)](../reference/component-contract.md#adding-a-new-component-checklist).
- [§8 Worked example: `<Prediction>` end-to-end](../reference/component-contract.md#worked-example-prediction).
- [Plugin API](../reference/plugin-api.md) — `registerComponent` and
  related hooks.
:::

## Outline of the recipe (placeholder)

1. Pick a `kind` (kebab-case, unique).
2. Define the prop schema (Zod) at `<Name>.schema.ts`.
3. Implement `render.read` (React component).
4. (If interactive) define state, response, initialState.
5. (If interactive) consume `useInteractive` for persistence.
6. Register via `registerComponent`.
7. Write Storybook stories (one per render mode).
8. Write Vitest unit tests.
9. Write axe-core a11y tests.
10. Add to chapter MDX, run `sophie audit`, fix any flags.
11. Document in this docs site (extend the v1 component set table).

## Open questions for this how-to

When this is fleshed out, address:

- How does a third-party plugin (vs. an in-platform component)
  package and distribute? See
  [Plugin API §Cowork plugin packaging](../reference/plugin-api.md).
- What's the migration story when a component prop schema evolves?
- How are component-specific theme tokens scoped to avoid collisions?

These are answered in part in the contract and plugin API references;
this how-to will pull the pieces together when there's a real custom
component to demonstrate.
