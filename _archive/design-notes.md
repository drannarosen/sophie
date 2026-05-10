# Design Notes

Current state of the platform design discussion. Updated as decisions are made.

## North star

A schema-driven, AI-authorable system for building interactive scientific
textbooks, course websites, slides, and LMS exports from a single source —
with first-class support for prediction-first pedagogy, computational demos,
animations, and multimedia (video, podcast).

## Scope

### In scope

- Interactive textbook chapters
- Course websites (semester shells that schedule canonical content)
- HTML slides (generated from same MDX source as chapters)
- Canvas/LMS export (HTML pages, assignments, discussions, quizzes)
- Cosmic Playground demo integration
- First-class video and podcast as content types (YouTube hosting in v1)
- Manim animations (pre-rendered, embedded as MP4)
- Pyodide runtime for student-facing executable Python (COMP courses)
- Pre-rendered figures via Python/SVG/Manim scripts (build-time)
- AI-assisted authoring: content audit, scaffolding, transcript generation,
  misconception checks
- KaTeX for math (MathJax fallback for unsupported features)
- Pagefind for client-side search

### Out of scope

- LMS replacement (no gradebook, no enrollment, no auth)
- Server-side execution / Jupyter kernel hosting
- Custom auth or accounts (FERPA-bearing data lives in Canvas)
- Real-time collaboration
- Mobile apps
- LTI integration (deferred indefinitely; export-based integration only)

## Architecture (five layers)

1. **Schema layer.** TypeScript types + JSON Schema. Defines Chapter, Mission,
   Demo, MediaAsset, Concept, Skill, Misconception, Citation, Course.
   Renderer-independent. Source of truth.
2. **Authoring layer.** MDX + a small, opinionated component library.
   Default pedagogy components: OMI, Prediction, UnitCheck, Assumption,
   ModelLimit, FigureReading, Checkpoint. Custom components register against
   the schema.
3. **Asset pipeline.** Text, math (KaTeX), code (illustrative + Pyodide-runnable),
   figures (pre-rendered), Manim animations (pre-rendered MP4 on YouTube/CDN),
   video embeds (YouTube), audio/podcast embeds, transcripts, captions.
4. **Renderer layer.** Astro+MDX as default. Adapters for Reveal.js (slides),
   Canvas/IMS (LMS), Pandoc/PDF (handouts), Pagefind (search).
5. **AI authoring kit.** Skills/agents that act on the schema:
   content audit, chapter scaffolding, mission generation, transcript-to-chapter,
   figure alt-text, misconception detection.

## Stack decisions

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Astro | Static-first with islands of interactivity; good for content-heavy pages |
| Authoring | MDX | Markdown + custom React components for pedagogy |
| Language | TypeScript | Schema-as-code; reusable tooling |
| Styling | Tailwind + design tokens | Fast, themeable, consistent |
| Math | KaTeX (primary), MathJax (fallback) | Speed first; full LaTeX where needed |
| Search | Pagefind | Static, no backend |
| Slides | Reveal.js via thin MDX adapter | Mature, presenter mode, PDF export, free |
| Hosting | GitHub Pages (v1) | Free, static, public |
| Runtime Python | Pyodide via custom `<CodeCell>` component | In-browser, no backend, lazy-loaded per chapter |
| Video | YouTube (unlisted/public) | Free, captions infra, accessibility |
| Manim | Pre-rendered MP4 hosted on YouTube or CDN | Avoid CI render time; deterministic |
| Math beyond Pyodide | Pre-render at build time + "Open in Colab" links | Handles JAX, GPU-required content |

## Pedagogy components (v1)

Five-to-seven well-designed components that appear in every chapter beat
twenty inconsistently used.

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

**Pluggable framing.** Schema's `Framing` is a tagged union: `OMI`, `PMI`, or
`custom`. Audit dispatches on `kind`. New framings can be added without
forking.

## Multimedia strategy

- **Video is first-class**, not an afterthought. `Chapter.primaryVideo` is in
  frontmatter, not buried in MDX. Renderer defaults to video-prominent layout.
- **Podcasts are content types** with their own MediaAsset entries (audio kind),
  transcripts, RSS distribution potential.
- **YouTube hosting** for v1: free, captions, accessibility tooling, where
  students already are. Migration path preserved via `MediaAsset.source` tagged
  union.
- **Transcripts are mandatory** for accessibility and double as searchable text.
  AI generates first pass; human edits.
