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

(a5-misconception-graph-and-intervention-library)=
## A5. Misconception Graph + Intervention Library — graduated 2026-05-14

**Graduated** → [ADR 0044 — Misconception Graph + Intervention Library](../../decisions/0044-misconception-graph-and-intervention-library.md)
+ [Misconception graph schema](../../reference/misconception-graph-schema.md)
+ [Intervention Library reference](../../reference/intervention-library.md).

The ADR resolved the *"graph topology"* open question (**hybrid**:
DAG for `prerequisite_misconceptions` — directional, cycle-detected
by audit invariant M5 — and loose `related_misconceptions` for
bidirectional siblings without ordering; parallels ADR 0043's
hybrid `common_confusions` + `related_concepts` modeling) and the
*"intervention reuse model"* sub-question (**hybrid**: 12 canonical
named interventions in a platform-level `intervention-index.ts`
mirroring ADR 0041's `move-index.ts`, plus `type="custom"` for
course-specific bespoke patterns; parallels ADR 0041's hybrid
taxonomy). Also resolved a third open question not in the original
framing: **distributively declared (no central YAML)** — graph
relations are new fields on the existing PR-C4 `<Aside
kind="misconception">` schema; the audit walks the existing
pedagogy index and reassembles the graph. `<Intervention>` nests
inside misconception Asides (children-mode source pattern). The
audit adds 6 new invariants (**MG1–MG3** for misconception-graph
integrity + **I1–I3** for intervention checks) extending PR-C4's
M1–M2.

All five originally-accepted entries now graduated. The
`accepted.md` section becomes a list of graduated pointers;
subsequent accepted entries promote from the backlog.

**Status.**
- 2026-05-14 — surfaced (speculative) during vision-section brainstorm
- 2026-05-14 — promoted to accepted-pending-ADR (triage)
- 2026-05-14 — graduated → [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)

---

(a6-pedagogical-diff-curriculum-ci)=
## A6. Pedagogical Diff / Curriculum CI — graduated 2026-05-14

**Graduated** → [ADR 0045 — Pedagogical Diff + Curriculum CI](../../decisions/0045-pedagogical-diff-curriculum-ci.md)
+ [`sophie diff` CLI reference](../../reference/sophie-diff-cli.md)
+ [Pedagogical change taxonomy](../../reference/pedagogical-change-taxonomy.md).

The ADR resolved six brainstorm open questions: (Q1) two-axis
taxonomy (granularity ∈ {`structural`, `semantic`, `relational`,
`conformance`} × severity ∈ {`routine`, `substantive`,
`breaking`, `requires-judgment`}) over a one-axis shape — both
reviewer-attention triage and structural detail are needed, and
two axes set up [B5](backlog.md#b5-human-expertise-required-gates)
cleanly. (Q2) Three output formats — text on TTY, JSON on pipe,
markdown via template — with smart default; PR comments and AI
Ledger paste-in get markdown day-one rather than waiting on a
downstream converter. (Q3) Worktree build + persisted
`dist/.sophie/pedagogy-index.json` artifact over a parallel
static-MDX extractor or cache-first scheme — diff and audit
must read the *same* index code path so they cannot disagree
about what the index contains; cache-first is deferred behind
the `--base-index` seam until measurable CI pressure justifies
the invalidation complexity. (Q4) Top-level peer
`sophie diff <ref>` over `sophie audit --diff` — `audit` answers
*"is this good?"* and `diff` answers *"what changed?"*; one verb
per question, mirroring `git diff`. (Q5) AI Ledger report-only
with staleness flagged as `requires-judgment` — the Ledger is
intentionally authored, the HITL mandate applies, write-through
is rejected even opt-in. (Q6) Textbook only in v1 — course-shell
audit invariants don't yet exist; shipping diff over unaudited
course-shell content would emit noise.

A6 is the **sixth graduation** through the staging-area
lifecycle and the **first ADR in the LDS series that adds a
tool over the foundation contracts** rather than a new contract
on content. Unlike A3/A4/A5, A6 does **not** ship a new audit-
invariant family — the diff's correctness is governed by Zod
schema validation, classifier-completeness tests against every
known component type, and CI consumption of the existing
NR/MR/MG/I/PC/AC/D/E/F/C/O/K invariants via the `conformance`
granularity axis. Together with A1+A2+A3+A4+A5, A6 closes the
v1 LDS-conformance-and-revision-discipline tranche: the
foundation declares contracts, audit checks single snapshots,
and diff polices changes across revisions.

**Status.**
- 2026-05-14 — surfaced (speculative) as B3 in [backlog.md](backlog.md)
- 2026-05-14 — brainstorm resolved 6 open questions; promoted
  to accepted-pending-ADR with defended priority claim
- 2026-05-14 — graduated → [ADR 0045](../../decisions/0045-pedagogical-diff-curriculum-ci.md)

---

## Graduated entries (links only)

Once an entry's ADR ships, this tail section keeps a complete
pointer-only index. The full A1–A5 entries above are retained
above as trace records of the open questions each ADR resolved; a
future tranche may collapse them to one-liners once the rationale
is no longer load-bearing for ongoing work.

- **A1 — Teaching Decision Records (TDRs)** → [ADR 0040 — Teaching Decision Records](../../decisions/0040-teaching-decision-records.md)
  + [TDR template](../../reference/tdr-template.md). Graduated 2026-05-14.
- **A2 — Teaching Move Library** → [ADR 0041 — Teaching Move Library](../../decisions/0041-teaching-move-library.md)
  + [Teaching Move Library reference](../../reference/teaching-moves.md). Graduated 2026-05-14.
- **A3 — Pedagogy Contract + AI Contribution Ledger** → [ADR 0042](../../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md)
  + [Pedagogy Contract schema](../../reference/pedagogy-contract-schema.md)
  + [AI Contribution schema](../../reference/ai-contribution-schema.md). Graduated 2026-05-14.
- **A4 — Notation Registry + MultiRep + Representation Alignment Audit** → [ADR 0043](../../decisions/0043-notation-registry-multirep-alignment-audit.md)
  + [Notation Registry schema](../../reference/notation-registry-schema.md)
  + [MultiRep component reference](../../reference/multirep-component.md). Graduated 2026-05-14.
- **A5 — Misconception Graph + Intervention Library** → [ADR 0044](../../decisions/0044-misconception-graph-and-intervention-library.md)
  + [Misconception graph schema](../../reference/misconception-graph-schema.md)
  + [Intervention Library reference](../../reference/intervention-library.md). Graduated 2026-05-14.
- **A6 — Pedagogical Diff / Curriculum CI** → [ADR 0045](../../decisions/0045-pedagogical-diff-curriculum-ci.md)
  + [`sophie diff` CLI reference](../../reference/sophie-diff-cli.md)
  + [Pedagogical change taxonomy](../../reference/pedagogical-change-taxonomy.md). Graduated 2026-05-14.
