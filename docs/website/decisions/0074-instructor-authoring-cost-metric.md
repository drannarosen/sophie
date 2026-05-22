---
date: 2026-05-21T00:00:00.000Z
tags:
  - sotl
  - measurement
  - metrics
  - authoring
  - instructor
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0074: Instructor authoring-cost as a first-class SoTL metric (extends ADR 0047)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0047](./0047-empirical-validation-plan.md) (adds a 9th
  metric `M9 — authoring-cost` to the 8-metric instructor-side
  measurement plan; adds an `instructor-authoring-economics` section
  to Paper #1)

:::

## Context

[ADR 0047 (Empirical Validation Plan)](./0047-empirical-validation-plan.md)
commits Sophie to a two-paper SoTL strategy with eight metrics (M1–M8)
derived from existing structured artifacts. Those metrics measure
*structural conformance* of the authored material: misconception
coverage, TDR provenance, audit-finding burn-down, equation-biography
completeness, and so on. They answer "is the curriculum
well-conformed?" but not "did Sophie pay for itself in instructor
time?"

The 2026-05-21 [course-website roadmap](../status/course-website-roadmap.md)
external review (ChatGPT) surfaced authoring-cost as a missing
first-class success criterion. The review's framing was correct:
**Sophie only works if authoring is fast enough to be the
instructor's default channel rather than a sacrifice they make for
pedagogical purity.** A platform that produces beautifully-conformed
curriculum but doubles instructor authoring time is not a sustainable
research instrument and will not survive the tenure → reappointment →
promotion cycle.

The trigger is concrete: ADR 0047's M-series defends Sophie's
curriculum-quality claim; without an authoring-cost metric, the
*sustainability* claim has no quantitative backing. Cottrell and
CAREER reviewers will ask "what does this cost the instructor
per Unit?" — a defensible answer needs the measurement layer in
place from day one, not retrofitted after the fact.

This ADR is **additive to ADR 0047**, not a new measurement
framework. It adds one metric to the existing plan and one
sub-section to Paper #1's authoring-side claim.

## Decision

Add **M9 — Authoring-cost per Unit / Section / Module** as the ninth
metric in ADR 0047's instructor-side measurement plan, with explicit
target times that Sophie commits to hitting through schema
scaffolding + AI co-authoring + curriculum-CI tooling. Track per-task
authoring time as a git-derivable metric; surface as both an
instructor-facing dashboard signal and a Paper #1 result.

### M9 — Authoring-cost per task

**Definition:** wall-clock time between the first commit and the
"shippable" commit for a given authoring task (new Unit, revise Unit,
draft Section practice-set, audit Module, slide↔reading drift
check). Derived from `git log` timestamps + the existing TDR provenance
trail ([ADR 0040](./0040-tdr-curriculum-decisions.md)). No new
instrumentation; same data ADR 0047's M2 (TDR provenance rate)
already extracts.

**Initial target times** (Sophie's commitment; these are the numbers
to beat):

| Task | Target | Rationale |
| --- | --- | --- |
| **New Unit (lecture-shape)** | < 30 min | Reading skeleton + slide outline + 1–2 retrieval prompts + LO declarations; AI co-author drafts; instructor refines |
| **Revise existing Unit** | < 15 min | Typical post-lecture polish: add equation cross-ref, refine LO wording, add one worked example |
| **Section-level practice-set draft** | < 15 min | AI 4-role panel ([ADR 0030](./0030-audience-and-ai-author-model.md)) generates ~20 interleaved problems; instructor curates ~half |
| **Module curriculum-CI audit** | < 5 min | `sophie audit` via the populated `PedagogyIndex`; structured findings only |
| **Slide ↔ reading drift check** | < 5 min | `sophie diff` ([ADR 0045](./0045-pedagogical-diff-curriculum-ci.md)) — identifies LO/equation/misconception coverage mismatch |
| **New equation biography** | < 10 min | ADR 0046 structure + Notation Registry cross-ref + 3 worked-example links |
| **New misconception entry** | < 10 min | Misconception node + ≥1 intervention reference + concept-graph wiring |

Targets are **aspirational floors** for the design, not service-level
agreements. Sophie's claim is that schema scaffolding + AI co-author
+ curriculum-CI together get a competent STEM instructor to these
numbers; missing a target is an actionable signal that the
scaffolding or AI prompts need re-engineering, not that the
instructor is slow.

**Comparator baseline** for Paper #1: same instructor's
Quarto/Canvas authoring times for equivalent tasks (intra-author
comparison, holding skill constant — same methodology as ADR 0047's
existing comparator design).

### Paper #1 — new sub-section

Adds an **Instructor-authoring economics** sub-section to ADR
0047's Paper #1 ("Authoring-side conformance"). Reports the M9
distribution per task class; pairs it with the existing M1–M8 metrics
to make the joint claim: *Sophie produces structurally-denser AND
faster-to-author artifacts than equivalent Quarto/JupyterBook output,
for the same instructor.*

### CLI surface

`sophie metrics history --task <new-unit|revise-unit|practice-set|audit|drift|equation|misconception>`
extends the existing `sophie metrics history` verb introduced in
ADR 0047. Emits a time-series of authoring durations for the
specified task class, derived from git log + TDR trailers. No new
data collection; reads the existing audit trail.

## Rationale

M9 is the right metric to add now (rather than later) because:

1. **The data already exists** in git history + TDR trailers. ADR 0047
   chose its 8 metrics specifically because they were derivable
   without new collection; M9 inherits the same property. Zero new
   instrumentation; zero new schema. The cost of adding M9 to the
   measurement plan is genuinely minimal.

2. **Sustainability is the load-bearing claim** for tenure / Cottrell
   / CAREER framing. ADR 0047 measures whether the *product* is
   good; M9 measures whether the *process* is sustainable. Reviewers
   will ask both questions; better to have both answers.

3. **Concrete targets defend against authoring bloat.** Without a
   target, future Sophie features can quietly add 5 minutes here
   and 10 minutes there until the instructor experience degrades to
   "this is slower than Canvas." Named targets give the platform
   permission to push back on its own complexity.

4. **It pairs naturally with the existing M-series.** M1 measures
   misconception coverage; M9 measures the cost of that coverage.
   M3 measures audit-finding burn-down; M9 measures whether the
   audit fixes are cheap enough to actually do. The metrics
   amplify each other.

5. **The roadmap's `Instructor authoring economics` design principle**
   (in
   [course-website-roadmap.md § Cross-cutting design principles](../status/course-website-roadmap.md))
   already commits to the principle; this ADR locks it into the
   measurement plan so it's audited rather than aspirational.

## Alternatives considered

- **Defer to "Paper #3" or a future ADR.** Pros: keeps ADR 0047
  unchanged; M9 is additive enough to not need a foundational ADR
  edit. Cons: the data is being generated *now* by every ASTR 201
  / 596 authoring commit; not capturing it from the start means
  the longitudinal baseline is missing when Paper #1 needs it.
  Rejected because M9 is cheap to add and expensive to retrofit.
- **Track authoring time via an explicit timer (instructor
  "starts" / "stops" an authoring session in Sophie).** Pros:
  more accurate than git-derived wall-clock. Cons: requires new
  UI, new persistence, new opt-in flow; instructor cognitive cost
  of tracking time itself; violates ADR 0047's "no new
  instrumentation" discipline. Rejected. Git-derived is good
  enough — instructors who commit incrementally get fine-grained
  data; those who commit in batches get session-level data.
  Both are usable signals.
- **Use a different decomposition** (e.g., per-artifact-type
  instead of per-task-type). Pros: aligns with the schema
  hierarchy. Cons: less actionable — "Artifact[type=reading]
  takes X minutes" isn't a target you can engineer for, but
  "new Unit < 30 min" is. Rejected in favor of task-decomposition.

## Consequences

What this decision makes:

- **Easier**:
  - Paper #1 gains a quantitative sustainability claim alongside
    its existing quality claim.
  - Sophie features that add authoring friction can be auto-flagged
    (M9 regresses → re-engineer the scaffolding).
  - Cottrell / CAREER narrative gets a concrete metric to anchor
    "sustainable instructor adoption" claims.
  - AI co-author panel ([ADR 0030](./0030-audience-and-ai-author-model.md))
    gets a measurable optimization target.

- **Harder**:
  - Initial calibration of target times will require honesty about
    when Sophie misses them. Targets that are wrong-by-2× lose
    credibility; targets need to be set from real-world authoring
    data, not aspiration alone.
  - Instructor authoring time is affected by many things outside
    Sophie's control (interruptions, scope creep, learning curve).
    M9 will need a "normalize / outlier-handle" pass before being
    publication-quality, which is real measurement work.

- **Triggers**:
  - `sophie metrics history --task <...>` CLI surface implementation
    (extends ADR 0047's existing verb; small).
  - Calibration sprint: instrument Anna's ASTR 201 + 596 authoring
    sessions for ~4 weeks to set initial targets from real data,
    then publish the calibrated numbers in Paper #1.
  - If any task class consistently misses its target, an ADR
    proposing the scaffolding fix lands as a follow-up.

## References

- [ADR 0047 — Empirical Validation Plan for the LDS Conformance Foundation](./0047-empirical-validation-plan.md) (this ADR extends 0047's 8-metric plan)
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md) (TDR trailer provides the audit trail M9 reads)
- [ADR 0045 — Pedagogical Diff / Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md) (`sophie diff` provides the drift-check task)
- [ADR 0030 — Audience and AI Author Model](./0030-audience-and-ai-author-model.md) (4-role co-author panel provides the practice-set generator)
- [ADR 0046 — Equation Biography](./0046-equation-biography.md) (drives the "new equation" task target)
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md) (drives the "new misconception" task target)
- [course-website-roadmap.md § Instructor authoring economics](../status/course-website-roadmap.md) — design principle this ADR locks in