- **Manim is pre-rendered**, not built in CI. Scripts live in `/scripts/manim/`,
  outputs go to YouTube or a CDN, embedded via component.

## Pyodide runtime (for COMP courses)

- Chapter declares `runtime.python = { packages: [...] }` in frontmatter.
- Page lazy-loads Pyodide only when a `<CodeCell>` is present.
- One kernel per page; cells share state within a page; isolated across pages.
- Service worker caches Pyodide and packages aggressively (cache-first for
  WASM and packages).
- Pedagogical cell kinds: `illustrative`, `predict-then-run`, `fill-in-blank`,
  `parameter-sweep`, `compare`. Audit warns on missing pedagogical kind.
- The `predict-then-run` kind keeps the cell disabled until the paired
  `<Prediction>` is submitted; wired through the `useInteractive` runtime
  helper.
- **JAX-specific topics** (small slice of COMP 536) handled via pre-rendered
  outputs at build time + "Open in Colab" links for hands-on sections.
  **Decided.**

## Persistence (student response data)

Supersedes any earlier sketch that used localStorage as the storage primitive.

- **Storage primitive: IndexedDB via the `idb` library.** Async, structured,
  hundreds of MB quota in practice. Avoids localStorage's synchronous I/O
  and ~5–10 MB cross-course quota wall.
- **Repository abstraction**: components consume a `ResponseStore` interface
  in `@sophia/components/runtime/responseStore.ts`. Implementations are
  swappable behind the interface (`IndexedDBResponseStore` in v1;
  `SyncedResponseStore` in v3 wrapping local + a pluggable `SyncClient`).
- **Cross-tab sync** via `BroadcastChannel` — predictions submitted in one
  tab appear in another instantly.
- **Per-course databases** (`sophia:astr201`, `sophia:comp521`) for clean
  FERPA boundaries — student deletes one course without touching another;
  no cross-course quota interaction.
- **Strict data minimization**: log submitted prediction responses, code-cell
  run records, mission completions only. *No* mouse, scroll, dwell, or
  click tracking. *No* telemetry to Sophia by default, ever, from any
  consumer site.
- **Schema migration**: forward-only via per-record `schemaVersion`. The
  `ResponseStore.migrate()` method runs on first load of a new platform
  version. Original recorded fields are preserved (no retroactive
  backfill).
- **The v3 sync seam** is exact, not aspirational: `SyncedResponseStore`
  implements the same `ResponseStore` interface and is swapped in via
  `@sophia/astro` config when a consumer enables it.

## Build alongside ASTR 201 (dogfooding plan)

- Platform features must earn their keep in a real ASTR 201 chapter before
  shipping.
- Vertical slice over horizontal scaffolding: build one course end-to-end before
  abstracting.
- COMP 536 follows in fall as second adopter — that's where we discover what
  was actually course-specific vs. platform.
- COMP 521 is the third adopter (new course; built on the platform from day one).
- Open-source release only after three real courses run on it.

## What already exists (do not redesign in a vacuum)

The platform is a **refactor / synthesis**, not a greenfield project. Existing
patterns to learn from and port:

- **`astr101-sp26/`, `astr201-sp26/`, `comp536-sp26/`** — Quarto sites with a
  shared custom SCSS design system: `tokens.scss`, `design-tokens.scss`,
  `callouts.scss`, `lecture-cards.scss`, `nav-markers.scss`, `dashboard.scss`,
  `collapsible-cards.scss`, `glossary.scss`. Custom HTML partials
  (`head.html`, `after-body.html`). Light/dark theme. The new platform's
  design system should *port* this, not reinvent it.

- **Dual-profile builds:** every active course has `_quarto-student.yml` +
  `_quarto-instructor.yml`. Same source, two builds, different visibility.
  This is load-bearing and the schema must first-class it — every entity has
  a visibility/profile dimension.

- **`astr596-modeling-universe/`** — production MyST site at
  `astrobytes-edu.github.io/astr596-modeling-universe/`. Thebe/Binder for
  live code execution. Utterances comments. CC-BY-4.0 content + MIT code.
  This is the closest precedent for what the new platform should feel like.

- **`astro-demos/`** — pnpm-workspace monorepo with `apps/`, `packages/`,
  `tools/`. This *is* the demo registry / Cosmic Playground inventory. The
  new platform's `<Demo>` component integrates with this; doesn't invent a
  new protocol.

