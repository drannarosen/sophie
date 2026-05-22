---
date: 2026-05-21T00:00:00.000Z
tags:
  - pedagogy
  - spaced-repetition
  - fsrs
  - retrieval-practice
  - sotl
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0069: FSRS as the spaced-repetition algorithm

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Related**: [0007](./0007-persistence-indexeddb.md) (per-browser scheduling state), [0030](./0030-audience-and-ai-author-model.md) (AI authoring of retrieval prompts), [0047](./0047-empirical-validation-plan.md) (SoTL research support), [0058](./0058-epistemic-component-contract.md), [0066](./0066-pseudonymous-first-data-model.md), [0068](./0068-bridge-rooms-and-prereq-pedagogy.md), [0073](./0073-unified-assessment-schema.md)
:::

## Context

Spaced repetition is one of the most replicated effects in cognitive
psychology — items reviewed at expanding intervals durably outperform
massed practice. Combined with retrieval practice (testing-yourself
beats re-reading) and interleaving (mixed-topic > blocked-topic), the
three effects form the foundation of evidence-based study practice.

Sophie's existing `<Predict>` component is already a
retrieval-practice + generation-effect pattern. The
[Course-Website Platform Roadmap](../status/course-website-roadmap.md)
expands this surface to a full spaced-repetition system with new
components (`<RetrievalPrompt>`, `<SpacedReview>`, `<WorkedExample>`,
`<FadedPrompt>`, `<InterleavedSet>`) and a scheduling engine that
resurfaces past items on a pedagogically-optimal cadence.

The algorithm question: which spaced-repetition scheduler does Sophie
adopt? Options range from simple to SoTA:

- **Leitner system** (1972): five boxes; items move forward on correct
  / back on incorrect. ~50 LOC; simple to debug.
- **SuperMemo SM-2** (Wozniak 1987): ease factor + interval formula.
  Spans Anki's foundation. Well-understood but limitations documented.
- **FSRS** (Free Spaced Repetition Scheduler): SoTA per the
  spaced-repetition research community; based on
  Difficulty/Stability/Retrievability formulation (Ye et al.);
  open-source; outperforms SM-2 in head-to-head studies on multiple
  datasets.

## Decision

**Sophie shall use FSRS (Free Spaced Repetition Scheduler) as its
spaced-repetition algorithm.**

### Why FSRS

