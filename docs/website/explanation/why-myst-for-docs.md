---
title: Why these design docs use MyST
short_title: Why MyST (for docs)
description: Why Sophie's own design documentation is built on MyST even though Sophie (the platform) is built on Astro+MDX.
tags: [myst, docs, dogfooding, meta]
---

# Why these design docs use MyST

This page closes the second half of an internal-consistency loop.
The first half is [Why Sophie is not built on MyST](why-not-myst-for-sophie.md).
The two together explain why **Sophie (the platform) and Sophie's own
design docs (this site) are built on different stacks** — and why
that's correct.

The decision is captured in
[ADR 0010](../decisions/0010-myst-for-design-docs.md). This page
goes deeper on the *why*.

## The principle

> Use each tool where it shines.

[ADR 0002](../decisions/0002-renderer-astro-mdx.md) says Sophie is
Astro+MDX because Sophie's pedagogy is interactive. **The pedagogy
is the differentiator.**

Design documentation has the *opposite* shape: it's classical
scientific technical writing — citations, cross-references, glossary,
{abbr}`ADR`s, definition lists, prose, occasional diagrams. Design
documentation is **not** interactive web-app territory. There is no
calibration slider in an ADR. There is no NPC dialogue in a roadmap.

What design documentation *is*:

- **Citation-heavy** — references to research papers, prior ADRs,
  external standards.
- **Cross-reference-dense** — every page links to every other page.
- **Definition- and glossary-driven** — terms have specific meanings.
- **Diagrammatic** — architecture diagrams, state machines, flows.
- **Author-edited** — humans write and revise; not generated.
- **Long-lived** — pages outlive any single phase of the project.

Each of those is a place {abbr}`MyST` shines and Astro+MDX is fine
but worse.

## What MyST gives this docs site

### Native scientific syntax

ADRs reference research papers. The eight pedagogical innovations in
[Pedagogical foundations](pedagogical-foundations.md) cite Tetlock,
Hestenes, Kapur, Bjork, Mayer, Brame. Citations are first-class in
MyST via `[@key]`; in Astro+MDX they would require setting up
`rehype-citation` (which Sophie *does* set up for chapters — but it's
a setup, not a built-in).

### Definition lists and glossary

`{glossary}` directive renders a glossary page where every term cross-
links automatically across the site. Adding a term once links it
everywhere. Astro+MDX would need a custom `<GlossaryRef>` component
plus a glossary page; doable but more work.

### Mermaid diagrams natively

`:::{mermaid}` renders a diagram inline. The architecture
diagrams in [Architecture](architecture.md) and the persistence
flows in [Persistence model](persistence-model.md) are inline
Mermaid — no separate image generation, no asset pipeline.

### Admonitions

`:::{important}`, `:::{seealso}`, `:::{warning}` render with
appropriate styling and ARIA attributes. Sprinkled throughout the
docs to flag status, cross-refs, and caveats.

### Numbered figures, equations, references

For the rare design doc that needs them (e.g., the persistence model
sketches), MyST handles numbering and cross-refs natively.

### Pandoc-compatible export

Design docs that someone wants as a PDF (e.g., for printing for an
offline review session) export cleanly via Pandoc. Astro+MDX's
print-mode is great for chapters; less battle-tested for prose-y
docs.

## Why we considered (and rejected) alternatives

### Could we use Astro+MDX for these docs too?

Yes, but at cost: every MyST native feature would be a custom React
component (`<Cite>`, `<Glossary>`, `<DefList>`), every diagram would
need `astro-mermaid` or similar, every cross-ref would need
audit-engine plumbing that doesn't exist for non-chapter content. We'd
spend a non-trivial amount of time *building docs infrastructure*
that MyST gives us for free.

The "dogfooding" argument — "use Sophie for Sophie's docs" — was
considered. It's appealing but premature: Sophie doesn't exist yet.
Until `@sophie/*` packages are published or workspace-linked,
`apps/docs/` can't actually run on Sophie. We'd be authoring docs
against a moving target.

[ADR 0010](../decisions/0010-myst-for-design-docs.md) reframes
this: **MyST bootstraps; Sophie-self-hosted `apps/docs/` later
replaces it** in Phase 4–5. By then Sophie is mature enough to host
its own docs as proper dogfooding for non-textbook content. Until
then, MyST is the practical choice.

### Could we use Quarto?

Quarto is the thing being migrated away from for Sophie. Choosing
it for design docs would re-validate Quarto in a context where MyST
is strictly better (richer scientific syntax, faster, more modern
authoring experience).

### Could we use a docs-specific framework like Docusaurus or VitePress?

Both are docs-framework-shaped, not science-document-shaped. They'd
serve us for the IA (sidebars, search) but lose the scientific
writing affordances (citations, equations, figure refs) that we use.

## The migration target

When [Phase 4–5](../status/roadmap.md#phase-5-dual-profile-v2-comp-536-8-weeks-fall-2026-early-2027)
delivers a stable Sophie, this site's content migrates into
`apps/docs/` (Sophie self-hosted). The migration is **mechanical by
design**:

- We use only MyST features that have clean MDX equivalents.
- We avoid MyST-only flourishes (executable code via Thebe, complex
  Sphinx extensions). Each such flourish would need an ADR before
  use.
- We stay disciplined about content boundaries: each page is one
  Diátaxis category, one purpose.

When the time comes, the migration is a content move with feature
substitution: `[@cite]` → `<Cite>`; `{glossary}` → `<Glossary>`;
`:::{mermaid}` → `<Mermaid>`; `:::{seealso}` → `<Note>`.

## What this *doesn't* say

This page does not say MyST is a better tool than Astro+MDX in
general. The argument is the same as the converse: **MyST shines for
scientific technical writing; Astro+MDX shines for interactive
pedagogy**. Sophie uses each where it shines.

The deepest internal consistency: **the platform doesn't pretend to
be one thing it isn't, and the platform's docs don't pretend to be a
textbook**. Sophie builds textbooks; this site documents Sophie. Two
different products, two appropriate substrates.

## See also

- [ADR 0010](../decisions/0010-myst-for-design-docs.md) — the formal
  decision record.
- [ADR 0002](../decisions/0002-renderer-astro-mdx.md) — Astro+MDX
  for Sophie.
- [Why Sophie is not built on MyST](why-not-myst-for-sophie.md) —
  the companion explanation.
- [Roadmap → Phase 4–5](../status/roadmap.md) — the migration
  target.
