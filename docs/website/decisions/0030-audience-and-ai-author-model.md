---
date: 2026-05-12
tags: [foundation, audience, authoring-model, ai-authoring]
---

# ADR 0030: Audience priority and AI-as-primary-author / instructor-as-supervisor

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Through Phase 0 and 1, Sophie's audience and authoring model
remained implicit. The roadmap named AI authoring as a Phase 3
deliverable, framed as "AI-assisted authoring." The 2026-05-11/12
big-picture brainstorm
([overview.md §1–§2](../overview.md)) made this implicit
shape explicit and substantially stronger: Sophie is not "AI helps
the instructor"; Sophie is **AI is the primary author and resident
expert; instructor is the supervisor and final decider**. Every
downstream schema, audit, template, doc, and skill choice depends
on which framing is correct.

## Decision

Sophie serves **two human audiences** in priority order, and is
**co-authored with AI** as a first-class partner — not a feature
or helper.

**Human audiences:**

1. **Anna + her students** (Anna authors; students learn).
2. **Anna + future external instructors** (open-source from day
   one).

**The AI is Sophie's co-author and resident expert,** not a third
audience. The defining principle is: *the AI is the primary
writer; the instructor is the supervisor and final decider.*
Sophie ships the scaffolding for the supervision workflow itself
— brainstorming, planning, drafting, auditing, iteration — so
that an instructor can produce high-quality scientific pedagogy
at speeds and volumes a solo human author cannot match.

**The AI plays four load-bearing roles** in Sophie. The platform's
schema, audit, templates, skill ecosystem, and docs all exist to
make these roles effective:

1. **Primary author.** Writes chapter prose, fills templates,
   drafts examples, drafts equations, drafts code. The instructor
   does not write the first draft.
2. **STEM pedagogy expert.** Coaches the instructor on
   evidence-based pedagogy (retrieval practice, spaced practice,
   interleaving, elaboration, dual coding, concrete examples,
   metacognition, productive failure, worked examples with faded
   prompts, cognitive-load management). Recommends which Sophie
   components fit a given pedagogical goal; pushes back on
   choices that contradict the literature, with citations rather
   than assertions.
3. **Domain expert.** Carries deep STEM domain knowledge
   (astrophysics, computational science, the textbook's specific
   subject area) and produces correct, citation-ready content;
   the instructor verifies and corrects.
4. **Brainstorming partner and design-doc writer.** Drives
   Socratic brainstorming, synthesizes brainstorm answers into
   outlines and design docs, drafts plans for the instructor to
   refine, and produces the scaffolding (CourseSpec, module
   skeleton, learning-arc map, pedagogy-philosophy doc) that
   keeps subsequent authoring coherent.

The instructor remains the **supervisor, decider, and final
authority** at every handoff. The AI proposes; the instructor
decides; the AI implements; the instructor reviews. HITL is
**structural, not advisory** — chapters do not ship without
instructor review.

## Rationale

- **The AI is the differentiator.** Quarto, MyST, Pressbooks all
  serve audiences 1 and 2; none treats AI as a first-class
  co-author and resident expert. Treating AI as a peer-author
  is the categorical move that makes Sophie distinct.
- **Instructor expertise is load-bearing.** Unlike one-shot AI
  tools (e.g., ClassBuild) that apply pedagogy principles
  automatically from upfront preferences, Sophie surfaces
  pedagogy choices the instructor decides at every handoff. AI
  suggests; instructor decides; AI implements; instructor
  reviews.
- **The four AI roles compound.** A primary-author AI that is
  also a STEM pedagogy expert produces pedagogically-better
  prose than either role alone. Add domain expertise and the
  draft is closer to publishable; add brainstorming/design-doc
  capability and the instructor's expertise is amplified upstream
  of the draft, not just downstream. The four roles are the
  point.
- **Domain expertise scopes the platform.** Sophie targets STEM
  college + graduate-level pedagogy
  ([overview §7](../overview.md)). The AI's domain hat is what
  makes that scope tractable — an instructor can supervise
  ~10× the draft throughput in a domain the AI already knows,
  but loses that ratio in a domain where the instructor must
  re-teach the AI on every chapter.
