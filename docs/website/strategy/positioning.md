---
title: Positioning
short_title: Positioning
description: Source-of-truth pitches and differentiators for Sophie — 1-sentence, 30-second, and reviewer-facing one-liners.
tags: [strategy, positioning, pitch]
---

# Positioning

Source-of-truth pitches and differentiators for Sophie. Copy these into
proposals, bios, conference intros, and reviewer-facing collateral.
Keep this page authoritative; if a better phrasing emerges in a
proposal, fold it back here.

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
the answers.

| vs. | Sophie's distinct contribution |
|-----|--------------------------------|
| **MyST / Quarto** | They are rendering infrastructure. Sophie adds pedagogy-primitive components, AI-author workflow, persistence, and audit on top. |
| **OpenStax** | Committee-authored static content. Sophie is instructor-authored, interactive, AI-augmented, and continuously revisable. |
| **ChatGPT-as-textbook-author** | No schema, no audit trail, no pedagogy primitives, no HITL structure. Sophie is what "use AI to write a textbook" should mean. |
| **Publisher AI tutors (Cengage, Pearson, Top Hat)** | Closed, proprietary, accountable to shareholders. Sophie is AGPL, accountable to instructors and students. |
| **Pressbooks** | OER hosting + flat content. Sophie targets the *interactive* layer: schema-validated components, persistent learner state, audit. |
| **Jupyter Book / JOSS-style infra** | General-purpose scholarly publishing. Sophie is opinionated about pedagogy and authoring workflow. |

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

## See also

- [Why now](why-now.md) — the 2026 alignment narrative
- [Audience and AI authoring model — ADR 0030](../decisions/0030-audience-and-ai-author-model.md)
- [Pedagogical foundations](../explanation/pedagogical-foundations.md) — the research literature Sophie operationalizes
- [Audit and AI authoring](../explanation/audit-and-ai-authoring.md) — how the platform enforces pedagogical correctness