1. **Current SoTA**: FSRS outperforms SM-2 (Anki's classic algorithm)
   in head-to-head benchmark studies on multiple datasets (cf. Anki's
   own integration of FSRS as its current default scheduler).
2. **Open source + library available**: TypeScript implementations
   exist; ~200 LOC integration effort.
3. **Defensible empirical-research claim**: "Sophie uses FSRS, the
   current state of art in spaced-repetition algorithms" is a
   well-grounded statement for SoTL research narratives
   ([ADR 0047](./0047-empirical-validation-plan.md)).
4. **Per-(student, item) state is small**: ~5 numeric fields per
   tracked item; fits cleanly in IndexedDB at Tier 1/2 and in a
   server-side store at Tier 3.

### Algorithm in brief

For each (student, item) pair, FSRS maintains:

- **Difficulty** (D): how hard this item is for this student
- **Stability** (S): how long the memory lasts after the most recent
  successful retrieval
- **Retrievability** (R): probability the item is recalled correctly
  *right now*

On each retrieval attempt, FSRS:

1. Computes current R from S, D, and time elapsed
2. Compares R to desired retention rate (configurable; commonly 0.9)
3. Schedules next review when R is predicted to drop to desired
   retention
4. Updates D + S based on the actual retrieval outcome (correct /
   incorrect / "again" / "easy")

### Scope of items scheduled

Sophie's FSRS scheduler tracks:

| Target | Examples |
|---|---|
| **Individual items** | One `<RetrievalPrompt>`; one practice problem; one diagnostic question |
| **Units** | "Lecture 2's content overall" — composite over its items |
| **Sections** | "Module 1 mastery" — composite |
| **Topics** (skills) | "Logarithms" — used by bridges + adaptive surfacing |
| **Learning objectives** | "LO 1.2" — same composite pattern |

The algorithm is identical across scopes; the difference is which
`target_id` the FSRS state is keyed on.

### Tier placement

- **Tier 1 / 2**: per-browser FSRS state in IndexedDB. Records carry
  `user_id` (per-browser UUID) + `course_id` + `target_id` +
  `target_type` + D + S + last_review_at + next_review_at + schema
  fields per [ADR 0066](./0066-pseudonymous-first-data-model.md).
- **Tier 3**: server-side FSRS state keyed on LTI sub. Auto-migrated
  from per-browser state on first LTI launch.

### Pedagogy integration

FSRS schedules from many sources:

- `<RetrievalPrompt>` answered in a reading → seeds spacing
- `<Predict>` revealed → counts as retrieval
- `<SkillReview>` interacted with → counts as retrieval
- Practice attempt graded → counts as retrieval
- Diagnostic item attempted → seeds + updates BKT mastery
  ([ADR 0073](./0073-unified-assessment-schema.md)) in parallel
- Each scheduled review is surfaced via `<SpacedReview topic="...">`
  components OR via the Schedule view's "FSRS Personal" surface

### Configurability

Per-course tuning:

- **Desired retention**: 0.85 (more permissive — fewer reviews) to
  0.95 (more demanding — more reviews); default 0.9
- **Maximum interval**: cap (e.g., 365 days) prevents items
  disappearing from the rotation
- **Review session size**: how many reviews surface per "FSRS Personal"
  session

## Consequences

### Positive

- **Defensible SoTL artifact**: FSRS is the SoTA; using it is a
  meaningful research-instrument claim.
- **Component-level integration**: every retrieval-style component
  feeds the same scheduler; no per-component reinvention.
- **Adaptive remediation foundation**: with mastery composites at the
  topic level (paired with BKT for diagnostic-driven mastery — see
  [ADR 0073](./0073-unified-assessment-schema.md)), Sophie's adaptive
  surfacing becomes empirically grounded.
- **Library-available**: existing TypeScript FSRS implementations
  (e.g., `ts-fsrs`) cut implementation effort substantially.
- **Per-browser at Tier 1/2 is privacy-elegant**: FSRS state is
  pseudonymous + per-browser; no PII exposure, no server burden.

### Negative

- **Cold-start problem**: a new item has no D/S history; first
  scheduling is heuristic. FSRS handles this via configurable initial
  parameters; standard practice in the literature.
- **Tuning per-course requires data**: optimal `desired_retention`
  varies by content + student population. Sophie starts with 0.9
  default; instructor can override; long-term, the per-cohort tuning
  becomes a SoTL research output (Tier 3).
- **Implementation complexity > Leitner**: ~200 LOC of FSRS vs ~50
  LOC of Leitner. Worth it for SoTA + research justification.

### Neutral

- **Behavior comparable to Anki for individual items**: instructors
  familiar with Anki will find the scheduling feels similar (since
  Anki now uses FSRS as default).

## Implementation notes

- New package `@sophie/pedagogy-fsrs` wrapping `ts-fsrs` or equivalent
- FSRS state record schema:
  ```ts
  type FSRSRecord = {
    user_id: string;
    course_id: string;
    target_id: string;
    target_type: "item" | "unit" | "section" | "topic" | "lo";
    difficulty: number;
    stability: number;
    last_review_at: string;     // ISO timestamp
    next_review_at: string;     // ISO timestamp
    review_count: number;
    desired_retention: number;  // 0.9 default
    schema_version: string;
    created_at: string;
    updated_at: string;
  };
  ```
- `useFSRS(target_id, target_type)` React hook exposes
  `{ schedule, recordReview, isOverdue }` to retrieval components
- "FSRS Personal" Schedule view shows overdue + upcoming reviews for
  the current student (per-browser)
- AI co-author suggestion: given a `Unit[lecture]`'s content, suggest
  `<RetrievalPrompt>` placements as FSRS seeds

## References

- [Course-Website Platform Roadmap](../status/course-website-roadmap.md) §"Pedagogy framework"
- [FSRS specification — open-spaced-repetition/fsrs4anki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- [`ts-fsrs` library](https://github.com/open-spaced-repetition/ts-fsrs)
- Karpicke, J. D. & Roediger, H. L. (2008). "The critical importance
  of retrieval for learning"
- Cepeda, N. J. et al. (2008). "Spacing effects in learning..."
