---
title: Textbook use cases
short_title: Textbook use cases
description: How Anna actually uses Sophie textbooks — authoring, migration from Quarto, migrating Python content, teaching across semesters, AI-assisted authoring, dual-profile, reordering, cross-references, and print/handout export.
tags: [textbook, use-cases, requirements, design-notes]
status: draft (skeleton — outline + section summaries; full prose pending Anna's sign-off on shape, 2026-05-11)
---

# Textbook use cases

> **Status (2026-05-11):** This page is a **skeleton** — every use
> case has a 2–3 sentence summary describing what it covers and what
> design constraints it places on the architecture. Use cases drive
> the architecture (see
> [textbook-architecture.md](textbook-architecture.md)); changes here
> may force ADRs to revise.

## How to read this page

Each use case captures *what Anna actually does today* (in Quarto,
in Markdown, in her head) and *what Sophie must support* to be at
parity-or-better. Use cases are the requirement set. The architecture
satisfies them; the migration playbooks operationalize them. If a use
case isn't here, the architecture isn't required to handle it — and
should explicitly defer rather than silently drop.

## A. Authoring a new textbook from scratch (greenfield)

**Source:** none — author writing a new textbook (e.g., COMP 521
"Scientific Computing with Python," ~8 chapters in v1 per
[roadmap §1](../status/roadmap.md)). **What Anna does:** runs
`sophie create textbook` (Phase 7), gets a minimal-example template
with one demo module + two demo chapters that already render
correctly. Edits the demo content in place to iterate; runs
`sophie dev` for HMR; passes `sophie audit` before commit. **Design
constraints:** template must be opinionated enough to teach the
contract by example, and minimal enough that `sophie audit` is green
on the demo content out of the box.

## B. Migrating from Quarto — ASTR 201

**Source:** `/Users/anna/Teaching/astr201-sp26/` —
`modules/module-NN/{readings,slides,_prep}/` shape, ~14–18 chapters
across 4+ modules. **What Anna does:** runs a migration walkthrough
([planned how-to](../how-to/migrate-from-quarto.md)) per chapter:
Quarto frontmatter → MDX frontmatter, callouts → `<Callout>`,
solutions companion → inline `<SolutionKey>` (Phase 5), figure
references → `figures.ts` registry. Chapters land incrementally; old
Quarto + new Sophie can co-exist during transition. **Design
constraints:** module slug accommodates ASTR's `module-NN/` shape;
chapter ordering survives mid-migration insertion; figure registry
handles the existing 26-figure ASTR 201 set; KaTeX matches Quarto's
math rendering at parity.

## C. Migrating Python content with executable code — COMP 536

**Source:** `/Users/anna/Teaching/comp536-sp26/` — flat
`NN-name/` top-level shape (e.g., `03-scientific-computing-with-python/`,
`07-numerical-methods/`), Python content already in production with
`.venv`, `tests/`, executable `qmd` cells. **What Anna does:**
migrates the Python textbook portions into a Sophie textbook
(plausibly into COMP 521, or as a separate sub-brand "Sophie
Compute"). Executable code cells become `<CodeCell>` (per
[ADR 0018](../decisions/0018-codemirror-6-for-codecell.md), Phase 3
deliverable). **Design constraints:** module slug accommodates
COMP's `NN-name/` shape; chapter ordering preserved; Pyodide
integration (Phase 3) supports the existing executable-code patterns;
`tests/` directory pattern in source is acknowledged in the
playbook but doesn't block migration shape.

## D. Teaching across semesters

**Source:** the same canonical textbook, semester after semester.
**What Anna does:** every fall, the textbook is republished without
content changes (or with minor errata fixes); the course shell
(separate consumer repo per [ADR 0001](../decisions/0001-platform-not-monorepo.md))
is the only thing that updates — week-to-chapter mapping, assignment
dates, grading weights. **Design constraints:** chapter slugs *do
not change* across semesters; persisted student responses keyed to
chapter slugs survive textbook bumps; the textbook publishes as a
dependency the course shell pins to a specific version.

## E. AI-assisted authoring

**Source:** the `sophie-chapter-author` skill (Phase 3). **What Anna
does:** invokes `/sophie-scaffold-chapter` in Claude Code; the AI
introspects the modules collection, picks the next free `order`
value within the target module, drafts a chapter that passes
`sophie audit`, hands back to Anna for review. **Design constraints:**
schema is introspectable (Zod `.shape` traversal); AI can read the
modules collection to choose `order` values without collisions;
`sophie audit` is fast enough to run after every AI iteration;
chapter-component reference docs are AI-ingestible.

## F. Dual-profile (already active in COMP 536)

**Source:** COMP 536's existing `_quarto-instructor.yml` /
`_quarto-student.yml` pattern with `_instructor/` directory of
solutions. **What Anna does today:** authors solutions inline with
prose, marks them with Quarto conditionals, builds two outputs.
**What Anna will do in Sophie:** authors `<SolutionKey
profile="instructor">` per the component contract; Phase 5 ships
the build-time profile flag and Cloudflare Access for the instructor
URL. **Design constraints:** the textbook design must accommodate
inline profile-conditional content from day one (even if the build
flag is Phase 5); the schema does not pre-bake a `kind: "solution"`
chapter type because solutions are *inline*, not separate chapters.

## G. Reordering chapters / inserting new content mid-semester

**Source:** the lived experience of writing a textbook. **What Anna
does:** decides Chapter 4 should now be Chapter 3.5; needs to insert
between existing chapters without renumbering. **Design constraints:**
sparse `order` field (10, 20, 30) makes mid-sequence insertion
trivial (insert 15 between 10 and 20); if a renumber is needed, it's
mechanical — but slugs stay stable so URLs and persisted responses
don't break. The audit catches duplicate `order` values immediately.

## H. Cross-references (figures, equations, glossary, citations)

**Source:** the canonical content. **What Anna does:** references
Figure 4.2 in Chapter 7's prose; cites a paper from
`references.bib`; links to a glossary entry on "metallicity";
points at an equation in a different module. **Design constraints:**
figure registry per chapter (already shipping); citations via
`rehype-citation` per [ADR 0002](../decisions/0002-renderer-astro-mdx.md);
glossary as either a fifth content collection (likely) or
component-managed; equation references via `<EqRef>`; cross-chapter
references resolve at build time and break the build if the target
moves. **Open question:** glossary collection vs. component
inventory (defer to later brainstorm).

## I. Print / handout export

**Source:** print-mode CSS pass already in the component contract.
**What Anna does:** generates a PDF handout for a specific chapter
or module via a `?print` URL or a `sophie export` subcommand
(Phase 4+). **Design constraints:** every component supports a
`print` render mode per the component contract; KaTeX prints
correctly; the print stylesheet hides interactive controls and
collapses persistence-bearing components to their submitted state.
**Status:** Phase 4 deliverable; not blocking textbook architecture.

## J. Search across the textbook

**Source:** Pagefind integration (Phase 2). **What Anna does:**
students hit `/?q=metallicity` or use a search box; results show
chapter title + matching snippet. **Design constraints:** Pagefind
indexes both `modules` and `chapters` collections; module landings
are searchable for "what's this module about?" queries; module
metadata (description, learningObjectives) gets indexed alongside
chapter prose.

## K. Theme + accessibility preferences

**Source:** dark/light mode + `prefers-reduced-motion` +
`prefers-contrast` per [ADR 0032 pending]. **What Anna does:**
nothing as author; the platform respects user-OS preferences and
provides an explicit toggle. **Design constraints:** theme
preference persists via `localStorage` (not `useInteractive` —
preferences ≠ response data); cross-tab sync via `storage` event;
Tailwind v4 dark variant via `data-theme` attribute on `<html>`.

## Use cases explicitly out of scope for v1

- **Real-time collaboration** on chapter editing (per
  [roadmap §8](../status/roadmap.md))
- **Student accounts / auth** — local-only via IndexedDB
- **Mobile native apps** — web only
- **Cross-course federated search** (per-site Pagefind only in v1)
- **Versioning chapters across semesters** — semester pins the
  textbook version; chapters do not internally version
- **i18n** ([ADR 0009](../decisions/0009-i18n-deferred.md))

## Use cases pending Anna's input

> **TODO:** This section captures use cases I haven't asked about
> directly and may have wrong. Expect Anna to refine, add, or remove.

- Embedded video (YouTube as v1 host per [architecture.md](architecture.md))
  — does this need a `<VideoEmbed>` component or just MDX `<iframe>`?
- Podcast episodes per chapter — referenced in `architecture.md` as
  in-scope; how does it surface in the textbook?
- Concept maps (Phase 6) — graph-shaped content; how does it
  reference chapters and modules?
- Mission Generator skill (Phase 6) — generates novel pedagogy
  exercises; what does it consume from the textbook?
- Lecture videos embedded with prompts (per
  [roadmap §1 v1 scope](../status/roadmap.md)) — textbook-shaped or
  course-shell-shaped?

## References

- [Textbook architecture](textbook-architecture.md) — companion
  document; the architecture this set of use cases drives.
- [Pedagogical foundations](pedagogical-foundations.md) — the
  pedagogy components these chapters use.
- [Roadmap §1](../status/roadmap.md) — v1/v2/v3 scope.
- [ADR 0001](../decisions/0001-platform-not-monorepo.md) — textbook
  vs. consumer repo split.
