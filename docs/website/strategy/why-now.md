---
title: Why now
short_title: Why now
description: The 2026 alignment narrative — why Sophie is timely, why no one else is doing it, and why this window won't stay open forever.
tags: [strategy, positioning, why-now]
---

# Why now

Sophie's timing is uniquely 2026. Three trend lines converged this
year that make the platform tractable, valuable, and urgent. Reviewers
ask "why now?" implicitly in every grant; this page is the answer.

## The three converging trends

### 1. LLMs crossed the content-authoring threshold

Between 2022 and 2025, large language models went from "novelty" to
"obviously load-bearing for content creation." By 2025, frontier
models could draft scientific prose, derive equations, generate
correct code, and produce pedagogically sensible explanations — with
errors, but errors that are *legibly correctable* by a domain expert.

The threshold matters: below it, AI-augmented authoring was a research
demo; above it, AI-augmented authoring is faster than unassisted
authoring for any expert who knows what they're doing. Sophie's
authoring model ([ADR 0030](../decisions/0030-audience-and-ai-author-model.md))
assumes 2025-and-later LLM capability. The same architecture would
have been premature in 2022.

### 2. OER infrastructure matured

MyST, Quarto, Jupyter Book, Pressbooks, Manifold, and OpenStax all
exist now as production-grade infrastructure for open educational
resources. Authoring a textbook in 2026 starts from a mature stack —
not a blank page.

This matters two ways: (a) Sophie can stand on the shoulders of these
projects rather than rebuilding rendering, citations, math, search,
deploy, and accessibility from scratch; and (b) the existence of these
tools demonstrates an addressable user base — thousands of instructors
already authoring OER, looking for better tools.

### 3. The education sector polarized into two failing reactions to AI

Higher education's responses to GenAI in 2023–2025 clustered into two
patterns:

- **Ban it.** Plagiarism detectors, AI-disabled exams, course
  policies that try to legislate AI out of student work. This fails
  because students use AI anyway and learn nothing about how to use
  it well.
- **Embrace it uncritically.** Instructors generate slop, students
  generate slop, nobody validates anything. This fails because
  AI-generated content without expert supervision is at best
  mediocre and at worst dangerous (factual errors propagate at
  scale).

A third path is needed: **structural human-in-the-loop**. AI does the
heavy lift; schema and audit enforce pedagogical correctness; the
instructor remains the final decider. As of 2026, almost no production
educational tools instantiate this third path as their core
architecture. Sophie does.

## Why no one else is building this

The closest projects in the space are:

- **MyST / ExecutableBooks** — building open scholarly publishing
  infrastructure; not opinionated about AI authoring or pedagogy
  primitives.
- **Quarto / Posit** — rendering infrastructure with commercial
  backing; not specifically educational or AI-authoring focused.
- **Pressbooks** — OER publishing platform; flat content, no
  interactive pedagogy layer.
- **Cengage MindTap / Top Hat / Pearson revel** — commercial AI
  tutors; closed, expensive, not OER-shaped.
- **OpenStax** — committee-authored static OER; no AI authoring, no
  interactive layer.

None of these are racing toward Sophie's shape. The closest is MyST,
which is excellent at scholarly publishing infrastructure but
deliberately stays out of the pedagogy-primitive and AI-authoring
opinions. Sophie picks up where MyST stops.

## Why this window won't stay open forever

Two clocks are running:

- **The AI-in-education attention window.** Funders (NSF, foundations)
  are actively shopping for credible "AI + education" proposals in
  2026. Within 2–3 years, either Sophie-shaped solutions become the
  default and the field commodifies, or the funder enthusiasm shifts
  to whatever's next. The 2026–2028 window is when "structural HITL
  for AI-authored OER" reads as fresh and important.
- **The pre-tenure CAREER window.** Anna is year 3 of pre-tenure. The
  NSF CAREER program is pre-tenure-only and is likely her single
  highest-leverage funding instrument. The 2026 and 2027 CAREER
  cycles are the realistic windows; 2028 may not be available
  depending on tenure clock and outcome. See
  [Funding roadmap](funding-roadmap.md) for details.

## What this means tactically

The "why now" lands in proposals as three claims:

1. **Capability**: 2025-and-later LLMs make the platform tractable.
2. **Demand**: OER infrastructure maturity demonstrates an addressable
   user base of instructors authoring open content.
3. **Gap**: The field has no production platform building structural
   HITL as its core architecture. Sophie occupies an open and timely
   position.

Use these three points in the introduction of any Sophie-adjacent
proposal. Cite this page as the canonical articulation.

## See also

- [Positioning](positioning.md) — pitches and differentiators
- [Audience and AI authoring model — ADR 0030](../decisions/0030-audience-and-ai-author-model.md)
- [Pedagogical foundations](../explanation/pedagogical-foundations.md)
- [Why not MyST for Sophie — explanation](../explanation/why-not-myst-for-sophie.md)
