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
  status: in-progress
  last_validated_date: "2026-05-28"
  evidence:
    - kind: review
      ref: "PR 2 of formative-assessment plan (ADR 0073 Amendment 1)"
      date: "2026-05-27"
      notes: "Amendment 1 — formative-with-reveal v1 schema locked (six MDX components + two shared reveals + practice route + AS-1..5 audit invariants). Pure design/documentation; no code changes."
    - kind: deployment
      ref: "PR 3 of formative-assessment plan"
      date: null
      notes: "PR 3 — practice route (/units/[unit]/practice) + N-tab `<ChapterLayout>` link-bar + Issue #189 retirement (placeholder; backfill on merge)."
    - kind: deployment
      ref: "PR 4 of formative-assessment plan"
      date: null
      notes: "PR 4 — `<Solution>` + `<Hint>` + `<PracticeProblem>` + `sophieAutoImportsRemarkPlugin` for MDX-compile-time prop threading (placeholder; backfill on merge)."
    - kind: deployment
      ref: "PR 5 of formative-assessment plan"
      date: null
      notes: "PR 5 — `<QuickCheck>` + `extractFormative` (QuickCheck branch) + AS-2 invariant + `PedagogyIndex.formatives` bucket (placeholder; backfill on merge)."
    - kind: deployment
      ref: "compound-island-transform bundle (ADR 0087)"
      date: "2026-05-28"
      notes: "`<MCQ>` (AS-1) + `<MultiSelect>` (AS-5) + `<FillBlank>` (AS-3) shipped as compile-time virtual tags lowered by `sophieCompoundExpandRemarkPlugin` per ADR 0087 — NOT runtime React islands. Native radio/checkbox/text inputs supersede the originally-planned `@radix-ui/react-radio-group` + `@radix-ui/react-checkbox` (both removed). Supersedes the PR 6/7/8 placeholders."
    - kind: test
      ref: examples/smoke/e2e/formative-render.spec.ts
      date: "2026-05-28"
      notes: "Build-level render+axe gate proving the shipped MCQ/MultiSelect/FillBlank render in the real build (the empty-render bug the runtime-introspection design hit; see ADR 0087) and AS-1..5 fire on the authored shape."
    - kind: deployment
      ref: "PR 9 of formative-assessment plan"
      date: null
      notes: "PR 9 — `<NumericQuestion>` + AS-4 invariant; closes the v1 formative-family wave (placeholder; backfill on merge). Graduates `validation.status` to `validated`."
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

- `<SkillReview target="topic:...">`
  ([ADR 0068](./0068-bridge-rooms-and-prereq-pedagogy.md), signature
  unified in Wedge B1) salience
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

## Amendments

### Amendment 1 — Formative-with-reveal v1 (2026-05-27)

**Title.** Formative-with-reveal v1 surface: six MDX components +
two shared reveals + practice route + AS-1..5 audit invariants.
Grading, attempt-tracking, BKT, `<Assignment>`, and
`<RetrievalPrompt>`-as-wrapper unification deferred to v2.

**Trigger.** Formative-assessment sprint
([implementation plan](../../plans/2026-05-27-formative-assessment-implementation.md),
[design doc](../../plans/2026-05-27-formative-assessment-design.md)).
ASTR 201 has ~35 prose practice problems already authored across
M3-L10 + M4 that need a visible practice surface immediately. The
broader ADR 0073 design (four-variant Assessment + Rubric + BKT) is
the right long-term shape; the wave that ships *first* is the
narrowest subset that gets practice items routed, reveals working,
and audit invariants in place. v2 widens to the full four-variant
union + grading + attempt tracking. This amendment is the single
citation point for PRs 3–9 of the implementation plan.

#### 1. Scope — strict subset of the locked ADR 0073 design

v1 ships `Assessment[type=practice]` only. The schema field
`Assessment.type` is locked at v1 to the literal `"practice"`; v2
widens to the four-variant union declared in §"Unified Assessment
schema" above. The §"Rubric as first-class artifact",
§"Auto-grading scope", §"Open-ended written grading", §"BKT mastery
model", §"Per-student-per-skill state", §"Diagnostic timing — three
windows", and §"Adaptive surfacing (Tier 2)" sections remain
accepted-design but unimplemented; v1 does not ship their machinery
and does not contradict their decisions. v1 does
not ship the `Assessment` Zod schema either — the wave's authored
shape is six MDX components, and the only schema material that
lands is a new `FormativeAnswer` discriminated union normalized
onto a `FormativeEntry` in the pedagogy index (see §4 + §5 below).

#### 2. The six v1 MDX components + two shared reveals

