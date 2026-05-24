---
title: Sophie Course Spec + Spec-Driven Authoring — Design
date: 2026-05-25
status: brainstorm-validated
authors:
  - Anna Rosen (course intent, decisions)
  - Claude (synthesis, drafting)
related:
  - ADR 0001 (platform repo shape)
  - ADR 0030 (AI as primary author)
  - ADR 0038 (pedagogy index)
  - ADR 0058 (epistemic component contract)
  - ADR 0064 (chapter migration playbook)
  - Inspirations: github/spec-kit, ariel-frischer/autospec
---

## Context

Sophie's current shape covers the **content layer** (MDX components, pedagogy index, audit invariants) and the **chrome layer** (`Card`, `Grid`, `Tabs`, `Dropdown` shipped 2026-05-24 in PR #168). What it does not yet have is a **course-level spec layer** — the artifact that declares what a course *is* (audience, terminal goals, pedagogy, principles, quality bars) and against which AI authoring + audit + iteration operate.

This design fills that gap.

Anna has two concrete drivers:

1. **ASTR 201 migration.** The existing Quarto course at `/Users/anna/Teaching/astr201-sp26/` migrates to Sophie. A Course Spec lets the migration be more than a file-format conversion — it captures pedagogical intent that was implicit in the Quarto frontmatter + Anna's head.
2. **COMP 521 greenfield.** Anna teaches "Intro to Scientific Computing and Data Science" in Fall 2026 from zero. The Course Spec must support AI+HITL authoring of a course that has no prior content to migrate from.

The same format must serve both loops. Two independent passes (Claude's critique of the original LDS-platform framing + ChatGPT's revised response) converged on the same architectural answer: **keep presentation flexible, course repos extensible, and the epistemic reasoning grammar stable.** The Course Spec is the artifact where each course declares its register within that shared grammar.

The brainstorm in conversation `you-re-starting-a-fresh-sorted-bengio` on 2026-05-25 locked nine design questions and produced a complete draft Course Spec for ASTR 201 across eight sections. This document captures the design.

## Decisions locked

| # | Question | Decision |
|---|----------|----------|
| Q1 | Which course is the brainstorm anchor? | ASTR 201 (Phase C migration target; Quarto modules ready) |
| Q2 | How to generate the 6 terminal goals? | (a)+(c): I distilled from existing per-lecture objectives, Anna redlined toward refinement |
| Q3 | How does pedagogy get declared? | (b) Per-course `pedagogy.pattern:` field; OMI is the default |
| Q4 | Course Spec scope — what's in vs pushed down? | (a) Course-level only; module/lesson metadata lives in their own files; Sophie discovers artifacts by filesystem convention |
| Q5 | Which quality bars should the constitution require? | (c) Full-quality bars, refined per course |
| Q6 | How rich should the audience model be? | (b) Standard (skills + brief affective profile); (c) personas + cognitive-load model optional |
| Q7 | Assessment in the spec — philosophy only, or +structure? | (b) Philosophy + grade weights; assignments stay in their files |
| Q8 | Do principles get a first-class section? | (b) Yes, lightweight — 3–7 short statements |
| Q9 | Synthesize a draft now or keep brainstorming residuals? | (a) Synthesize; residuals get answered against the concrete draft |

Additional decisions made in conversation:

- **Voice contract is a separate artifact** at `voices/<author-id>.yaml`. The constitution references it. Voice belongs to the instructor (portable across courses), not the course.
- **Quality-audit is a first-class stage.** It runs the pedagogy-index pipeline against the constitution's `required_quality_checks` and produces a persisted, versioned `audits/<artifact>.audit.yaml` report.
- **Iterate is a first-class stage.** It consumes the audit report plus author redlines and produces v2 of the drafted artifact. Loop until clean.
- **Workflow shape adapts spec-kit's pattern** (constitution → specify → plan → tasks → implement) with Sophie-specific extensions (audit, iterate). The mapping is one-to-one with autospec's YAML-first stance.

