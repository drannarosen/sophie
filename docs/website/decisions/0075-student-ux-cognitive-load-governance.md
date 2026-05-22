---
date: 2026-05-21T00:00:00.000Z
tags:
  - ux
  - pedagogy
  - cognitive-load
  - component-contract
  - design-principle
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0075: Student UX cognitive-load governance (progressive disclosure, one primary action per page)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0004](./0004-component-contract-revisions.md) (adds a
  UX-governance dimension to the component contract: every component
  declares its default reveal-state)

:::

## Context

Sophie's pedagogy component inventory is growing fast. Sprint K
shipped 0058's epistemic-role contract, 0059's linked-parameter
state, 0060's registry conventions, and 0063's `<OMIFlow>`. The
course-website roadmap (decisions 0065–0074, 2026-05-21) adds
~15 more components across Tier 1: `<RetrievalPrompt>`,
`<SpacedReview>`, `<WorkedExample>`, `<FadedPrompt>`,
`<InterleavedSet>`, evolved `<SkillReview>`, `<EquationSpecPage>`,
`<PythonCell>`, `<PlotlyChart>`, `<ParameterControl>`,
`<NumericalReadout>`, `<TableOutput>`, `<FigureSlot>`,
`<ComputeAssumption>`, plus the slide ↔ reading synchronized
split-screen primitives.

Each component is individually justified by pedagogy literature. The
risk is **pedagogical maximalism**: a chapter page that surfaces all
of them at once becomes cognitive-load chaos for the student —
retrieval prompts + skill reviews + equation specs + misconception
cards + concept maps + Pyodide demos + adaptive warnings, every one
"useful" in isolation but collectively overwhelming. The trap is
real and well-known in ed-tech: "if a component exists, every page
should use it" is how good learning platforms become bad ones. The
external review of the 2026-05-21 roadmap (ChatGPT) flagged this
explicitly as a top-tier risk: *"If every page has [all the
pedagogy], students may feel overwhelmed. You need a strong UX
principle: Sophie should reveal pedagogy at the moment of need, not
display all pedagogy all the time."*

The trigger for this ADR is the rapid component expansion. Without a
named governance principle, every future component PR can plausibly
default to "show prominently" and pages accrete chrome until the
primary learning action is buried. The principle exists informally
in Sophie's existing patterns (`<Aside>`, `<Spoiler>`,
sidebar-toggle, view-mode toggle) but has never been written down
as a contract that future component PRs must honor.

