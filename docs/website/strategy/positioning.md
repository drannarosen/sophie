---
title: Positioning
short_title: Positioning
description: Source-of-truth pitches and differentiators for Sophie — 1-sentence, 30-second, and reviewer-facing one-liners. Anchored in honest origin (teaching infrastructure that grew, not a research program in disguise).
tags: [strategy, positioning, pitch, origin, governance]
---

# Positioning

Source-of-truth pitches and differentiators for Sophie. Copy these into
proposals, bios, conference intros, and reviewer-facing collateral.
Keep this page authoritative; if a better phrasing emerges in a
proposal, fold it back here.

(origin-and-scope)=

## Origin and scope — honest framing

Sophie emerged from a working astrophysicist's teaching infrastructure
problem: across ASTR 201 (intro astrophysics), ASTR 101 (intro
astronomy), and COMP 521 (algorithms / data structures for non-CS
majors), Anna Rosen was building a fresh course website per course,
duplicating effort, and starting to rely on AI for chapter drafts
without a system to constrain or audit the AI's output. Sophie is
that system. The platform is teaching infrastructure first; the
research and grant story is a downstream consequence, not the driver.

This framing matters for proposal writing. Sophie's claims are
**stronger** when grounded as "infrastructure that emerged from
actual teaching practice" than as "a research program designed to
prove a thesis." Astrophysics remains Anna's primary research output
(observation, simulation, papers); Sophie supports the tenure case
through (a) demonstrated teaching effectiveness, (b) 1–2 SoTL papers
targeting JOSS + *Computers & Education* (see
[Paper #1](papers/paper-1-methods.md)), and (c) potential
infrastructure-grant alignment (Cottrell, Sloan, NSF IUSE). Sophie
is *not* a pivot to DBER as a primary research identity.

That makes the platform's positioning *more* credible, not less. A
working faculty member who built and ships teaching infrastructure
is a more believable steward than someone whose entire research
program depends on the platform succeeding.

## 1-sentence pitch

> Sophie is an open-source platform for AI-authored,
> instructor-supervised interactive science textbooks — AI plays four
> expert roles (primary author, pedagogy expert, domain expert, design
> partner), while the instructor remains the final decider on every
> page.

## 30-second elevator

> Large language models can now draft scientific content that is
> competitive with human writing, but uncritical use produces slop.
> Education's two dominant reactions — ban it or embrace it
> uncritically — both fail. Sophie is the third path: structured
> human-in-the-loop. AI does the heavy lift; schema-driven validation
> enforces pedagogical correctness; the instructor decides what ships.
> The platform encodes evidence-based pedagogy — retrieval practice,
> confidence calibration, predict-then-run — as authoring primitives,
> not afterthoughts. We're using it to ship two SDSU textbooks this
> fall; the architecture is general.

## Differentiator one-liners

When a reviewer or colleague asks "why not just use X?", these are
the answers. The [Landscape comparators page](landscape/comparators.md)
holds the longer, citation-backed versions; copy from there for any
proposal.

| vs. | Sophie's distinct contribution |
|-----|--------------------------------|
| **MyST / Quarto** | They are rendering infrastructure. Sophie adds pedagogy-primitive components, AI-author workflow, persistence, and audit on top. |
| **PreTeXt + PROSE Consortium** | PreTeXt has schema-driven publishing with native braille and a decade-plus track record. Sophie *adds* epistemic-role semantics, AI-authoring contract, and per-commit a11y enforcement; the two are additive, not competitive. |
| **OpenStax** | Committee-authored static content. Sophie is instructor-authored, interactive, AI-augmented, and continuously revisable. |
| **OLI Torus (CMU)** | Server-bound adaptive courseware. Sophie is file-based, git-versioned, static-site-publishable, with schema-driven pedagogy. Orthogonal, not competitive. |
| **Khanmigo / Cognii / Querium** | AI-as-tutor over fixed curriculum. Sophie is AI-as-author bound by schema. Different abstraction layer. |
| **ChatGPT-as-textbook-author** | No schema, no audit trail, no pedagogy primitives, no HITL structure. Sophie is what "use AI to write a textbook" should mean. |
| **Publisher AI tutors (Cengage, Pearson, Top Hat)** | Closed, proprietary, accountable to shareholders. Sophie is AGPL, accountable to instructors and students. |
| **Pressbooks** | OER hosting + flat content. Sophie targets the *interactive* layer: schema-validated components, persistent learner state, audit. |
| **Jupyter Book / JOSS-style infra** | General-purpose scholarly publishing. Sophie is opinionated about pedagogy and authoring workflow. |
| **Course-LMS integration (Canvas, Blackboard, Moodle)** | LMS plugins or manually-authored Markdown syllabi; per-course rebuild + sync required. Sophie ships schema-driven course-website chrome (`course.sophie.yaml` v0.2 — see [ADR 0080 Amendment 2](../decisions/0080-course-spec-format-v0-1.md#amendment-2-assessment-grade-weights-clean-break-course-info-projection-2026-05-26)) that auto-generates syllabus, schedule, instructor, policies, and accommodations pages from a single source. Lighter-weight than LMS plugins; more structured than plain-Markdown syllabi. iCal export + PDF generation on the same source roadmapped. |

## Sophie as a production implementation of Open Cognitive Graph

> The need to "externalize pedagogical structure in forms aligned
> with human educational reasoning" — making "the cognitive logic
> governing AI behaviour inspectable and revisable" — was recently
> articulated as the Open Cognitive Graph (OCG) framework
> ([Li et al., 2026](https://arxiv.org/abs/2602.16949)). Sophie
> operationalizes that argument in production: an MDX+Zod schema
> contract, an explicit misconception graph with bound canonical
> interventions, equation biographies that surface assumptions
> and common misconceptions per equation, a per-PR axe-core
> accessibility gate, and an AI authoring contract that constrains
> LLM emission to schema-valid structures. Where OCG names the
> theoretical requirement, Sophie tests whether such infrastructure
> is implementable by a working faculty member with existing
> teaching needs and bounded research time.

Use this paragraph (or a tighter version) in any proposal that
touches AI-in-education governance or schema-driven pedagogy. The
mapping between OCG's theoretical claims and Sophie's concrete
components lives in
[Academic prior art § 1](landscape/academic-prior-art.md).

## AGPL one-liner (for skeptical reviewers)

> AGPL-3.0 ensures Sophie cannot be enclosed as proprietary IP by any
> contributor or downstream user; the platform remains as freely
> modifiable for educators in 20 years as it is today.

See [AGPL rationale](agpl-rationale.md) for the full justification and
the (deferred) dual-licensing option.

## The four AI roles

When the pitch needs more detail on what "AI as primary author" means
operationally:

1. **Primary author** — writes prose, fills templates, drafts examples,
   equations, code. The instructor does not write the first draft.
2. **STEM pedagogy expert** — coaches on evidence-based pedagogy
   (retrieval, spaced, interleaved practice; elaboration; dual coding;
   productive failure; metacognition; worked examples with faded
   prompts; cognitive-load management). Pushes back on choices that
   contradict the literature, with citations.
3. **Domain expert** — carries deep STEM knowledge (astrophysics,
   computer science, the textbook subject). Produces correct,
   citation-ready content; the instructor verifies.
4. **Brainstorming partner + design-doc writer** — Socratic
   brainstorming, synthesis into outlines and design docs, plan
   drafting, course-design scaffolding (CourseSpec, module skeleton,
   learning-arc, pedagogy-philosophy doc).

The instructor remains supervisor at every handoff. HITL is
*structural*, not advisory — chapters do not ship without instructor
review. "The AI suggested it" is never a justification on its own;
citations are required for research claims.

Canonical reference:
[ADR 0030 — Audience and AI author model](../decisions/0030-audience-and-ai-author-model.md).

## What Sophie is *not*

To prevent misreading:

- **Not an "AI textbook generator."** Sophie is a platform for
  *structured* AI authoring with instructor supervision; it is not a
  vending machine that emits chapters.
- **Not a tutoring system.** Sophie produces textbook content; it
  does not replace human instructors or tutors.
- **Not a commercial product.** Sophie is AGPL OSS, AGPL-licensed
  platform code, CC BY content. Commercial paths are deferred to
  post-tenure (see [Commercialization](commercialization.md)).
- **Not a publisher.** Sophie produces course-author-owned content;
  authors retain copyright and license under CC BY (or whatever they
  choose).
- **Not a pivot to DBER as a primary research identity.** Anna's
  primary research output remains astrophysics. Sophie produces 1–2
  SoTL papers; it is not the platform on which her tenure case is
  built. See origin-and-scope above.

## Governance and longevity

Sophie's longevity story is intentionally minimal. The platform is
**AGPL-3.0 licensed**, runs from a public git repository
([drannarosen/sophie](https://github.com/drannarosen/sophie)), follows
documented ADR + TDR + validation-tracker discipline, and ships with
test coverage and CI gates sufficient that a determined contributor
can pick it up without privileged context. That is the longevity
story.

Concretely:

1. **Default:** AGPL + public repo + ADR discipline + clean
   documentation. This is sufficient for a teaching-infrastructure
   tool with an undergraduate-and-graduate-student-and-faculty user
   base.
2. **If a small infrastructure grant lands** (CZI EOSS, Sloan
   Technology, or NSF IUSE infrastructure track): apply for the
   institutional umbrella that the grant brings. Not pursued
   speculatively.
3. **If meaningful adoption happens outside SDSU**: revisit
   governance as a real question, not a hypothetical one. Until
   adoption exists, additional governance overhead is premature.

Sophie does **not** need a foundation, a consortium, or a co-PI to
exist and serve its purpose. The minimal-governance choice is a
deliberate scope-discipline move; ambitious governance only makes
sense if and when ambitious adoption arrives.

The fuller analysis lives in
[Risks and discipline § single-PI longevity](landscape/risks-and-discipline.md).

## See also

- [Why now](why-now.md) — the 2026 alignment narrative
- [Audience and AI authoring model — ADR 0030](../decisions/0030-audience-and-ai-author-model.md)
- [Pedagogical foundations](../explanation/pedagogical-foundations.md) — the research literature Sophie operationalizes
- [Audit and AI authoring](../explanation/audit-and-ai-authoring.md) — how the platform enforces pedagogical correctness
- [Landscape comparators](landscape/comparators.md) — citation-backed competitive landscape
- [Academic prior art § OCG](landscape/academic-prior-art.md) — the full mapping between OCG and Sophie
- [Risks and discipline](landscape/risks-and-discipline.md) — what to watch as Sophie evolves