| Component | Role | Audit invariant |
|---|---|---|
| `<MCQ>` | single-best-answer; native `<input type=radio>` radiogroup ([ADR 0087](../decisions/0087-compound-island-transform.md); was `@radix-ui/react-radio-group`) | AS-1 (ERROR): exactly one `<MCQ.Choice correct>` |
| `<MultiSelect>` | select-all-that-apply; native `<input type=checkbox>` ([ADR 0087](../decisions/0087-compound-island-transform.md); was `@radix-ui/react-checkbox`) | AS-5 (ERROR): at least one `correct` choice |
| `<FillBlank>` | text-fill with inline `<FillBlank.Slot>` children | AS-3 (WARN): at least one `<FillBlank.Slot>` |
| `<NumericQuestion>` | numeric answer + tolerance + optional unit | AS-4 (ERROR): exactly one `<NumericQuestion.Answer>` |
| `<QuickCheck>` | free-response, solution-only | AS-2 (WARN) applies via §5 |
| `<PracticeProblem>` | bare practice shell; context owner for `<Solution>`/`<Hint>` when no formative child wraps | AS-2 (WARN) applies via §5 |

Two shared reveal primitives, used inside any of the six parents:

- `<Solution>` — reveal primitive; persistence key
  `solution:${parentId}:open`, namespaced by the parent
  formative item's `id`.
- `<Hint number={N}>` — progressive reveal; persistence key
  `hint:${parentId}:${n}:open`, same namespace.

The six parents are the formative *family*. The two reveals are
not formative items themselves — they are reveal primitives that
attach to a formative parent. This is the structural reason for
the parent-context discipline in §3.

#### 3. Author surface — compile-time prop threading

Only the six formative-family parents declare `course` / `unit` / `id`
per ADR 0027's slug discipline; `<Solution>` and `<Hint>` are
authored with no namespace props at all. The author surface is
minimal — no `import { … } from "@sophie/components"`, no
`client:load`, no `course` / `unit` / `parentId` on the reveals:

```mdx
<PracticeProblem course="astr201" unit="m1-l2" id="kepler-3">
  <Hint number={1}>Apply Kepler's third law.</Hint>
  <Solution>$T = 1$ year.</Solution>
</PracticeProblem>
```

**The "parent-context threading" promise is realized at MDX-compile
time via `sophieAutoImportsRemarkPlugin`, not at runtime via React
Context.** The plugin (at
`packages/astro/src/lib/mdx-plugins/sophie-auto-imports.ts`) runs as
part of the chapter-MDX pipeline before `remark-math` and does three
things: (1) auto-injects the `@sophie/components` import line with
every interactive component used in the file, (2) marks every
interactive callsite with `client:load`, and (3) walks each
formative parent's subtree and writes its `course` / `unit` / `id`
as explicit `course` / `unit` / `parentId` props on every nested
`<Solution>` and `<Hint>`. Authors get the same ergonomics as a
runtime-Context design without the Context's runtime constraints.

**Why not React Context?** The original Context-based design
mounted a `FormativeContext` provider in `<PracticeProblem>` and
consumed it with `useFormativeContext()` in `<Solution>` / `<Hint>`.
That shape didn't survive Astro's MDX island model: each top-level
JSX tag in an MDX file SSRs as its own React tree, so a Context
provider mounted by an outer JSX tag is invisible to a sibling
JSX tag — even when the sibling looks nested in the authored MDX,
Astro splits them into independent islands at render. Compile-time
prop threading sidesteps the island boundary entirely: the plugin
writes literal `course` / `unit` / `parentId` props onto each child
element while the tree is still a single mdast, before MDX hands
fragments off to Astro for island compilation.

**Failure modes are loud and curated.** Missing `course` / `unit` /
`id` on a formative-parent shell halts the MDX compile with a
`file:line` error naming the gap; declaring any of the three as a
JSX expression (e.g. `course={courseSlug}` instead of
`course="astr201"`) raises a distinct error pointing at the
expression callsite. The plugin runs before `remark-math` so `$…$`
content inside formative-family children is unaffected by the JSX
rewrites. The rationale for the strict namespace discipline carries
over: IndexedDB persistence keys for reveals must namespace under
the formative item that owns them; the compile-time threading
enforces that invariant structurally rather than relying on a
runtime hook.

#### 4. Answer contract — JSX-native + index-normalized discriminated union

Authors type answers as JSX, not as YAML or JSON props. The two
shapes are **boolean-presence on choices** (`<MCQ.Choice correct>`,
`<MultiSelect.Choice correct>`) and **value attributes on dedicated
answer children** (`<NumericQuestion.Answer value={9.81}
tolerance={0.05} toleranceKind="relative" unit="m/s^2" />`,
`<FillBlank.Slot id="x" correct="42" />`). The pedagogy-index
extractor materializes a typed `FormativeAnswer` discriminated
union onto each `FormativeEntry`:

