---
title: "Paper #2 — Structural HITL model"
short_title: "Paper #2"
description: "Conceptual + methodological paper on AI-primary / instructor-supervised authoring as a generalizable model. Target Q1 2027."
tags: [strategy, papers, hitl, conceptual, ijaied]
---

# Paper #2 — Structural HITL model

## Working title

> **AI-primary, instructor-supervised: a structural human-in-the-loop
> model for educational content authoring**

## Target venues

- **Primary**: [International Journal of Artificial Intelligence in
  Education (IJAIED)](https://link.springer.com/journal/40593) —
  the canonical venue for AI-in-education conceptual work.
- **Alternate**: [AERA Open](https://www.aera.net/publications/journals/aera-open) —
  high-prestige education research venue, open access.
- **Stretch**: [Educational Researcher](https://journals.sagepub.com/home/edr) —
  AERA's flagship; very high prestige; longer review.

## Type

Conceptual + methodological paper. The contribution is the *model*:
the four AI roles (primary author, pedagogy expert, domain expert,
brainstorming partner) plus structural HITL as a generalizable
architecture for AI-augmented educational content authoring beyond
Sophie itself.

## Timing

- **Drafting**: January–February 2027.
- **Submission**: March 2027.
- **Decision**: IJAIED typically 6–9 months.

## Why this is the conceptual anchor

Paper #1 documents Sophie's specific architecture. Paper #2 abstracts
the *pattern* — structural HITL as a model that other AI-augmented
educational platforms could adopt. This is the higher-impact paper of
the two because the contribution generalizes beyond a single platform.

The conceptual contribution rests on:

- **Naming the model.** "Structural HITL" as distinct from
  "AI-assisted authoring" and from "AI-as-tutor" framings.
- **Decomposing the four AI roles** ([ADR 0030](../../decisions/0030-audience-and-ai-author-model.md))
  as a checklist for AI integration in educational platforms.
- **Articulating the supervision invariants** that preserve
  instructor authority while leveraging AI productivity.
- **Connecting to evidence-based pedagogy** — showing that the model
  is compatible with retrieval practice, spaced practice, confidence
  calibration, and other learning-science principles, by encoding
  them as schema primitives.

## Abstract sketch

> The arrival of LLM-class AI capability has reshaped the question of
> how educators author content. The field has polarized into two
> failing positions: ban AI authoring (which students circumvent) and
> embrace it uncritically (which propagates errors at scale). We
> propose a third position — **structural human-in-the-loop (HITL)
> authoring** — and articulate it as a generalizable model.
>
> In structural HITL, AI plays four distinct expert roles: primary
> author, pedagogy expert, domain expert, and design partner. The
> human instructor remains supervisor and final decider through
> mechanisms encoded in the authoring platform's architecture: schema
> validation, audit pipelines, contributor agreements, and visible
> revision history. We distinguish structural HITL from advisory
> HITL, in which AI use is at the educator's discretion without
> platform-level safeguards.
>
> We illustrate the model using Sophie, an open-source AI-coauthored
> textbook platform deployed in three undergraduate STEM courses at
> a Hispanic-Serving Institution. We argue that structural HITL is a
> necessary architectural commitment for educational platforms that
> integrate AI authoring at scale, and we offer a checklist for
> platform designers and program officers evaluating AI-in-education
> proposals.

## Paper outline

1. **Introduction** — the AI-in-education polarization; the
   structural-HITL gap; this paper's contribution.
2. **Three positions on AI in educational authoring** — ban,
   embrace, structural HITL.
3. **The four AI roles** — author / pedagogy / domain / partner;
   what each contributes and what each gets wrong without
   supervision.
4. **Supervision invariants** — schema validation, audit, license,
   contributor model, revision history. The platform-level
   mechanisms that distinguish structural from advisory HITL.
5. **Connection to evidence-based pedagogy** — how structural HITL
   accommodates retrieval, spacing, interleaving, confidence
   calibration, productive failure, dual coding, worked examples.
6. **Sophie as illustrative case** — brief; this paper *is not* a
   Sophie paper, it is a *model* paper using Sophie as illustration.
7. **A checklist for evaluating AI-in-education platforms** — the
   conceptual deliverable.
8. **Limitations and open questions** — what structural HITL does
   not solve.
9. **Conclusion** — forward agenda.

## Co-author considerations

This is the paper where a **DBER co-author adds real value.** The
checklist contribution benefits from validation by someone with
deeper pedagogy-research background than Anna currently has.

Plausible co-author candidates (in priority order):

1. **AAS-EPD community member** who works on astronomy DBER. Easier
   cold-introduction than non-astronomy DBER folks.
2. **SDSU CRMSE faculty member** if any work on AI-in-education.
3. **External DBER star** — Janelle Bailey, Edward Prather, or
   similar. Higher visibility but harder access.

Cold-email script: "I'm drafting a conceptual paper on a model I
call structural HITL for AI-augmented educational content authoring,
illustrated through Sophie. I'd like your read on the checklist
section before submission — would you be open to coauthoring or
reviewing?" Even a "reviewer" credit is useful; coauthor is better.

## Risks

- **Too speculative for IJAIED.** Mitigated by grounding heavily in
  Sophie's actual implementation and learning-science citations.
- **Insufficient empirical backing.** This is a conceptual paper;
  empirical work lives in Paper #3. Be clear about scope in
  introduction and abstract — and link forward to Paper #3.
- **Reviewers may not buy the four-role decomposition.** Defend by
  citing pedagogical literature on each role's domain (retrieval +
  pedagogy expert; domain knowledge representations + domain expert;
  Socratic dialogue + brainstorming partner; AI writing capabilities
  + primary author).

## See also

- [Papers overview](index.md) — full publication pipeline
- [ADR 0030 — Audience and AI author model](../../decisions/0030-audience-and-ai-author-model.md)
- [Pedagogical foundations](../../explanation/pedagogical-foundations.md)
- [Audit and AI authoring](../../explanation/audit-and-ai-authoring.md)
