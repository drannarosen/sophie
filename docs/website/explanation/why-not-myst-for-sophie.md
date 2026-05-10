---
title: Why Sophie is not built on MyST
short_title: Why not MyST (for Sophie)
description: The case for choosing Astro+MDX over MyST as Sophie's renderer, with the loss-mitigation mappings.
tags: [renderer, astro, mdx, myst, meta]
---

# Why Sophie is not built on MyST

This page closes one half of an internal-consistency loop. The other
half is [Why MyST for these design docs](why-myst-for-docs.md). The
two together explain why Sophie (the platform) and Sophie's docs
(this site) are built on different stacks, and why that's correct.

The decision is captured in
[ADR 0002](../decisions/0002-renderer-astro-mdx.md). This page goes
deeper on the *case* and the *what we lose*.

## What MyST is excellent at

{abbr}`MyST` is genuinely the best choice for a wide class of
scientific writing:

- Native scientific syntax: `{cite}`, `{eq}`, `{numref}`, glossary
  directives, definitions, admonitions.
- Executable code via Thebe / Jupyter Book.
- Exports to PDF / JATS / EPUB out of the box.
- Active community in the scientific publishing space.

ASTR 596 runs on MyST today, and that's the right choice for ASTR
596: a graduate computational-modeling course that's mostly prose,
math, and code, with light interactivity. MyST shines there.

## What Sophie is

Sophie is a platform for **interactive scientific textbooks**. The
distinguishing pedagogy components are:

- `<Prediction>` — multiple-choice or free-response with optional
  confidence slider; submits to the ResponseStore; calibration
  curves over a semester.
- `<MisconceptionDialog>` — AI persona role-plays a confused peer;
  the student teaches them out of the misconception; transcript
  recorded.
- `<PredictThePlot>` — sketch canvas; student sketches axes/curve
  before reveal; AI cohort-level analysis identifies common shape
  misconceptions.
- `<VideoPrompt>` — YouTube player intercepted at timestamps;
  predictions render inline; player resumes only on submit.
- `<ConceptLatency>` — sparkline of decay across concepts; opt-in
  retrieval prompts before chapters.
- `<CodeCell>` — Pyodide-runnable Python with `predict-then-run`
  semantics.
- `<CalibrationCurve>` — semester-long aggregate visualization over
  hundreds of predictions.
- `<PreMortem>` — failure-mode prediction before code/demo
  execution.

These are interactive web apps wearing textbook clothing. They are
the differentiator of the platform.

## Why MyST is the wrong substrate for these

MyST is built around the **directive grain**:
`{prediction}` / `{calibration}` / `{misconception-dialog}`. Adding
any custom interactive component requires:

1. A directive (server-side, declarative).
2. A React component (client-side, interactive).
3. A translation layer between them.

Each new interactive component pays the directive-and-component tax.
Sophie has 15 v1 components and 8 planned v3 innovations. The tax
compounds.

MyST has a React renderer (`myst-theme`, `myst-to-react`) that
addresses some of this — the AST is renderable in React. But the
authoring surface remains directive-shaped, and the dual-profile
build mechanism, the ResponseStore integration, the per-island
hydration model, and the slide adapter all become custom inventions
on top of MyST rather than idiomatic uses of the surrounding
framework.

## Why Astro+MDX fits

In Astro+MDX, a pedagogy component is just a React component:

```mdx
<Prediction
  id="flux-distance-doubles"
  question="If the distance to a star doubles, what happens to flux?"
  choices={["Doubles", "Halves", "Decreases by a factor of 4", "Stays the same"]}
  answer="Decreases by a factor of 4"
  skill="scaling-reasoning"
/>
```

Authors write `<Prediction />`. Astro hydrates the island per its
directive (`client:visible` or `client:load`). The component
consumes [`useInteractive`](../reference/component-contract.md#useinteractive-runtime-helper)
to persist to the ResponseStore. There is no directive-and-component
duplication; there is no translation layer.

Astro additionally gives Sophie:

- **Per-island hydration**: a chapter with one Pyodide cell doesn't
  ship Pyodide on chapters without one.
- **Content Collections**: Zod schemas natively (see
  [ADR 0003](../decisions/0003-zod-as-source-of-truth.md)).
- **`vite.define` substitution + tree-shaking**: the dual-profile
  build mechanism is idiomatic, not invented.
- **Mature integration ecosystem**: image optimization, view
  transitions, sitemap, RSS, integrations like `@astrojs/mdx`,
  `@astrojs/react`, `@astrojs/tailwind`.
- **Active development cadence** with regular releases.

## What we lose by leaving MyST — and how each loss is mitigated

| MyST capability | Sophie's mitigation |
|---|---|
| Native `{cite}` + bibliography | `rehype-citation` plugin with CSL-JSON; ApJ default for ASTR. See [Cite with CSL-JSON](../how-to/cite-with-csl-json.md). |
| Native `{eq}` + equation numbering | `remark-math` + `rehype-katex` for math; `<EqRef>` React component for cross-refs. Audit verifies refs resolve. |
| Native `{numref}` for figures | `<FigureRef id="...">` React component, resolved at build via Sophie's reference graph. |
| Native definitions / glossary | MyST handles glossary in *these docs*. In Sophie chapters, `<ConceptRef>` and a separate glossary page render via React; mostly equivalent. |
| Executable code via Thebe | Pyodide-based `<CodeCell>` with service-worker caching. Different mechanism, equivalent outcome. |
| PDF / JATS / EPUB export | `print` mode CSS plus optional Pandoc post-processing. Pandoc reads HTML. |
| Authoring familiarity (for users with MyST background) | Real loss; mitigated only by docs and the fact that JSX-in-Markdown is a small mental model. |
| Sphinx ecosystem extensibility | Real loss; mitigated by the [plugin API](../reference/plugin-api.md) and Astro integrations. |

The losses are **mitigated, not eliminated**. The mitigations are
real engineering work, but they're bounded and in service of a
substrate that makes the platform's differentiator easy.

## Why this isn't pretending to be portable

Sophie is *Astro-shaped*. The decision to keep `@sophie/components`,
`@sophie/schema`, `@sophie/audit`, and `@sophie/theme` framework-pure
is structural hygiene that pays off if Astro hits a wall in 2028 or
2029 — but it's not a portability promise. The
`@sophie/renderer-contract` package documents the adapter interface
but only one adapter (`@sophie/astro`) ships in v1. If multi-renderer
support ever becomes a real need, the cost of replacing
`@sophie/astro` is bounded but non-trivial. We're not designing for
that today.

## What this *doesn't* say

This page does not say MyST is a bad choice in general. MyST is
excellent for what it's designed for: scientific writing where the
authoring surface is markdown + directives, and where interactivity
is light. ASTR 596 is on MyST and that's the right choice. These
design docs are on MyST, and that's also the right choice
([Why MyST for these design docs](why-myst-for-docs.md)).

What this page says: **for *Sophie* — a platform whose differentiator
is interactive web-app pedagogy components — Astro+MDX is the right
substrate.**

## See also

- [ADR 0002](../decisions/0002-renderer-astro-mdx.md) — the formal
  decision record.
- [Architecture](architecture.md) — how the renderer choice
  cascades through the rest of the system.
- [Why MyST for these design docs](why-myst-for-docs.md) — the
  internal-consistency closing argument.
