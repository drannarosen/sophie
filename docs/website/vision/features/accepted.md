---
title: Accepted-pending-ADR features
short_title: Accepted features
description: Features committed to ship, awaiting their authoring ADR. Each entry includes a motivating use case, design sketch, estimated cost, defended priority claim, and a framed open ADR question.
tags: [vision, features, accepted, adr, sophie-lds]
---

# Accepted-pending-ADR features

Features committed to ship. Each entry has cleared the
[backlog](backlog.md) → accepted gate (see
[Transitions](../transitions/index.md) for criteria) and is awaiting
its authoring [ADR](../../decisions/).

When an entry's ADR is drafted, accepted, and (usually) placed on the
[roadmap](../../status/roadmap.md), the entry moves to *graduated*
status — a one-line pointer with a cross-link.

(a1-teaching-decision-records-tdrs)=
## A1. Teaching Decision Records (TDRs) — graduated 2026-05-14

**Graduated** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
+ [TDR template](../../reference/tdr-template.md).

The ADR resolved the "where do TDRs live?" open question (option c —
in consumer repos, not platform docs), ratified the ADR-shaped
schema, and locked folder-scoped 3-digit numbering. TDRs are now a
first-class Sophie convention; consumer repos copy the template and
begin authoring `teaching-decisions/001-...md` entries.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0040](../../decisions/0040-teaching-decision-records.md)

---

(a2-teaching-move-library)=
## A2. Teaching Move Library — graduated 2026-05-14

**Graduated** → [ADR 0041 — Teaching Move Library](../../decisions/0041-teaching-move-library.md)
+ [Teaching Move Library reference](../../reference/teaching-moves.md).

The ADR resolved the "what's the canonical move taxonomy?" open
question (option c — hybrid: literature-grounded canonical names +
practice glosses) and the "where does `pedagogy_intent` live in code?"
sub-question (centralized TypeScript map at
`packages/components/src/pedagogy/move-index.ts`, populated in a
follow-up code PR). v1 ships 18 named moves across 7 families:
eliciting prior knowledge, confronting misconceptions, worked
examples + fading, representations + comparison, metacognition +
retrieval, diagnostics, and Sophie-native. The reference doc holds
the full library with citations.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0041](../../decisions/0041-teaching-move-library.md)

---

(a3-ai-contribution-ledger-and-pedagogy-contract)=
## A3. AI Contribution Ledger + Pedagogy Contract — graduated 2026-05-14

**Graduated** → [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)
+ [Pedagogy Contract schema](../../reference/pedagogy-contract-schema.md)
+ [AI Contribution schema](../../reference/ai-contribution-schema.md).

The ADR resolved the *"where does the per-course pedagogy contract
live?"* open question (top-level `pedagogy-contract.yaml` at the
consumer repo root, parallel to ADR 0040's `teaching-decisions/`
placement) and the *"what's the minimum required `ai_contribution`
schema?"* sub-question (three-tier shape: required fields —
`drafted_by`, `instructor_reviewed`, `last_review_date`; recommended
— `transparency_note`; optional — `brainstormed_by`, `reviewed_by`,
`instructor_decisions`). Public-facing by default. Together with ADR
0040 (TDRs) and ADR 0041 (Teaching Moves), this completes the
**Sophie LDS conformance triple**: a Sophie-LDS-compliant course
ships TDRs (curriculum audit trail) + Teaching Move references
(pedagogical vocabulary) + Pedagogy Contract & AI Ledger
(accountability layer).

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0042](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)

---

(a4-multirep-notation-registry-and-representation-alignment-audit)=
## A4. MultiRep + Notation Registry + Representation Alignment Audit — graduated 2026-05-14

**Graduated** → [ADR 0043 — Notation Registry + MultiRep + Representation Alignment Audit](../../decisions/0043-notation-registry-multirep-alignment-audit.md)
+ [Notation Registry schema](../../reference/notation-registry-schema.md)
+ [MultiRep component reference](../../reference/multirep-component.md).

The ADR resolved the *"schema shape for Notation Registry"* open
question (declarative YAML at the consumer repo root, parallel to
ADRs 0040 + 0042's repo-root placement; chapters are audited
*against* the registry as an external source of truth, not the
reverse) and the *"what audit invariants ship at v1?"* sub-question
(eight invariants: four NR-prefix on the registry / `<KeyEquation>`
relationship + four MR-prefix on the `<MultiRep>` binding integrity).
The three sub-features ship as one ADR because they're tightly
coupled — splitting would force forward-references that obscure
rationale. `<MultiRep>` uses the children-mode source pattern from
PR-C4's LearningObjectives refactor. The registry is **opt-in** via
`pedagogy-contract.yaml.math_and_units_standards.notation_registry`
so non-STEM courses (creative writing, intellectual history) aren't
forced into empty registries.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0043](../../decisions/0043-notation-registry-multirep-alignment-audit.md)

---

## A5. Misconception Graph + Intervention Library

**Motivating use case.** PR-C4 shipped a `misconceptions` collection
in the pedagogy index — each misconception has a name, a chapter
locator, and short/long content discriminator. But misconceptions
*relate*: "universe expands from a center" is a *prerequisite* to
"redshift is ordinary Doppler motion"; "brightness is intrinsic"
*relates to* "flux and luminosity are interchangeable." And
misconceptions have *reusable interventions*: contrasting cases,
Predict-then-reveal sequences, specific analogies. Today: each
chapter rediscovers these. Tomorrow: a graph + library makes them
queryable + reusable across courses.

**Design sketch.** Two paired sub-features: (1) **Misconception
Graph** — extend `MisconceptionEntry` schema with `related_concepts`,
`prerequisite_misconceptions`, `addressed_by` (chapter/component
FKs); (2) **Intervention Library** — reusable misconception →
intervention pairings (Predict + contrasting cases; analogy with
explicit limits; etc.) that any chapter can reference. The
PR-C4 audit pass extends with M3 (orphan misconception),
M4 (misconception addressed but no intervention paired), M5
(intervention used but no misconception cited).

**Estimated cost.** ~1 week. Schema extension on existing collection;
new lightweight intervention-library schema; audit invariant
additions.

**Priority claim.** Highest *curriculum-design distinctiveness*
leverage of any accepted item. Most courses track "what students
should know"; Sophie tracks "what wrong models students bring and
how the course transforms them." That's the deepest pedagogical
claim Sophie can make. Builds directly on PR-C4's shipped
misconceptions index; no greenfield work.

**Open ADR question.** *Graph topology — should misconception
prerequisites form a DAG (build-time audit catches cycles) or just
loose `related_to` links?* Plus: *intervention-library reuse model —
named interventions referenced by anchor (rigid), or per-chapter
inline interventions tagged with type (flexible)?*

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to accepted-pending-ADR
- ADR target: after A1 (TDRs)

---

## Graduated entries (links only)

Once an entry's ADR ships, the full content moves into the ADR; the
vision/features/ entry collapses to a one-line pointer.

- **A1 — Teaching Decision Records (TDRs)** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
  + [TDR template](../../reference/tdr-template.md). Graduated 2026-05-14.
