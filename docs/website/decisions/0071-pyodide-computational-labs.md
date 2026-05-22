---
date: 2026-05-21T00:00:00.000Z
tags:
  - compute
  - pyodide
  - python
  - wasm
  - course-website
  - reasoning-os
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0071: Pyodide-driven in-browser computational labs (no Jupyter UI)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Related**: [0008](./0008-cosmic-playground-protocol.md) (interactive demos pattern), [0018](./0018-codemirror-6-for-codecell.md) (code editor), [0030](./0030-audience-and-ai-author-model.md), [0058](./0058-epistemic-component-contract.md) (epistemic-role taxonomy code cells inhabit), [0059](./0059-linked-representation-state.md) (linked-parameter state shared with charts), [0067](./0067-section-level-artifacts.md)
:::

## Context

ASTR 596 (Modeling the Universe) is built around six multi-week
computational projects — N-body integration, Monte Carlo radiative
transfer, MCMC cosmological inference, Gaussian processes, neural
networks + JAX. The students need to **write and run code** as part of
learning the science. Anna's current MyST-based course site cannot
host computation; students bounce out to GitHub Codespaces, which adds
friction and breaks the reading flow.

Future SDSU COMP courses will also be computation-heavy. ASTR 201 will
likely also benefit from inline live-computation demos even though it
isn't primarily a coding course.

Three architectural options for in-browser Python:

1. **Server-side kernel** (JupyterHub, BinderHub): full Jupyter
   experience; requires server infrastructure; per-user containers;
   ops + cost burden; data leaves the browser (privacy concern).
2. **Pyodide** (Python compiled to WebAssembly): full CPython +
   numpy/scipy/pandas/matplotlib/scikit-learn/JAX in the browser; zero
   server compute; data never leaves the browser; constrained by
   browser memory (~1–2GB practical) and single-threaded WASM.
3. **External cloud notebooks** (Google Colab, Codespaces): students
   bounce out; no Sophie integration.

Independent question: should Sophie expose a **Jupyter notebook UI**
(cell-based execution, free-form code authoring) or a more
**constrained pedagogical-component model** (instructor-authored
code cells with specific learning intent, students modify parameters
+ observe)?

## Decision

**Sophie shall host in-browser Python via Pyodide; Plotly as the
declarative charting layer; NO Jupyter notebook UI — code cells are
pedagogical components with specific learning intent.**

### Pyodide stack

- **Pyodide** (CPython 3.11+ compiled to WebAssembly) provides Python
  in the browser
- Default packages loaded: numpy, scipy, pandas, matplotlib,
  scikit-learn, sympy, JAX (CPU)
- Per-cell package loading via `micropip.install()` for less-common
  libraries
- Initial load is 5–10 MB; cached aggressively after first visit
- Runs entirely client-side; no server compute

### Plotly as the chart layer

- **Plotly** declarative spec for interactive charts
- Two integration paths:
  - **Pyodide → Plotly.py → Plotly.js**: Python authoring; spec
    emitted as JSON
  - **react-plotly.js direct**: declarative React component for
    instructor-authored charts not driven by Python
- Both paths produce the same Plotly.js renderer in the browser

### Constrained pedagogical-component model (no Jupyter UI)

Code cells in Sophie are **first-class pedagogical components**, not
free-form Jupyter cells. Each code cell:

- Has a declared `epistemic_role` from
  [ADR 0058](./0058-epistemic-component-contract.md)'s 8-role
  taxonomy (Observable / Model / Inference / Assumption /
  Approximation / Uncertainty / Numerical / Misconception)
- Is **authored by the instructor** with specific learning intent
- May be **readonly** (student reads + runs; result is the observable)
  or **parameter-editable** (student tweaks declared params; observes
  effect)
- Is **NOT free-form** (students can't add arbitrary cells; can't
  import arbitrary packages mid-cell unless declared up-front)

This is the explicit constraint. Sophie isn't trying to be a Python
playground; it's a pedagogy platform where computation is one of
several typed component classes.

### Component contract

| Component | Role |
|---|---|
| `<PythonCell>` | Execution primitive; runs author-supplied Python in Pyodide; sandboxed; readonly or parameter-editable |
| `<PlotlyChart>` | Declarative plot; pre-bound spec; reactively re-renders when params change |
| `<ParameterControl>` | Slider/select/number wired to Python cell's globals (composes with `<ParameterCursor>` from [ADR 0059](./0059-linked-representation-state.md)) |
| `<ComputeOutput>` | Typed display: `<NumericalReadout>` / `<TableOutput>` / `<FigureSlot>` |
| `<ComputeAssumption>` (role) | Epistemic annotation on a code cell |

