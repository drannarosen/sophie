---
title: Textbook architecture
short_title: Textbook architecture
description: How a Sophie textbook is structured — modules and chapters as canonical content collections, the schema, the filesystem layout, routing, navigation, and what's deferred to future passes.
tags: [architecture, textbook, modules, chapters, schema, design-notes]
status: accepted-design
---

# Textbook architecture

> **Status (2026-05-11):** This page is a **skeleton** — every
> section has a 2–3 sentence summary describing what the full prose
> will cover. The architecture itself was brainstormed on 2026-05-11
> and locked across six decisions (ADRs 0030–003N pending). This
> document is the connective tissue between those ADRs and the
> downstream reference / how-to / tutorial docs.

## 1. North star — what a Sophie textbook is

A Sophie textbook is **canonical** content (chapters and the modules
that group them) that lives in a consumer course repo per
[ADR 0001](../decisions/0001-platform-not-monorepo.md), is built and
deployed via the Sophie integration (`@sophie/astro`), and is *reused*
across semesters. The course shell — semester-specific scheduling,
assignments, dates — is a separate concern that *links into* the
textbook but does not own its content.

## 2. The two-collection content model

A Sophie textbook ships **two MDX content collections**:

- **`modules`** — chapter-grouping landing pages with their own
  metadata (title, learning objectives, week range) and prose.
- **`chapters`** — individual reading chapters that declare which
  module they belong to via a frontmatter ref.

Both collections are MDX, both are Zod-validated against schemas
exported from `@sophie/core/schema`. This section explains why two
collections beat one (audit invariants, routing layouts, AI
authoring ergonomics) and how the design generalizes when future
content kinds (slides, prep, solutions, handouts) get added.

## 3. `SectionModuleVariantSchema` — what a module is

Modules are first-class. Per
[ADR 0067](../decisions/0067-section-level-artifacts.md) (locked
2026-05-21 via Wedge A.5 reconciliation), the "module" concept is
the `type: "module"` variant of the new `SectionSchema` discriminated
union; `SectionModuleVariantSchema` is the exported Zod schema for
that variant.

A module requires a slug, title, order (sparse numeric for
insertion-friendly reordering), description (capped at 280 characters
for ToC consistency), and at least one learning objective (using the
shared `ObjectiveSchema` lifted into `@sophie/core/schema` from
`@sophie/components`). Optional fields: subtitle, weekRange, prep
(the latter deferred for refinement post-textbook). The module's
MDX body is author-controlled prose — "Why this module matters" —
that anchors the landing page.

## 4. `ChapterSchema` — chapter↔module relationship

Chapters declare module membership via a `module: "<slug>"` ref and
intra-module position via a sparse `order` field. Chapter `slug` is
stable and authoritative for routing and for the persistent-response
key per [ADR 0007](../decisions/0007-persistence-indexeddb.md) — it does **not**
derive from the filesystem. The schema also tightens `description`
to be required and capped at 280 characters, matching
`SectionModuleVariantSchema` for ToC layout predictability.

## 5. Filesystem layout convention

Filenames follow a folder-by-module + numeric-prefix convention
(`chapters/<module-slug>/<NN>-<slug>.mdx`). The folder name is the
module slug; the filename prefix is the zero-padded `order` value.
Both are *advisory* — the schema fields are the source of truth —
but the audit enforces alignment between filename prefix and `order`
to prevent silent drift. The convention works for both ASTR 201's
`module-NN/` shape and COMP 536's `NN-name/` shape because the
folder name is a free-form slug, not a fixed pattern.

## 6. Audit invariants (cross-collection)

The audit walks both collections and enforces five invariants beyond
per-entry Zod validation: (1) every chapter's `module` ref resolves;
(2) `(module, order)` tuples unique within a module; (3) filename
prefix matches `order` after zero-padding; (4) module slugs unique;
(5) module `order` values unique. These are Tier 1 deterministic
checks per the existing audit framework.

## 7. Routing model

