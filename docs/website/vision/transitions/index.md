---
title: Transitions and lifecycle
short_title: Transitions
description: How ideas graduate through vision/ — from speculative to backlog to accepted-pending-ADR to graduated (with their corresponding ADR + roadmap entry).
tags: [vision, lifecycle, governance, staging-area]
---

# Transitions and lifecycle

How ideas graduate through `vision/`. This file documents the
*rules*; the [features/](../features/) subsection contains the
*artifacts*.

## The lifecycle

```text
        speculative
            │
            │  Gate 1: motivating use case + sketch + cost
            ▼
         backlog
            │
            │  Gate 2: defended priority claim
            ▼
   accepted-pending-ADR
            │
            │  Gate 3: ADR drafted, reviewed, accepted
            ▼
        graduated
            │
            │  ADR is published; (usually) roadmap-entered
            ▼
    (decisions/ + status/)
```

Pedagogy and design *principles* (in [`vision/pedagogy/`](../pedagogy/)
and [`vision/design/`](../design/)) follow a separate lifecycle: they
stay in `vision/` as the values driving decisions, even after ADRs
codify their concrete expressions. Principles aren't graduated out;
they remain the aspirational substrate.

## Gate 1: speculative → backlog

A speculative idea earns promotion to backlog when it can show:

1. **Motivating use case.** One concrete situation — preferably with a
   real example from a real chapter or course — where this feature
   would matter. Hypothetical-only doesn't earn the move.
2. **Design sketch.** A few sentences describing how it would work.
   Enough that a fresh reader can imagine the shape; not a full design
   doc.
3. **Rough cost estimate.** Order of magnitude (hours / days / weeks).
   Surfacing dependencies on other features or platform work.

## Gate 2: backlog → accepted-pending-ADR

A backlog idea earns promotion to accepted when it can show:

1. **Defended priority claim.** Why does this earn a slot ahead of
   other backlog items? Cite the use case + leverage analysis. The
   claim should anticipate the question "what would we have to give
   up to ship this?"
2. **Open ADR question framed.** What architectural decision will the
   authoring ADR make? Frame the choice that needs to be settled.

## Gate 3: accepted-pending-ADR → graduated

A feature graduates when:

1. **The ADR is drafted, reviewed, and accepted.** Following the
   [ADR process](../../contributing/adr-process.md).
2. **Implementation is scheduled.** Either on the
   [roadmap](../../status/roadmap.md) or queued for a sprint.

At graduation, the full content moves into the ADR. The
[`vision/features/accepted.md`](../features/accepted.md) entry
collapses to a one-line pointer.

## Demotion

Demotion is allowed and normal:

- A *backlog* idea can move back to *speculative* if its motivating
  use case evaporates.
- An *accepted-pending-ADR* item can move back to *backlog* if it
  loses priority (something more important displaces it).

Demotions are documented inline in the entry's *Status* line. Don't
quietly disappear an idea; record why it moved.

## Recording transitions

Each entry in [features/](../features/) has a *Status* line. When the
entry moves, append a line documenting the move:

```markdown
**Status.**
- 2026-05-10 — surfaced (speculative)
- 2026-05-25 — promoted to backlog (motivated by ASTR 201 Module 3 authoring friction)
- 2026-06-10 — promoted to accepted-pending-ADR; ADR target: 2026-06-20
- 2026-06-22 — graduated → ADR 00NN — Feature name; roadmap Phase 4.
```

This makes the section's history legible — anyone can trace why an
idea moved between tiers, and when.

## Why this section exists

Most product roadmaps blur three different things:
- *Aspirations* (what the team hopes for)
- *Decisions* (what's locked)
- *Schedule* (when things ship)

Sophie's three layers split these explicitly: [`vision/`](../) holds
aspirations; [`decisions/`](../../decisions/) holds locked choices;
[`status/`](../../status/) holds schedule. The graduation lifecycle
documented above is the bridge — the explicit, traceable path from
*we wish for this* to *we've decided to do this* to *here's when it
ships*.
