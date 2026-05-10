# Platform Design Docs

Working specification, planning, and design notes for the AI-assisted teaching
platform. Name: **Sophia** (Greek for *wisdom*).

## Status

Design phase. Decisions are being captured here as we make them. Nothing in
this folder is committed code yet — these are living docs that should evolve as
ASTR 201 dogfooding surfaces real requirements.

A May 2026 design-stress-test session locked the remaining ~20% of
architectural decisions and reframed the project shape (see "Decisions made"
below). The synthesis lives at
`~/.claude/plans/read-all-of-the-sharded-sky.md`; the docs in this folder have
been reconciled to it.

## Files

- `README.md` — this file (index, status, open questions)
- `design-notes.md` — current state of the design, decisions, scope
- `content-schema.md` — TypeScript schema sketch for chapters, missions, assets,
  concepts, skills, misconceptions, courses
- `dual-profile-builds.md` — student vs. instructor build mechanism, deploy
  options (GitHub Pages + Cloudflare Pages + Cloudflare Access)
- `pedagogical-innovations.md` — eight novel pedagogical elements proposed
  for the platform, with learning-science backing, schema sketches, and
  implementation order
- `component-contract.md` — TypeScript interface every pedagogy component
  implements; four render modes (read/slide/print/audit); state vs.
  response; cross-component protocol; audit hooks; v1 set; worked
  example walkthrough of `<Prediction>`
- `audit-and-authoring.md` — AI surface architecture; Sophia CLI is
  deterministic, AI work happens in Claude Code/Codex via prompt files
  and skills; v1 skills, slash commands, subagents; Cowork plugin
  packaging
- `roadmap.md` — phased implementation plan (Phase 0–7), calendar
  projection, critical path, decision points, risk register, v1/v2/v3
  scope definitions
- (more to come as we expand each area)

## Decisions made

- **Name: Sophia.** Greek for *wisdom*. Recognizable, scholarly pedigree
  (Hagia Sophia; *philosophy* = "love of *sophia*"), no etymology to teach.
  Cultural saturation as a baby name is the known cost; the etymology
  carries the justification. Repo and package: `sophia`. Sub-brand layer
  (e.g., `Sophia Astro` for astronomy textbooks, `Sophia Compute` for
  COMP textbooks) emerges if/when needed.

  Also considered: Gravitas, Prism, Etude, Trellis, Hypatia, Minerva,
  Urania, Aletheia. Kept here for posterity.

- **Sophia is a standalone platform, not a course monorepo.** Like MyST and
  Quarto, Sophia is published as `@sophia/*` packages plus a CLI plus an
  Astro integration. The platform repo (`astrobytes-edu/sophia`) contains
  *only* platform code, dogfooded docs, a reference example textbook, and
  tests. Course content (ASTR 201, COMP 521, etc.) lives in *separate
  consumer repos* that depend on `@sophia/*`. Open-source-shaped from day
  one; publication is a calendar decision, not an architectural one.

- **Renderer: Astro 5 + MDX.** Plugin-mediated academic markdown
  (`remark-math`, `rehype-katex`, `rehype-citation`,
  `rehype-autolink-headings`). Rejected MyST + `myst-theme` because
  interactive pedagogy components are the differentiator and go against
  MyST's directive grain.

- **JAX runtime strategy.** Pre-render JAX outputs at build time + provide
  "open in Colab" links for hands-on sections. Confirmed for COMP 536's
  small JAX slice.

- **Slides adapter: Reveal.js + thin Astro adapter.** Same MDX as the
  chapter; `h2` is the default slide boundary; `<SlideBreak />`,
  `<SlideAppear>`, `<SpeakerNotes>` are the three slide-specific
  components.

- **Persistence: IndexedDB via `idb` + `ResponseStore` repository.**
  Supersedes the documented localStorage-only approach. Cross-tab sync via
  `BroadcastChannel`; per-course databases for clean FERPA boundaries.
  v3 sync seam designed (same `ResponseStore` interface, swap
  implementation).

## Open questions

1. **Cross-device persistence (v3).** v1 is local-only via IndexedDB; the
   open question is *which* backend (Cloudflare Workers / Supabase /
   Convex / custom) gets wired into `SyncedResponseStore` when v3 needs
   it. Decide when there's a real signal, not now.
2. **Canvas export format.** HTML pages + Common Cartridge? Just HTML? QTI
   for quizzes? Decide before authoring real assignments.
3. **License.** Apache 2 (recommended for platform code) + CC BY 4.0
   (recommended for textbook content). Pick before public release.

## Working principles

- **Build the platform alongside ASTR 201.** Every platform feature has to
  earn its keep in a real chapter before it ships. COMP 536 follows in fall as
  the second adopter; COMP 521 is the third. Open source comes after three
  real courses run on it.
- **v1 ships single-build but authors as if dual-profile.** Solutions and
  teaching notes live inline in MDX from day one (`<SolutionKey>`,
  `<InstructorNote>`); v1 components render to `null` and the public build
  strips them. The instructor deploy target (Cloudflare Pages + Access)
  waits for v2 — triggered when ≥10 chapters carry instructor content,
  a TA needs remote access, or you want to read teaching notes from a
  phone/iPad. See `dual-profile-builds.md`.
- **Schema first, renderer second.** Content is portable across renderers if
  the schema is the source of truth.
- **Five views over the same content:** Read, Explore, Mission, Present, Teach.
  Plus Canvas Export as the LMS bridge.
- **AI assistance lives in the authoring loop**, not as a student tutor in v1.
  Content audit, chapter scaffolding, transcript generation, misconception
  checking — that's where AI earns its keep.
- **Static-deployable end-to-end** including Pyodide runtime. No backend in v1.
- **Accessibility is required, not optional.** WCAG 2.1 AA from the start.
