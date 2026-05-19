---
title: Architecture
short_title: Architecture
description: How Sophie is structured — five layers, repo split, pedagogy components, multimedia strategy, and the v1 dogfooding plan.
tags: [architecture, design-notes]
---

# Architecture

This page is the architectural narrative — how Sophie fits together
and why. The *decisions* themselves live as
[ADRs](../decisions/template.md); this page is the connective tissue.

## North star

A schema-driven, AI-authorable system for building interactive
scientific textbooks, course websites, slide decks, and {abbr}`LMS`
exports from a single source — with first-class support for
prediction-first pedagogy, computational demos, animations, and
multimedia (video, podcast).

## Scope

### In scope

- Interactive textbook chapters
- Course websites (semester shells that schedule canonical content)
- HTML slides (generated from same MDX source as chapters; see
  [ADR 0006](../decisions/0006-slides-revealjs.md))
- Canvas/LMS export (HTML pages, assignments, discussions, quizzes)
- Cosmic Playground demo integration (see
  [ADR 0008](../decisions/0008-cosmic-playground-protocol.md))
- First-class video and podcast as content types (YouTube hosting in v1)
- Manim animations (pre-rendered, embedded as MP4)
- Pyodide runtime for student-facing executable Python (COMP courses)
- Pre-rendered figures via Python/SVG/Manim scripts (build-time)
- AI-assisted authoring: content audit, scaffolding, transcript
  generation, misconception checks (see
  [Audit and AI authoring](audit-and-ai-authoring.md))
- KaTeX for math (MathJax fallback for unsupported features)
- Pagefind for client-side search

### Out of scope

- LMS replacement (no gradebook, no enrollment, no auth)
- Server-side execution / Jupyter kernel hosting
- Custom auth or accounts (FERPA-bearing data lives in Canvas)
- Real-time collaboration
- Mobile apps
- LTI integration (deferred indefinitely; export-based integration only)

## The five layers

```{mermaid}
flowchart TD
    Schema["Schema layer<br/>(@sophie/core)<br/>Zod schemas → TS types"]
    Authoring["Authoring layer<br/>(MDX + @sophie/components)<br/>OMI, PMI, Prediction, UnitCheck, ..."]
    Assets["Asset pipeline<br/>Math (KaTeX), Code (Pyodide), Figures, Manim, Video, Audio, Transcripts"]
    Renderer["Renderer layer<br/>@sophie/astro (default)<br/>+ adapters for Reveal.js, Canvas, Pagefind"]
    AI["AI authoring kit<br/>@sophie/astro audit emits findings<br/>Claude Code / Codex consume"]

    Schema --> Authoring
    Authoring --> Renderer
    Assets --> Renderer
    Schema --> AI
    Authoring --> AI
    Renderer --> Output["Static sites,<br/>slide decks,<br/>LMS exports"]
```

1. **Schema layer.** Zod schemas (source of truth) for Chapter,
   Mission, Demo, MediaAsset, Concept, Skill, Misconception, Citation,
   Course. TypeScript types via `z.infer`; JSON Schema generated.
   Renderer-independent. See
   [ADR 0003](../decisions/0003-zod-as-source-of-truth.md) and
   [Content schema](../reference/content-schema.md).

2. **Authoring layer.** MDX + a small, opinionated component library.
   Default pedagogy components: OMI, PMI, Prediction, UnitCheck,
   Assumption, ModelLimit, FigureReading, Checkpoint. Custom
   components register against the schema. See
   [Component contract](../reference/component-contract.md).

3. **Asset pipeline.** Text, math (KaTeX), code (illustrative +
   Pyodide-runnable), figures (pre-rendered), Manim animations
   (pre-rendered MP4), video embeds (YouTube), audio/podcast embeds,
   transcripts, captions.

4. **Renderer layer.** Astro+MDX as default via `@sophie/astro` (see
   [ADR 0002](../decisions/0002-renderer-astro-mdx.md)). Adapters for
   Reveal.js (slides), Canvas/IMS (LMS), Pandoc/PDF (handouts),
   Pagefind (search).

5. **AI authoring kit.** Skills/agents that act on the schema:
   content audit, chapter scaffolding, mission generation,
   transcript-to-chapter, figure alt-text, misconception detection.
   See [Audit and AI authoring](audit-and-ai-authoring.md).