```ts
type FormativeAnswer =
  | { type: "single-choice"; correct: string }
  | { type: "multi-choice"; correct: string[] }
  | { type: "fill-blank"; blanks: Array<{ id: string; correct: string }> }
  | {
      type: "numeric";
      value: number;
      tolerance: number;
      toleranceKind: "absolute" | "relative";
      unit?: string;
    }
  | { type: "solution-only" };
```

This is the **grading seam**. v1 does not run a grader against
`FormativeAnswer`; v2 does, by reading the entry from the
pedagogy index and wrapping the runtime component in `useInteractive`
per §9.c below. Authoring the answer in JSX at v1 costs nothing
additional and locks the v2-ready data shape into the index from
day one.

#### 5. Pedagogy-index bucket + five audit invariants

A new top-level bucket joins the existing pedagogy-index pattern
per [ADR 0038](./0038-pedagogy-index-pattern.md):

```ts
PedagogyIndex.formatives: readonly FormativeEntry[]
```

`FormativeEntry` carries (at minimum) `{ kind, unit, anchor, id,
answer: FormativeAnswer | null, hasSolution: boolean, hints: number }`.
The `unit + anchor` shape is the v2-readiness on-ramp for cross-unit
references (see §9.a).

The five audit invariants enforced by the pedagogy-index extractor
per ADR 0038's audit pattern:

| ID | Severity | Trigger | Author resolution |
|---|---|---|---|
| **AS-1** | ERROR | `<MCQ>` does not have exactly one `<MCQ.Choice correct>` | Mark exactly one choice with `correct` |
| **AS-2** | WARN | A formative item (any of the six) has no `<Solution>` child | Add a `<Solution>` — authored-but-answerless items are the silently-missing-Aside class for the formative family |
| **AS-3** | WARN | `<FillBlank>` has zero `<FillBlank.Slot>` children | Add at least one `<FillBlank.Slot>` |
| **AS-4** | ERROR | `<NumericQuestion>` does not have exactly one `<NumericQuestion.Answer>` child | Provide exactly one answer child with `value` + `tolerance` |
| **AS-5** | ERROR | `<MultiSelect>` has zero choices marked `correct` | Mark at least one `<MultiSelect.Choice correct>` |

ERROR-severity invariants halt the build per the existing audit
contract; WARN-severity invariants surface in the audit report and
in CI logs but do not halt. AS-2's WARN posture is deliberate: a
formative item without a solution is a likely authoring gap but a
legitimate intermediate state during drafting; the audit notifies
rather than blocks.

#### 6. Practice route

`/units/[unit]/practice` is injected by `@sophie/astro` at
`astro:config:setup`, mirroring the reading route per
[ADR 0082](./0082-chapter-layout-extraction.md). The route reads
`practice.mdx` for the unit and renders it through
`makeStaticComponents` — the chapter-MDX factory at
`packages/astro/src/components.tsx`. Issue #189 (the
practice-content-not-visible warning) retires when PR 3 ships;
its warning file is deleted in the same PR.

#### 7. `<ChapterLayout>` link-bar

The chapter-layout link-bar gains an N-tab affordance from day one
— `Reading | Slides | Practice` — even though slides are not in this
amendment's scope. Slides slot in when their own ADR ships. Each
tab renders conditionally on the artifact's availability for the
unit (per the projection pattern formalized in ADR 0082): if the
unit declares no `practice.mdx`, the Practice tab does not render.
A trailing CTA ("→ Practice this lecture") lands at the end of
`reading.astro` when a practice artifact exists. The N-tab shape is
forward-compat with the v2 `<Assignment>` work — assignments live
at course-level routes (§9.a) and do not add a fourth per-unit tab.

#### 8. Stable anchors

Every formative-family parent accepts an optional `id` prop that
overrides the `form-${counter}` auto-anchor. The auto-counter
suffices for v1 because cross-unit references do not yet exist;
the explicit `id` shape is the v2-readiness on-ramp for the
`<Assignment>` cross-unit reference seam declared in §9.a. Authors
who do not provide `id` get a stable auto-anchor; authors who do
provide `id` opt their item into being referenceable from a future
assignment without changing any other shape.

#### 9. v2-foreshadowing — three locked design seams

These three seams are **locked at v1** even though their machinery
ships later, because each one constrains the v1 data shape (the
`FormativeEntry` schema, the `<RetrievalPrompt>` children-mode, the
attempt-record shape). Locking them now prevents v2 from being a
breaking-rewrite.

##### 9.a `<Assignment>` references practice items by `(unitId, anchor)` tuples across multiple units

The v2 `<Assignment>` MDX component references practice items by
`(unitId, anchor)` tuples *across multiple units* — not by intra-unit
anchor list, not by inline item authoring. The
`FormativeEntry.unit + .anchor` shape **is** the cross-unit reference
seam; v2 adds no new field. Authoring shape:

