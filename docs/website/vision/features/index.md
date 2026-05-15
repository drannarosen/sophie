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

## Graduations (2026-05-14)

All five originally-accepted entries graduated on the same day as
the triage that promoted them. The staging-area model's first five
end-to-end tests: ideas moving from speculative → accepted →
graduated within one day. Subsequent accepted entries will promote
from the [backlog](backlog.md).

**A1 — Teaching Decision Records (TDRs)** ratified by
[ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
+ [TDR template](../../reference/tdr-template.md). The ADR locked
location (consumer repos, not platform docs), schema (ADR-shaped),
and numbering (folder-scoped 3-digit).

**A2 — Teaching Move Library** ratified by
[ADR 0041 — Teaching Move Library](../../decisions/0041-teaching-move-library.md)
+ [Teaching Move Library reference](../../reference/teaching-moves.md).
The ADR locked the hybrid taxonomy (literature-grounded canonical
names + practice glosses) and the centralized-TS-map binding
(`packages/components/src/pedagogy/move-index.ts`, populated in a
follow-up code PR). v1 ships 18 moves across 7 families.

**A3 — AI Contribution Ledger + Pedagogy Contract** ratified by
[ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)
+ [Pedagogy Contract schema](../../reference/pedagogy-contract-schema.md)
+ [AI Contribution schema](../../reference/ai-contribution-schema.md).
The ADR locked the placement of the per-course contract
(`pedagogy-contract.yaml` at the consumer repo root, parallel to ADR
0040's `teaching-decisions/`) and the three-tier `ai_contribution`
schema (required minimum + recommended `transparency_note` + optional
rich-ledger fields). Public-facing by default. Together with ADR 0040
and ADR 0041, this commit completes the **Sophie LDS conformance
triple** (TDRs + Teaching Moves + Pedagogy Contract & AI Ledger).

**A4 — MultiRep + Notation Registry + Representation Alignment Audit**
ratified by [ADR 0043 — Notation Registry + MultiRep + Representation Alignment Audit](../../decisions/0043-notation-registry-multirep-alignment-audit.md)
+ [Notation Registry schema](../../reference/notation-registry-schema.md)
+ [MultiRep component reference](../../reference/multirep-component.md).
The ADR locked the declarative-YAML registry shape (chapters audited
against the registry as external truth, not the reverse), the
children-mode `<MultiRep>` source pattern (parallel to PR-C4's LO
refactor), the eight v1 audit invariants (NR1–NR4 + MR1–MR4), and
opt-in via `pedagogy-contract.yaml.math_and_units_standards.notation_registry`
so non-STEM courses aren't forced into empty registries. First
STEM-specific consumer-repo contract; Sophie LDS conformance triple
(ADRs 0040/0041/0042) stays universal.

**A5 — Misconception Graph + Intervention Library** ratified by
[ADR 0044 — Misconception Graph + Intervention Library](../../decisions/0044-misconception-graph-and-intervention-library.md)
+ [Misconception graph schema](../../reference/misconception-graph-schema.md)
+ [Intervention Library reference](../../reference/intervention-library.md).
The ADR locked the hybrid graph topology (DAG for prerequisites,
loose links for siblings), the hybrid intervention reuse model (12
canonical interventions in a platform-level `intervention-index.ts`
mirroring `move-index.ts`; `type="custom"` for course-specific
bespoke), the distributive declaration shape (graph fields on the
existing PR-C4 `<Aside kind="misconception">` schema; no central
YAML), the nested children-mode `<Intervention>` component, and 6
new audit invariants (**MG1–MG3** for graph integrity + **I1–I3**
for intervention checks) extending PR-C4's M1–M2. Universal scope
across Sophie LDS courses.

The first-triage cohort is now fully graduated. Subsequent
graduations promote from the [backlog](backlog.md).
