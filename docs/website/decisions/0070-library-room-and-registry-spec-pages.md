---
date: 2026-05-21T00:00:00.000Z
tags:
  - library
  - registries
  - spec-pages
  - cheatsheets
  - course-website
  - reasoning-os
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0070: Library room + registry-driven Spec pages and Cheatsheets

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0038](./0038-pedagogy-index-pattern.md) (pedagogy-index becomes the data source for Library spec pages), [0060](./0060-registry-ecosystem.md) (registries gain navigable page surfaces)
- **Related**: [0043](./0043-notation-registry-multirep.md), [0044](./0044-misconception-graph.md), [0046](./0046-equation-biography.md), [0048](./0048-lds-content-plugin-system.md), [0058](./0058-epistemic-component-contract.md), [0063](./0063-omiflow-composite-primitive.md), [0067](./0067-section-level-artifacts.md)
:::

## Context

Sophie has accumulated multiple registries — Equations
([ADR 0060](./0060-registry-ecosystem.md)), Glossary
(in-progress), Misconceptions ([ADR 0044](./0044-misconception-graph.md)),
Key Insights, Figures, Deep Dives ([ADR 0064](./0064-chapter-migration-playbook.md)),
Interventions ([ADR 0044](./0044-misconception-graph.md)), OMI flows
([ADR 0063](./0063-omiflow-composite-primitive.md)). Each holds
canonical pedagogy data, but **none currently has a navigable page
surface** beyond inline cross-references inside readings.

Anna's existing ASTR 201 site has manually-maintained formula sheets
as PDFs — three of them, one per exam. These rot whenever an equation
changes; require manual re-export; can drift from the actual content.

The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
proposes a generalized **"Registry → Spec page + Cheatsheet"** pattern:
every registry type gets (1) an auto-generated per-entry Spec page,
and (2) an auto-generated Cheatsheet index across all entries. Both
live in a top-level "Library" room.

This is one schema decision that unlocks ~8 different content surfaces
with minimal per-registry code investment.

## Decision

**Sophie ships a top-level Library room containing auto-generated Spec
pages and Cheatsheets for every registry type.**

### Library room placement

A new top-level nav item: "Library" (per-course-configurable label;
alternates: Reference / Atlas / Compendium / Toolbox). One room
containing collapsible sub-areas — one per registry.

```
Library/                  ← /library/
├─ Glossary/              ← /library/glossary/ + /library/glossary/<term>/
├─ Equations/             ← /library/equations/ + /library/equations/<slug>/
├─ Figures/               ← /library/figures/ + /library/figures/<slug>/
├─ Key Insights/          ← /library/key-insights/ + /library/key-insights/<slug>/
├─ Misconceptions/        ← /library/misconceptions/ + /library/misconceptions/<slug>/
├─ Objectives/            ← /library/objectives/ (rollup)
├─ Topics/                ← /library/topics/ + /library/topics/<slug>/ (Wedge B-followup W4b)
├─ Observables/           ← /library/observables/ (W4c; from OMIFlowEntry.observable)
├─ Models/                ← /library/models/ (W4c; from OMIFlowEntry.model)
├─ Inferences/            ← /library/inferences/ (W4c; from OMIFlowEntry.inference)
├─ Deep Dives/            ← /library/deep-dives/ + /library/deep-dives/<slug>/ (future)
├─ Interventions/         ← /library/interventions/ + /library/interventions/<slug>/ (future)
└─ OMI flows/             ← /library/omi/ + /library/omi/<slug>/ (future)
```

**URL prefix:** all Library room pages live under `/library/`
(W4a, 2026-05-22 — see Revision history below). The prefix
namespaces the room and prevents future collision with
Section/Subsection/Unit slugs (a course section literally
titled "Glossary of Symbols" cannot conflict with
`/library/glossary` at the URL level).

**Slug conventions:** room slugs match Sophie's internal entity
vocabulary (`key-insights`, not `insights`; `observables` for
the OMIFlowEntry.observable slot; etc.) so that author-facing
URLs align with component / entry-type / data-field names
(`<CourseKeyInsights>` → `KeyInsightEntry` →
`/library/key-insights/`). This avoids the URL-vs-internal-name
ambiguity flagged in the W4a R+CR (G2).

### Per-registry Spec pages (auto-generated)