- **ASTR 101 demo inventory** — ~18 interactive demos (seasons, moon phases,
  eclipses, parallax, EM spectrum, blackbody, spectral lines, Doppler,
  telescopes, Kepler's laws, binary orbits, conservation, climate, angular
  size). Real content, not hypothetical.

- **`comp521-fa26/`** — markdown drafts only, no built site yet. The cleanest
  candidate to author *natively* on the new platform once it has shape.

## Dual-profile (student / instructor) design

The full mechanism is documented in `dual-profile-builds.md`. Summary
of the scoping decision here.

### v1: single build, dual-profile-aware authoring

- CI builds only the student profile and deploys to GitHub Pages.
- Schema includes `profiles: Profile[]` from day one (default
  `['student', 'instructor']`); chapter frontmatter can declare it but
  v1 doesn't act on entity-level filtering.
- MDX components `<SolutionKey>`, `<InstructorNote>`,
  `<MisconceptionGuide>`, `<TeachingTip>` exist from day one but
  render to `null`. They strip from the student bundle at build time.
- Authors put solutions, teaching tips, and misconception guides
  *inline* in chapter MDX, colocated with the prose they relate to.
- Instructor-side viewing in v1: `pnpm preview:instructor` builds
  locally and serves on `localhost`. No cloud deploy.

The point of this scoping: get the *authoring* benefit (solutions
colocated with predictions, teaching tips next to relevant prose,
single source of truth) on day one without paying the Cloudflare
setup cost. Migration to v2 is purely additive — zero chapter rewrites.

### v2 triggers (any one is sufficient)

- ≥10 chapters carry substantial instructor content.
- A TA or co-instructor needs remote access.
- You want to read teaching notes from phone/iPad before class.

### v2 work (~1 evening)

- Flip `<SolutionKey>` / `<InstructorNote>` / etc. from always-null to
  `PROFILE`-conditional rendering (~10 lines per component).
- Activate `pnpm build:instructor` in CI as a parallel job.
- Deploy `dist/instructor/` to Cloudflare Pages.
- Wrap the Cloudflare Pages URL in a Cloudflare Access policy
  (email allowlist or domain match). Free up to 50 users.
- Optional: custom domain via Cloudflare DNS.

Zero chapter content changes required.

### What v2 enables that v1 doesn't

Two-layer profile filtering — the thing Quarto's profile system
gestures at but does coarsely:

- **Entity-level filtering**: chapters, missions, demos, or media
  assets tagged `[instructor]` only don't produce pages in the
  student build at all. Not hidden by CSS — not in the bundle,
  not in the source map, not inspectable.
- **Body-level conditional rendering**: inline `<SolutionKey>` /
  `<InstructorNote>` blocks render in the instructor build,
  collapse to `null` in the student build, get tree-shaken from
  the student bundle.

### Audit checks (when v2 is active)

- Every `<Prediction>` in the student build has a matching
  `<SolutionKey>` (by ID) in the instructor build.
- Every misconception declared in chapter frontmatter is addressed by
  a `<MisconceptionGuide>` somewhere in the instructor build.
- No `<SolutionKey>` content accidentally appears in the student
  bundle (smoke-test via `grep` on `dist/student/`).
- Student-build entities don't reference instructor-only entities.

## Open design questions surfaced by existing work

1. **What's specifically painful about current Quarto?** Decision is made
   (moving away), but the *grievance* should be documented because it points
   to platform priorities.
2. ~~**Astro+MDX vs. continuing on MyST.**~~ **Decided.** Astro 5 + MDX with
   plugin-mediated academic markdown (`remark-math`, `rehype-katex`,
   `rehype-citation`, `rehype-autolink-headings`). Rationale: the eight
   pedagogical innovations are interactive web apps wearing textbook
   clothing — calibration sliders, sketch canvases, NPC dialogues, video-
   player interception, concept-decay sparklines. Trivial in MDX/React,
   painful in MyST directives. Citations / cross-refs / equation labels
   are well-served by mature remark/rehype plugins; that loss is mitigated
   not eliminated.
3. ~~**Demo integration pattern.**~~ **Decided.** Manifest + iframe +
   versioned postMessage protocol via `@sophia/cosmic-playground`.
   Cosmic Playground publishes a `manifest.json` with demo IDs, URLs,
   parameter and event schemas; Sophia's `<Demo demoId="...">` validates
   demoIds at build time, embeds via iframe at runtime, exchanges events
   that flow into `useInteractive` → `ResponseStore`. Decoupled deploys,
   fault isolation, theme bridge optional.
