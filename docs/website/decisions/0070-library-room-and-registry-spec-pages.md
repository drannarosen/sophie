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
  status: in-progress
  last_validated_date: "2026-05-23"
  evidence:
    - kind: test
      ref: packages/astro/src/components/LibraryCollectionShell.axe.test.ts
      date: "2026-05-23"
      notes: "Shell extraction (D2 hybrid API: text props + slots); axe-clean as a standalone container; outer <section aria-labelledby> region landmark."
    - kind: test
      ref: packages/astro/src/components/CourseGlossary.axe.test.ts
      date: "2026-05-23"
      notes: "Refactored to use LibraryCollectionShell; axe-clean post-refactor."
    - kind: test
      ref: packages/astro/src/components/CourseKeyInsights.axe.test.ts
      date: "2026-05-23"
      notes: "Refactored to use LibraryCollectionShell; axe-clean post-refactor."
    - kind: test
      ref: packages/astro/src/components/CourseEquations.axe.test.ts
      date: "2026-05-23"
      notes: "Refactored to use LibraryCollectionShell; axe-clean post-refactor."
    - kind: test
      ref: packages/astro/src/components/CourseMisconceptions.axe.test.ts
      date: "2026-05-23"
      notes: "Refactored to use LibraryCollectionShell; axe-clean post-refactor."
    - kind: test
      ref: packages/astro/src/components/CourseFigures.axe.test.ts
      date: "2026-05-23"
      notes: "Refactored to use LibraryCollectionShell; axe-clean post-refactor."
    - kind: test
      ref: packages/astro/src/components/CourseObjectives.axe.test.ts
      date: "2026-05-23"
      notes: "Stays outside the shell per W4c D1 exception (3-level grouping); internal aria-labelledby landmark added for standalone axe-cleanness."
    - kind: test
      ref: packages/astro/src/components/CourseObservables.axe.test.ts
      date: "2026-05-23"
      notes: "New OMIFlow-derived rollup per ADR 0058 §4 slot-name-binds-role."
    - kind: test
      ref: packages/astro/src/components/CourseModels.axe.test.ts
      date: "2026-05-23"
      notes: "New OMIFlow-derived rollup per ADR 0058 §4 slot-name-binds-role."
    - kind: test
      ref: packages/astro/src/components/CourseInferences.axe.test.ts
      date: "2026-05-23"
      notes: "New OMIFlow-derived rollup per ADR 0058 §4 slot-name-binds-role."
    - kind: test
      ref: packages/astro/src/components/EquationSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "Per-entry Spec route /library/equations/<id>/ — BiographyRender + KaTeX + role 'model' + cross-refs from equationCitations."
    - kind: test
      ref: packages/astro/src/components/MisconceptionSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "Per-entry Spec route /library/misconceptions/<slug>/ — role 'misconception'."
    - kind: test
      ref: packages/astro/src/components/GlossarySpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "Per-entry Spec route /library/glossary/<slug>/ — cross-refs via slugify(refKey) per D4."
    - kind: test
      ref: packages/astro/src/components/FigureSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "Per-entry Spec route /library/figures/<name>/ — two-tier registry+usage; raw refKey match per F2."
    - kind: test
      ref: packages/astro/src/components/KeyInsightSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "Per-entry Spec route /library/key-insights/<slug>/ — uses Batch 1+2 derived slug; role 'inference'."
    - kind: test
      ref: packages/astro/src/components/ObservableSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "New per-OMIFlow-callsite Spec route /library/observables/<unit>-<anchor>/ per W4c D3 + ADR 0058 §4."
    - kind: test
      ref: packages/astro/src/components/ModelSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "New per-OMIFlow-callsite Spec route /library/models/<unit>-<anchor>/ per W4c D3 + ADR 0058 §4."
    - kind: test
      ref: packages/astro/src/components/InferenceSpecContent.axe.test.ts
      date: "2026-05-23"
      notes: "New per-OMIFlow-callsite Spec route /library/inferences/<unit>-<anchor>/ per W4c D3 + ADR 0058 §4."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/invariants/key-insights.test.ts
      date: "2026-05-23"
      notes: "KI-slug-unique audit invariant (Batch 2 Task 2.2) — cross-unit slug-collision detection; pathological-'term' hint when slug derives from non-alphanumeric titles."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit/invariants/misconceptions.test.ts
      date: "2026-05-23"
      notes: "Misconception-slug-unique audit invariant (Batch 1b) — sibling cross-unit slug-collision detection."
    - kind: deployment
      ref: examples/smoke/dist/library/index.html
      date: "2026-05-23"
      notes: "Library hub surfaces 10 rooms with counts from PedagogyIndex (Topics shipped in W4b; 9 W4c rooms + Topics). Smoke build: 19 → 129 pages."
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

