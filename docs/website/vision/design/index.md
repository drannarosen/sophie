---
title: Design principles
short_title: Design
description: Sophie's design principles — what the platform feels like at its best. Motion, density, multi-media pedagogy, focus states, and the visual/interaction vocabulary that distinguishes Sophie from academic-default-dry.
tags: [vision, design, principles, ux, motion, accessibility]
---

# Design principles

What Sophie feels like at its best. The visual and interaction
vocabulary that makes pedagogy components *do their pedagogical work*
rather than just rendering inert text.

These principles stay in `vision/design/` as **values** even after
[ADRs](../../decisions/) (like [ADR 0005 — three-layer theming](../../decisions/0005-theming-three-layers.md)
or [ADR 0019 — Radix primitives](../../decisions/0019-radix-ui-primitives.md))
make specific commitments. Principles drive future decisions; they
don't replace decided ones.

## Status

This section is *under construction*. Initial principles to be drafted
(one essay per file):

- **Motion and affordance** — micro-interactions communicate
  pedagogical state changes (a `<Predict>` answer being revealed; a
  `<Dropdown>` "deep dive" opening; a `<HoverCard>`
  cross-reference appearing). Motion shouldn't be decorative; it
  should reduce cognitive friction.
- **Multi-media pedagogy** — text + math + figures is the floor, not
  the ceiling. Sophie's vision includes audio overview, narrated
  mini-lecture, Manim-style animation, retrieval audio. Each modality
  has a different pedagogical contract; Sophie codifies them rather
  than treating "media" as one undifferentiated bucket.
- **Typography, density, and reading rhythm** — academic content
  defaults to dense, monochrome, single-rhythm prose. Sophie's
  chapters should breathe, modulate, and signal pedagogical role
  through type without becoming gimmicky.
- **Focus, error, and empty states** — every interactive component has
  three latent states most platforms forget. Sophie's components ship
  with all three designed and tested via [Storybook](../../decisions/0028-storybook-setup.md).
- **Accessibility as design, not retrofit** — [ADR 0004](../../decisions/0004-component-contract-revisions.md)
  mandates axe-core on every component; design principles reinforce
  this with: keyboard navigation parity with mouse, prefers-reduced-
  motion respected, color is never the only signal, focus rings
  visible at all zoom levels.
- **Print is a first-class output** — handouts, study guides, and
  exam prep documents share a build pipeline with the web. Sophie's
  print-mode CSS (Bucket B PR 10) is a design constraint, not an
  afterthought.

Each principle gets its own file once drafted. Cross-link generously
to [Pedagogy](../pedagogy/) (the *why* this design serves) and to
[Decisions](../../decisions/) (where the design has been codified).