## The Course Spec format

Single YAML file at the consumer-course repo root: `course.sophie.yaml`. The `.sophie.yaml` extension marks the file Sophie-recognizable. The schema lives at `@sophie/schemas/course-spec@0.1` and Sophie validates the file via Zod (ADR 0003).

The file has eight sections. Each section serves a distinct role; the sections do not nest.

### Section 1 — Identity

```yaml
id: astr-201-sp26
title: Astronomy for Science Majors
code: ASTR 201
term: Spring 2026
institution: San Diego State University
instructor: Anna Rosen

voice: anna-rosen
voice_register: sophomore_quantitative

subtitle: >
  A quantitative introduction to astrophysics — extracting physical
  insight from limited observations using mathematics and physics.

description: >
  This is not a "tour of the cosmos" course. ASTR 201 teaches you to
  think like an astronomer: take a constrained observation, build a
  model, infer a physical property, name the assumptions you leaned on.
  Wonder-first → physics-second.
```

`id` is stable across term-by-term offerings (`astr-201-sp26`, `astr-201-sp27`, etc.) and serves as the cross-reference target for audit reports. `voice` references the instructor-level voice contract; `voice_register` selects the per-course pitch.

### Section 2 — Audience

```yaml
audience:
  level: undergraduate_sophomore
  majors_minors: [astronomy_major, astronomy_minor]
  enrollment_motivation: >
    Elective for many; required for the astronomy major track.

  prerequisites:
    courses:
      - phys-195-intro-mechanics
    assumed_skills:                 # We HOPE students arrive with these
      - newton_laws_qualitative
      - energy_conservation_algebraic
      - free_body_diagrams
      - vectors_2d_3d
      - single_variable_calculus_basics
    scaffolded_skills:              # We re-establish inline as needed
      - dimensional_analysis
      - ratio_method
      - order_of_magnitude_estimation
      - unit_conversions_si_cgs
      - small_angle_approximation

  affective_profile: >
    Quantitative anxiety often surfaces in Module 3 (stellar structure +
    evolution) when derivations stack. Newly-declared majors carry
    imposter syndrome — Module 1's "Spoiler Alerts" lecture front-loads
    the "you can do this" framing for exactly this reason.

  # Optional (Q6 (c)) — expand when needed:
  # personas: [...]
  # cognitive_load_model: ...
```

The load-bearing distinction is `assumed_skills` versus `scaffolded_skills`. A prerequisite course is what students *took*; an assumed skill is what we *hope* they retained. Audit rule (`QB3`): a lecture invoking a skill in neither list is silent prereq invocation and triggers a finding.

### Section 3 — Pedagogy

```yaml
pedagogy:
  pattern: observable_model_inference

  required_moves:
    observable: "What we measure (parallax angle, color, line spectrum, orbital period)"
    model:      "What we believe (geometric, atomic, gravitational, statistical)"
    inference:  "What we can claim (distance, T, M, composition, L)"
    assumption_audit: "What we leaned on; where it breaks"

  named_tools:
    - id: dimensional_analysis
      tagline: "The smoke detector for physics — catches errors before you calculate."
    - id: ratio_method
      tagline: "Escape the paralysis of giant numbers."
    - id: order_of_magnitude_estimation
      tagline: "One sig fig keeps you grounded in physical reality."
    - id: unit_conversions
      tagline: "Move between SI and CGS without panicking."

  multi_track_readings:
    enabled: true
    tracks:
      - { id: core,       label: Track A, target_time: 20_min }
      - { id: enrichment, label: Track B, target_time: 30_min, deeper: true }

  callouts:
    - { id: big_idea,            role: gateway,       use: "Frame the conceptual pay-off in 1-2 sentences." }
    - { id: reading_map,         role: navigation,    use: "Explicit Track A / Track B branch at the top." }
    - { id: quick_check,         role: formative,     use: "Self-assessment question, answer collapsed." }
    - { id: misconception_alert, role: misconception, use: "Name the wrong idea before correcting it." }
    - { id: frontier,            role: open_question, use: "Active research / unknowns (e.g., dark energy)." }
    - { id: enrichment,          role: extension,     use: "Historical depth / alternative derivations." }
    - { id: explore,             role: extension,     use: "Extended calculations, 3D visuals." }
```

