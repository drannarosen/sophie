---
status: accepted
date: 2026-05-12
deciders: [anna]
supersedes: ~
superseded-by: ~
tags: [foundation, audience, authoring-model, ai-authoring]
---

# ADR 0030: Audience priority and AI-as-primary-author / instructor-as-supervisor

## Context

Through Phase 0 and 1, Sophie's audience and authoring model
remained implicit. The roadmap named AI authoring as a Phase 3
deliverable, framed as "AI-assisted authoring." The 2026-05-11/12
big-picture brainstorm
([overview.md §1–§2](../overview.md)) made this implicit
shape explicit and substantially stronger: Sophie is not "AI helps
the instructor"; Sophie is **AI is the primary author; instructor
is the supervisor and pedagogical expert**. Every downstream
schema, audit, template, doc, and skill choice depends on which
framing is correct.

## Decision

Sophie has **three audiences in priority order**, with a fourth
elevated to **first-class author**:

1. **Anna + her students** (Anna authors; students learn).
2. **Anna + future external instructors** (open-source from day
   one).
3. **AI as a first-class author**, with the instructor as
   supervisor and pedagogical expert.

The defining principle is: *the AI is the main writer; the
instructor is the supervisor.* Sophie ships the scaffolding for
the supervision workflow itself — brainstorming, planning,
drafting, auditing, iteration — so that an instructor can produce
high-quality scientific pedagogy at speeds and volumes a solo
human author cannot match.

## Rationale

- **The AI is the differentiator.** Quarto, MyST, Pressbooks all
  serve audiences 1 and 2; none treats AI as a first-class author.
  Treating AI as a peer-author is the categorical move that makes
  Sophie distinct.
- **Instructor expertise is load-bearing.** Unlike one-shot AI tools
  (e.g., ClassBuild) that apply pedagogy principles automatically
  from upfront preferences, Sophie surfaces pedagogy choices the
  instructor decides at every handoff. AI suggests; instructor
  decides; AI implements; instructor reviews. HITL is structural,
  not advisory.
- **All three audiences benefit simultaneously.** The same
  workflow scaffolding that makes Anna productive makes external
  instructors productive and makes AI authorship credible.

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
