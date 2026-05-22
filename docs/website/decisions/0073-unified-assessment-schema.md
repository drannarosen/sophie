---
date: 2026-05-21T00:00:00.000Z
tags:
  - schema
  - assessment
  - assignment
  - exam
  - diagnostic
  - rubric
  - bkt
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0073: Unified Assessment schema with type-variants (assignment / practice / diagnostic / exam) + BKT mastery

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0003](./0003-zod-as-source-of-truth.md) (extends Zod schemas with Assessment + Rubric entities)
- **Related**: [0030](./0030-audience-and-ai-author-model.md), [0044](./0044-misconception-graph.md), [0045](./0045-pedagogical-diff.md), [0058](./0058-epistemic-component-contract.md), [0067](./0067-section-level-artifacts.md), [0069](./0069-fsrs-spaced-repetition-engine.md), [0072](./0072-three-tier-build-priority.md)
:::

## Context

The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
introduces four assessment surfaces — assignments, practice problems,
diagnostics, exams. The naive design would give each its own schema +
machinery; the result would be ~80% duplication (each shares: prompt,
rubric, references, items, feedback, submission semantics).

A more SoTA design unifies them under one entity with a discriminating
type tag. Plus: Sophie needs a **mastery model** for adaptive
remediation. The intelligent-tutoring-systems literature converges on
Bayesian Knowledge Tracing (BKT, Corbett & Anderson 1995 + many
refinements) as the SoTA standard.

This ADR locks both the unified Assessment schema and the BKT mastery
model.

## Decision

**Sophie ships a single `Assessment` entity with four type-variants
(assignment / practice / diagnostic / exam), plus BKT for mastery
tracking.**

### Unified Assessment schema

```
Assessment
├─ type: "assignment" | "practice" | "diagnostic" | "exam"
├─ title, description, prompt
├─ schedule: { released, due, late_policy, duration?, time_limit? }
├─ rubric: Rubric (first-class artifact; see below)
├─ items: AssessmentItem[]
├─ references: { units, equations, skills, los, misconceptions }
├─ scope: { sections, modules }                  // for exams
├─ stakes: "formative" | "low" | "high"
├─ submission: { mode, location }
└─ feedback: { timing: "inline" | "asynchronous", format }
```

### Type-driven UX

| Variant | UX | Where it lives |
|---|---|---|
| `practice` | Instant feedback; unlimited retry; FSRS-scheduled | Module's `practice-set.mdx` + Unit `practice.mdx` |
| `assignment` | Submission window; feedback after due date; rubric-graded | Assignments room (Tier 2) |
| `diagnostic` | Required-for-completion not-grade; results feed mastery model | Bridge rooms + course-start sequence |
| `exam` | Time-locked; scope-restricted; high-stakes | Exams room (Tier 2 low-stakes; Tier 3 high-stakes) |

Same schema; type field drives rendering, submission flow, feedback
timing. Adding a new variant (quiz, project, reflection) is
mechanical.

### Rubric as first-class artifact

```
Rubric
├─ type: "criterion-based" | "holistic"
├─ total_points: number
├─ criteria: Criterion[]
│   ├─ id, label, weight
│   └─ scale: { points, label, descriptor }[]
└─ references: { los }
```

Rubrics are authored once, reused across Assessments. Renderable for
student self-assessment. Audited by curriculum-CI
([ADR 0045](./0045-pedagogical-diff.md)) against claimed LOs.
Peer-review-capable at Tier 3. AI-rubric-aligned grading at Tier 3.

### Auto-grading scope

Tier 1/2 auto-gradable item types (per-browser; Pyodide where needed
per [ADR 0071](./0071-pyodide-computational-labs.md)):

| Item type | How | Pyodide |
|---|---|---|
| `multiple-choice` | Match selected option | No |
| `multiple-select` | Match selected set | No |
| `numerical` | Compare with tolerance | Optional |
| `short-text` | Regex/normalized-string match | No |
| `code` | Run in Pyodide; compare output / pass tests | Yes |
| `plotly-chart` | Compare spec to expected | Yes |
| `concept-map` | Compare student graph to expected | No |
| `equation-derivation` | SymPy in Pyodide | Yes |

### Open-ended written grading

**Deferred to Tier 3.** Tier 1/2: Sophie hosts rubric + prompt;
instructor grades in Canvas. AI-rubric-aligned grading lands at Tier 3
via a server-side AI API endpoint.

### BKT mastery model

For each `(student, skill)` pair, BKT maintains:

- **P(L)**: probability the skill is *learned* (mastered)
- **P(T)**: probability of transitioning from not-learned to learned
  per practice opportunity
- **P(S)**: probability of *slip* (wrong answer despite mastery)
- **P(G)**: probability of *guess* (right answer without mastery)

Updates on each item attempt:

- If correct: P(L) increases (Bayesian update accounting for guess)
- If incorrect: P(L) decreases (accounting for slip)
- After each step, optional transition: P(L) may increase further by
  P(T) (learning during practice)

Standard intelligent-tutoring-systems algorithm; ~200 LOC
implementation; JS libraries available.