### 2026-05-23 — Wedge B-followup W4b: Topics room ships

W4b adds the **Topics** room to the Library hierarchy alongside
the 6 W4a rooms (Glossary, Equations, Figures, KeyInsights,
Misconceptions, Objectives). Topics route lives at
`/library/topics/<topic-id>/` per the W4a URL convention; per
[ADR 0079](./0079-topic-registry-and-resolution-pattern.md),
the topic Spec page renders the topic's frontmatter metadata +
inline card list + cross-references.

Library hub at `/library/index.astro` (W4a) gains a Topics tile
in the rooms list. Smoke fixture covers two topic Spec pages:
`/library/topics/exponents/` and `/library/topics/logarithms/`.

**W4c expansion preview.** W4c will add three more Library
rooms — Observables, Models, Inferences — derived from the
existing `OMIFlowEntry` slot data per the [W4 meta-plan
Q4b](../../../.claude/plans/sophie-wedge-b-followup-w4-tranquil-glade.md).
The 3 deferred rooms (Assumption, Approximation, Numerical)
await role-tagging extension or new entry types.

### 2026-05-23 — Wedge B-followup W4c: shell extraction + 3 OMIFlow rooms + 8 per-entry Spec routes

W4c is the largest single increment on this ADR since the original
2026-05-21 design lock. It does five interlocking things: extracts
the Course\* surface chrome into a shared shell, refactors the five
W4a Course\* components onto it (with one principled exception),
ships three new OMIFlow-derived rollups, ships eight new per-entry
Spec routes, and adds two cross-unit slug-uniqueness audit
invariants. The Library hub now surfaces ten rooms with live
counts. Smoke build grows 19 → 129 pages.

**Companion ADR revision entries.** ADR 0058 records the
Observable/Model/Inference rollup chrome + Spec routes shipped via
OMIFlow slot derivation per §4 (slot name binds role). ADR 0079
records the PRA-2 graduation + Topic Spec page card-body inline
rendering + the `<article>` → `<section aria-labelledby>` landmark
fix. Read all three W4c entries together — the W4c work was a
coordinated cross-ADR push, not three independent changes.