4. ~~**Visibility/profile model in the schema.**~~ **Decided.** Tag set
   (`profiles: Profile[]`) on entities; body-level `<SolutionKey>` /
   `<InstructorNote>` components for inline. v1 single-build,
   dual-profile-aware authoring (components render to null);
   v2 activates the second build target. See `dual-profile-builds.md`.
5. ~~**Migration scope.**~~ **Decided.** Chapter-by-chapter migration of
   ASTR 201 from Quarto, in parallel with greenfield COMP 521 authoring.
   If Phase 4 calendar slips, ASTR 201 stays on Quarto for fall 2026 and
   migration completes in spring 2027; COMP 521 ships first because
   nothing has to be displaced.

## Repository layout — platform repo + consumer course repos

Sophia is a standalone, distributable platform. The platform repo contains
*only* platform code, dogfooded docs, a reference example textbook, and
tests. **Course content lives in separate repos that depend on `@sophia/*`.**
This is the same shape as MyST (`mystmd` package + project repos that use
it) and Quarto (the `quarto` CLI + project repos).

### Platform repo — `astrobytes-edu/sophia`

```text
sophia/
  packages/
    @sophia/schema/              # Zod schemas, inferred TS types, JSON Schema gen
    @sophia/components/          # Framework-pure React + Zod + CSS Modules
    @sophia/theme/               # tokens.ts → CSS vars + Tailwind preset
    @sophia/audit/               # MDX AST walker, Tier 1/2 checks, Tier 3 prompt emitter
    @sophia/cli/                 # `sophia` command (build / audit / eval /
                                 #   validate / fmt / create / upgrade)
    @sophia/renderer-contract/   # SophiaRendererAdapter interface
    @sophia/astro/               # The only Astro-coupled package
    @sophia/cosmic-playground/   # <Demo> manifest + postMessage adapter
  apps/
    docs/                        # Sophia docs site, self-hosted on Sophia
    example-textbook/            # 4-chapter reference textbook for e2e tests
  templates/
    starter-textbook/            # `sophia create textbook` scaffolds this
    starter-course/              # `sophia create course` scaffolds this
  e2e/                           # Playwright tests against example-textbook
  .changeset/                    # SemVer + release notes
  .github/workflows/             # CI: test, build, deploy docs, publish
```

Note: `apps/` here is *consumer* dogfood, not course content. The docs site
and the reference example textbook are Sophia's first external-style users —
they catch authoring papercuts before any real course author hits them.

### Consumer course repos — separate, e.g. `astrobytes-edu/astr201`

Each course is its own repo:

```text
astr201/
  package.json                   # depends on @sophia/* packages
  sophia.config.ts               # validated by Zod schema
  astro.config.mjs               # imports @sophia/astro integration
  src/
    content/
      bibliography.json          # CSL-JSON
      textbook/                  # canonical chapters (semester-independent)
      courses/fa26/              # semester-specific shell
                                 #   - syllabus, schedule, weekly modules,
                                 #     assignment shells, Canvas links
    pages/                       # auto-generated by @sophia/astro
  public/
```

Inside one course repo, **textbook and course-instance content are
separate content collections under different routes**, not separate
deployed sites. A new semester (`courses/sp27/`) is a content addition,
not a new app. The textbook content remains stable across semesters; only
the `courses/<slug>/` shell changes.

### Why this separation

- A chapter improved once benefits every future semester instance in the
  same course repo.
- An external instructor adopts Sophia by `sophia create textbook ...`,
  not by forking the platform.
- Sophia's release cadence is independent of any one course's calendar.

### v1 scope

- One platform repo (`astrobytes-edu/sophia`) shipping `@sophia/*`
  packages, the docs site, and the example textbook.
- Two consumer course repos: `astrobytes-edu/astr201` (migration from
  Quarto) and `astrobytes-edu/comp521` (greenfield).
- COMP 536 stays on Quarto for fall 2026; migration is v2 (a third
  consumer repo).
- GitHub: `astrobytes-edu/sophia` for the platform; one repo per course.
- NPM packages: scoped under `@sophia/*` (or `@astrobytes-edu/sophia-*`
  if `sophia` is taken on npm).

Add platform packages only when actively duplicating across consumers.
Slides, canvas-export, and any other adapter starts as code in
`@sophia/astro` or in the consumer; it graduates to its own package the
first time two consumers want it.
