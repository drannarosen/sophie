---
date: 2026-05-21T00:00:00.000Z
tags:
  - schema
  - content-hierarchy
  - artifacts
  - course-website
  - reasoning-os
status: shipped
validation:
  status: in-progress
  last_validated_date: "2026-05-22"
  evidence:
    - kind: manual
      ref: "packages/core/src/schema/subsection.ts + unit.ts + artifact.ts"
      date: "2026-05-21"
      notes: "Wedge A (PR #154, merged 2026-05-21) shipped Subsection (auto-grouped + explicit variants), Unit (5-variant type discriminator), and Artifact (20 typed variants: 10 unit-level + 10 section-level) Zod schemas. Tested + barrel-exported."
    - kind: manual
      ref: "packages/core/src/schema/section.ts"
      date: "2026-05-21"
      notes: "Wedge A.5 shipped the SectionSchema discriminated union (module / phase / track / unit-block / bridge variants) replacing the previous ModuleSchema. ChapterSectionSchema renamed from the old SectionSchema (chapter-internal H2 concept). 14 unit tests + smoke consumer migration."
    - kind: manual
      ref: "Wedge B-followup W1 (PR #157, merged 2026-05-22 as 7f9b25f)"
      date: "2026-05-22"
      notes: "Surfaced Section[] + Unit[] in PedagogyIndex; graduated PRA-1 (Unit-aware) + SR-1 (section-validity); <SpacedReview section> end-to-end render. Smoke ADDED sections/ + units/ collections; chapters/ + modules/ stayed (transitional)."
    - kind: manual
      ref: "Wedge B-followup W2 (feat/wedge-b-followup-w2)"
      date: "2026-05-22"
      notes: "File-layout migration activated. Smoke chapter MDX MOVED to sections/<sec>/units/<unit>/reading.mdx; ArtifactEntry surfaced in PedagogyIndex as a discriminated union over scope; ChapterEntrySchema + ModuleEntrySchema deleted; routes graduated to /units/<unit-id>/reading; UnitSchema gained status + framing + description per W2/D2 Placement 1; <ChapterRef> prop slug → chapter (W2/D3). Smoke build green at 12 pages / 125 pedagogy entries / 0 errors / 14 warnings / 7 infos (audit baseline holds)."
---

# ADR 0067: Section / Subsection / Unit / Artifact content hierarchy

:::{admonition} ADR metadata

- **Status**: shipped (Wedge B-followup W2, 2026-05-22)
- **Deciders**: anna
- **Amends**: [0003](./0003-zod-as-source-of-truth.md) (extends Zod schemas with new typed entities), [0038](./0038-pedagogy-index-pattern.md) (pedagogy-index extractor expands to handle Section/Unit/Artifact entities)
- **Related**: [0004](./0004-component-contract-revisions.md), [0030](./0030-audience-and-ai-author-model.md), [0058](./0058-epistemic-component-contract.md), [0060](./0060-registry-ecosystem.md), [0064](./0064-chapter-migration-playbook.md), [0073](./0073-unified-assessment-schema.md)
:::

## Context

Sophie's current content model is `Textbook → Module → Chapter`
([ADR 0064](./0064-chapter-migration-playbook.md)) — a lecture-shape
hierarchy that fits ASTR 201 but not ASTR 596's project-shape courses.
The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
identifies this as the single biggest content-schema gap to close
before course-website work proceeds.

ASTR 596 (Modeling the Universe) is built around six multi-week
computational projects, not lectures. Forcing it into a Module →
Chapter shape distorts the authoring model. Future COMP courses likely
mix lecture topics + coding labs in yet another shape.

A generalized content hierarchy is needed that:

1. Handles lecture-shape, project-shape, and lab-shape courses
   uniformly
2. Allows instructor-configurable display labels per course (Module /
   Phase / Track / Bootcamp / Bridge / etc.) while keeping the
   internal schema stable for tooling
3. Supports Section-level artifacts (intro, synthesis,
   equation-collection, practice-set, etc.) that don't belong to any
   single Unit
4. Integrates with the Library + bridge + FSRS + Assessment systems
   (see related ADRs)

## Decision