### Per-student-per-skill state

```
BKTState
├─ user_id: string                  // per-browser UUID or LTI sub
├─ course_id: string
├─ skill_id: string
├─ p_learned: number                // current P(L) estimate
├─ p_transit: number                // P(T) per-skill or global
├─ p_slip: number                   // P(S) per-skill or global
├─ p_guess: number                  // P(G) per-skill or global
├─ attempt_count: number
├─ last_attempt_at: ISO timestamp
├─ schema_version: string
├─ created_at, updated_at
```

Per [ADR 0066](./0066-pseudonymous-first-data-model.md). Tier 1/2:
IndexedDB. Tier 3: server-side with same shape.

### Diagnostic timing — three windows

- **Course-start** diagnostic: broad prereq screener; bootstraps BKT
  state for prereq skills
- **Mid-course** diagnostic (~Week 6): identifies accumulated gaps
  before Midterm 2
- **Pre-exam** diagnostics (~1 week before each midterm + final):
  scope-restricted review

All `Assessment[type=diagnostic]` with `required: completion` (not
graded on outcome, just on participation per the formative-stakes
principle).

### Adaptive surfacing (Tier 2)

Once BKT state exists per skill, UI adapts:

- `<SkillReview topic="...">`
  ([ADR 0068](./0068-bridge-rooms-and-prereq-pedagogy.md)) salience
  varies by mastery (prominent if weak; collapsed-by-default if strong)
- FSRS scheduler ([ADR 0069](./0069-fsrs-spaced-repetition-engine.md))
  weights retrieval frequency by mastery
- Practice-set ordering: weakest skills first
- Schedule view surfaces "review topic X before Tuesday's lecture"
  based on lecture `prereqs:` + student mastery

## Consequences

### Positive

- **One schema, four variants**: 80% code reuse vs four parallel
  schemas. Adding a new variant (quiz, reflection, project) is
  mechanical.
- **Rubric is reusable**: a project rubric authored once is used by
  multiple assignments + peer-review at Tier 3.
- **BKT is defensible SoTA**: well-established in
  intelligent-tutoring-systems literature; citable for tenure +
  Cottrell narrative; matches the published research instrument
  Sophie is built to be.
- **Adaptive remediation foundation**: BKT mastery + FSRS spacing +
  bridge components form a single integrated adaptive-learning
  system that's empirically grounded.
- **Auto-grading covers ~80% of practice items**: multiple choice,
  numerical, code (Pyodide), equation derivation, concept maps. The
  20% that needs human grading goes through Canvas at Tier 1/2,
  Sophie's AI-rubric grading at Tier 3.

### Negative

- **Cold-start problem for BKT**: first attempt has no history; P(L)
  starts at prior (commonly 0.5). Resolves quickly with a few
  attempts; intelligent-tutoring-systems literature handles this
  with skill-specific priors.
- **Per-skill parameter tuning**: optimal P(T)/P(S)/P(G) varies by
  skill + cohort. Sophie ships with conservative defaults (P(T)=0.1,
  P(S)=0.1, P(G)=0.2); long-term, per-cohort tuning becomes a SoTL
  output (Tier 3 with cohort data).
- **Diagnostic-coverage discipline required**: every prereq skill
  needs at least one diagnostic item authored. Mitigated by AI
  co-author suggestions ([ADR 0030](./0030-audience-and-ai-author-model.md)'s
  pedagogy role generates diagnostic candidates from the skill graph).

### Neutral

- **Practice + diagnostic blur intentionally**: a low-stakes diagnostic
  item is structurally identical to a practice item; the difference
  is metadata (stakes + intent). Same machinery serves both.

## Implementation notes

- New Zod schemas in `@sophie/core/schema`: `Assessment`,
  `AssessmentItem`, `Rubric`, `Criterion`, `BKTState`
- New package `@sophie/pedagogy-bkt` containing BKT algorithm
  implementation (likely wrapping or porting `bkt-tutor` or similar
  existing library)
- `useMastery(skill_id)` React hook exposes
  `{ pLearned, recordAttempt, isMastered, isWeak }`
- Auto-grading item type schemas + grader functions in
  `@sophie/pedagogy-assessment`
- Pedagogy-index extractor audit rules:
  - Every `prereqs: [skill_id]` on a Unit must have at least one
    `Assessment[type=diagnostic]` item exercising that skill
  - Every claimed `los: [lo_id]` on a Rubric must have at least one
    `AssessmentItem` exercising it
- AI co-author workflow (per
  [ADR 0030](./0030-audience-and-ai-author-model.md)): Section-level
  `practice-set` AI generates 20 draft interleaved problems from Unit
  content + LO tags; instructor curates

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) §"Assessment cluster"
- Corbett, A. T., & Anderson, J. R. (1995). "Knowledge tracing:
  Modeling the acquisition of procedural knowledge."
- Yudelson, M. V., Koedinger, K. R., & Gordon, G. J. (2013).
  "Individualized Bayesian Knowledge Tracing models."
- Pelánek, R. (2017). "Bayesian Knowledge Tracing, Logistic Models,
  and Beyond..."
