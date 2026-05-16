---
title: Vision
short_title: Vision
description: Sophie's aspirational substrate — the pedagogy principles, design principles, and feature aspirations that drive future architectural decisions.
tags: [vision, aspirations, pedagogy, design, features, lds]
---

# Vision

Sophie's aspirational substrate — the *why* behind the *what* in
[Decisions](../decisions/), and the *where we're going* behind the
*where we are* in [Status](../status/).

This section captures four layers of forward-looking thinking:

- **[Pedagogy](pedagogy/index.md)** — the teaching principles Sophie
  encodes. *What kind of learning does Sophie want to make easier?*
- **[Design](design/index.md)** — the design principles Sophie
  follows. *What does Sophie feel like at its best?*
- **[Reasoning OS](reasoning-os/index.md)** — Sophie's STEM
  vertical specialization: how the platform encodes the epistemic
  structure of scientific reasoning. *What kind of platform does
  Sophie become when an LDS is optimized for science?*
- **[Features](features/index.md)** — the feature aspirations Sophie
  may grow into, tracked on a staging-area model. *What's coming, what
  might come, what we're still unsure about.*

The lifecycle rules — how an idea graduates from *speculative* to
*backlog* to *accepted-pending-ADR* to a real [decision](../decisions/)
on the [roadmap](../status/roadmap.md) — are documented in
[Transitions](transitions/index.md).

## The Sophie thesis

Three claims, each load-bearing:

> **Sophie makes AI useful for education without pretending educators are
> optional.**

> **Sophie turns curriculum into structured, auditable, AI-readable
> infrastructure.**

> **Sophie encodes the design choices that distinguish merely-functional
> curriculum from rigorous, misconception-aware, multimodal teaching —
> and makes those choices reviewable, transferable, and improvable.**

## Sophie as a Scientific Reasoning OS

Stacked on the LDS positioning below is a vertical specialization:
**Sophie is a Scientific Reasoning OS** — a platform whose component
contract, schema, and authoring model encode the epistemic structure
of scientific reasoning (Observable / Model / Inference / Assumption
/ Approximation / Uncertainty / Numerical / Misconception). The
eight-role taxonomy is locked by
[ADR 0058](../decisions/0058-epistemic-component-contract.md);
the [Reasoning-OS section](reasoning-os/index.md) walks the thesis
and its substrate (ADRs 0030, 0040–0046, 0058 — i.e., the foundation
tranche read as one general pattern rather than several pedagogy
features).

LDS is the *horizontal* claim (what Sophie does for any discipline);
Reasoning OS is the *vertical* claim (what an LDS becomes when
STEM-optimized). They layer rather than compete: the LDS positioning
below is unchanged.

## Sophie as a Learning Design System (LDS)

The shorthand we use for what Sophie aspires to be: a **Learning Design
System** — the design-system pattern applied to learning design.

Analogous to how *Design System* wasn't a category in 2010 and was a
recognized professional discipline by 2018, *Learning Design System*
isn't yet a productized category. Adjacent precedents exist: Carnegie
Mellon's Open Learning Initiative (OLI) since 2002 for learning-
engineering rigor; edX Studio for component-based course authoring;
Quarto / MyST / Jupyter Book for markdown-as-source courseware; OER
repositories for sharing + remix; backward-design pedagogy (Wiggins &
McTighe) for the methodology; CS50 / MIT-style course-as-repo for
git-versioned curriculum. **Sophie's claim is the unified substrate:**
all of these layers stacked on one open-source, AGPL-licensed,
schema-driven repo with audit invariants enforcing the relationships.

What an LDS does that an LMS doesn't:

- An **LMS** delivers content and tracks students.
- An **LXP** personalizes the learner experience.
- An **LDS** captures the *design choices* — pedagogical, structural,
  representational, accessibility, AI-provenance — that distinguish
  rigorous teaching from generic publishing, and makes those choices
  reviewable + forkable + improvable.

This section is the place where those design choices are articulated
*before* they become [ADRs](../decisions/) and *before* they become
[roadmap items](../status/roadmap.md).

## Audiences

This section serves at least four readers:

1. **Anna (today)** — the instructor authoring Sophie courses; treats
   this section as a working notebook for design intent.
2. **Anna (next semester)** — same instructor, returning to a decision
   six months later; uses this section as memory.
3. **Other instructors (post-launch)** — adopters who want to
   understand Sophie's pedagogical philosophy before forking or
   contributing.
4. **Learning-science researchers** — SoTL audience who want to
   understand Sophie as a reproducible curriculum-engineering artifact.

The writing voice should serve all four without pandering to any.
Honest, specific, defensible — not aspirational marketing copy.