**Sophie's content hierarchy is a four-tier typed model: Course →
Section → Subsection → Unit → Artifact, with type-driven display
labels at every tier.**

### The four tiers

```
Course (top level)
  └─ Section [typed: module | phase | track | unit-block | bridge]
      ├─ Section-level Artifacts (intro, synthesis, equation-collection,
      │   practice-set, concept-map, review-checklist, etc.)
      └─ Subsection (auto-grouped by Artifact type by default;
          explicit Subsection authoring as opt-in override)
          └─ Unit [typed: lecture | project | lab | topic | skill]
              └─ Artifact [typed: reading | slides | spec | rubric |
                  lab-notebook | media | practice | worked-example |
                  diagnostic | concept-review | ...]
```

### Type-driven display labels

Internal types (used by pedagogy-graph + audit tooling) are stable.
Display labels are per-course-configurable with sensible defaults:

| Section type | Default label |
|---|---|
| `module` | Module N: Name |
| `phase` | Phase N: Name |
| `track` | Track: Name |
| `bridge` | Bridge: Name (visually distinct from modules) |

| Unit type | Default label |
|---|---|
| `lecture` | Lecture N: Title |
| `project` | Project N: Title |
| `lab` | Lab N: Title |
| `topic` | Topic: Title |
| `skill` | Skill: Topic (bridge-only) |

Instructor overrides via course.yaml; Sophie's tooling never leaks the
internal type name to the rendered UI unless the instructor chooses to.

### Section-level Artifacts

A `Section` holds zero-or-more Section-level Artifacts directly (not
inside any Unit). These are scoped to the Section as a whole:

| Type | Required? | Pedagogical role |
|---|---|---|
| `intro` | ★ Required | Advance organizer (LOs, prior-knowledge connection, roadmap) |
| `synthesis` | ☆ Recommended | Integrative recap; cross-Unit conceptual links |
| `equation-collection` | ☆ Recommended | Auto-pulled from Equation Registry; instructor curates |
| `practice-set` | ★ Required | Interleaved, mixed-topic, FSRS-scheduled |
| `review-checklist` | ☆ Recommended | LO self-check; entries link to diagnostics |
| `concept-map` | ○ Optional | Visual summary (React Flow per [ADR 0016](./0016-react-flow-for-concept-maps.md)) |
| `misconception-summary` | ○ Optional | Module-level misconception bundle |
| `historical-context` | ○ Optional | Narrative thread |
| `further-reading` | ○ Optional | Annotated bibliography |
| `reference-tables` | ○ Optional | Module-scoped reference; mirrors to Resources |

Curriculum-CI ([ADR 0045](./0045-pedagogical-diff.md)) enforces tier
markers at build time.

### Subsection grouping

By default, Sophie auto-generates Subsections by Artifact type within
each Section ("Slides", "Readings", "Resources"). This requires zero
authoring overhead. Instructors who want subsection commentary or
custom grouping can opt into explicit Subsection authoring.

### Two view modes per Section

| View | Default for | What it shows |
|---|---|---|
| **Artifact-grouped** | `Section[module]` (lecture-shape) | All slides in one list; all readings in another; all resources in a third |
| **Unit-grouped** | `Section[phase]` (project-shape) | Each Unit is a coherent block; Artifacts ride inside it |

Students can toggle per-browser; persists as preference.

### Required identification fields on every entity

All Section, Subsection, Unit, Artifact entities carry stable `id`
fields. Cross-references (e.g., an Assessment declares
`references: [unit-id, equation-id, misconception-id]`) operate on
these IDs. Pedagogy-index extractor
([ADR 0038](./0038-pedagogy-index-pattern.md)) audits that referenced
IDs exist + are appropriately typed.

## Consequences

### Positive

- **One contract handles both lecture-shape and project-shape
  courses**: ASTR 201 and ASTR 596 both fit cleanly.
- **Type tag drives template selection**: a `Unit[lecture]` scaffolds
  `{slides, reading}`; a `Unit[project]` scaffolds
  `{spec, rubric, lab-notebook}`. AI co-authoring
  ([ADR 0030](./0030-audience-and-ai-author-model.md)) picks templates
  by type.