`pattern` is the registered name of the pedagogical pattern. OMI is the v1 default; COMP 521 will need a new pattern (probably `problem_algorithm_implementation_test`). `required_moves` captures the course-specific framing of the pattern's stages. `named_tools` and `callouts` lift Anna's existing taxonomy into spec-form so the audit can verify usage.

### Section 4 — Terminal Goals

The brainstorm produced six terminal goals, distilled from ~150 per-lecture objectives across the four ASTR 201 modules and rewritten in Anna's voice:

```yaml
terminal_goals:
  - id: TG1
    tag: infer-physical-property
    statement: >
      Take a constrained observation — a parallax angle, a stellar
      color, a binary's orbital period — and pull a physical property
      out of it (distance, temperature, mass, composition, luminosity).
      Name the model you used and the assumptions you leaned on.
    contributing_modules: [m1, m2, m3, m4]

  - id: TG2
    tag: quantitative-toolkit
    statement: >
      Sanity-check problems with dimensional analysis. Compare
      quantities with ratios instead of grinding through giant numbers.
      Estimate to one significant figure when full calculation is
      overkill. Move between SI and CGS without panicking.
    contributing_modules: [m1, m2, m3]

  - id: TG3
    tag: model-pressure-test
    statement: >
      Build a simplified model of an astrophysical system — a stellar
      interior, a binary orbit, a galaxy's rotation curve — and
      pressure-test it. What does it assume? Where does it break?
      What can you still trust when it does?
    contributing_modules: [m2, m3, m4]

  - id: TG4
    tag: stars-live-and-die
    statement: >
      Explain how stars live and die. Show why mass sets nearly
      everything — lifetime, luminosity, fate. Trace a low-mass and a
      high-mass star through their full evolution.
    contributing_modules: [m3]

  - id: TG5
    tag: large-scale-universe
    statement: >
      Read the universe at large scales. Use galaxy rotation curves to
      detect dark matter. Use Hubble's law to infer cosmic expansion.
      Use the CMB to read the history of structure.
    contributing_modules: [m4]

  - id: TG6
    tag: reason-like-an-astronomer
    statement: >
      Reason like an astronomer. Distinguish what you observe from what
      you infer. Pressure-test your models. When two ideas compete, say
      which evidence would decide between them.
    contributing_modules: [m1, m2, m3, m4]
```

### Section 5 — Principles

```yaml
principles:
  - id: P1
    statement: "Every quantitative claim is unit-checked at every step."
    rationale: "Dimensional analysis is the smoke detector. Drift here is silent."

  - id: P2
    statement: "Every inference cites its assumption. Implicit assumptions are bugs."
    rationale: "Inference without assumption-naming is invisible epistemic debt."

  - id: P3
    statement: >
      Math level is symbolic-with-interpretation. No plug-and-chug.
      No opaque derivation.
    rationale: "Students see why the math matters; the math sees what physics it serves."

  - id: P4
    statement: >
      Wonder-first → physics-second. Open with a puzzle or
      observation; build the model to explain it.
    rationale: "Pure physics for its own sake is a hard sell to sophomores. The puzzle earns the math."

  - id: P5
    statement: "Misconceptions are named in their wrong form before being corrected."
    rationale: "Papered-over misconceptions surface in exams as confusion. Naming them defuses them."

  - id: P6
    statement: >
      Growth memos scaffold reflection, not graded content.
      Self-assessment is metacognitive practice, not surveillance.
    rationale: "Grading reflection turns it into performance. The practice is the point."
```

Principles are the *rules of engagement* the AI authoring and audit both respect. They differ from voice (HOW you write), pedagogy (OMI), quality bars (WHAT must be present), and goals (WHAT students leave with). Audit findings cite the principle ID: `§P2: derivation in M3-L04 line 12 introduces 'assume isothermal' without naming it as an assumption`.