Three URL families: `/` (textbook home — lists modules in `order`),
`/modules/<slug>/` (module landing — renders MDX body + auto-listing
of chapters), and `/chapters/<slug>/` (individual chapter). Chapter
URLs use the slug from frontmatter, **not** the filesystem path —
critical for stability when chapters get reordered or moved between
modules mid-semester. This section diagrams the route → page → layout
mapping.

## 8. Module landing layout

`ModuleLayout.astro` renders the module's MDX body, then auto-appends
a chapter-card listing (sorted by `order`, showing title +
description + read-time estimate). Authors can suppress the
auto-listing via `autoListing: false` frontmatter and place a
`<ChapterListing module="<slug>">` component anywhere in the body for
custom layouts. Default-on auto-listing matches Anna's existing
Quarto module-page behavior.

## 9. Cross-chapter navigation

`ChapterLayout` renders prev/next links computed from the chapter's
`(module, order)` tuple. Cross-module navigation: last chapter of
module N links to first chapter of module N+1, computed from the
modules collection sorted by `order`. At the textbook boundaries
(first chapter / last chapter), the prev/next falls back to the
module landing page rather than a dead link.

## 10. Build pipeline integration

The textbook builds via Sophie's Astro integration
(`defineSophieIntegration({ pagefind: true, sitemap: true,
darkMode: true })`), which wires Pagefind search across both
collections, emits a sitemap covering all routes, and exposes
dark/light theme tokens. None of this is textbook-specific — these
are general Phase-2 features — but the textbook design surfaces
what they index, sitemap, and theme.

## 11. Deferred content kinds

This section is a **placeholder** for the brainstorms that follow
the textbook-first pass. Each deferred kind gets a one-paragraph
sketch of how it slots into the two-collection model when it lands:

- **Slides** ([ADR 0006](../decisions/0006-slides-revealjs.md)) — likely a third
  textbook collection (`slides`) with its own `SlideDeckSchema`
  referencing modules.
- **Prep materials** — likely either an optional `prep[]` field on
  `SectionModuleVariantSchema` (small) or a fourth collection (rich).
- **Solutions** — Phase 5 dual-profile work; inline
  `<SolutionKey profile="instructor">` per the existing component
  contract; COMP 536's existing `_instructor/` shape is the
  reference.
- **Handouts / projects / lectures** — likely course-shell
  territory, not textbook; needs an explicit decision.

Each gets its own ADR when its brainstorm runs.

## 12. Relationship to course-shell

The textbook is canonical and stable across semesters; the course
shell is semester-specific and schedules content. Course shell repos
import the textbook as a dependency and link into modules and
chapters via the `defineCrossSiteLinks` API (planned for Phase 2
per [ADR 0031 pending]). This section sketches the semantics: the
course shell never owns chapter content, only schedules and
assignments that point at chapter URLs.

## 13. Open questions

This section is **alive** during the docs-first pass — questions
that surface here become brainstorming inputs or future ADRs. Initial
list:

- Should the textbook landing (`/`) be auto-generated or
  author-controlled?
- Per-textbook metadata file (title, ISBN-style identifier, license,
  cover image) — frontmatter on `index.mdx`, or a `textbook.config.ts`
  file?
- Cross-textbook references (linking from ASTR 201 to a chapter in
  COMP 521) — Phase 2's `defineCrossSiteLinks` covers this; revisit
  here once that API solidifies.
- Versioning chapters across semesters — does the textbook tag a
  version per academic year? Probably not in v1; revisit.

## References

- [ADR 0001](../decisions/0001-platform-not-monorepo.md) — platform
  vs. consumer-repo split.
- [ADR 0003](../decisions/0003-zod-as-source-of-truth.md) — Zod as
  schema source of truth.
- [ADR 0004](../decisions/0004-component-contract-revisions.md) —
  component contract.
- [ADR 0007](../decisions/0007-persistence-indexeddb.md) —
  persistence and the slug-as-key pattern.
- ADRs 0030–003N (pending) — module canonical, two-collection model,
  schema details, filename convention, template shape.
- [Textbook use cases](textbook-use-cases.md) — companion document
  driving this architecture.