- **Section-level artifacts are first-class**: `intro` + `synthesis`
  become the pedagogy graph's integration surfaces at Section
  granularity (LOs declared here; cross-Unit links declared here).
- **Display flexibility doesn't fragment tooling**: Sophie's audit +
  pedagogy-graph + curriculum-CI operate on internal types; instructor
  customization happens in display layer only.

### Negative

- **Schema migration from existing chapter content**: ASTR 201's
  current chapters need to be re-categorized into the new hierarchy
  (Module = Section[module]; Chapter = Unit[lecture]). The
  [ADR 0064](./0064-chapter-migration-playbook.md) playbook extends to
  cover this conversion.
- **Subsection adds a tier**: nav rendering needs to handle the
  Section → Subsection → Unit traversal. Mitigated by auto-grouping
  default (most courses never author explicit Subsections).
- **More Artifact types**: pedagogy-index extractor adds rules for
  each new Artifact type. Mitigated by typed contract — each Artifact
  type has a clear rule set; new types added as standalone Zod schema
  extensions.

### Neutral

- **The Subsection tier is "soft"**: auto-grouped by default; explicit
  only on opt-in. Most authoring never sees it.

## Implementation notes

- New Zod schemas in `@sophie/core/schema`: `Section`, `Subsection`,
  `Unit`, `Artifact` (each with `type` discriminator)
- New artifact-type schemas as union variants: `reading`, `slides`,
  `spec`, `rubric`, `lab-notebook`, `media`, `practice`,
  `worked-example`, `diagnostic`, `concept-review`,
  `equation-collection`, `intro`, `synthesis`, `practice-set`,
  `review-checklist`, `concept-map`, `misconception-summary`,
  `historical-context`, `further-reading`, `reference-tables`
- Extend `pedagogy-index/extractors/` to walk the new hierarchy
- New `course.yaml` schema with `rooms`, `sections`, `display_labels`
  configuration
- File-layout convention (sketched in roadmap):
  ```
  src/content/courses/<course>/sections/<section-id>/
    section.yaml
    intro.mdx
    synthesis.mdx
    equation-collection.mdx
    practice-set.mdx
    units/<unit-id>/
      unit.yaml
      slides.mdx
      reading.mdx
  ```

## Revision history

- **2026-05-22 (W3, this PR)** — Per-callsite parent-ref field rename
  `chapter` → `unit` across all 15 pedagogy-index entry schemas + audit
  invariants + Finding location + persistence layer (IDB key dimension,
  `useInteractive*` hooks, ResponseStore methods, BroadcastChannel
  helper) + the 12 parent-ref React component props (Reflection,
  LearningObjectives, RetrievalPrompt, SpacedReview, SkillReview,
  Predict, Callout, CollapsibleCard, ConfidenceCheck, ComprehensionGate,
  EffortLog, InteractiveCheckbox). UnitEntry.chapter (D7 reading-artifact
  binding) and the artifact-ref component family (`<ChapterRef>` + 7
  chrome `Chapter*` roll-ups) preserve the `chapter` field/prop name.
  CLI audit output keeps `chapter:<id>:<line>` prefix word per educator
  vocabulary lock. See
  [W3 design doc](../plans/2026-05-22-wedge-b-followup-w3-design.md)
  and [W3 pilot report](../pilots/wedge-b-followup-w3-callsite-rename.md).
- **2026-05-22 (W2)** — File-layout migration activated; chapter MDX
  moved to `sections/<sec>/units/<unit>/reading.mdx`; ChapterEntry +
  ModuleEntry deleted; ArtifactEntry surfaced. See W2 design doc.

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md)
- [ADR 0064 — Chapter Migration Playbook](./0064-chapter-migration-playbook.md)
- [ADR 0038 — Pedagogy Index Pattern](./0038-pedagogy-index-pattern.md)
- [ADR 0060 — Registry Ecosystem](./0060-registry-ecosystem.md)
- [W3 design doc](../../plans/2026-05-22-wedge-b-followup-w3-design.md)
- [W3 pilot report](../pilots/wedge-b-followup-w3-callsite-rename.md)
