---
date: 2026-05-09T00:00:00.000Z
tags:
  - data-viz
  - observable-plot
  - calibration
  - dashboards
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0021: Observable Plot for data viz and dashboards

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie has several places that need real data visualization:

- **`<CalibrationCurve>`** (v3) — per-student calibration plot:
  predicted confidence on the x-axis, observed accuracy on the
  y-axis, hundreds of points over a semester. The
  signature visualization for the
  [confidence-calibrated predictions](../explanation/pedagogical-foundations.md)
  feature.
- **Cohort dashboards** (v2 instructor view) — aggregate
  prediction-distribution plots, response-rate over time, common
  misconception heatmaps.
- **Dashboard widgets** in chapter dashboards (existing pattern in
  ASTR 201's Quarto site, ported to Sophie in Phase 1).
- **`<ConceptLatency>`** sparklines (v3) — per-concept freshness
  over time; tiny line plots inline in the reading.
- **Pre-rendered figures** at build time — when a Python-generated
  figure is overkill but a tiny stat plot is right.

The choice affects bundle weight, aesthetic, customization
ergonomics, and the time it takes to produce a one-off plot for a
chapter.

## Decision

**Observable Plot** (`@observablehq/plot`) is the data-viz library
for Sophie. Used in v2 dashboards and v3 calibration / concept-
latency components. Available as a `<Plot>` wrapper component in
`@sophie/components` for chapter authors to use ad-hoc.

## Rationale

- **Grammar of graphics done right.** Mike Bostock (D3 author)
  designed Plot as a declarative layer atop D3 — concise plot
  specs, sensible defaults, beautiful out of the box. A
  `<CalibrationCurve>` is ~30 lines instead of ~300.
- **Small bundle.** ~50–80 KB minified+gzipped, plus minimal D3
  helpers it transitively brings. Acceptable on chapters that
  contain a plot; tree-shakable for chapters without.
- **Scientific aesthetic.** Default styling matches what astronomers
  expect — clean axes, sensible margins, type-friendly. Less
  "marketing dashboard" than Recharts.
- **SSR-friendly.** Plot renders SVG; can pre-render at build time
  for static figures and hydrate only when interactive.
- **Customizable.** Themes (colors, fonts, axes) consume CSS
  variables — `--color-plot-axis`, etc. Light/dark mode follows
  `data-theme`. Pairs with
  [`@sophie/theme`](../decisions/0005-theming-three-layers.md).
- **Composable with `useInteractive`.** Calibration data flows
  from
  [`ResponseStore`](../explanation/persistence-model.md)
  via `useInteractive`; Plot consumes the array directly.
- **Already in the astronomy mind.** The Observable platform
  itself is well-known in scientific computing; teaching with
  Plot reinforces a useful tool for students.

## Alternatives considered

- **Visx** (Airbnb). Pros: React component primitives; flexible.
  Cons: more verbose API; bigger bundle; needs more boilerplate
  for the same plot. Rejected — Plot's declarative API wins for
  the volume of plots Sophie will produce.
- **Recharts.** Pros: very popular; React-first. Cons: opinionated
  styling that fights our design system; more "dashboard" aesthetic
  than scientific; less customizable axes/scales. Rejected.
- **uPlot.** Pros: extremely fast; small bundle. Cons: focused on
  high-frequency time-series; less ergonomic for general
  scientific plots. Rejected — wrong tool for our use case.
- **D3 raw.** Pros: total power. Cons: writing D3 by hand for every
  chapter plot is significant authorial overhead. Plot gives 80%
  of D3's power at 20% of the LoC. Rejected as a default; available
  as an escape hatch for genuinely custom needs.
- **Vega / Vega-Lite.** Pros: powerful, declarative. Cons: bigger
  runtime; the JSON spec language is a context-switch. Rejected
  for v1.
- **Plotly.js.** Pros: rich interactive plots out of the box. Cons:
  huge bundle (~3 MB); proprietary feel; aesthetic doesn't match
  scientific norms. Rejected.

## Consequences

**Easier:**

- Calibration curve, distribution plots, instructor dashboards
  ship with consistent aesthetic.
- Chapter authors use a `<Plot>` component as if it were any other
  pedagogy component.
- Dark mode + design tokens "just work."
- SSR-rendered SVG keeps initial-page-load light; hydration only
  for interactive plots.

**Harder:**

- Plot's API is concise but unfamiliar to authors who know D3 or
  Matplotlib. Mitigated by examples in the docs and a thin
  `<Plot>` wrapper that documents the pattern Sophie expects.
- For genuinely complex interactive plots (zoomable scatter with
  hover tooltips), Plot has limits — fall back to D3 directly or
  to Visx for those one-offs.
- Bundle weight on calibration-curve-bearing chapters; mitigated
  by per-island lazy loading (Astro's `client:visible`).

**Triggers:**

- `@sophie/components` adds `@observablehq/plot` as a peer dep.
- `@sophie/components/Plot.tsx` ships in Phase 1 as a thin wrapper
  with theme integration.
- `<CalibrationCurve>` ships in Phase 6 (v3 innovations) per the
  [roadmap](../status/roadmap.md), built on `<Plot>`.
- `<ConceptLatency>` sparkline ships in Phase 6 similarly.
- Instructor dashboards (v2 / Phase 5) use `<Plot>` for cohort
  analysis.
- A Storybook category "Visualizations" hosts plot-pattern
  examples chapter authors can copy.

## References

- [Observable Plot documentation](https://observablehq.com/plot/).
- [Pedagogical foundations §1](../explanation/pedagogical-foundations.md)
  — confidence-calibrated predictions; the v3 feature most
  visible via Plot.
- [ADR 0005](0005-theming-three-layers.md) — design tokens that
  flow into plot styling.
- [Persistence model](../explanation/persistence-model.md) — where
  the calibration data flows from.
