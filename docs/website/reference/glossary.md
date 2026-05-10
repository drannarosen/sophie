---
title: Glossary
short_title: Glossary
description: Terms used across the Sophie documentation.
tags: [glossary, reference]
---

# Glossary

Terms used across the Sophie documentation. Where a term has a more
in-depth explanation page, the entry links to it.

```{glossary}
ADR
: Architecture Decision Record. A short, dated, immutable document
  capturing a single architectural decision: context, decision,
  rationale, alternatives considered, consequences. See the
  [ADR template](../decisions/template.md) and the
  [ADR process](../contributing/adr-process.md).

AuditNode
: The structured representation of a pedagogy component, produced by
  the component's `serialize(props)` function. Used by Tier 3 audit
  checks (AI-driven). Shape: `{ kind, id?, semantics, children? }`.
  See the [component contract](component-contract.md).

Biome
: A Rust-based lint + format tool replacing ESLint + Prettier. Single
  config (`biome.json`), ~25× faster, official Astro/MDX support.
  See [ADR 0013](../decisions/0013-biome-lint-format.md).

CodeMirror 6
: The in-browser code editor inside `<CodeCell>` (COMP courses).
  Modular, accessible, themeable via CSS variables, extensible.
  See [ADR 0018](../decisions/0018-codemirror-6-for-codecell.md).

BroadcastChannel
: Browser API for cross-tab synchronization within the same origin.
  Sophie uses it so a prediction submitted in one tab updates the
  ResponseStore view in other tabs instantly. See
  [Persistence model](../explanation/persistence-model.md).

calibration
: The match between a student's stated confidence and their actual
  accuracy. A calibrated student who reports 80% confidence is
  correct on ~80% of those predictions. Sophie tracks per-student
  calibration over a semester via the optional confidence slider on
  `<Prediction>`. v3 feature; designed in v1. See
  [Pedagogical foundations](../explanation/pedagogical-foundations.md).

CCS
: Sophie's optional Cohort Calibration Summary. v3.

Changesets
: A SemVer + release-notes tool used by Sophie to manage version bumps
  across the `@sophie/*` packages. Each PR that changes a package
  adds a changeset describing the impact (`patch` / `minor` / `major`).

Chapter
: The canonical content entity in Sophie. Owned by one course;
  referenceable by many semester instances. Frontmatter validated
  against `ChapterSchema`. See [Content schema](content-schema.md).

CodeCell
: A Pyodide-runnable Python code cell in COMP chapters. Has a
  `pedagogicalKind` (illustrative / predict-then-run / fill-in-blank /
  parameter-sweep / compare). One kernel per page; isolated across
  pages.

Concept
: A pedagogical concept (e.g. *flux-distance-relation*). Concepts
  have prerequisites; chapters declare which concepts they cover; the
  audit verifies coverage and prerequisite ordering.

Cosmic Playground
: A separate Astro site at `astrobytes-edu.github.io/cosmic-playground`
  hosting interactive astronomy simulations. Sophie integrates via
  manifest + iframe + postMessage protocol. See
  [Integrate Cosmic Playground](../how-to/integrate-cosmic-playground.md).

CSL-JSON
: Citation Style Language JSON — a standard format for bibliographic
  entries. Sophie uses CSL-JSON as the canonical bibliography format;
  `.bib` is accepted as input and converted at build. ApJ default for
  ASTR; APA for COMP.

Diátaxis
: The information-architecture framework these docs follow: tutorials
  (learning), how-to guides (doing), reference (looking up),
  explanation (understanding). See https://diataxis.fr.

dual-profile
: The mechanism that produces separate student and instructor static
  builds from one source. v1 single-build (instructor components
  render to `null`); v2 activates the second build target. Lives in
  `@sophie/astro`. See
  [Set up dual-profile](../how-to/set-up-dual-profile.md).

framing
: The pedagogical structure a chapter is organized around: `OMI`
  (Observable → Model → Inference, for astronomy), `PMI` (Problem →
  Model → Implementation → Interpretation, for computational), or
  `custom`. Discriminated union; audit dispatches on `kind`.

HMR
: Hot Module Replacement. Vite's mechanism for swapping changed
  modules into a running page without reloading or losing component
  state. Sophie's `sophie dev` exposes Astro's HMR; feedback typically
  <100 ms. See [ADR 0015](../decisions/0015-dev-preview-workflow.md).

IndexedDB
: Browser API for client-side structured storage. Async, hundreds of
  MB quota, supported everywhere. Sophie uses it (via the `idb`
  library) as the v1 storage primitive behind `ResponseStore`.

LMS
: Learning Management System (e.g. Canvas, Moodle, Blackboard). Sophie
  exports to LMS but does not replace it.

manifest (Cosmic Playground)
: A JSON file published by Cosmic Playground listing each demo's
  ID, URL, parameter schema, and event schema. Sophie reads it at
  build time to validate `<Demo demoId="...">` references.

Mission
: An interactive sequence within or alongside a chapter: prediction →
  demo-interaction → inference-prompt → reflection → ... Validated
  against `MissionSchema`. See [Content schema](content-schema.md).

Observable Plot
: Mike Bostock's grammar-of-graphics library — declarative,
  scientific-aesthetic data viz. Used in Sophie for
  `<CalibrationCurve>`, instructor cohort dashboards, and the
  generic `<Plot>` chapter component. See
  [ADR 0021](../decisions/0021-observable-plot-data-viz.md).

Misconception
: A first-class entity in Sophie's schema. Drives audit checks ("does
  this chapter address its declared misconceptions?") and feeds
  experimental features like Misconception NPCs (v3). See
  [Pedagogical foundations](../explanation/pedagogical-foundations.md).

mystmd
: The MyST CLI used to build and serve this docs site. Not used by
  Sophie itself (which is Astro+MDX). See
  [Why MyST for these docs](../explanation/why-myst-for-docs.md).

OMI
: Observable → Model → Inference. Astronomy framing. The chapter
  declares what's observed, the proposed model, and what can be
  inferred. Default for ASTR chapters.

Pedagogy component
: A React component implementing the [component contract](component-contract.md).
  Examples: `<Prediction>`, `<OMI>`, `<UnitCheck>`, `<FigureReading>`.
  Distinct from generic structural callouts like `<Note>`.

Playwright MCP
: A Model Context Protocol server that gives AI tools (Claude Code,
  Codex, others) a real browser they can drive — navigate, click,
  type, screenshot, read accessibility tree, monitor console. Enables
  AI verification of rendered behavior, not just source review. See
  [ADR 0015](../decisions/0015-dev-preview-workflow.md).

pnpm
: The JavaScript package manager Sophie uses. Content-addressed
  store, hard-linked into projects; strict (rejects phantom deps);
  best-in-class workspaces. The only supported package manager for
  Sophie repos. See
  [ADR 0011](../decisions/0011-pnpm-package-manager.md).

React Flow
: A React library for node-based editors and interactive diagrams
  (`@xyflow/react`). Proposed for Sophie's v2/v3 concept maps,
  skill ladder, curriculum dependency graphs, and mission-flow
  visualizations. **Not** for slides (Reveal.js per
  [ADR 0006](../decisions/0006-slides-revealjs.md)). See
  [ADR 0016](../decisions/0016-react-flow-for-concept-maps.md).

PMI
: Problem → Model → Implementation → Interpretation. Computational
  framing. Default for COMP chapters.

POE
: Predict-Observe-Explain. A pedagogical pattern: students commit a
  prediction *before* seeing data, observe, then explain the
  discrepancy if any. Variant: *Predict the Plot* (sketch-based).

Profile
: A visibility tier on entities and inline components: `student` or
  `instructor`. v1 builds only the student target; v2 activates dual-
  profile builds.

Pyodide
: CPython compiled to WebAssembly. Sophie uses it to execute Python
  in the browser inside `<CodeCell>` (COMP chapters). Lazy-loaded;
  service-worker cached.

Radix UI
: Unstyled, accessible React primitives (slider, dialog, tabs,
  tooltip, popover, etc.) maintained by WorkOS. Sophie uses them
  as the foundation for interactive pedagogy components; styles
  layered via CSS Modules + design tokens. See
  [ADR 0019](../decisions/0019-radix-ui-primitives.md).

ResponseStore
: The repository abstraction for client-side persisted student
  responses. v1 implementation: `IndexedDBResponseStore`. v3
  implementation: `SyncedResponseStore` (same interface; pluggable
  `SyncClient`). See
  [Persistence model](../explanation/persistence-model.md).

Reveal.js
: A web-based slide-deck library. Sophie generates slides from chapter
  MDX through a thin `@sophie/astro` adapter; `h2` is the default
  slide boundary. See [ADR 0006](../decisions/0006-slides-revealjs.md).

Shiki
: Build-time syntax highlighter using VS Code's TextMate grammars.
  Sophie uses it (via `rehype-pretty-code`) for static code blocks
  in chapters and these design docs. **Not** the highlighter inside
  the editable `<CodeCell>` — that's CodeMirror's Lezer. See
  [ADR 0020](../decisions/0020-shiki-syntax-highlighting.md).

Sophie
: This platform. Greek for *wisdom*. Repo: `drannarosen/sophie`.
  Packages: `@sophie/*`.

Spectacle
: FormidableLabs' React-native presentation library; MDX-first.
  Considered for Sophie's slides; rejected for v1 in favor of
  Reveal.js due to classroom-equipment compatibility, but remains
  the natural future revisit if Reveal.js's API quirks become
  limiting. See [ADR 0006](../decisions/0006-slides-revealjs.md).

Turborepo
: Monorepo task orchestrator with content-hash caching. Runs only
  the packages whose inputs changed; parallelizes within the
  dependency graph. Used as `pnpm turbo run <task> --filter=<package>`.
  See [ADR 0014](../decisions/0014-turborepo-monorepo-orchestration.md).

tsup
: The library bundler Sophie uses to build `@sophie/*` packages
  (esbuild-based, dual ESM+CJS output, declaration files in one
  config). Distinct from Astro's application bundler. See
  [ADR 0022](../decisions/0022-tsup-library-builds.md).

uv
: Astral's Rust-based Python package and project manager. 10–100×
  faster than pip/poetry; lockfile, Python version management, all
  in one tool. Sophie uses `uv run` for any Python (figure
  generation, CI utilities). See
  [ADR 0012](../decisions/0012-uv-python-tooling.md).

useInteractive
: The React hook in `@sophie/components/runtime` that owns persistence
  for interactive components: drafts to IndexedDB, freezing on
  submit, schema migration, cross-tab sync. Components consume it;
  they never touch IndexedDB directly. See the
  [component contract](component-contract.md).

Zod
: The TypeScript schema-validation library Sophie uses as the source
  of truth. Inferred TS types via `z.infer`; JSON Schema generated
  via `zod-to-json-schema`. See
  [ADR 0003](../decisions/0003-zod-as-source-of-truth.md).
```

## Adding a term

When introducing a term that's used across multiple pages, add an
entry here rather than re-defining it in every page that uses it.
Cross-references via `{term}` syntax in MyST then link to this page
automatically.