- **All three groups benefit simultaneously.** The same workflow
  scaffolding that makes Anna productive makes external
  instructors productive and makes AI authorship credible to
  reviewers, tenure committees, and prospective adopters.

### AI-primary is structural, not optional

The cumulative authoring lift of Sophie's LDS foundation
(ADRs 0040–0046) is substantial: every chapter that takes the
contract seriously declares concepts in a Notation Registry,
paths through a Misconception Graph, structured AI-contribution
records, TDRs with typed evidence, equation biographies, and
optionally `<MultiRep>` alignments. A solo human author,
drafting prose first and retrofitting structure, would
experience this as overhead — too much scaffolding for the
chapter being written.

That lift is deliberate. Sophie's authoring model relocates
instructor labor *away from drafting prose* and *toward
pedagogical decision-making + verification.* The AI
primary-authors against the foundation contracts; the
instructor declares the pedagogical positions (concepts,
misconceptions, key equations, TDRs) and reviews AI-drafted
artifacts against them. The structured scaffolding is *what
the AI uses to draft well* and *what the instructor uses to
supervise efficiently.* Strip the scaffolding and you get
either AI drafts the instructor can't efficiently verify or
instructor labor that doesn't scale.

This framing — labor relocated, not added — surfaces in
public Ledger renders via
[ADR 0042](0042-pedagogy-contract-and-ai-contribution-ledger.md)'s
`ai_ledger.preamble` field. Sophie's contracts assume this
workflow; instructors choosing Sophie are choosing the
relocation. The contracts are AI-primary-friendly *because
that is the design*, not because it is the cheapest path.

The HITL mandate ([CLAUDE.md](../../../CLAUDE.md)) makes the
relocation defensible: AI proposes, instructor decides, AI
implements, instructor reviews. The scaffolding makes both
halves of the loop tractable.

## Alternatives considered

- **AI as helper (Phase 3 polish).** The original roadmap framing.
  Rejected: under-states the architectural commitment AI authorship
  requires — schema introspectability, audit-loop tightness,
  template fillability, skill-kit ecosystem.
- **AI-only (one-shot pipeline).** ClassBuild's model. Rejected:
  removes instructor expertise from the loop; produces pedagogy
  that obeys canned principles rather than instructor design
  choices.
- **Anna alone (selfish tool).** Rejected: open-source from day one
  is real per ADR 0001; AGPL choice in
  [ADR 0024](0024-license-agpl.md) presumes external adoption.

## Consequences

**Easier:**

- Schema, audit, and templates inherit a single coherent direction:
  AI-friendly + instructor-supervised.
- Future Sophie skills (chapter-brainstormer, chapter-planner,
  chapter-drafter, chapter-pedagogy-expert, etc.) compose into a
  kit, not a single black-box "draft this textbook" entry point.

**Harder:**

- Every PR must hold the line on "AI-as-author-friendly," even
  before the AI surface itself ships in Phase 3. Schema choices,
  audit shapes, template shapes, doc conventions cannot be
  AI-hostile.
- The AI authoring kit becomes a versioned product with its own
  release cadence (anticipated in [ADR 0033 pending] for plugin
  marketplace distribution).

**Triggers:**

- Sophie skill ecosystem (analogous to `superpowers:*`) — multiple
  specialized skills, not one monolithic skill.
- Evidence-based pedagogy as a first-class skill family —
  encoding interleaving, spacing, retrieval practice, elaboration,
  dual coding, concrete examples, metacognition, productive
  failure, worked-example fading, cognitive-load management.
- Multi-editor distribution via plugin marketplaces (Claude Code +
  Codex + Cursor + …) per the obra/superpowers model.
- Course-design as the workflow's starting state — instructor and
  AI co-design the whole pedagogical arc *before* any chapter
  exists.

## References

- [overview.md §1–§2](../overview.md) — full audience and
  authoring-model section.
- [overview.md §6](../overview.md) — Sophie vs ClassBuild
  positioning.
- [ADR 0001](0001-platform-not-monorepo.md) — open-source-shaped
  from day one.
- [ADR 0024](0024-license-agpl.md) — AGPL license presumes external
  adoption.
- [ADR 0042](0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `ai_ledger.preamble` carries the structural-labor framing
  into public Ledger renders.
