---
date: 2026-05-09
tags: [components, visualization, concept-maps, v2, v3, proposed]
---

# ADR 0016: React Flow for concept maps and interactive diagrams (v2+)

:::{admonition} ADR metadata
- **Status**: proposed
- **Deciders**: anna
:::

:::{important} Status: proposed (not yet accepted)
This ADR captures the rationale for adopting React Flow *if and when*
v2/v3 features earn it their keep. Acceptance is deferred until a
concrete consumer (likely `<ConceptMap>` in v2 or
`<ConceptLatency>` in v3) drives the decision. Capturing the analysis
now means future-Anna doesn't re-derive it from scratch under teaching
pressure.
:::

## Context

Sophie's schema already encodes structure that benefits from
node-graph visualization:

- `Concept.prerequisites: ConceptId[]` — concept dependency graph.
- `Skill` taxonomy with implicit progression (the "skill ladder").
- `Chapter.prerequisites.{concepts, chapters}` — curriculum
  dependency graph.
- `MissionStep[]` — sequence of step kinds (prediction → demo-
  interaction → inference-prompt → reflection) that's natural to
  render as a flow.
- v3 [pedagogical innovations](../explanation/pedagogical-foundations.md)
  include Concept Latency (per-student concept-freshness sparklines
  that escalate into a navigable concept graph).

Today the schema is rendered as flat lists in the audit and in
prose. That's adequate for v1 but loses structure that's valuable for:

- **Students** wanting a map of how chapters/concepts connect.
- **Instructors** planning curriculum across a semester (which
  chapters depend on which prerequisites? which concepts are
  covered late but referenced early?).
- **Authors** maintaining the concept registry (catching cycles,
  orphans, missing prerequisites).

A node-graph rendering of these data shapes serves all three
audiences better than a flat list. We need a tool when the time
comes; this ADR proposes which tool.

## Decision (proposed)

**React Flow** (`@xyflow/react`) is the recommended library for
Sophie's concept maps and interactive diagrams when v2/v3
components need them. **Not for slides** — Reveal.js stays per
[ADR 0006](0006-slides-revealjs.md). **Not for audio** — Sophie's
audio is podcast/lecture playback, not synthesis.

Initial scope at acceptance time:

- A `<ConceptMap>` component in `@sophie/components` that reads
  the Concept registry and renders an interactive node graph.
- A `<SkillLadder>` component (similar shape).
- An instructor-build `<CurriculumDependencyGraph>` (chapters as
  nodes, prerequisites as edges).

## Rationale

- **Mature and active.** 36.5K GitHub stars, 7.4M weekly npm
  installs, MIT-licensed, maintained by xyflow (Berlin team since
  2019). Risk of abandonment is low.
- **Customizable nodes are React components.** A `<ConceptNode>` is
  just a React component — it consumes
  [`@sophie/theme`](../decisions/0005-theming-three-layers.md) tokens
  via CSS variables; honors dark mode; renders accessibility tree
  via standard ARIA attributes.
- **Layout algorithms via integrations.** Built-in support
  patterns for Dagre (hierarchical), Elkjs (layered), and
  force-directed layouts. Concept dependency graphs are typically
  hierarchical — Dagre is the natural fit.
- **Keyboard navigation built in.** Arrow keys, delete, multi-select
  via standard patterns; aligns with Sophie's WCAG 2.1 AA mandate.
- **Lazy-loadable.** Bundle weight matters; React Flow can be
  loaded only on chapters that actually contain `<ConceptMap>`
  (Astro's per-island hydration, see
  [ADR 0002](0002-renderer-astro-mdx.md)).
- **Composable with our schema.** The graph nodes/edges shape maps
  cleanly from `Concept.prerequisites[]`; no impedance mismatch.

## Alternatives considered

- **D3 (force-directed).** Pros: maximum power, no dependencies.
  Cons: low-level; we'd write a lot of code React Flow gives us
  for free; less ergonomic in React. Rejected — the cost is real.
- **vis-network.** Pros: similar capabilities. Cons: smaller
  community; less React-idiomatic; uses a Vue/imperative API.
  Rejected.
- **Mermaid.** Pros: text-source diagrams, version-controllable;
  already used in these MyST docs. Cons: static (no interaction);
  doesn't support clicking a node to drill in. Acceptable for
  *static* architecture diagrams (and we use it in these docs);
  not suitable for interactive concept maps.
- **Cytoscape.js.** Pros: mature, powerful graph library. Cons:
  imperative API; less ergonomic in React than React Flow;
  heavier bundle. Rejected.
- **Custom SVG with hand-rolled layout.** Pros: smallest possible
  bundle; total control. Cons: significant engineering investment;
  reinvents what React Flow gives us; layout algorithms are real
  research. Rejected for v2/v3 timeline.

## Consequences

**Easier:**

- Concept maps, skill ladders, dependency graphs, mission flow
  diagrams all built from one library.
- Custom node rendering integrates cleanly with
  [theming](../decisions/0005-theming-three-layers.md) and
  [the component contract](../reference/component-contract.md).
- Authors don't author concept-map *layouts* — they edit the
  Concept registry; the layout regenerates.
- Future v3 concept-latency UI (per-student decayed-concept
  sparkline → graph drill-in) has a natural home.

**Harder:**

- Bundle weight when used (mitigated by per-island lazy loading;
  not loaded on chapters without a graph component).
- Learning curve for component authors who haven't used React
  Flow before — moderate; the API is well-documented.
- Visual regression testing of node-graph layouts is harder than
  for static components (positions can shift slightly across
  layout-algorithm versions); will need tolerant comparisons.
- Accessibility for graph navigation is non-trivial — requires
  thoughtful keyboard+screen-reader patterns beyond what React
  Flow provides out of the box.

**Triggers** (when this ADR moves to `accepted`):

- A v2 or v3 component (`<ConceptMap>`, `<SkillLadder>`,
  `<CurriculumDependencyGraph>`, `<MissionFlow>`, `<AlgorithmTrace>`,
  or graph-mode `<ConceptLatency>`) needs node-graph rendering.
- The component definition follows [the contract](../reference/component-contract.md)
  including axe-core a11y tests for keyboard graph navigation.
- React Flow added as a dependency in `@sophie/components`,
  marked `@stable` in the public API.

## Explicitly out of scope

- **Slides.** React Flow is not for slide presentations. Reveal.js
  remains primary; Spectacle remains the future revisit. See
  [ADR 0006](0006-slides-revealjs.md).
- **Audio synthesis.** React Flow's Web Audio API tutorial pattern
  is for building modular synthesizers visually. Sophie's audio is
  podcast/lecture playback with transcripts; the synth-builder
  pattern doesn't fit our pedagogy. If a future course unit teaches
  signal processing or DSP, this could be reconsidered as a
  domain-specific component — not a platform commitment.
- **WYSIWYG MDX authoring.** The temptation to use React Flow as
  the surface for a node-based chapter authoring tool exists; we
  reject it. MDX-as-text is the authoring surface; visualizations
  are *rendered from* the schema, not the source of it.

## References

- [React Flow / xyflow documentation](https://reactflow.dev).
- [ADR 0006](0006-slides-revealjs.md) — slides stay on Reveal.js.
- [ADR 0002](0002-renderer-astro-mdx.md) — per-island hydration
  enables lazy-loading React Flow only on chapters that need it.
- [ADR 0005](0005-theming-three-layers.md) — design tokens that
  custom node components consume.
- [Pedagogical foundations §7 Concept Latency](../explanation/pedagogical-foundations.md)
  — the v3 feature most likely to drive acceptance of this ADR.