For each registry entry, Sophie auto-routes a Spec page at
`/<registry>/<slug>/`. The page template pulls from:

1. The registry entry itself
2. Biography children (per [ADR 0046](./0046-equation-biography.md)
   for equations; analogous structures for other registries)
3. Cross-references collected from the pedagogy-index extractor
   ([ADR 0038](./0038-pedagogy-index-pattern.md))

Example: `/equations/stefan-boltzmann/` renders:

- KeyEquation card (LaTeX via KaTeX)
- Plain-language statement
- Epistemic role (Observable / Model / Inference / ... per
  [ADR 0058](./0058-epistemic-component-contract.md))
- Variables & units (Notation Registry per
  [ADR 0043](./0043-notation-registry-multirep.md))
- Assumptions, validity domain, common misuses (from Equation
  Biography per [ADR 0046](./0046-equation-biography.md))
- MultiRep links (verbal / graphical / equation / numeric)
- Where introduced (link to Section/Unit)
- Related equations (Equation Graph)
- Worked examples using this equation (cross-references)
- Practice problems exercising it (with FSRS schedule from
  [ADR 0069](./0069-fsrs-spaced-repetition-engine.md))
- Historical context
- `<RetrievalPrompt>` slot (FSRS-scheduled)

Same template-pattern for Glossary, Misconceptions, Key Insights,
Figures, Deep Dives, Interventions, OMI flows — each with its own
type-specific fields.

### Cheatsheet (per-registry index)

The index page for each registry shows all entries in compact form:

- Card grid (3-up desktop; 1-up mobile)
- Filterable by Section/Module, by epistemic role, by topic tag, by
  text search
- Sortable by order-introduced, name, role
- **Scope toggle** (especially valuable for Equations): "current
  module" / "course-to-date" / "course-wide" / "exam-1" / "exam-2" /
  "final" — scope filters operate on instructor-declared exam scopes
- **PDF export at any filter state** — auto-generates a print-CSS
  formula sheet matching the current filter

### Auto-generated formula sheets

The PDF export from `/equations/` at scope "exam-2" replaces Anna's
manually-maintained ASTR 201 exam-2 formula sheet. Always-correct;
auto-updates when equations are added/removed/edited; never drifts.

### Component contract

- `<EquationSpecPage equation="stefan-boltzmann" />` — top-level page
  template; Sophie's Astro routing auto-handles registry slug → page
- Similar templates per registry type: `<MisconceptionSpecPage>`,
  `<GlossarySpecPage>`, `<KeyInsightSpecPage>`, etc.
- All Spec pages are auditable by curriculum-CI in the same way
  readings are

## Consequences

### Positive

- **Massive content surface gained for modest code investment**: one
  page template per registry × 8 registries ≈ 8 page templates;
  hundreds of generated pages.
- **No per-entry authoring**: registry entry is the source of truth;
  Spec page renders from it. Adding a new equation = the Spec page
  appears automatically.
- **Formula sheets cease drifting**: PDF export from registry. Anna's
  three manually-maintained PDFs replaced by one declarative export.
- **Cross-references become bidirectional**: clicking an equation in a
  reading goes to its Spec page; the Spec page lists every reading
  that references it. The pedagogy graph becomes navigable.
- **OER reuse foundation**: per
  [ADR 0048](./0048-lds-content-plugin-system.md), Library entries are
  pluggable across courses. Plugin-level reuse becomes "pull these
  specific equations from another course's registry."

### Negative

- **More routes to maintain**: each registry slug → URL. Mitigated by
  Astro's dynamic routing; no per-entry route file.
- **Spec page templates must handle missing biography fields**:
  not every entry will have full biography filled. Templates render
  gracefully on partial data.
- **Filter UI complexity**: scope filters (especially exam scopes)
  add UX surface. Default views without filters keep the surface
  simple; power-users access scopes via a toggle.

### Neutral

- **Registries that don't need pages can opt out**: instructor
  configuration in `course.yaml` can disable specific registry surfaces
  if a course doesn't use them. Default is all registries enabled.

## Implementation notes

- New package `@sophie/library` containing Spec page templates per
  registry type
- Each Spec page template is an Astro component pulling from
  pedagogy-index (cross-references) + registry data
  ([ADR 0060](./0060-registry-ecosystem.md))
- Dynamic Astro routes: `/library/equations/[slug]/index.astro` etc.
  (per W4a 2026-05-22 URL prefix amendment)
