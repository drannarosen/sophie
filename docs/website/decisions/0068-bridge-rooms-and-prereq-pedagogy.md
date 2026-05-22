---
date: 2026-05-21T00:00:00.000Z
tags:
  - pedagogy
  - prerequisites
  - bridges
  - threshold-skills
  - course-website
  - reasoning-os
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0068: Bridge concept at three scales (rooms, sections, components)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Related**: [0044](./0044-misconception-graph.md) (Misconception Graph the bridges interact with), [0058](./0058-epistemic-component-contract.md) (8-role taxonomy bridges operate within), [0067](./0067-section-level-artifacts.md) (Section[type=bridge] variant), [0069](./0069-fsrs-spaced-repetition-engine.md) (spaced retrieval pairing)
:::

## Context

Students enrolled in courses with formal prerequisites (e.g., ASTR 201
requires PHYS 195 — Introductory Mechanics) often arrive without
durable retention of the prereq material. The Physics Education
Research literature is explicit: students passed the prereq once, the
gradebook records it, and the durable working knowledge is uneven.

The pedagogy literature (Meyer & Land 2003 on threshold skills; Pashler
et al. on spacing + interleaving; Sweller on cognitive load) converges
on three findings:

1. **Just-in-time prereq review beats front-loaded review** — a
   "Week 0 bootcamp" before main content is less effective than
   surfacing the prereq right before the lecture that depends on it.
2. **Spaced retrieval over the semester durably consolidates** prereq
   skills better than a one-time review.
3. **Multiple grain sizes are needed** — sometimes a single concept
   reminder suffices; sometimes a full multi-Unit refresher is
   appropriate; sometimes a course-wide reference is the right shape.

The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
introduces a "bridge" concept at **three scales** to operationalize
these findings. This ADR locks the three scales as first-class
architectural elements.

## Decision

**Sophie supports prerequisite pedagogy at three scales — top-level
bridge rooms, inline `Section[type=bridge]`, and inline
`<SkillReview>` components — all backed by the same pedagogy graph
underneath.**

### Scale 1: Top-level bridge room

A course can declare zero-or-more top-level **bridge rooms** in its
`course.yaml`. Each bridge room is a primary nav destination,
accessible course-wide. Internal type is `bridge`; display label is
per-course configurable.

| Internal type | Default label | Common alternates |
|---|---|---|
| `bridge` | (instructor picks) | Prerequisites · Foundations · Bridge · Bootcamp · Fundamentals · custom (e.g., "Python Bootcamp", "Math & Physics Refresher") |

Multiple bridge rooms per course are supported. Examples:

- ASTR 201: one bridge labeled "Math & Physics Prereqs"
- ASTR 596: two bridges — "Python Bootcamp" + "Math Refresher"
- COMP courses: one bridge labeled "CS Fundamentals" + one labeled
  "Tooling Setup"

When multiple bridge rooms exist, nav groups them under a single
collapsible parent ("Get Ready" / "Before You Start" / configurable);
single-bridge courses show the room flat at top-level.

### Scale 2: Inline `Section[type=bridge]`

Between content modules, the instructor can author a `Section[bridge]`
that lives in the Content flow alongside `Section[module]`s. Example:

```
Content
├─ Section[module]: M1 Foundations
├─ Section[module]: M2 HR Diagram
├─ Section[bridge]: ODE Basics for Stellar Structure   ← inline
├─ Section[module]: M3 Stellar Structure
└─ Section[module]: M4 Galaxies & Cosmology
```

Visually distinguished from modules (different icon, slightly different
chrome) to signal "this isn't new content; this is getting-you-ready
content." Uses the same Unit/Artifact contract as content sections.

### Scale 3: Inline `<SkillReview>` component

A pedagogy component embeddable anywhere in a reading or slide:

```mdx
<SkillReview topic="logarithms" />
```

