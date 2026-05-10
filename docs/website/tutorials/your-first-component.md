---
title: Your first custom pedagogy component
short_title: First component
description: A guided tutorial that walks through adding a new pedagogy component to Sophie.
tags: [tutorial, components, customization]
---

# Your first custom pedagogy component

:::{important} Status: pending Phase 1
This tutorial is written when Phase 1 produces a real worked example
of authoring a new component. Until then, the
[component contract reference](../reference/component-contract.md)
contains the specification; the
[`<Prediction>` worked example](../reference/component-contract.md#worked-example-prediction)
is the closest thing to this tutorial today.
:::

## What you'll build (planned)

A small pedagogy component end-to-end — likely `<UnitCheck>` or a
simpler variant — covering:

- Zod prop schema colocated at `<Name>.schema.ts`.
- React component implementing `render.read`.
- (If interactive) `useInteractive` for persistence.
- `registerComponent` registration.
- Storybook stories for all render modes the component supports.
- Vitest unit tests.
- axe-core a11y tests.
- Inclusion in a chapter and audit verification.

## See also (current)

- [Component contract](../reference/component-contract.md) — the
  full specification.
- [Adding a new component checklist](../reference/component-contract.md#adding-a-new-component-checklist).
- [Plugin API](../reference/plugin-api.md) — `registerComponent` and
  related hooks.
- [Add a custom component (how-to)](../how-to/add-a-custom-component.md) —
  the recipe form (also pending Phase 1).