```mdx
<Assignment
  id="hw-3"
  items={[
    { unit: "rotation-curves", anchor: "form-3" },
    { unit: "dark-matter-evidence", anchor: "core-q" },
  ]}
  due="2026-10-15T23:59"
  late={{ policy: "grade_floor", floor: 0.5 }}
/>
```

Assignments live at a **course-level route** (`/assignments/[id]`),
not under `/units/[unit]/`. This is the structural reason the
per-unit link-bar stays Reading|Slides|Practice and does not gain
an Assignments tab — assignments are course-scoped, not unit-scoped.

##### 9.b `<RetrievalPrompt>` widens to wrap any formative child

In v1, `<RetrievalPrompt>` is the retrieval-family component with
its existing `target` prop semantics (skill-bridge / spaced-review).
In v2, `<RetrievalPrompt>` widens to **wrap** any formative child —
`<MCQ>`, `<MultiSelect>`, `<FillBlank>`, `<NumericQuestion>`,
`<QuickCheck>`. The retrieval-family components own the
spaced-review / skill-bridge machinery; the formative-family
components own the question content. The v2 PR rewrites
`<RetrievalPrompt>`'s children-mode while preserving the existing
`target`-prop semantics; the `useRetrievalAttempt` attempt-record
shape gains a discriminated union over `FormativeAnswer` rather
than the v1 free-text record. No formative-family component
authored in v1 needs to change to opt in to retrieval scheduling
at v2 — wrapping is purely additive.

##### 9.c Grading turns on by reading `FormativeEntry.answer` from the index

v2 grading is **a render-time wrap, not an authoring change**. The
v2 PR reads `FormativeEntry.answer` from the pedagogy index at
chapter-MDX compile time and wraps each runtime formative component
in `useInteractive` attempt-tracking per ADRs 0004 + 0007. No
call-site changes for authors. The v2 attempt-record shape attributes
attempts to specific formative occurrences via `formative.id` — the
stable `id` shape from §8 is the join key into the index. BKT state
itself remains keyed by `(user_id, course_id, skill_id)` per
§"Per-student-per-skill state" above; the formative-attempt-to-skill
mapping is the v2 design surface this amendment leaves open. The
`useInteractive` integration is the seam where the formative family
meets the locked broader ADR 0073 BKT design.

#### 10. What v1 explicitly does NOT do

- Auto-grading (any of the eight grader types in
  §"Auto-grading scope" above)
- Attempt tracking
- Score persistence
- `<Assignment>` MDX component
- `<RetrievalPrompt>` body widening
- Per-choice feedback on `<MCQ>`
- Self-grade after reveal ("got it / partial / missed")
- Ordering / matching / categorization / diagram-labeling questions
- Numeric-tolerance comparison at runtime (tolerance + unit data IS captured in the index per §4; v1 just doesn't compare student input against them)
- Submission flow
- `Rubric` / `Criterion` schemas
- `Assessment.schedule` / `Assessment.stakes` / `Assessment.submission`
  / `Assessment.feedback` blocks
- BKT state initialization or update

Each is locked-design but unimplemented; v2 turns them on without
contradicting v1's shape.

#### 11. PR sequencing locked

The 12-PR sequence in
[`docs/plans/2026-05-27-formative-assessment-implementation.md`](../../plans/2026-05-27-formative-assessment-implementation.md)
is the appendix-referenced sequencing for this amendment. PRs 3–9
are the formative-family wave (practice route + link-bar; reveals
+ `<PracticeProblem>` + `sophieAutoImportsRemarkPlugin`
compile-time prop threading; `<QuickCheck>` + index
bucket + AS-2; `<MCQ>` + AS-1; `<MultiSelect>` + AS-5;
`<FillBlank>` + AS-3; `<NumericQuestion>` + AS-4). PRs 1, 10, 11,
12 are Track-B side-channels (Video component; author-trap lint;
audit-error DX; figures duplicate-key guard). Each formative-family
PR cites this Amendment as its design source.

#### 12. Validation block

The page-level `status:` stays `accepted-design` — Sophie's convention
(per ADR 0080's amendment precedent) tracks broad-vision status at the
page level while amendments live in the `## Amendments` section and
amendment-progress lives in the `validation:` block. Frontmatter
changes for Amendment 1:

- `validation.status: unvalidated → in-progress`
- `validation.last_validated_date: null → "2026-05-27"`
- `validation.evidence`: one `kind: review` entry for PR 2 (this
  amendment) and seven `kind: deployment` placeholder entries for
  PRs 3–9 (backfilled with merge dates as each PR lands).

`validation.status` graduates to `validated` when all PRs 3–9
have merged and the ASTR 201 formative-family adoption pass lands
(the ~35 existing prose practice problems migrated onto the new
components).
