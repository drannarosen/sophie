---
date: 2026-05-09T00:00:00.000Z
tags:
  - foundation
  - renderer
  - astro
  - mdx
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: test
      ref: packages/astro/src/lib/transform-mdx-compile.test.ts
      date: "2026-05-13"
      notes: "MDX compile + AST-transform pipeline tested end-to-end."
    - kind: chapter
      ref: examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx
      date: "2026-05-14"
      notes: "1347-line real chapter renders via @sophie/astro's TextbookLayout."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
  notes: "Astro 6 + MDX confirmed across the bucket B+C smoke build; the renderer-choice contract held under the smoke chapters and the components matrix."
---

# ADR 0002: Astro + MDX as the renderer

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

> **Revision (2026-05-10):** title, body, and pin updated from
> "Astro 5" to "Astro 6". Astro 6 became stable after this ADR was
> first written; the *renderer* decision (Astro + MDX) is unchanged.
> No new architectural rationale needed — the Astro integration in
> Phase 0 step 6 builds against `astro ^6.0.0` (latest 6.3.1 at time
> of bump). Future ADRs may bump to Astro 7+ similarly without
> rewriting this document.

## Context

The renderer choice is the keystone of Sophie. Everything downstream
inherits from it — component model, build pipeline, hydration, search,
deployment. The real axis is not "Astro vs. MyST" but **academic-
markdown ecosystem (MyST / Quarto / Pandoc) vs. web-app ecosystem
(Astro / Next / Vite + MDX)**. Each gives one set of things for free
and makes the other a fight.

The user is migrating off Quarto. {abbr}`MyST` is in production for
ASTR 596 and would be a lateral move with continuity benefits.
Astro+MDX is forward and brings interactive components as first-class
citizens.

## Decision

**Astro + MDX** (currently Astro 6; was originally Astro 5 — see
revision note), with plugin-mediated academic markdown:
`remark-math` + `rehype-katex`, `rehype-citation`,
`rehype-autolink-headings`. The integration lives in `@sophie/astro`,
which is the single Astro-coupled package. All other core packages
remain framework-pure.

## Rationale

The eight pedagogical innovations in
[Pedagogical foundations](../explanation/pedagogical-foundations.md)
are interactive web apps wearing textbook clothing — calibration
sliders, sketch canvases, NPC dialogues, video-player interception,
concept-decay sparklines. They are the differentiator of the platform.

In Astro+MDX, these are trivial: `<Prediction />` is just a React
component. In MyST, they go *against the directive grain*: every
interactive component would require both a directive *and* a React
component plus a translation layer. Picking the renderer that makes
the differentiator easy is the whole game.

The "we lose academic-markdown ergonomics" cost is **mitigated, not
eliminated**:

- Math: `remark-math` + `rehype-katex` (server-rendered to HTML+CSS).
- Citations: `rehype-citation` with CSL-JSON; ApJ style for ASTR.
- Cross-references: built via React components
  (`<ConceptRef>`, `<ChapterRef>`, `<FigureRef>`, `<EquationRef>`) resolved
  against Sophie's reference graph at build time.
- PDF/handout export: `print` mode CSS plus Pandoc post-processing —
  Pandoc reads HTML.

## Alternatives considered

- **MyST + `myst-theme` (React renderer)**.
  Pros: native scientific syntax (`{cite}`, `{eq}`, `{numref}`),
  executable code via Thebe, exports to PDF/JATS/EPUB, continuity
  with ASTR 596.
  Cons: custom interactive components go against the grain; Sophie's
  pedagogy components would need both directives and React; smaller
  ecosystem than Astro/Vite; dual-profile build mechanism would be
  invented from scratch.
  Rejected: interactive pedagogy *is* the platform's differentiator.

- **Stay on Quarto.** Already moving away; not a viable forward
  option.

- **Next.js App Router.** Heavier, server-default; can SSG. The
  Vercel-coupling is more cultural than technical, but Astro is the
  better fit for content-heavy static sites with islands of
  interactivity. Rejected: Astro's per-island hydration is exactly
  what Sophie needs.

- **Custom Vite + MDX + react-router.** Maximum control, minimum
  batteries. Rejected: Astro's batteries (content collections, image
  optimization, view transitions, integrations) are exactly what we
  want.

- **VitePress / Starlight.** Docs-style; courses are not docs.
  Rejected.

## Consequences

**Easier:**

- Per-island hydration: chapters with one Pyodide cell don't ship
  Pyodide on chapters without one.
- Astro Content Collections consume Zod schemas natively (see
  [ADR 0003](0003-zod-as-source-of-truth.md)).
- Dual-profile build mechanism is idiomatic Astro
  (`vite.define` + tree-shaking); see
  [ADR 0001 derivative]: `@sophie/astro`'s integration owns it.
- React + TypeScript ecosystem: hiring/borrowing examples is easy.

**Harder:**

- Citations and cross-refs require plugin maintenance instead of
  being built-in.
- Author-time migration from Quarto/MyST is non-trivial; Phase 4
  carries the bulk of it.
- PDF export requires a print-mode pass (already in the component
  contract) plus optional Pandoc.

**Triggers:**

- `@sophie/astro` is the single Astro-coupled package. All other
  packages stay framework-pure for future renderer-portability
  optionality (see [ADR 0001 derivative]).
- `@sophie/renderer-contract` package documents the adapter
  interface even though only one adapter ships in v1.
- Slide adapter design ([ADR 0006](0006-slides-revealjs.md)) sits
  inside `@sophie/astro`.
- Cosmic Playground integration via iframe + postMessage
  ([ADR 0008](0008-cosmic-playground-protocol.md)) keeps demos
  decoupled from Astro's release cadence.

## References

- Brainstorming session Q1 (May 2026): "Renderer: MyST vs. Astro+MDX"
  — user confirmed interactive pedagogy is the differentiator.
- [explanation/why-not-myst-for-sophie.md](../explanation/why-not-myst-for-sophie.md)
  — extended argument with the "loss is mitigated" mappings.
- [explanation/why-myst-for-docs.md](../explanation/why-myst-for-docs.md)
  — closing the irony loop on why these design docs are MyST.
- [reference/component-contract.md](../reference/component-contract.md) — what becomes
  natural in Astro+MDX vs. would be painful in MyST.