### Tier placement

- **Tier 2**: full Pyodide stack + all component classes ship
- **Tier 1**: declarative React components only (`<PlotlyChart>` with
  static data, `<ParameterControl>` without Python evaluation) so the
  authoring contract is established early; Pyodide loads when Tier 2
  components mount

### Linked-representation state integration

Per [ADR 0059](./0059-linked-representation-state.md), a
`<ParameterCursor>` elsewhere on the page can drive `<PythonCell>`
parameters and reflow `<PlotlyChart>` outputs in lockstep. Same
state-management seam as existing linked-parameter components.

## Consequences

### Positive

- **Zero compute cost**: each student's browser does its own work; no
  JupyterHub to operate; no per-student container scaling; no
  per-month bill.
- **Privacy-elegant**: student code + data never leave the browser.
  FERPA-aligned by construction (Sophie literally can't leak what it
  doesn't receive).
- **Offline-capable**: after first load, no network needed to run
  code. Students with intermittent connectivity still get the full
  experience.
- **No Codespaces bounce**: students stay in Sophie; reading + code +
  visualization in one surface.
- **Pedagogically constrained**: each code cell earns its place in
  the pedagogy graph; instructor authoring intent is explicit;
  pedagogy-index extractor can audit code cells like any other
  component.
- **JAX support**: works via Pyodide's WASM build of JAX; ASTR 596's
  computational arc fits in the browser.

### Negative

- **First load is slow**: 5–10 MB Pyodide download. Mitigated by
  aggressive browser caching; subsequent visits are instant.
- **Limited concurrency**: single-threaded WASM; no MPI, no
  multi-process parallelism beyond Web Workers. Fine for pedagogy,
  not fine for production-scale simulations.
- **Memory ceiling**: ~1–2 GB practical per browser tab. Fine for
  pedagogical N-body, not fine for 100M-particle simulations. ASTR 596
  projects must scale problem sizes to this constraint (which they
  already do, pedagogically).
- **No GPU**: CUDA / Apple Metal unavailable. JAX CPU mode only.
  Acceptable for teaching the algorithms; production runs go elsewhere.
- **Some packages have no WASM builds**: PyTorch is unofficial-only;
  some C-extension-heavy libraries unavailable. JAX, numpy, scipy,
  sklearn, sympy, matplotlib, pandas, plotly all work.
- **No general-purpose Jupyter experience**: students who want to
  write arbitrary code go elsewhere (Codespaces, local environments).
  This is by design — Sophie's compute surface is pedagogy, not
  productivity.

### Neutral

- **Server-side execution remains available as an escape hatch**:
  Sophie can integrate with external execution services at Tier 3 for
  cases that genuinely need server compute. The pedagogy-component
  contract stays the same; only the execution backend changes.

## Implementation notes

- New package `@sophie/compute` containing:
  - `<PythonCell>`, `<PlotlyChart>`, `<ParameterControl>`,
    `<ComputeOutput>` React components
  - Pyodide loader + warm-up logic (deferred load until first
    compute cell mounts)
  - Per-cell virtual filesystem (avoid cross-cell variable leakage)
  - CodeMirror 6 ([ADR 0018](./0018-codemirror-6-for-codecell.md))
    inside `<PythonCell>` for Python syntax highlighting + linting
- Per-component contract enforced via Zod schema
  ([ADR 0003](./0003-zod-as-source-of-truth.md))
- Pedagogy-index extractor audit rule: code cells declare
  `epistemic_role`; default to Observable if omitted; emit warning if
  role unclear
- Authoring affordance: instructor writes `<PythonCell readonly />`
  for demo cells; `<PythonCell editable params={[…]} />` for
  parameter-explorable cells

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) §"Computational labs (Pyodide)"
- [Pyodide documentation](https://pyodide.org/en/stable/)
- [JAX on Pyodide compatibility notes](https://github.com/google/jax/issues/12576)
- [Plotly.js documentation](https://plotly.com/javascript/)
- [ADR 0008 — Cosmic Playground Protocol](./0008-cosmic-playground-protocol.md)
