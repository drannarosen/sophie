---
title: Pedagogy principles
short_title: Pedagogy
description: The teaching principles Sophie encodes — recognition-not-retention, misconceptions-as-content, predict-then-reveal, observable→model→inference, and the other commitments that shape every Sophie component.
tags: [vision, pedagogy, principles, teaching, learning-science]
---

# Pedagogy principles

The teaching principles Sophie encodes. Each principle is the *why*
behind one or more Sophie components — the answer to "why does this
component exist pedagogically?"

These principles stay in `vision/pedagogy/` as the **values**, even
after [ADRs](../../decisions/) derive from them. Principles are not
decisions; they're the substrate decisions are made against.

## Status

This section is *under construction*. Initial principles to be drafted
(one essay per file):

- **Recognition not retention** — Sophie's chapters are written for
  recognition under reading load, not memorization. Components like
  `<Aside kind="definition">` and `<GlossaryTerm>` exist to support
  the recognize-by-context pattern rather than the recall-the-list
  pattern.
- **Misconceptions as content** — student wrong models are
  *load-bearing curriculum*, not edge cases. Sophie's misconception
  components and (eventual) misconception graph treat them as primary,
  not decorative.
- **Predict-then-reveal** — productive cognitive conflict beats
  passive exposition. Sophie's `<Predict>` component and the
  "two-voice Socratic podcast" media variant both encode this move.
- **Observable → model → inference** — STEM reasoning has a canonical
  three-stage arc. Sophie's chapter scaffolding should make that arc
  legible.
- **Representation coherence** — STEM learning depends on connecting
  representations (prose, equation, plot, code, diagram, physical
  intuition). Disagreements between representations confuse students;
  Sophie's representation alignment audit catches them.
- **Instructor judgment is irreducible** — pedagogy choices (sequencing,
  emphasis, what to leave out) are the instructor's expertise. AI
  drafts; the instructor decides. Sophie's TDR pattern (when shipped)
  makes this expertise visible and transferable.

Each principle gets its own file once drafted. Cross-link generously
to [Design](../design/) (where the principle's visual/interaction
expression lives) and to [Decisions](../../decisions/) (where the
principle has been codified into platform commitments).