### Section 6 — Assessment

```yaml
assessment:
  philosophy: >
    Assessment is integrated, not separated. Homework is for practice
    and habit-building; growth memos are for metacognition; exams are
    for synthesis. Correctness matters less than showing your work,
    naming your assumptions, and being able to defend your reasoning
    under closed-book conditions.

  grade_weights:
    - { category: homework,             weight: 30, count: 9,
        label: "HW 1–9 problem sets; weekly grade memo included" }
    - { category: growth_memos,         weight: 10, count: 2,
        label: "Mid-term reflections; one after each midterm; scored on reflection quality" }
    - { category: scholarly_engagement, weight: 10,
        label: "iClicker / in-class participation" }
    - { category: midterm_1,            weight: 15,
        label: "Closed-book; formula sheet provided" }
    - { category: midterm_2,            weight: 15,
        label: "Closed-book; formula sheet provided" }
    - { category: final_exam,           weight: 20,
        label: "Cumulative; closed-book; formula sheet provided" }

  homework_workflow:
    submission_day:   tuesday
    solutions_posted: wednesday
    grade_memo:
      cadence: per_homework        # 9 grade memos, one per HW
      due:     friday_after_hw
      purpose: student_self_assessment_against_rubric
    rubric:
      scale: "0–5"
      weighted_factors: [completion, professionalism, showing_steps]

  growth_memos:
    cadence:          per_midterm  # one after each midterm
    count:            2
    purpose:          metacognitive_practice
    scored:           true         # 0–5 on reflection quality (P6)
    rubric_dimension: reflection_quality

  exam_policy:
    note_policy:      closed_book
    formula_sheet:    provided
    final_cumulative: true
```

Weights sum to 100. The constitution declares philosophy and weights; per-assignment files declare which terminal goals they `measures:`. The audit cross-checks coverage (`QB5`) and verifies that grade-memo and growth-memo cadences match the schedule.

### Section 7 — Quality Bars