Renders as a collapsed affordance ("Need a quick refresher on
logarithms?"). Expansion shows a **retrieval-first** surface:
brief recall prompt → "Reveal" → optional deeper concept review.
Interaction logs to FSRS ([ADR 0069](./0069-fsrs-spaced-repetition-engine.md))
for spaced consolidation. Component salience adapts to per-student
mastery (collapsed when strong; prominent when weak — Tier 2+).

### Shared pedagogy graph

All three scales reference the same pedagogy graph:

- A bridge `Unit[skill]` declares its `topic_id` (e.g.,
  `math-logarithms`)
- An inline `Section[bridge]` declares its `topic_ids`
- A `<SkillReview topic="logarithms" />` references the same
  `topic_id`
- A content `Unit[lecture]` declares its `prereqs: [math-logarithms,
  physics-newton-2]`
- The pedagogy-index extractor
  ([ADR 0038](./0038-pedagogy-index-pattern.md)) audits that
  every declared prereq topic has at least one authored bridge surface

### Unit types within bridge sections

`Section[bridge]` and bridge rooms hold `Unit[type=skill]` entities.
Each `Unit[skill]` represents one prereq topic (e.g., "Logarithms",
"Newton's 2nd Law", "Energy Conservation") and contains typed
Artifacts:

| Artifact type | Purpose |
|---|---|
| `concept-review` | Explanation prose |
| `worked-example` | Step-by-step problem solving |
| `practice` | Practice problems with FSRS scheduling |
| `diagnostic` | Quick check questions |

## Consequences

### Positive

- **Single pedagogy graph; three surfaces**: instructor authors a
  prereq topic once; surfaces it through any of three affordances per
  pedagogical moment.
- **Just-in-time pedagogy operationalized**: `<SkillReview>` brings
  the prereq into the exact moment the student needs it; matches the
  best-supported finding in the literature.
- **Substantial review chunks supported**: `Section[bridge]` handles
  multi-Unit refreshers (e.g., a full "Bayesian Inference Primer"
  before the cosmological-inference project in ASTR 596).
- **Course-wide reference handled**: top-level bridge rooms make the
  prereq content always findable.
- **Cohort-aware future capability**: with BKT mastery model
  ([ADR 0073](./0073-unified-assessment-schema.md) §"BKT"),
  `<SkillReview>` salience adapts per-student — strong learners ignore
  it; struggling learners see it prominently.

### Negative

- **Authoring discipline required**: declaring `prereqs:` on every
  `Unit[lecture]` is new authoring overhead. Mitigated by AI
  co-authoring suggesting prereqs from the pedagogy graph.
- **Visual distinction must be clear**: students need to feel that
  `Section[bridge]` is review, not new content. Design treatment
  (different icon, slightly different chrome) handles this.
- **Multiple bridge rooms in nav need grouping**: solved by the
  collapsible parent ("Get Ready") when count > 1.

### Neutral

- **The bridge concept is opt-in**: courses without prereq pedagogy
  needs (e.g., entirely self-contained pure-introduction courses)
  simply don't declare any bridges. Sophie's content audit doesn't
  require them.

## Implementation notes

- New Section type variant `bridge` added in
  [ADR 0067](./0067-section-level-artifacts.md)'s schema
- New Unit type variant `skill` added similarly
- New `<SkillReview topic="..." />` component in
  `@sophie/components/src/components/SkillReview/`
- Component renders collapsed by default; click expands to
  retrieval-first surface; FSRS logging on each interaction
- Pedagogy-index extractor audit rule: every declared `prereqs:` topic
  must map to at least one authored bridge surface (room, section, or
  component)
- AI co-author suggestion: given a `Unit[lecture]`'s content, suggest
  `prereqs:` topics from the existing bridge content

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) §"Section 1.5 — Prerequisites + skill reinforcement"
- Meyer, J. H. F., & Land, R. (2003). "Threshold concepts and troublesome
  knowledge..."
- Pashler, H. et al. (2007). "Organizing instruction and study to
  improve student learning" (IES practice guide)
- Sweller, J. (1988). "Cognitive load during problem solving..."
