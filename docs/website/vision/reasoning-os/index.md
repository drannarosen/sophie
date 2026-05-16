---
title: Sophie as a Scientific Reasoning OS
short_title: Reasoning OS
description: Sophie's STEM vertical specialization — the platform's component contract, schema, and authoring model encode the epistemic structure of scientific reasoning.
tags: [vision, reasoning-os, pedagogy, epistemic, lds, thesis]
---

# Sophie as a Scientific Reasoning OS

Sophie's **vertical STEM specialization** of its horizontal
[Learning Design System positioning](../index.md). LDS describes what
Sophie does for *any* discipline. Reasoning OS describes what Sophie
becomes when an LDS is optimized for *scientific reasoning*: a
platform whose component contract, schema, and authoring model
encode the epistemic structure of how science actually works.

This page articulates the thesis. The
[contract that locks it](../../decisions/0058-epistemic-component-contract.md)
(ADR 0058) and the [eight-role grammar](./epistemic-grammar.md)
make the thesis enforceable rather than aspirational.

## The three claims

Three load-bearing claims, in order of architectural depth.

### 1. The component contract encodes epistemic role, not just pedagogy intent

The traditional contract for educational components is *what does
this component do pedagogically?* — explain a concept, prompt a
prediction, check comprehension. Sophie keeps that contract and adds
a second one: *what epistemic role does the content inside this
component play in the surrounding scientific argument?* The role is
one of eight: observable, model, inference, assumption, approximation,
uncertainty, numerical, or misconception. The taxonomy is locked in
[ADR 0058](../../decisions/0058-epistemic-component-contract.md);
the [grammar page](./epistemic-grammar.md) walks each role.

This is what distinguishes Sophie from interactives-as-content
platforms. A `<Predict>` widget on a competitor platform asks "what
will the student guess?" A Sophie `<Predict>` is *also* asking
"what observable are they predicting, against what model, under
what assumption?" The component contract makes the question
answerable in source, not just in the author's head.

### 2. The schema is the source of truth for reasoning structure

[ADR 0003](../../decisions/0003-zod-as-source-of-truth.md) made Zod
the schema source of truth for *content structure*. Reasoning-OS
extends that claim to *reasoning structure*. The misconception graph
([ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md))
is a schema'd DAG, not prose. Equation biographies
([ADR 0046](../../decisions/0046-equation-biography.md)) are
schema'd children with typed roles, not annotation in surrounding
prose. The pedagogy index
([ADR 0038](../../decisions/0038-pedagogy-index-pattern.md))
serializes the page's epistemic structure as a graph that audit,
diff, and AI authoring all read from.

A reader of a Sophie chapter sees prose, equations, figures.
A reader of the schema sees the *argument*: which claims are
observables, which are models, which inferences depend on which
assumptions, which misconceptions intersect which prerequisites.
Two views of the same chapter, one for humans and one for tools.

### 3. AI authoring operates on the epistemic graph, not just the prose

[ADR 0030](../../decisions/0030-audience-and-ai-author-model.md)
locked AI as Sophie's primary author with instructor supervision.
Reasoning-OS sharpens that claim: AI authoring targets the
*epistemic graph*, not the *prose surface*. A pedagogy-AI prompt
of *"propose three observables and one inference for this OMI
section"* is structurally different from *"propose three components
for this section"* — the first is role-aware, the second is type-
aware. Role-aware generation is what makes
misconception-targeted interventions, role-balanced OMI flows, and
assumption-aware approximations tractable. Without the role
vocabulary, AI authoring is reduced to component-shape generation.

## Why this matters for STEM

Students who cannot distinguish observable from inference cannot
do science. This is not a stylistic complaint — it's a measurable
[epistemic-cognition](../../explanation/pedagogical-foundations.md)
gap. Hofer + Pintrich and successors have documented for two
decades that the leap from *"the textbook says X is true"* to
*"here is the observable, here is the model, here is the inference
that connects them, and here is what changes if the assumption
fails"* is the single biggest predictor of expert-novice transfer
in STEM.

Most educational software encodes none of this distinction.
Equations float without observables. Models render as truth, not
construction. Uncertainty is a `±` ignored by every reader. Sophie
is not the first platform to notice the gap, but it is structured to
*fix* the gap in source: the epistemic role of every pedagogy
element on the page is declarable, schema-validated, audit-checked,
and AI-readable.

## What's locked

Reasoning-OS is descriptive of decisions Sophie has already made,
not aspirational beyond them. The substrate:

- **[ADR 0030 — Audience + AI author model](../../decisions/0030-audience-and-ai-author-model.md)**
  — AI as primary author, instructor as supervisor. The four AI
  roles (author / pedagogy / domain / brainstorming) generate
  Sophie content under HITL review.