## Stack decisions

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Astro 6 | Static-first with islands of interactivity; good for content-heavy pages. [ADR 0002](../decisions/0002-renderer-astro-mdx.md) (upgraded from Astro 5 per ADR 0002 revision note) |
| Authoring | MDX | Markdown + custom React components for pedagogy. [ADR 0002](../decisions/0002-renderer-astro-mdx.md) |
| Language | TypeScript | Schema-as-code; reusable tooling. |
| Schema | Zod | Source of truth; TS types inferred; JSON Schema generated. [ADR 0003](../decisions/0003-zod-as-source-of-truth.md) |
| Styling | TS tokens → CSS vars + Tailwind preset; CSS Modules in components | Re-themable without rebuilding. [ADR 0005](../decisions/0005-theming-three-layers.md) |
| Math | KaTeX (primary), MathJax (fallback) | Speed first; full LaTeX where needed. |
| Search | Pagefind | Static, no backend. |
| Slides | Reveal.js via thin Astro adapter | Mature, presenter mode, PDF export, free. [ADR 0006](../decisions/0006-slides-revealjs.md) |
| Hosting | GitHub Pages (v1) | Free, static, public. |
| Runtime Python | Pyodide via `<CodeCell>` | In-browser, no backend, lazy-loaded per chapter. |
| Video | YouTube (unlisted/public) | Free, captions infra, accessibility. |
| Manim | Pre-rendered MP4 hosted on YouTube or CDN | Avoid CI render time; deterministic. |
| Math beyond Pyodide | Pre-render at build time + "Open in Colab" links | Handles JAX, GPU-required content. |
| Persistence | IndexedDB via `idb` + `ResponseStore` repository | Async, scales to v3. [ADR 0007](../decisions/0007-persistence-indexeddb.md) |
| Demos | Cosmic Playground via manifest + iframe + postMessage | Decoupled deploys, fault isolation. [ADR 0008](../decisions/0008-cosmic-playground-protocol.md) |

## Pedagogy components (v1)

Five-to-seven well-designed components that appear in every chapter
beat twenty inconsistently used.

**v1 (mandatory):**

- `OMI` — Observable → Model → Inference (astronomy framing)
- `PMI` — Problem → Model → Implementation → Interpretation (computational framing)
- `Prediction` — commit before reveal/demo
- `UnitCheck` — dimensional reasoning
- `Assumption` — explicit model assumptions
- `ModelLimit` — what would break this inference
- `FigureReading` — active interpretation prompt
- `Checkpoint` — retrieval practice

**v2 (add when they earn their keep):**

- `CommonMistake`, `Reflection`, `ConceptContrast`, `AlgorithmTrace`,
  `DebuggingLens`, `ParameterSweep`, `StabilityCheck`

**Pluggable framing.** Schema's `Framing` is a discriminated union:
`OMI`, `PMI`, or `custom`. Audit dispatches on `kind`. New framings
can be added without forking.

## Multimedia strategy

- **Video is first-class**, not an afterthought. `Chapter.primaryVideo`
  is in frontmatter, not buried in MDX. Renderer defaults to
  video-prominent layout.
- **Podcasts are content types** with their own MediaAsset entries
  (audio kind), transcripts, RSS distribution potential.
- **YouTube hosting** for v1: free, captions, accessibility tooling,
  where students already are. Migration path preserved via
  `MediaAsset.source` discriminated union.
- **Transcripts are mandatory** for accessibility and double as
  searchable text. AI generates first pass; human edits.
- **Manim is pre-rendered**, not built in CI. Scripts live in
  `/scripts/manim/`, outputs go to YouTube or a CDN, embedded via
  component.

## Pyodide runtime (for COMP courses)

- Chapter declares `runtime.python = { packages: [...] }` in
  frontmatter.
- Page lazy-loads Pyodide only when a `<CodeCell>` is present.
- One kernel per page; cells share state within a page; isolated
  across pages.
- Service worker caches Pyodide and packages aggressively (cache-first
  for WASM and packages).
- Pedagogical cell kinds: `illustrative`, `predict-then-run`,
  `fill-in-blank`, `parameter-sweep`, `compare`. Audit warns on
  missing pedagogical kind.
- The `predict-then-run` kind keeps the cell disabled until the
  paired `<Prediction>` is submitted; wired through the
  `useInteractive` runtime helper.
- **JAX-specific topics** (small slice of COMP 536) handled via
  pre-rendered outputs at build time + "Open in Colab" links for
  hands-on sections.

## Persistence

See [Persistence model](persistence-model.md) for the complete design.
Summary:

- IndexedDB-backed via the `ResponseStore` repository abstraction.
- Cross-tab sync via `BroadcastChannel`.
- Per-course databases for clean FERPA boundaries.
- Strict data minimization (no telemetry by default, ever).
- v3 sync seam designed (same interface, swappable implementation).

## Build alongside ASTR 201 and COMP 521 (dogfooding plan)

- Platform features must earn their keep in a real chapter before
  shipping.
- Vertical slice over horizontal scaffolding: build one course
  end-to-end before abstracting.
- ASTR 201 + COMP 521 are the v1 consumers (separate repos).
- COMP 536 follows in v2 — that's where we discover what was actually
  course-specific vs. platform.
- ASTR 596 is a stretch v2/v3 consumer (it's already in production on
  MyST; migration is non-urgent).
- Open-source release only after multiple real courses run on it (see
  [Status → Roadmap](../status/roadmap.md)).

## What already exists (do not redesign in a vacuum)

