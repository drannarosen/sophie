---
title: Accepted-pending-ADR features
short_title: Accepted features
description: Features committed to ship, awaiting their authoring ADR. Each entry must include a motivating use case, design sketch, estimated cost, and defended priority claim.
tags: [vision, features, accepted, adr, sophie-lds]
---

# Accepted-pending-ADR features

Features committed to ship. Each entry below has cleared the
[backlog](backlog.md) → accepted gate (see
[Transitions](../transitions/index.md) for criteria) and is awaiting
its authoring [ADR](../../decisions/).

When an entry's ADR is drafted, accepted, and (usually) placed on the
[roadmap](../../status/roadmap.md), the entry moves to *graduated*
status — a one-line pointer with a cross-link.

## Entry template

```markdown
## Feature name

**Motivating use case.** One concrete situation where this feature
matters. Real, not hypothetical.

**Design sketch.** A few sentences (not a full design doc) describing
how it would work. Enough that a fresh reader can imagine the shape.

**Estimated cost.** Schema additions / new components / extractor work
/ migration cost. Order of magnitude (hours / days / weeks).

**Priority claim.** Why this earns a slot ahead of other backlog items.
Cite the use case + leverage analysis.

**Open ADR question.** What architectural decision will the ADR make?
Frame the choice that needs to be settled.

**Status.** When did it move to accepted; when is the ADR target?
```

## Entries (initial seeds, to be filled out)

This section is currently empty. Initial candidates from the
[features index](index.md) that the 2026-05-14 brainstorm flagged for
fast-track:

- Teaching Decision Records (TDRs)
- Teaching Move Library
- AI Contribution Ledger + Pedagogy Contract
- MultiRep + Notation Registry + Representation Alignment Audit
  (paired)
- Misconception Graph + Intervention Library (extends PR-C4)

Each will be written up using the template above in subsequent
sessions. The TDR entry is the highest-priority first draft because
its mechanism is well-understood (mirrors ADRs) and its leverage as an
intellectual artifact is unusually high (tenure case + SoTL paper +
future-instructor onboarding all derive value).

## Graduated entries (links only)

Once an entry's ADR ships, the full content moves into the ADR; the
vision/features/ entry collapses to a one-line pointer.

*None yet.*

Future format:

```markdown
- **TDRs** → [ADR XXXX — Teaching Decision Records](../../decisions/XXXX-teaching-decision-records.md)
  ([roadmap](../../status/roadmap.md))
```
