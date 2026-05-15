---
title: Teaching Decision Record (TDR) template
short_title: TDR template
description: The canonical Teaching Decision Record template, with one fully-worked illustrative example. Consumer repos copy this file as their `teaching-decisions/template.md` and create numbered TDRs alongside.
tags: [reference, tdr, teaching-decisions, template, curriculum-design]
---

# Teaching Decision Record (TDR) template

The canonical template for Teaching Decision Records, ratified by
[ADR 0040](../decisions/0040-teaching-decision-records.md).

**Consumer repos copy this file** as their
`teaching-decisions/template.md` and use it as the starting point for
each new TDR. Each TDR lives at
`teaching-decisions/NNN-<slug>.md` inside the consumer repo.

## Why TDRs exist

TDRs are the pedagogy-decision equivalent of
[ADRs](../decisions/): a numbered, version-controlled, structured
audit trail of *why a course is designed this way*. They answer the
question that ADRs don't: *not* "why is the platform built this way?"
but *"why is this course taught this way?"*

The full rationale + scope + alternatives-considered live in the
ratifying ADR. This file is the template — what an actual TDR looks
like when filled in.

## Template

Copy the block below into a new file at
`teaching-decisions/NNN-<slug>.md` in your consumer repo, replacing
all bracketed placeholders.

````markdown
---
date: YYYY-MM-DD
tags: [pedagogy, decision, ...optional course/topic tags]
evidence_type: <required: course_eval | student_artifact | participation_data | literature | instructor_observation | student_feedback | audit_signal | forward_hypothesis>
evidence_strength: <optional: strong | moderate | weak | exploratory>
evidence_summary: <optional 1-2 sentences anchoring the evidence>
scope: <optional, default chapter: chapter | module | course_shell | semester>
visibility: <optional, default internal: internal | public>
affects_anchors: [<optional list of pedagogy-index anchor slugs>]
affects_versions: [<optional list of course version strings>]
---

# TDR-NNN: Brief decision title

:::{admonition} TDR metadata
- **Status**: proposed | accepted | superseded
- **Deciders**: [instructor name(s)]
- **Course**: [course identifier, e.g., ASTR 201]
:::

## Context

[What teaching situation prompted this decision? Be concrete:
- which chapters / modules / lectures it affects
- what student outcome you're trying to improve
- what real student-confusion or learning-friction pattern motivated
  thinking about this
- what tools / time / authoring constraints are relevant

If there's prior discussion (Slack threads, email, conference notes,
SoTL paper findings), link or summarize it here.]

## Decision

[The teaching choice made. Concrete and specific:
- what gets done, in what order, with what scope
- what's introduced vs deferred
- which Sophie components / pedagogy moves are deployed

Aim for a paragraph or two; not a full lecture plan.]

## Rationale

[The pedagogical reasoning. Strongest when it cites:
- specific student-confusion patterns from past semesters
- learning-science literature (with brief, accurate paraphrase)
- the misconception(s) this decision targets
- the [vision/pedagogy/](../vision/pedagogy/) principle(s) this
  decision serves

Avoid generic claims ("this is good pedagogy"); aim for falsifiable
ones ("students who saw X first showed Y improvement on Z").]

## Consequences

[What this means for the course:
- what's constrained downstream (other chapters that now depend on
  this sequence)
- what's deferred or excluded
- what authoring obligations follow (e.g., "every chapter using
  flux must reference TDR-NNN's flux-vs-luminosity scaffolding")
- what the audit invariants (eventual) would check]

## Alternatives considered

