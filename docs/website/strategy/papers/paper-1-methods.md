---
title: "Paper #1 — Methods / infrastructure"
short_title: "Paper #1"
description: "Methods/infrastructure paper on Sophie's schema-driven design for AI-coauthored interactive STEM content. Target Q4 2026."
tags: [strategy, papers, methods, joss, sophie]
---

# Paper #1 — Methods / infrastructure

:::{note} The committed paper
Paper #1 is the **only committed paper** in Sophie's publication
strategy. It implements
[ADR 0047](../../decisions/0047-empirical-validation-plan.md)'s
authoring-side empirical validation plan; target submission Q4 2026.
Other research threads — structural-HITL conceptual, HSI outcomes,
predict-then-run calibration — are documented as brainstorming at
[Future contributions](future-contributions.md), not committed papers.
:::

## Working title

> **Pedagogy-aware authoring: schema-driven design for AI-coauthored
> interactive STEM content**

## Target venues

- **Primary**: [Journal of Open Source Software (JOSS)](https://joss.theoj.org/) —
  short paper format (~1000 words), focused on software contribution,
  fast turnaround.
- **Alternate**: [Computers & Education](https://www.sciencedirect.com/journal/computers-and-education) —
  longer methods paper with explicit pedagogy motivation. Higher
  impact factor but slower review.
- **Stretch alternate**: [SoftwareX](https://www.sciencedirect.com/journal/softwarex) —
  Elsevier's scientific software venue; good fit for
  infrastructure-focused contribution.

The decision between JOSS and Computers & Education depends on what
the [DBER positioning conversation](../dber-positioning.md) reveals
about how each is weighted in SDSU astronomy tenure review. If JOSS
counts as a meaningful publication, lead there (fast turnaround,
focused contribution). If not, lead with Computers & Education.

## Type

Methods / infrastructure paper. The contribution is the *software
architecture*: Sophie's schema-driven design, pedagogy-primitive
component library, AI-authoring workflow, and AGPL governance.

## Timing

- **Drafting**: November–December 2026 (post-Sophie-v1-launch).
- **Submission**: January 2027.
- **Decision**: Q1–Q2 2027 (JOSS is fast; Computers & Education
  ~6 months).

## Why this is the easy first paper

Paper #1 is the easiest paper to write because **the work is
already done**:

- Sophie's [architecture explanation](../../explanation/architecture.md)
  is written.
- [50+ ADRs](../../decisions/template.md) document every load-bearing
  design decision.
- Phase 0 and v1 launches demonstrate the architecture working.

The writing task is mostly *condensation* — turning existing internal
docs into a focused publishable paper. Estimated drafting time:
30–40 hours over ~6 weeks, suitable for fall semester load.

## Abstract sketch

> Authoring interactive scientific textbook content at the speed AI
> now enables requires structural safeguards that vanilla AI assistants
> do not provide. We present Sophie, an open-source platform for
> AI-coauthored, instructor-supervised interactive STEM textbooks.
> Sophie's architecture is schema-driven: Zod-validated content
> schemas serve as the single source of truth from which TypeScript
> types, JSON Schema, audit rules, and renderer pipelines are derived.
> Pedagogy primitives — comprehension gates, confidence checks,
> predict-then-run interactions — are first-class schema entities
> rather than rendering conventions. An audit pipeline emits
> machine-readable prompts that drive AI-coauthoring loops while
> preserving instructor-as-final-decider supervision. We describe the
> platform's design, its deployment in three undergraduate STEM
> courses, and the governance pattern (AGPL + ADRs + contributor
> agreements) that supports long-term sustainability of the
> open-source infrastructure.

## Paper outline

1. **Introduction** — the AI-augmented authoring problem; the
   structural-HITL gap; Sophie's contribution.
2. **Architecture** — schema-as-source-of-truth; the audit pipeline;
   pedagogy primitives.
3. **Implementation** — package structure, Astro/MDX renderer,
   IndexedDB persistence, BroadcastChannel sync.
4. **Deployment** — ASTR 201 + COMP 521 v1 launch; usage data.
5. **Sustainability** — AGPL governance, ADR discipline, contributor
   model.
6. **Related work** — MyST/Quarto/Pressbooks; Jupyter Book; commercial
   AI tutors.
7. **Conclusion** — summary and forward agenda.

For JOSS, this collapses to ~1000 words emphasizing the software
contribution. For Computers & Education, it expands to ~6000 words
with deeper pedagogy motivation and a stronger related-work section.

## Co-author considerations

- **Solo-author is acceptable** for this paper. The contribution is
  Sophie's architecture, which Anna designed.
- **Acknowledgments** should credit any human contributors (TAs,
  reviewers of ADRs, students who used Phase 0).
- **AI authoring acknowledgment** — disclose that Sophie was
  developed with Claude Code as a coauthoring assistant per
  [ADR 0030](../../decisions/0030-audience-and-ai-author-model.md).
  Most venues now accept and even encourage transparent AI use
  disclosure.

## Risks

- **Too engineering-flavored for Computers & Education.** If C&E
  reviewers reject as insufficiently pedagogy-research-grounded,
  pivot to JOSS or SoftwareX.
- **Insufficient novelty for top-tier venues.** Mitigated by leading
  with the structural-HITL framing in introduction.
- **v1 launch slips past December 2026.** The paper drafting depends
  on v1 being live with usage data. If v1 launches in Q1 2027
  instead, push the paper to Q1 2027 submission and accept the slip.

## See also

- [Papers overview](index.md) — publication strategy
- [Future contributions](future-contributions.md) — uncommitted research threads
- [ADR 0047 — Empirical Validation Plan](../../decisions/0047-empirical-validation-plan.md) — what this paper implements
- [Architecture explanation](../../explanation/architecture.md) — what this paper distills
- [JOSS submission guide](https://joss.readthedocs.io/en/latest/submitting.html)