The platform is a **refactor / synthesis**, not a greenfield project.
Existing patterns to learn from and port:

- **`astr101-sp26/`, `astr201-sp26/`, `comp536-sp26/`** — Quarto sites
  with a shared custom SCSS design system. The new platform's design
  system *ports* this, not reinvents it. See
  [ADR 0005](../decisions/0005-theming-three-layers.md).

- **Dual-profile builds:** every active course has
  `_quarto-student.yml` + `_quarto-instructor.yml`. Same source, two
  builds, different visibility. The new platform first-classes this —
  every entity has a visibility/profile dimension. See
  [Set up dual-profile](../how-to/set-up-dual-profile.md).

- **`astr596-modeling-universe/`** — production MyST site at
  `astrobytes-edu.github.io/astr596-modeling-universe/`. Thebe/Binder
  for live code execution. CC-BY-4.0 content + MIT code. The closest
  precedent for what the new platform should feel like.

- **`astro-demos/`** — the Cosmic Playground monorepo. The new
  platform's `<Demo>` component integrates with this via a published
  manifest + postMessage protocol. See
  [ADR 0008](../decisions/0008-cosmic-playground-protocol.md).

- **ASTR 101 demo inventory** — ~18 interactive demos (seasons, moon
  phases, eclipses, parallax, EM spectrum, blackbody, spectral lines,
  Doppler, telescopes, Kepler's laws, binary orbits, conservation,
  climate, angular size). Real content, not hypothetical.

- **`comp521-fa26/`** — markdown drafts only, no built site yet. The
  cleanest candidate to author *natively* on the new platform once it
  has shape.

## Repository layout — platform repo + consumer course repos

Sophie is a standalone, distributable platform. The platform repo
contains *only* platform code, dogfooded docs, a reference example
textbook, and tests. **Course content lives in separate repos that
depend on `@sophie/*`.** See
[ADR 0001](../decisions/0001-platform-not-monorepo.md).

### Platform repo — `drannarosen/sophie`

**Shipped today** (5 packages):

```text
sophie/
  packages/
    @sophie/core/                # Zod schemas (pedagogy-index, equation-registry,
                                 # notation-registry, multirep, intervention,
                                 # equation-biography, registry-base, validation,
                                 # audit), inferred TS types
    @sophie/components/          # Framework-pure React + Zod + CSS Modules + axe
    @sophie/astro/               # The only Astro-coupled package: integration,
                                 # layout, pedagogy-index extractor + audit,
                                 # validation extractor, virtual modules
    @sophie/cli/                 # `sophie start / dev / preview / audit` (file mode)
    @sophie/theme/               # tokens.ts → CSS vars + Tailwind preset + math
                                 # + fonts; WCAG AA contrast checks
  examples/
    smoke/                       # Working vertical-slice consumer course
  docs/website/                  # MyST-built design docs (transitional;
                                 # eventually self-hosted on Sophie itself)
  e2e/                           # Playwright tests (currently under examples/smoke/e2e/)
  .github/workflows/             # CI: typecheck, build, unit, lint, e2e,
                                 # storybook, visual-regression
```

**Designed-but-not-shipped** packages (kept here for design-record
continuity; subject to revision before implementation):

- `@sophie/cosmic-playground` — `<Demo>` manifest + postMessage adapter (ADR 0008).
- `@sophie/renderer-contract` — `SophieRendererAdapter` interface for non-Astro consumers.
- Templates: `templates/starter-textbook/` + `templates/starter-course/` would be
  scaffolded by a future `sophie create` (the command itself is Designed; see
  [CLI reference](../reference/cli.md)).
- A pre-PR-A architectural sketch split out `@sophie/schema` (Zod) + `@sophie/audit`
  (MDX walker) as separate packages. That split was rolled back when ADR 0001
  consolidated schemas into `@sophie/core` and PR-C1 placed the extractor + audit
  inside `@sophie/astro` rather than as a separate package. The current layout
  above is canonical.

Note: `apps/` here is *consumer* dogfood, not course content. The docs
site and the reference example textbook are Sophie's first
external-style users — they catch authoring papercuts before any real
course author hits them.

### Consumer course repos — separate, e.g. `drannarosen/astr201`

Each course is its own repo:

```text
astr201/
  package.json                   # depends on @sophie/* packages
  sophie.config.ts               # validated by Zod schema
  astro.config.mjs               # imports @sophie/astro integration
  src/
    content/
      bibliography.json          # CSL-JSON
      textbook/                  # canonical chapters (semester-independent)
      courses/fa26/              # semester-specific shell
                                 #   - syllabus, schedule, weekly modules,
                                 #     assignment shells, Canvas links
    pages/                       # auto-generated by @sophie/astro
  public/
```

Inside one course repo, **textbook and course-instance content are
separate content collections under different routes**, not separate
deployed sites. A new semester (`courses/sp27/`) is a content
addition, not a new app. The textbook content remains stable across
semesters; only the `courses/<slug>/` shell changes.