```yaml
quality_bars:
  required:                            # errors
    - { id: QB1-accessibility,         scope: [chapter, figure],
        check: "Alt text + color-independent encoding on every figure." }
    - { id: QB2-goal-alignment,        scope: [chapter, assignment, exam],
        check: "Each artifact declares `measures: [TG#]` for ≥1 TG." }
    - { id: QB3-prerequisite-mapping,  scope: [chapter],
        check: "Invoked skills must appear in audience.{assumed,scaffolded}_skills." }
    - { id: QB4-misconception-repair,  scope: [misconception_alert],
        check: "Names the wrong form AND the repair (P5)." }
    - { id: QB5-assessment-coverage,   scope: course,
        check: "Every TG has ≥1 assessment item measuring it." }
    - { id: QB6-units,                 scope: [equation, derivation_step],
        check: "Units shown at every step (P1)." }
    - { id: QB7-assumptions,           scope: [inference, derivation],
        check: "Every inference cites its assumption (P2)." }

  recommended:                         # warnings
    - { id: QB8-retrieval-practice,    scope: [chapter],
        check: "Each reading has ≥1 quick_check callout." }
    - { id: QB9-voice-register,        scope: [chapter, slide],
        check: "Prose matches declared voice + register." }
    - { id: QB10-multi-representation, scope: [key_equation],
        check: "Visual + numerical + symbolic forms (Sophie multi-rep partial)." }
```

Seven required bars (errors), three recommended (warnings). Required bars are the hard contract; recommended bars track aspirational state Sophie has not fully built (QB10 multi-rep, QB8 retrieval-practice components are partial). Per Q5, this set is course-specific — COMP 521 will swap QB6 for something like "every code block has a type-check or runtime assertion" and may drop QB4 if scientific computing has different misconception shapes.

### Section 8 — Discovery + Spec Metadata

```yaml
discovery:
  modules:
    pattern: "modules/*/index.mdx"
    children:
      lectures: "modules/*/readings/*.mdx"
      slides:   "modules/*/slides/*.mdx"

  assignments: "homework/*.mdx"
  exams:       "exams/*.mdx"
  course_info: "course-info/*.mdx"
  handouts:    "handouts/*.{pdf,mdx}"

  registries:
    figures:        "assets/figures.yaml"     # Quarto-carryover
    equations:      "equations/*.mdx"         # Restructured from Quarto _includes/equations/
    misconceptions: "misconceptions/*.mdx"    # NEW; populated as drafts call them out

  schedule: "course-info/schedule.yaml"

spec_version: "0.1"
schema:       "@sophie/schemas/course-spec@0.1"
```

Discovery rules let Sophie find artifacts by filesystem convention without the constitution having to enumerate 25 lectures, 9 homeworks, 3 exams, and so on. `equations/*.mdx` restructures Quarto's `_includes/equations/` into a proper directory where each equation is its own MDX file. `schedule.yaml` lives separately so a new term can edit dates without touching the constitution.

## Sophie's spec-driven workflow

The Course Spec is the artifact one stage of a seven-stage workflow produces and consumes. The workflow borrows shape from `github/spec-kit` (slash-command UX) and `ariel-frischer/autospec` (YAML-first artifacts, token-isolated execution), then adapts to pedagogy.

| Stage | Sophie command | Input | Output | Notes |
|-------|----------------|-------|--------|-------|
| Constitution | `/sophie.constitution` | conversation + existing course (optional) | `course.sophie.yaml` | What this document specs; produced via brainstorm like Q1–Q9 |
| Specify | `/sophie.specify` | constitution + scope (e.g., "Module 3") | `modules/m3/spec.sophie.yaml` | Per-module or per-lesson spec; declares scope + sequence |
| Plan | `/sophie.plan` | specify output | `modules/m3/plan.sophie.yaml` | Outline + sequence + figure/equation/assessment placement |
| Tasks | `/sophie.tasks` | plan output | `modules/m3/tasks.sophie.yaml` | Drafting steps (write this section, this caption, this quick-check) |
| Implement | `/sophie.implement` | tasks | MDX files | AI drafts content; bounded sessions per task (autospec pattern) |
| Audit | `/sophie.audit` | MDX artifact + constitution | `audits/<path>.audit.yaml` | Runs pedagogy-index pipeline against `required_quality_checks` |
| Iterate | `/sophie.iterate` | audit + author redlines | v2 MDX | Refines artifact; loops back to audit until clean |

Two stages do not exist in spec-kit or autospec: **Audit** and **Iterate**. They are Sophie's differentiators. spec-kit's "did the code compile" check is mechanical; Sophie's audit is pedagogical (goal alignment, prerequisite mapping, misconception coverage, voice drift). spec-kit ends at implement and assumes the AI's draft is done; Sophie acknowledges that pedagogy authoring is iterative and makes the loop first-class.

### Voice contract as separate artifact

The voice contract lives at `voices/<author-id>.yaml` in the consumer-course repo, sibling to `course.sophie.yaml`. It declares the instructor's base voice — invariant across the instructor's courses — and exposes registers the constitution can select:

```yaml
# voices/anna-rosen.yaml
id: anna-rosen
display_name: Anna Rosen

base_voice:
  rules:
    - Information-dense and quantitatively anchored.
    - Wonder-first → physics-second.
    - Conversational, not formal.
    - Metaphor-light; physics-reasoning over analogy.
    - Direct address ("you can measure"), not third-person passive.
    - No hedging. Declarative claims with assumption-citing.

registers:
  - id: sophomore_quantitative          # ASTR 201
    pitch: "Assumes Phys 195; symbolic-with-interpretation math; high information density."
  - id: intro_non_major                 # ASTR 101
    pitch: "Wonder-first; ≤50 words per slide; lighter math (scientific notation, ratios)."
  - id: scientific_computing            # COMP 521
    pitch: "Code-as-explanation; runnable examples; test-driven framing."
```

This makes voice portable across Anna's three courses, testable (the audit's `QB9` checks drafted prose against this contract), and reusable (a future second instructor authors their own voice file once).

## What this design unlocks

1. **ASTR 201 migration as a real spec-driven exercise.** The Course Spec + ADR 0064's migration playbook give Anna a concrete first artifact to author. The migration becomes more than file-format conversion: it captures pedagogical intent that was implicit before.
2. **COMP 521 greenfield with an AI co-author.** The same workflow generates a course from a blank repo via brainstorm conversation, voice transfer (anna-rosen with the `scientific_computing` register), and AI-assisted spec drafting.
3. **Quality as a first-class object.** Each chapter has a persisted, versioned audit report. Quality scores trend over revisions. The audit becomes a teaching tool — students can be shown how the chapter they read was checked.
4. **Sophie as the third option.** spec-kit + autospec serve software development. Sophie's spec-driven layer serves pedagogy. The architectural shape is the same; the audit and iterate stages are the pedagogy-specific differentiators.

## Open items (followup)

These came up during brainstorm but were deferred to keep the synthesis focused:

- **Constitution file shape edge cases.** What happens when two voice registers conflict? When `pedagogy.pattern` changes mid-course? When a course inherits another course's constitution?
- **Course-level concept throughline.** Anna's per-lecture readings carry a `Concept-Throughline:` field. The course-level analog (the through-line that connects all four modules) is not yet in the spec. Worth adding when the Module Spec format is designed.
- **Module sequence dependencies.** Currently implicit in `contributing_modules`. Could be explicit as a `requires:` field per module spec.
- **AI authoring context pack.** What exactly does `/sophie.implement` receive as context? The constitution alone? Plus the voice file? Plus the audit history? Worth specifying in the implementation plan.
- **Cross-course registries.** Equations and figures could be reused across Anna's courses (the inverse-square law appears in ASTR 201 and ASTR 101). A shared `voices/` already exists; should `equations/` be similar?

## Implementation sequencing proposal

This is a multi-PR sprint, not a single change. Suggested order:

1. **Schema first.** Author `@sophie/schemas/course-spec@0.1` (Zod) + `@sophie/schemas/voice-contract@0.1`. Validates the format without yet building tooling.
2. **Validator second.** `sophie validate course.sophie.yaml` reports schema violations. Doesn't do authoring or audit yet.
3. **Discovery third.** `sophie discover` walks the consumer repo, lists what the constitution's discovery rules would find. Surfaces gaps before any audit runs.
4. **Audit fourth.** `/sophie.audit` runs `required_quality_checks` against discovered artifacts. Produces persisted `audits/<path>.audit.yaml`. Validates the audit invariant pipeline.
5. **Iterate fifth.** `/sophie.iterate` takes an audit report + author redlines, produces v2. Validates the loop. Pairs with audit immediately.
6. **Implement sixth.** `/sophie.implement` drafts new MDX content from a task spec. The hardest stage; depends on AI context-pack design (open item above).
7. **Specify + Plan + Tasks last.** The "scope-down" stages between constitution and implement. Useful but not strictly required for v1 — Anna can author module/lesson specs by hand initially.
8. **Constitution stage last of the meta-stages.** `/sophie.constitution` automates the brainstorm we just did manually. Useful once the format is stable; not v1-critical.

This order builds Sophie's spec-driven layer outside-in: schema → validator → discovery → audit → iterate → implement → scope-down stages → constitution-from-conversation. Each stage delivers value independently.

## References

- Brainstorm conversation: `~/.claude/plans/you-re-starting-a-fresh-sorted-bengio.md`
- ASTR 201 source: `/Users/anna/Teaching/astr201-sp26/`
- spec-kit: <https://github.com/github/spec-kit>
- autospec: <https://github.com/ariel-frischer/autospec>
- Voice precedent: `~/.claude/skills/writing-science-voice/`