Cognitive load theory ([Sweller](https://en.wikipedia.org/wiki/Cognitive_load))
is the underlying evidence base: working memory is the bottleneck;
extraneous cognitive load (presentation chrome) crowds out germane
cognitive load (learning the actual content). This ADR operationalizes
that theory into a Sophie-specific governance contract.

## Decision

Every Sophie student-facing page is governed by three rules:

1. **Single primary learning action per page.** The page declares
   what the student is *doing* there (reading prose, working a
   worked example, attempting a practice problem, exploring a
   parameter sweep, etc.). All other content on the page is
   *secondary* by definition.

2. **Secondary pedagogy is collapsible, contextual, or sequenced
   by default.** Components that aren't the primary action default
   to a quiet reveal-state: collapsed (`<Aside>` / `<Spoiler>`),
   sidebar-toggle, hover-reveal, progressive-disclosure pattern,
   or "appears at scroll position X." Authors can override per-page
   when an exception is warranted, but the *default* is quiet.

3. **Pedagogy reveals at the moment of need.** Cross-references
   (`<EquationRef>`, `<MisconceptionRef>`, `<SkillReview>`) surface
   inline pop-out cards or sidebar drawers rather than expanding
   the main reading flow. Adaptive surfacing (BKT-driven
   `<SkillReview>` salience, FSRS-driven retrieval-prompt timing)
   pushes pedagogy *toward* the student at the right moment rather
   than letting the page show everything *to* them all the time.

### Per-page-type defaults

Each page-type ships with a baseline UX contract that components
inherit. Component authors can override per-instance but the page
type's default sets the "quiet baseline":

| Page type | Primary action | Default reveal-state for secondary |
| --- | --- | --- |
| **Reading** (`Artifact[type=reading]`) | Read the prose | Retrieval prompts collapsed under reveal triggers; equation specs as inline pop-outs; misconception cards in sidebar drawer |
| **Slide** (`Artifact[type=slides]`) | See the concept | Speaker notes off-screen (presenter mode only); FSRS-tracked Predict-Reveals as deliberate slide-step actions |
| **Worked example** (`Artifact[type=worked-example]`) | Follow the solution | Epistemic-role annotations as hover-reveal; "Why this step?" expansions as click-to-expand |
| **Practice / Faded** (`Artifact[type=practice]` / `<FadedPrompt>`) | Solve the problem | Hints behind progressive reveals; rubric collapsed until submission |
| **Lab notebook** (`Artifact[type=lab-notebook]`) | Manipulate the model | Output displays inline; `<ComputeAssumption>` annotations as hover-reveal; documentation in sidebar |
| **Library Spec page** (`<EquationSpecPage>` etc.) | Look up the concept | Cross-references as inline links to other Spec pages; biography sections collapsed-by-default below the primary card |
| **Schedule** | See what's next | Past items collapsed; FSRS-personal queue in collapsed sidebar |

### Author override + curriculum-CI

When a per-page-type default doesn't fit, authors override via
explicit component props (`<RetrievalPrompt prominence="primary" />`,
`<MisconceptionRef reveal="expanded" />`). Overrides are first-class
in the schema, not hacks. Curriculum-CI
([ADR 0045](./0045-pedagogical-diff-curriculum-ci.md)) audits the
overrides at build time:

- **WARN** when a page has > 1 component marked `prominence="primary"`
  (likely competing for the "primary action" slot)
- **WARN** when a Reading-type page has > 3 components expanded by
  default (likely cognitive-load creep)
- **INFO** with a per-page "reveal-state diff" so instructors can
  see what they're shipping vs. the page-type default

These are warnings (not errors) because pedagogical judgment
sometimes warrants the override. The build proceeds; the instructor
sees the audit finding in the Instructor room dashboard (Tier 3) or
in `sophie audit` output (Tier 1+2).

### Empirical link

This ADR is the *student-side* design principle that pairs with
[ADR 0074](./0074-instructor-authoring-cost-metric.md)'s
*instructor-side* metric. Both ADRs share the philosophy that
Sophie's success criteria must be measurable, not aspirational.
The student-side measurement layer (B9 Learning Telemetry, deferred
per ADR 0047) will eventually carry a UX-health metric — e.g.,
"time-on-page distribution" + "scroll-depth" + "expand-aside rate"
correlated with primary-action completion — that quantifies
whether progressive disclosure is actually working. Until B9 ships,
the design principle is enforced by code review + curriculum-CI
warnings.

## Rationale

The principle is right for Sophie specifically because:

1. **Sophie's component velocity is high.** Pedagogy components keep
   landing. Without a named governance principle, every new
   component PR's reviewer has to re-derive "should this be
   prominent or quiet?" from first principles. With this ADR, the
   default is "quiet; opt into prominent only when justified" and
   the burden of proof is on prominence, not on quietness.

2. **Sophie's per-page schema already supports this.** Every page
   has a typed `Artifact` ancestor; per-page-type defaults are
   declared once in the schema rather than re-implemented per
   component. The mechanism cost is low.

3. **The 8-role epistemic contract ([ADR 0058](./0058-epistemic-component-contract.md))
   doesn't constrain UX prominence.** A component can be
   role-correct *and* surface-overwhelming; this ADR closes that
   gap. The two contracts are orthogonal but both load-bearing.

4. **Tenure / research narrative defensibility.** "Sophie reveals
   pedagogy at the moment of need" is a research-grade design
   claim, not vibes. Cognitive load theory is the evidence base;
   B9 Learning Telemetry will eventually be the empirical validator;
   the curriculum-CI warnings + per-page-type defaults are the
   enforcement mechanism. The principle is auditable end-to-end.

5. **Avoids a real failure mode in similar platforms.** Ed-tech
   pages that try to "do everything" — every section has its own
   quiz / discussion / video / annotation / collaboration affordance
   — frequently end up doing nothing well. Naming the trap now
   gives Sophie permission to push back on its own complexity
   later.

## Alternatives considered

- **No formal principle; rely on case-by-case review.** Pros:
  zero ADR overhead; flexibility per component PR. Cons: the
  default in code review becomes "the author chose this prominence,
  who am I to argue"; chrome accretes silently; Sophie ends up at
  pedagogical maximalism by drift, not by decision. Rejected
  because the failure mode is real and asymmetric (adding chrome
  is easy; removing it from shipped chapters is hard).

- **Hard schema constraint (no `prominence="primary"` overrides
  ever).** Pros: maximum discipline. Cons: instructor pedagogical
  judgment is sometimes correctly "this retrieval prompt IS the
  primary action of this page"; outright disallowing it makes the
  contract too rigid. Rejected in favor of "default quiet + warn
  on overrides + allow override with curriculum-CI visibility."

- **UX-governance as an Astro-package convention rather than an
  ADR.** Pros: lighter weight; lives next to the components. Cons:
  course-website-level decisions belong in ADRs (per the ADR
  process); locking the principle at code-only level leaves it
  invisible to instructors / external reviewers / future
  collaborators. Rejected.

- **Defer until cognitive-load problems are observed in practice.**
  Pros: principle is data-driven. Cons: ADR 0074's authoring-cost
  measurements + Sprint K's component velocity say the chrome is
  arriving *now*; waiting to observe the problem means absorbing
  the cost of fixing it after-the-fact across many already-shipped
  pages. Rejected — cheaper to set the default before accretion
  starts than to retrofit after.

## Consequences

What this decision makes:

- **Easier**:
  - Future component PRs have a clear default: secondary, quiet,
    progressive. Authors don't re-derive the principle every time.
  - Page templates ship with sensible UX baselines; per-instance
    customization is opt-in, not opt-out.
  - Curriculum-CI catches drift toward maximalism early via WARN
    thresholds.
  - The student-facing claim "Sophie respects your attention" gains
    a concrete contract behind it.

- **Harder**:
  - Component authors lose the easy path of "just make it prominent;
    instructors can hide it later." They must defend prominence
    when they want it.
  - Page-type defaults need to be calibrated empirically over time;
    initial defaults will need refinement once B9 telemetry exists.
  - Some pedagogy literature *does* recommend high-visibility
    interventions (esp. misconception warnings); the contract
    must accommodate exceptions without becoming a swiss cheese.

- **Triggers**:
  - Update each pedagogy component PR landing post-this-ADR to
    declare its default `reveal-state` per the contract.
  - Add the WARN thresholds to curriculum-CI (`> 1 primary` /
    `> 3 expanded` per page) — small implementation; reads existing
    pedagogy index.
  - B9 Learning Telemetry sprint should include the UX-health
    metric (time-on-page + scroll-depth + expand-rate correlated
    with primary-action completion) as a headline measurement.
  - Reference this ADR in
    [course-website-roadmap.md § Student UX](../status/course-website-roadmap.md)
    (already linked from the design-principle section).

## References

- [ADR 0004 — Component Contract Revisions](./0004-component-contract-revisions.md) (UX-governance dimension added to the contract)
- [ADR 0045 — Pedagogical Diff / Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md) (curriculum-CI WARN thresholds extend its existing audit machinery)
- [ADR 0058 — Epistemic Component Contract](./0058-epistemic-component-contract.md) (orthogonal contract; both load-bearing)
- [ADR 0074 — Instructor authoring-cost SoTL metric](./0074-instructor-authoring-cost-metric.md) (paired with this ADR: student-side principle + instructor-side metric)
- [ADR 0047 — Empirical Validation Plan](./0047-empirical-validation-plan.md) (B9 Learning Telemetry is the future empirical validator)
- [course-website-roadmap.md § Student UX — progressive disclosure](../status/course-website-roadmap.md)
- **Sweller, J.** Cognitive Load Theory (foundational evidence base)
- **Mayer, R. E.** Multimedia learning principles (the
  coherence-principle + signaling-principle subsections in
  particular)