- Cheatsheet / rollup index pages:
  `/library/equations/index.astro` etc., consuming the full
  registry + filter UI. W4a (2026-05-22) shipped the first 6
  rollup pages (`/library/{glossary,equations,figures,
  misconceptions,key-insights,objectives}`) + the Library hub
  at `/library/index.astro`.
- PDF export pipeline: print-CSS + headless browser snapshot, OR
  client-side PDF generation via `react-pdf` for offline export
- Pedagogy-index extractor augmented to emit cross-reference indexes
  per registry entry (e.g., "Stefan-Boltzmann is referenced in
  M2-L3 reading, M2 practice-set P3, P7, P11")

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) §"Library room"
- [ADR 0046 — Equation Biography](./0046-equation-biography.md)
- [ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md)
- [ADR 0048 — LDS Content Plugin System](./0048-lds-content-plugin-system.md)

## Revision history

### 2026-05-22 — Wedge B-followup W4a: URL prefix `/library/<X>/`

The original ADR (2026-05-21) specified bare-URL routes for
each registry room (`/equations/`, `/glossary/`, `/insights/`,
etc.). Wedge B-followup W4a amends this to `/library/<X>/`
across the board.

**Motivation.** Two converging reasons:

1. **Future Section/Unit slug collision.** ADR 0067's content
   hierarchy lets course authors slug Section / Subsection /
   Unit titles freely within their course. A course Section
   literally titled "Glossary of Symbols" produces a slug that
   would collide with the bare `/glossary` rollup route. The
   `/library/` prefix prevents this collision by construction;
   the alternative (a reserved-slug list across all rollup
   names) is fragile and grows with each new room added.
2. **Room-metaphor legibility.** ADR 0070 frames Library as a
   *room* containing typed sub-areas. Bare-URL routes flatten
   the room metaphor in URL space; the prefix makes the
   architectural seam visible. Authors reading a URL like
   `/library/equations/stefan-boltzmann/` can immediately
   place the page in the room hierarchy.

**Slug alignment.** The amendment also realigns the "Key
Insights" slug from `/insights/` (per the original ADR) to
`/library/key-insights/` to match Sophie's internal entity
vocabulary (`KeyInsightEntry`, `CourseKeyInsights`,
`KeyInsightSlug`). The original ADR's `/insights/` shorthand
was unattested in the broader codebase and would have
required a vocabulary split between URL and entity names.

**Implementation evidence (W4a, 2026-05-22).**

- 6 existing rollup routes hard-renamed via `git mv` (history
  preserved): `/glossary`, `/equations`, `/figures`,
  `/misconceptions`, `/key-insights`, `/objectives` → their
  `/library/<X>/` equivalents.
- New Library hub at `/library/index.astro` lists the 6 rooms.
- Relative-import depth fixed in all 6 moved files
  (`../content/figures` → `../../content/figures`).
- No 301 redirects; no shim routes (pre-launch posture per
  `feedback_no_backcompat_prelaunch`).
- All consumers migrated in same PR (no back-compat shims):
  6 e2e specs, 9 lines in `chapter-components.md`, 8 JSDoc /
  comment refs in component code, ADR 0038 inline example,
  ~7 live `docs/website/` cross-references.
- Detail-routes `/equations/<id>` preserved untouched
  (W4c territory, per W4 meta-plan).

**Implications for W4b / W4c.**

- W4b's Topic registry collection lives at `/library/topics/`
  with Spec pages at `/library/topics/<slug>/`.
- W4b's `<SkillReview target="topic:X" />` resolver looks up
  the topic entry at the same `/library/topics/<slug>/` route.
- W4c's missing-CourseX chrome (Observables / Models /
  Inferences from OMIFlowEntry slot data) renders at
  `/library/observables/`, `/library/models/`,
  `/library/inferences/`.
- W4c's per-entry Spec pages render at
  `/library/<collection>/[slug]/index.astro` dynamic routes.

**HITL note.** The W4 meta-plan's Q1 brainstorm decided
`/library/<X>/` without consulting this ADR (the brainstorm
cited "ADR 0067 §2.1 Library room hierarchy" — a non-existent
section). The W4a code review caught the conflict before PR
merge. The amendment lands in the W4a PR alongside the
implementation evidence, per ADR-as-revision-history
convention.
