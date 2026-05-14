---
title: Feature aspirations
short_title: Features
description: Sophie's feature wishlist organized by status — speculative ideas, backlog candidates, accepted-pending-ADR commitments, and graduated features that have moved to decisions/ + roadmap.
tags: [vision, features, wishlist, staging-area, roadmap]
---

# Feature aspirations

The staging area for feature ideas Sophie might grow into. Every
entry has an explicit status; ideas flow from *speculative* →
*backlog* → *accepted-pending-ADR* → *graduated* (with the
corresponding [ADR](../../decisions/) and
[roadmap](../../status/roadmap.md) entry).

The lifecycle rules and graduation criteria are documented in
[Transitions](../transitions/index.md).

## The four statuses

| Status | What it means | What goes in | Files |
|---|---|---|---|
| **Speculative** | A blue-sky idea. We're considering whether it's worth pursuing. May never ship. | Anything plausible — quotes from conversations, research-paper-inspired ideas, "what if Sophie could…" thoughts | [`speculative.md`](speculative.md) |
| **Backlog** | An idea that has earned consideration. We've decided it *might* be worth shipping, but it's not committed. | Ideas with a clear motivating use case + at least a sketch of how they'd work + a sense of cost | [`backlog.md`](backlog.md) |
| **Accepted-pending-ADR** | A committed feature. We're going to ship it; an ADR is needed before implementation can begin. | Ideas with a use case, a design sketch, an estimated cost, and a defended priority claim | [`accepted.md`](accepted.md) |
| **Graduated** | An idea that has become an [ADR](../../decisions/) and (usually) a [roadmap](../../status/roadmap.md) entry. The vision/ entry becomes a pointer. | Pointer entries with one-sentence summaries + cross-link to the originating ADR | Linked from [`accepted.md`](accepted.md) |

## How an idea moves

```text
        speculative
            │
            │  earns a motivating use case + sketch + cost
            ▼
         backlog
            │
            │  earns a defended priority claim + design sketch
            ▼
   accepted-pending-ADR
            │
            │  ADR drafted, reviewed, accepted
            ▼
        graduated
            │
            │  may show up on the roadmap
            ▼
    (decisions/ + status/)
```

Demotion is possible: an *accepted-pending-ADR* item can move back to
*backlog* if it loses priority; a *backlog* item can move to
*speculative* if its use case evaporates. Movement is documented in
[Transitions](../transitions/index.md).

## First triage (2026-05-14)

13 seed aspirations from the 2026-05-14 vision-section brainstorm
(Anna + Claude + ChatGPT input) have been triaged:

- **5 entries** → [`accepted.md`](accepted.md):
  Teaching Decision Records, Teaching Move Library, AI Contribution
  Ledger + Pedagogy Contract, MultiRep + Notation Registry +
  Representation Alignment Audit, Misconception Graph + Intervention
  Library.
- **7 entries** → [`backlog.md`](backlog.md):
  Equation Biography, Approximation Honesty, Pedagogical Diff /
  Curriculum CI, Course Brain, Human Expertise Required gates,
  Multi-modal generation pipeline, Course as Research Object.
- **1 entry demoted** → [`speculative.md`](speculative.md):
  Pedagogy Notebooks (subsumed by Teaching Decision Records).

The 5 entries already in [`speculative.md`](speculative.md) stay where
they are.

Next graduation candidate is **Teaching Decision Records** (A1 in
accepted) — its ADR's open question is "where do TDRs live in the
docs site or in consumer repos?" Drafting that ADR is the next
substantive step.
