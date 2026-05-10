---
title: Your first Sophie chapter
short_title: First chapter
description: A guided tutorial that walks you through authoring a complete Sophie chapter from scratch.
tags: [tutorial, getting-started, chapter]
---

# Your first Sophie chapter

:::{important} Status: pending Phase 1
This tutorial is written when Phase 1 produces a real worked
authoring flow. Until then, it's a stub. The
[reference](../reference/content-schema.md) and
[explanation](../explanation/architecture.md) sections cover the
conceptual material; this tutorial will become the read-along that
ties them together.
:::

## What you'll build (planned)

A single Sophie chapter — `flux-luminosity-distance` is the planned
starter — with:

- Frontmatter validated against `ChapterSchema`.
- An OMI framing block.
- 2–3 `<Prediction>` components with paired `<SolutionKey>`.
- A `<UnitCheck>` after the central equation.
- An embedded `<Demo>` from Cosmic Playground.
- A `<FigureReading>` prompt around the inverse-square diagram.
- Citations to the relevant astronomy literature.
- Audit passing.

## What you'll need (planned)

- A Sophie consumer course repo (created via `sophie create textbook`).
- Node.js 20+, pnpm, a code editor.
- ~90 minutes for the first chapter (subsequent ones are faster).

## Outline (placeholder)

1. Scaffold via `sophie create chapter <topic>`.
2. Fill in frontmatter — concepts, skills, framing, citations.
3. Author the body in MDX with pedagogy components.
4. Run `sophie audit chapter <id>` and fix flags.
5. Run `sophie preview` and verify the rendered chapter.
6. Submit to your course repo.

## See also (current)

- [Content schema](../reference/content-schema.md)
- [Component contract](../reference/component-contract.md)
- [CLI reference](../reference/cli.md)