- **[ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)**
  — pedagogy decisions are audit-trailed in `teaching-decisions/`,
  the curriculum-side counterpart to ADRs.
- **[ADR 0041 — Teaching Move Library](../../decisions/0041-teaching-move-library.md)**
  — 18 named teaching moves across 7 families; components declare
  `pedagogy_intent` against the library.
- **[ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)**
  — courses declare their pedagogical commitments + AI contribution
  provenance at the repo root.
- **[ADR 0043 — Notation Registry + MultiRep](../../decisions/0043-notation-registry-multirep-alignment-audit.md)**
  — symbols and units are first-class registry entries; cross-
  representation coherence is audit-checked.
- **[ADR 0044 — Misconception Graph + Intervention Library](../../decisions/0044-misconception-graph-and-intervention-library.md)**
  — misconceptions are graph nodes with prerequisite / related
  edges; 12 canonical interventions in a platform-level library.
  Canonical role-`misconception` instance.
- **[ADR 0045 — Pedagogical Diff / Curriculum CI](../../decisions/0045-pedagogical-diff-curriculum-ci.md)**
  — `sophie diff` classifies changes across a two-axis taxonomy;
  reasoning-structure changes are first-class.
- **[ADR 0046 — Equation Biography](../../decisions/0046-equation-biography.md)**
  — `<Observable>`, `<Assumption>`, `<Units>`, `<BreaksWhen>`,
  `<CommonMisuse>` as children of `<KeyEquation>`. Canonical role-
  `observable` / `assumption` / `approximation` instances.
- **[ADR 0058 — Epistemic Component Contract](../../decisions/0058-epistemic-component-contract.md)**
  — the eight-role taxonomy that names what 0030/0040–0046 are
  collectively instances of.

Together these ADRs *are* the Reasoning OS in everything but name.
ADR 0058 supplies the name.

## What's next (C-tier)

Four components and one architectural primitive are accepted-
pending-ADR (per the [transitions lifecycle](../transitions/index.md))
and registered in [features/accepted.md](../features/accepted.md):

- **A8 — `<OMIFlow>`.** The canonical three-panel composite
  (observable / model / inference) that makes OMI framing visible
  on the page rather than only in the chapter discriminator.
- **A9 — `<AssumptionStack>`.** Togglable list of an analysis's
  assumptions with optional validity-domain marking and
  propagation to linked views.
- **A10 — `<UncertaintyLens>`.** Overlay that reveals posterior
  spread, error bars, or model degeneracies on any compatible
  figure.
- **A11 — Linked-representation state primitive.** Cross-component
  reactive cursor (architecturally distinct from
  [`useInteractive`](../../decisions/0007-persistence-indexeddb.md),
  which is per-component persistence). Enables one parameter
  cursor to co-vary multiple representations of the same physical
  system.

A8 is the first C-tier component scheduled to ship; it doubles as
the validation of ADR 0058's contract. A11 is the architectural
prerequisite for the interesting versions of A8–A10 (single
slider, multiple linked views) and is the one piece of C-tier
that requires its own ADR-shaped architectural decision.

## Relationship to Tufte

[Tufte](https://www.edwardtufte.com/) optimized *information
density and explanatory integrity* for the medium of static print
— careful layout, small multiples, sparklines, annotation density
that doesn't insult the reader. Sophie's medium is different
(reactive computation, schema-validated source, AI-authored draft,
linked views, executable figures), but the underlying principle
transfers: *the visual encoding should preserve the structure of
the argument it represents*.

Where Tufte ran into the limits of static print, Sophie's medium
runs into the opposite question: with reactivity, motion,
inference overlays, and AI generation available, what should be
encoded? The eight-role grammar is the answer for STEM. Each role
is a stable visual identity — color slot, motion language, edge
style — that survives across pages, components, and disciplines.
The reader learns the grammar once and reads every Sophie page
faster.

The Reasoning-OS thesis is not "Sophie is Tufte for the web."
It is "Sophie optimizes epistemic legibility for reactive
computation the way Tufte optimized information density for
static print." Same principle, different medium, different
output.

## Reading order

For a first pass:

1. [Epistemic grammar](./epistemic-grammar.md) — the eight roles
   in author-facing prose with current instances.
2. [Linked representations](./linked-representations.md) — the
   architectural principle for cross-component reactive state.
3. [ADR 0058](../../decisions/0058-epistemic-component-contract.md)
   — the contract.
4. [explanation/scientific-reasoning-os.md](../../explanation/scientific-reasoning-os.md)
   — when to declare a role; the implicit-role lookup table.

For an author already familiar with Sophie's component library,
the explanation page is the load-bearing read; this thesis page
is the *why* behind it.