**`<LibraryCollectionShell>` extraction (D2 hybrid API).** The five
W4a Course\* components had grown a duplicated surface: each
rendered a `<section>` wrapper with a heading + intro paragraph +
entry-grid container. W4c lifts this chrome into
`<LibraryCollectionShell>` with a deliberately hybrid API per
W4c D2: text-shaped concerns (`heading`, `headingId`, `intro`,
`emptyMessage`, `count`) are exposed as props; structurally-
distinct concerns (the entry grid, any per-entry filter UI) are
exposed as `<slot>` children. The outer wrapper is
`<section aria-labelledby={headingId}>` — a region landmark, not
`<main>` (avoids duplication with `<ContentColumn>`, which already
owns the page's main landmark).

**Five Course\* refactored onto the shell.** CourseGlossary,
CourseKeyInsights, CourseEquations, CourseMisconceptions, and
CourseFigures now consume `<LibraryCollectionShell>` for chrome
and contribute their entry-grid bodies as slot children. Each
refactor is a strict reduction in surface area — no new behavior,
no per-component chrome variation.

**CourseObjectives D1 exception.** CourseObjectives stays outside
the shell per W4c D1: its three-level grouping (Unit → Section →
Objective) is structurally distinct from the flat entry-grid the
other five Course\* render, and forcing it through the shell would
either degrade the shell's hybrid API to lowest-common-denominator
slot-everything OR keep an `<LibraryCollectionShell variant=...>`
escape valve that swallows the abstraction. Instead the component
gets an internal `aria-labelledby`-bound landmark (matching the
shell's pattern) so it remains axe-clean as a standalone surface.

**Three new CourseX OMIFlow rollups.** CourseObservables,
CourseModels, and CourseInferences derive their entry lists from
existing `OMIFlowEntry` slot data — per
[ADR 0058 §4](./0058-epistemic-component-contract.md) the slot
name binds the role, so OMIFlow's three slots already constitute
the role-classified data each rollup needs. No new schema, no new
extractor; the entry-list is a projection of `PedagogyIndex.omiFlows`
through the slot accessor. Each rollup uses `<LibraryCollectionShell>`
identically to the five refactored W4a components.

**Eight new per-entry Spec routes.** Five W4a-era + three new:

| Route                                     | Wave | Highlights                                                                           |
| ----------------------------------------- | ---- | ------------------------------------------------------------------------------------ |
| `/library/equations/<id>/`                | W4a  | BiographyRender + KaTeX + epistemic role `model` + cross-refs from equationCitations |
| `/library/misconceptions/<slug>/`         | W4a  | Role `misconception`; canonical instance per ADR 0058 §3                             |
| `/library/glossary/<slug>/`               | W4a  | Cross-refs via `slugify(refKey)` per D4                                              |
| `/library/figures/<name>/`                | W4a  | Two-tier registry+usage; raw `refKey` match per F2                                   |
| `/library/key-insights/<slug>/`           | W4a  | Uses Batch 1+2 derived slug; role `inference`                                        |
| `/library/observables/<unit>-<anchor>/`   | W4c  | New; per-OMIFlow-callsite per-slot Spec page per W4c D3                              |
| `/library/models/<unit>-<anchor>/`        | W4c  | New; per-OMIFlow-callsite per-slot Spec page per W4c D3                              |
| `/library/inferences/<unit>-<anchor>/`    | W4c  | New; per-OMIFlow-callsite per-slot Spec page per W4c D3                              |

All eight render through dedicated `<XSpecContent>` Astro
components with full axe coverage.

**Two cross-unit slug-uniqueness audit invariants.** KI-slug-unique
(Batch 2 Task 2.2) and Misconception-slug-unique (Batch 1b) detect
cases where two different entries in different units would otherwise
collide on the `/library/<collection>/<slug>/` Spec-route path. Both
include a pathological-`"term"` diagnostic hint when the colliding
slug derives from a title containing no alphanumerics (slugify's
fallback case) — a class of bug that surfaces during real authoring
because component-flavored content (e.g., a glossary entry titled
`<term>`) produces an empty slug pre-fallback.

**Library hub: 10 rooms with counts.** `/library/index.astro` now
lists 10 rooms — the six W4a rooms (Glossary, Equations, Figures,
KeyInsights, Misconceptions, Objectives), Topics (W4b), and the
three new W4c rooms (Observables, Models, Inferences) — each
showing a live count read from `PedagogyIndex`. The W4a hub was
hand-rolled with 6 tile entries; W4c rewrites it to consume a
manifest so adding the next room is one entry, not three edit
points.

**Tier-2 forward-compat data attributes (D8).** Every Course\*
entry and every Spec page entry carries `data-section`,
`data-unit`, `data-anchor` attributes. These have no rendering
effect at W4c — they're declared now so a future Tier-2 filter UI
(filter Library entries by section / unit / anchor without
re-extracting from PedagogyIndex on the client) can consume them
without a downstream chrome rewrite.

**Smoke build: 19 → 129 pages.** The smoke fixture now exercises
the eight new Spec routes across every entry in its registries
(N misconceptions × 1 route + N equations × 1 route + ...). The
build-time count is the headline evidence that the per-entry route
templates work generically across real registry data.

**HITL note.** The shell-vs-no-shell call for CourseObjectives
(D1) was the only W4c brainstorm decision Anna explicitly broke
the SoTA-default on — every other Course\* uniformly adopted the
shell. The exception is documented because *not* documenting it
would invite a future PR to "fix the inconsistency" by forcing
CourseObjectives through the shell anyway.