[The teaching moves NOT made and why:
- the obvious alternative (and what it sacrifices)
- the textbook-default approach (and why it was rejected)
- any approach a colleague or AI suggested that didn't make the cut]

## References

[Cross-links:
- related TDRs (e.g., "TDR-NNN supersedes this"; "TDR-NNN extends
  this")
- relevant [ADRs](../decisions/) (e.g., the pedagogy-index pattern
  that makes this decision implementable)
- [vision/pedagogy/](../vision/pedagogy/) essays that articulate the
  principle this decision applies
- external sources (papers, OER, conference talks)]
````

### Frontmatter field semantics (hardened 2026-05-14)

The frontmatter shape was extended in the 2026-05-14 hardening pass.
All fields except those marked **required** are optional. Full
authoring guidance lives in
[ADR 0040](../decisions/0040-teaching-decision-records.md); brief
guidance below.

| Field | Required? | Purpose |
|---|---|---|
| `date` | yes | When the TDR was authored |
| `tags` | yes | Free-form tags; convention includes `pedagogy`, `decision`, course slug |
| `evidence_type` | **yes** | One of 8 values classifying the decision's basis. `instructor_observation` is legitimate when basis is informal professional judgment. `forward_hypothesis` for predictive / exploratory TDRs |
| `evidence_strength` | no | One of 4 values: self-disclosure of quality within the type. `exploratory` pairs naturally with `evidence_type: forward_hypothesis` |
| `evidence_summary` | no | 1–2 sentences anchoring the evidence to specifics (e.g., *"sp25 evals n=47, 18/47 flagged section as confusing"*) |
| `scope` | no | One of: `chapter` (default) \| `module` \| `course_shell` \| `semester`. Lets course-shell decisions live in the same TDR machinery |
| `visibility` | no | `internal` (default) \| `public`. Most TDRs stay internal — frank reflection + forward-hypotheses need safety. Opt-in `public` for SoTL citation, departmental sharing, or tenure-case artifacts |
| `affects_anchors` | no | List of pedagogy-index anchor slugs this TDR claims to affect (`eq-wiens-law`, `misc-redshift-doppler`, etc.). Feeds `sophie diff` intentional-change demotion (ADR 0045) and chapter-frontmatter `audit_overrides` provenance coupling (ADR 0053) |
| `affects_versions` | no | List of course versions this TDR spans (`["1.0.0", "1.1.0"]`). Auto-populated by `sophie refactor` (ADR 0049); editable when decision genuinely spans versions |

### Evidence-type quick reference

| `evidence_type` value | Use when |
|---|---|
| `course_eval` | Formal end-of-semester evaluations (rated items, free-response patterns) |
| `student_artifact` | Homework / exam / discussion-board responses showing a pattern |
| `participation_data` | Engagement metrics (attendance, completion rates, time-on-task) |
| `literature` | Cited research applied to this course |
| `instructor_observation` | Pattern noticed across office hours / class discussion / teaching memory |
| `student_feedback` | Informal — emails, office-hour comments, mid-semester feedback |
| `audit_signal` | Sophie's own audit caught the issue (NR1/MR2/MG/etc. drove the change) |
| `forward_hypothesis` | Predictive / exploratory — trying something new with no prior evidence; pair with `evidence_strength: exploratory` |

## Example — fully worked

Below is an illustrative example showing what a real TDR looks like
filled in. The decision is drawn from ASTR 201 Module 1: whether to
introduce *parallax distance* before *standard candles*.

````markdown
---
date: 2026-05-14
tags: [pedagogy, decision, astr201, distance-scale, parallax]
evidence_type: instructor_observation
evidence_strength: moderate
evidence_summary: |
  Across sp24 + sp25 office hours, students consistently struggled to
  reason about photon counts and distance inference without parallax's
  observable-to-inference scaffolding established first.
scope: module
visibility: internal
affects_anchors:
  - lo-parallax-distance
  - misc-brightness-is-intrinsic
  - eq-small-angle-parallax
affects_versions:
  - 1.0.0
---

# TDR-001: Introduce parallax distance before standard candles

:::{admonition} TDR metadata
- **Status**: accepted
- **Deciders**: anna
- **Course**: ASTR 201
:::

## Context

Module 1's distance-scale arc spans Lectures 1–4. Students arrive
with two latent misconceptions about astronomical distance:

1. *Brightness is an intrinsic property of objects* — distance and
   intrinsic brightness aren't yet distinguished.
2. *Distance is just measured (with a "really big ruler") rather than
   inferred from observable patterns* — the observable → inference
   distinction isn't yet load-bearing.

Standard candles (e.g., Cepheid period-luminosity) require the
student to *already trust* the observable-vs-inferred distinction:
"we measure period and flux; from these plus assumed intrinsic
luminosity we infer distance." Without that distinction in place,
standard candles look like magic.

Parallax distance is geometric: measure angular shift over baseline,
infer distance via small-angle geometry. The observable (angular
shift) and inferred quantity (distance) are visually distinct on a
diagram. Parallax is *the* canonical observable → inference example
in the course.

## Decision

Introduce parallax distance in **Lecture 2** (Foundations) before
standard candles in **Lecture 4** (Light as Information). Parallax
becomes the canonical observable → model → inference example
referenced throughout the rest of the distance-scale arc.

## Rationale

Three reasons this sequencing earns priority:

1. **Observable → inference scaffolding.** Parallax makes the
   observable (angular shift) and inferred quantity (distance)
   visually distinct. Students who internalize this pattern carry
   it into every later distance method (standard candles, redshift,
   Cepheid period-luminosity).

2. **Targets the brightness-is-intrinsic misconception indirectly.**
   By establishing that distance is *inferred from geometry* in
   Lecture 2, the Lecture 3 introduction of flux ("brightness depends
   on distance") has a referent the student already accepts: distance
   is real, was inferred from observation, now interacts with
   intrinsic luminosity to produce flux.

3. **Matches the [observable → model → inference](../vision/pedagogy/observable-to-model-to-inference.md)
   principle** (when drafted). This principle says: STEM reasoning
   has a canonical arc; chapter sequencing should make that arc
   legible. Parallax is the simplest possible instance.

## Consequences

- Standard candles in Lecture 4 reference parallax explicitly as
  the foundational technique they extend.
- The misconception graph entry "brightness is intrinsic" lists
  Lecture 3 (flux introduction) as primary intervention; parallax in
  Lecture 2 is the scaffolding that makes Lecture 3's intervention
  work.
- Any chapter using distance must reference TDR-001's scaffolding;
  changes to Module 1's distance-arc sequencing supersede this TDR.
- Module 1 audit (eventual) checks that Lecture 4 cross-references
  Lecture 2's parallax framing.

## Alternatives considered

### Standard candles first

Some intro-astronomy textbooks introduce standard candles before
parallax (e.g., as part of stellar-spectra chapters). This works for
students who already accept observable → inference reasoning, but
fails the latent-misconception case described in Context. Rejected
on first-principles + prior-semester evidence.

### Skip parallax entirely (defer to the distance-ladder lecture)

Some courses treat the distance ladder as a single late-course
synthesis, with parallax as one rung among many. This forfeits
parallax's scaffolding role. The current sequence specifically
reserves parallax for its scaffolding value, not just its
ladder-rung value.

### Introduce both in the same lecture

Compresses the cognitive load; conflates observable types
(geometric vs photometric). Students conflate the two in
post-Module-1 work. Rejected on prior-semester evidence.

## References

- [ADR 0030 — audience and AI-author model](../decisions/0030-audience-and-ai-author-model.md):
  AI scaffolding decisions reference this TDR when drafting
  distance-related chapters.
- [ADR 0038 — pedagogy index pattern](../decisions/0038-pedagogy-index-pattern.md):
  the misconception index that captures "brightness is intrinsic"
  is the data layer this TDR's intervention plans against.
- *(when drafted)* [vision/pedagogy/observable-to-model-to-inference.md](../vision/pedagogy/):
  the principle this TDR applies.
- Bailer-Jones (2015), "Estimating distances from parallaxes":
  technical motivation for parallax-as-canonical-geometric-
  observable in the modern Gaia era.
````

## Notes on authorship and review

- **Instructor of record signs.** AI may draft TDR proposals or
  suggest TDR-worthy decisions, but the *acceptance* signal comes from
  the instructor — recorded explicitly in the `Deciders` field.
- **TDRs are working documents.** Proposed → accepted is the normal
  workflow; the proposal phase is for refinement, not gatekeeping.
- **Supersession beats revision.** A meaningful change to an accepted
  TDR authors a *new* TDR that supersedes the old one. The supersession
  chain becomes its own audit trail. Don't quietly edit an accepted
  TDR's `Decision` section — supersede it.
- **TDRs may cite each other.** Cross-reference liberally; the
  TDR corpus is a graph, not a list.

## When to write a TDR

A decision is TDR-worthy when *future-you (or another instructor)
needs to understand why this part of the course is shaped this way*.
Typical triggers:

- Sequencing chapters or topics in an unusual order
- Introducing a concept before its formal definition (or vice versa)
- Targeting a specific misconception with a chosen intervention
- Adopting a non-default authoring convention
- Choosing a specific Sophie component pattern that another instance
  of the course might do differently
- Excluding content the textbook would normally cover, with a
  pedagogical reason
- Choosing a notation convention with course-wide consequences
- Adopting (or rejecting) an AI-suggested teaching move

A decision is *not* TDR-worthy when it's purely tactical — fixing a
typo, swapping an image, renaming a variable. Save TDRs for choices
that have downstream consequences.

## References

- [ADR 0040 — Teaching Decision Records (TDRs)](../decisions/0040-teaching-decision-records.md):
  the ratifying ADR; full scope + alternatives-considered.
- [Decisions](../decisions/): ADRs (Sophie's architecture-decision
  audit trail) — TDRs are their pedagogy-side counterpart.
- [Vision / Pedagogy principles](../vision/pedagogy/): the principles
  TDRs apply to specific course-design contexts.
