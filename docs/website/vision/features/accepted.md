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
## A6. Pedagogical Diff / Curriculum CI

**Motivating use case.** When AI (or Anna) revises a chapter,
`git diff` shows text changes but not *pedagogical* changes. Did
this revision add or remove a `<Predict>`? Change a definition?
Break a cross-reference? Introduce a new misconception target?
Bump a learning objective body without bumping `last_review_date`
in the AI Contribution Ledger? Today: the reviewer compares
pre/post manually. The five graduated foundation ADRs each define
schemas and audit invariants (NR1–NR4, MR1–MR4, MG1–MG3, I1–I3,
PC1, AC1–AC2, plus the Bucket-C families D/E/F/C/O/K); without
a diff tool, those invariants only fire against a single snapshot.
**A6 makes the foundation observable across revisions.**

**Design sketch (refined from 2026-05-14 brainstorm).** Three
artifacts, no new audit invariant family. (Unlike A3/A4/A5, A6 is
a *tool over the existing contracts*, not a contract on content.)

1. **`sophie diff <ref>` CLI command** — top-level peer of
   `sophie audit` / `sophie build` / etc. (matches `git diff`
   mental model). Flags: `--format=text|json|markdown` (default
   `text` when stdout is a TTY, `json` when piped, modern CLI
   convention); `--base-index <path>` (skip worktree build if a
   pre-computed base index is passed in; future caching seam).
2. **Persisted index build artifact** — `sophie build` is amended
   to write `dist/.sophie/pedagogy-index.json` as a byproduct
   (the HEAD snapshot). `sophie diff` materializes the base ref
   via `git worktree add -d /tmp/sophie-diff-<sha> <ref>`, runs
   `sophie build` inside the worktree, reads the worktree's
   `pedagogy-index.json`, computes the diff, removes the
   worktree. *Why not a static MDX extractor?* — diff and audit
   must read the same index code path so they can't disagree
   about what the index contains. *Why not cache snapshots by
   SHA?* — Sophie has no production CI pressure yet; cache-
   invalidation complexity isn't worth it. Caching can land
   later through the `--base-index` seam without redesigning
   diff.
3. **Canonical pedagogical-change taxonomy** — Zod-schema'd
   structured type in `@sophie/core/diff`. **Two-axis**:
   - *Granularity*: `structural` (component instance added or
     removed) | `semantic` (body/content change to existing
     entry) | `relational` (cross-ref resolution changed) |
     `conformance` (audit-warning delta vs base).
   - *Severity*: `routine` (typo/format) | `substantive` (real
     pedagogical change) | `breaking` (broken refs, new ERROR-
     tier audit warnings) | `requires-judgment` (touches LO body,
     definition body, ai_policy, pedagogy-contract fields,
     misconception prerequisites, OR `ai_contribution.last_review_date`
     is older than the most recent change touching the chapter).
   Each diff item carries both labels; the top-line summary is
   severity-keyed ("3 substantive · 1 breaking · 1 requires-
   judgment").

**Scope (v1).** Textbook only (`src/content/textbook/`). Course-
shell changes are tracked by `git diff` like any other YAML/text;
course-shell audit + diff is a future ADR (likely paired with B5
or a dedicated "Course Shell Audit" ADR).

**AI Ledger integration (v1).** Notice + report staleness as
`requires-judgment`; **no writes** — the ledger is intentionally
authored, and auto-bumping defeats the audit-trail purpose. JSON
output includes the chapter's current `ai_contribution` block so
downstream tools can compute their own suggestions.

**Estimated cost.** ~2–3 days for the doc-only ADR + paired
references; ~1–1.5 weeks for the follow-up code PR (CLI
plumbing + Zod schema + worktree orchestration + three
formatters + classification rules + tests). Phase 3 dependency
(audit + AI authoring + first skill); lands in `@sophie/core/diff`
and `@sophie/cli`.

**Defended priority claim.** A3+A4+A5 ship schemas and audit
invariants on 2026-05-14. Without A6, those invariants only fire
against single snapshots — there is no routine signal when a PR
*introduces* a new MR2 WARNING or breaks a misconception
prerequisite. A6 is the keystone that converts the foundation
from "invariants Sophie checks at build time" into "invariants
Sophie polices across revisions." Promoting A6 ahead of B1
(Equation Biography) and B6 (Multi-modal generation pipeline)
because:
- B1 is an authoring affordance; useful but doesn't unlock the
  foundation invariants' CI value.
- B6 is bigger scope (6–10 weeks) and depends on a mature
  authoring loop that A6 helps establish.
- A6 has the smallest doc-only cost (~2–3 days, here) and the
  highest leverage over the foundation tranche.

**Framed ADR question.** *How is the pedagogical-change taxonomy
shaped, and what tool surface emits it?* Brainstorm resolved six
sub-questions: (Q1) two-axis taxonomy (granularity + severity);
(Q2) three output formats with smart TTY default; (Q3) worktree
build + persisted artifact + `--base-index` seam; (Q4) top-level
peer `sophie diff <ref>`; (Q5) AI Ledger report-only with
staleness flagged as `requires-judgment`; (Q6) textbook only in
v1.

**Status.**
- 2026-05-14 — surfaced (speculative) as B3 in [backlog.md](backlog.md)
- 2026-05-14 — brainstorm resolved 6 open questions; promoted
  to accepted-pending-ADR with defended priority claim

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
