---
title: Pedagogical change taxonomy
short_title: Change taxonomy
description: >-
  The canonical two-axis taxonomy for `sophie diff` output — granularity ×
  severity, with per-component triggers and JSON schema.
tags:
  - reference
  - diff
  - audit
  - taxonomy
  - sophie-lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
status: accepted-design
---

# Pedagogical change taxonomy

This is the canonical specification of how `sophie diff`
categorizes pedagogical changes. Every diff item carries **two
orthogonal labels** — a *granularity* axis (what kind of change)
and a *severity* axis (how much human attention it needs). The
labels are independent: a structural change can be routine
(formatting a list item) or breaking (removing the last
`<EquationRef>` to an equation other chapters cite).

The authoring decision behind this taxonomy lives in
[ADR 0045](../decisions/0045-pedagogical-diff-curriculum-ci.md).
The CLI that emits items in this shape is specified in
[sophie-diff-cli.md](sophie-diff-cli.md).

## Severity-threshold reference table (hardened 2026-05-14)

The canonical rule reference for classification. A CI integrator
reads this table; the per-axis prose sections expand each rule
with rationale.

| Granularity | Change kind | Default severity | Threshold rule |
|---|---|---|---|
| `structural` | `added` | `substantive` | always (unless routine exception below) |
| `structural` | `added` | `routine` | trivial: empty container, no body, no anchor cross-refs |
| `structural` | `removed` | `substantive` | always |
| `semantic` | `body_changed` (prose) | `substantive` | word-delta ≥ 5% OR ≥ 1 paragraph rewritten |
| `semantic` | `body_changed` (prose) | `routine` | word-delta < 5% AND only whitespace / punctuation / typo fixes |
| `semantic` | `body_changed` (equation) | `substantive` | equation body changed at all (equation changes are never routine) |
| `semantic` | `title_changed` | `substantive` | title is part of the chapter's semantic surface |
| `semantic` | `caption_changed` (figure) | `substantive` | caption changes affect reader interpretation |
| `relational` | `resolved` (new ref works) | `substantive` | new resolution adds curriculum coverage |
| `relational` | `broken` (existing ref fails) | `breaking` | always — broken refs are correctness failures |
| `relational` | `target_changed` | `substantive` | reference points at different target |
| `relational` | `list_changed` (prereqs, related) | `substantive` | misconception graph edges added/removed |
| `relational` | `prerequisite_cycle_introduced` | `breaking` | MG1 cycle is always breaking |
| `conformance` | `audit_warning_added` | `substantive` | when `level=WARNING` |
| `conformance` | `audit_warning_added` | `breaking` | when `level=ERROR` |
| `conformance` | `audit_warning_cleared` | `substantive` | clearing a warning is curriculum improvement |
| `conformance` | `audit_warning_level_changed` | `substantive` | escalation/de-escalation visible |
| `conformance` | `contract_field_changed` | `requires-judgment` | pedagogy-contract changes are instructor-judgment-load-bearing |
| (any) | (anchor in HEAD TDR `affects_anchors`) | **one-level demotion** | per ADR 0045: `breaking` → `substantive`; `substantive` → `routine`; `requires-judgment` → `routine`. Item tagged with source TDR-id. |
| (any) | (commit carries `TDR: <N>` trailer per ADR 0045 bidirectional traceability) | `commit_provenance` field surfaced | trailer presence does NOT demote severity (`affects_anchors:` is the demotion mechanism); trailer surfaces in the diff item's JSON metadata for M2 attribution + downstream analytics |
| `requires-judgment` trigger | (anchor is `lo-*` LO body) | `requires-judgment` | learning-objective bodies are instructor-judgment surfaces |
| `requires-judgment` trigger | (anchor is `def-*` definition body) | `requires-judgment` | definitions are foundational claims |
| `requires-judgment` trigger | (anchor is `ai_policy` in contract) | `requires-judgment` | course-wide AI-use policy |
| `requires-judgment` trigger | (anchor is `misconception.prerequisite_*` order) | `requires-judgment` | sequencing is pedagogically load-bearing per ADR 0044 MG2 |
| `requires-judgment` trigger | (`ai_contribution.instructor_reviewed.date` predates change) | `requires-judgment` | stale-review nudge per ADR 0042 hardening |
| `requires-judgment` trigger | (`ai_contribution` missing on changed chapter) | `requires-judgment` + `breaking` (AC1) | AC1 ERROR also fires |

The table is the **canonical rule reference**; the prose sections
below expand each rule with rationale. Adding a new component
type to `PedagogyIndex` requires adding rows here AND in
`@sophie/core/diff/classify.ts` (the latter is failure-mode-
tested per "Classification rules — coverage testing" below).

## Why two axes

A one-axis taxonomy fails one of two reviewer needs. Severity-
only loses structural detail: "3 substantive changes" doesn't tell
you whether those are 3 new misconceptions, 3 changed equations,
or one of each. Granularity-only loses attention-triage: a
30-item structural diff requires sequential reading to find the
one item that touches a learning-objective body. Two axes carry
both signals; the top-line summary uses severity counts, and
per-item detail surfaces both.

## Granularity axis

What *kind* of change happened to the PedagogyIndex.

### `structural`

A component instance was **added** or **removed** between base
and HEAD. The component is one of the source-of-truth pedagogy-
index contributors:

| Component | Source ADR | Triggers `structural` when |
|---|---|---|
| `<Aside kind="definition">` | [ADR 0038](../decisions/0038-pedagogy-index-pattern.md) | Added or removed |
| `<Aside kind="key-insight">` | ADR 0038 | Added or removed |
| `<Aside kind="misconception">` | [ADR 0044](../decisions/0044-misconception-graph-and-intervention-library.md) | Added or removed |
| `<Callout variant="key-insight">` | ADR 0038 | Added or removed (long-form) |
| `<Callout variant="misconception">` | ADR 0044 | Added or removed (long-form) |
| `<Figure>` | ADR 0038 | Added or removed |
| `<KeyEquation>` | ADR 0038 | Added or removed |
| `<LearningObjectives>` + `<Objective>` | ADR 0038 (PR-C4) | Added or removed |
| `<MultiRep>` + `<Rep*>` children | [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md) | Added or removed |
| `<Intervention>` | ADR 0044 | Added or removed |
| `<Predict>` / `<ConfidenceCheck>` / `<ComprehensionGate>` / etc. | Bucket-C interactive primitives | Added or removed |

`change_kind` field values: `"added"` | `"removed"`.

### `semantic`

A component instance **already exists in both base and HEAD**, but
its body or content has changed. Triggers:

| Trigger | Field surfaced |
|---|---|
| Definition body changed | `before_words`, `after_words`, optional `diff_summary` |
| Equation body (`$$...$$`) changed | `before_tex`, `after_tex` |
| Misconception body text changed | `before_words`, `after_words` |
| Intervention body text changed | `before_words`, `after_words` |
| Learning-objective body changed | `before_text`, `after_text` |
| Figure caption changed | `before_caption`, `after_caption` |
| Aside `title` changed (with anchor stable) | `before_title`, `after_title` |
| `<Predict>` prompt text changed | `before_text`, `after_text` |

`change_kind` field values: `"body_changed"` | `"title_changed"` |
`"caption_changed"`.

A change that *renames* a component's stable anchor surfaces as
two `structural` items (one `removed`, one `added`) — not as
`semantic`. This is the right shape: an anchor rename invalidates
cross-references, so it's structurally observable.

### `relational`

A cross-reference resolution changed. The component itself may not
have moved; what changed is what it points to or what points to
it. Triggers:

| Trigger | Field surfaced |
|---|---|
| `<EquationRef slug="X">` newly resolves / was newly broken / changed target | `before_target`, `after_target` |
| `<FigureRef name="X">` newly resolves / was newly broken / changed target | `before_target`, `after_target` |
| `<GlossaryTerm name="X">` newly resolves / was newly broken | `before_target`, `after_target` |
| `<ChapterRef slug="X">` newly resolves / was newly broken | `before_target`, `after_target` |
| Misconception `prerequisite_misconceptions` list changed | `before_prereqs`, `after_prereqs` |
| Misconception `related_misconceptions` list changed | `before_related`, `after_related` |
| `<Intervention addresses="X">` target changed | `before_addresses`, `after_addresses` |
| `<MultiRep>` `<RepEquation refKey>` / `<RepFigure refName>` / `<RepCode refName>` target changed | `before_ref`, `after_ref` |
| `<KeyEquation>` anchor reused by `<EquationRef>` from another chapter | reverse-reference change |

`change_kind` field values: `"resolved"` | `"broken"` |
`"target_changed"` | `"list_changed"`.

### `conformance`

The audit-warning set changed between base and HEAD. The diff
re-runs `runPedagogyAudit(index)` against both snapshots and
emits one `conformance` item per warning whose ID, level, or
target changed.

| Trigger | Field surfaced |
|---|---|
| New WARNING-tier audit invariant fires (NR/MR/MG/I/PC/AC/D/E/F/C/O/K family) | `invariant_id`, `level`, `target_anchor`, `message` |
| New ERROR-tier audit invariant fires | same fields |
| Previously-firing warning cleared | `invariant_id`, `level: "cleared"` |
| `pedagogy-contract.yaml` changed in a way that flips which invariants apply (e.g., `notation_registry: true → false`) | `field`, `before`, `after` |

`change_kind` field values: `"audit_warning_added"` |
`"audit_warning_cleared"` | `"audit_warning_level_changed"` |
`"contract_field_changed"`.

## Severity axis

How much human attention this item needs. *Derived* from the
change content via the classification rules below — not declared
by the author.

### `routine`

Pedagogically inert change. The reviewer skims past these; CI
ignores them. Triggers (any of):

- Whitespace-only change in a body.
- Punctuation-only change (smart quotes, em-dash, terminal
  period).
- Reordering of equivalent items (e.g., LO list reordered without
  text changes — though anchor order may carry pedagogical
  meaning per ADR 0044 MG2; see *Edge cases* below).
- Code-style change inside a `<CodeCell>` that does not affect
  execution behavior (whitespace, comment text).

Routine items are suppressed from the **text formatter by
default** (use `--include-routine` to show). Always present in
JSON output.

### `substantive`

Real pedagogical change. Triggers (any of):

- Any `structural` item not below the routine bar.
- Any `semantic` item whose body word delta is greater than 5%
  OR whose `<KeyEquation>` `$$...$$` block changed at all
  (equation changes are never routine).
- Any `relational` item where the new target resolves (vs the
  old, which also resolved).
- Any `conformance` item that adds or clears a WARNING-tier
  invariant.

### `breaking`

Reviewer attention required; CI fails (exit 1). Triggers (any of):

- Any `relational` item where a target newly *fails* to resolve
  (broken `<EquationRef>`, `<FigureRef>`, `<GlossaryTerm>`,
  `<ChapterRef>`, `prerequisite_misconceptions`, `concept_refs`).
- Any `conformance` item that adds an **ERROR-tier** audit
  warning (NR4, MG1, I2, etc.).
- Any `relational` change that introduces a cycle into
  `prerequisite_misconceptions` (detected by MG-family DAG
  check).
- Any `structural` removal of a component instance that is
  cross-referenced from another chapter (e.g., removing a
  definition that `<GlossaryTerm name="X">` resolves to elsewhere).
- `pedagogy-contract.yaml` missing or schema-invalid in HEAD
  (PC1 ERROR).

### `requires-judgment`

Surfaces a yellow flag in the summary; does *not* fail CI alone
(future B5 ADR may add a gate). Triggers (any of):

- Any `semantic` change whose subject is a **learning-objective
  body** (per ADR 0038 PR-C4 — LOs are pedagogically load-bearing;
  rewording one without instructor sign-off is a judgment
  decision).
- Any `semantic` change to a **definition body** (definitions are
  the chapter's foundational claims).
- Any `semantic` change to **`ai_policy`** in the pedagogy
  contract (course-wide AI-use policy).
- Any `conformance` `contract_field_changed` (the pedagogy
  contract is intentionally authored).
- Any `relational` change to misconception **prerequisite
  ordering** (sequencing is pedagogically load-bearing per
  ADR 0044 MG2).
- The chapter's **`ai_contribution.last_review_date` is earlier
  than the most recent change touching the chapter** (per
  ADR 0045 §Artifact 3, AI Ledger integration).
- The chapter's **`ai_contribution` block is missing** in a HEAD
  that contains at least one change (AC1 invariant overlap;
  shows up as both `conformance` ERROR *and* `requires-judgment`
  — the latter to flag for instructor judgment).

## Edge cases

### Anchor renames

A component whose stable anchor changes (e.g., `misc-3` → `misc-
flux-not-luminosity`) emits two `structural` items: a `removed`
of the old anchor and an `added` of the new one. This is correct
because the rename invalidates any external `<EqRef>` /
`<GlossaryTerm>` referring to the old anchor — which `relational`
items will surface independently. The reviewer sees both: "this
anchor went away" + "these references are now broken."

### LO list reordering

`<Objective>` order within `<LearningObjectives>` is
pedagogically meaningful (the LO order suggests chapter
narrative arc). A pure reorder with no text changes surfaces as
`structural` `substantive`, not `routine` — the reviewer should
see it.

### Equation `$$...$$` whitespace changes

KaTeX rendering is whitespace-insensitive in math mode. But
authoring intent matters: a reformat from `\frac{a}{b}` to `\frac{
a }{ b }` is `routine`; any change to operators, operands, or
notation is `substantive` at minimum. The classifier normalizes
whitespace before comparing equation bodies.

### Misconception `discipline_scope` change

A misconception declared `discipline_scope: ["astronomy"]` in
base, broadened to `["astronomy", "physics"]` in HEAD, is a
`semantic` `substantive` change. Narrowing scope (`["astronomy",
"physics"]` → `["astronomy"]`) is `substantive` AND, if any
chapter cross-references the misconception from outside the
narrowed scope, also `breaking`.

### Cross-chapter ripple

A change in `ch1` that breaks a `<GlossaryTerm name="X">` in
`ch7` emits the `relational` `breaking` item against **`ch7`**
(the consumer), not `ch1`. The diff is reviewer-oriented: where
does the breakage *manifest*?

## JSON schema (abbreviated)

The full Zod schema lives in `@sophie/core/diff/schema.ts` (post-
code-PR). Abbreviated TypeScript-style for reference:

```ts
type DiffOutput = {
  schema_version: "1";
  sophie_version: string;
  base_ref: string;
  head_ref: string;
  generated_at: string; // ISO 8601
  summary: {
    by_severity: { routine: number; substantive: number; breaking: number; "requires-judgment": number };
    by_granularity: { structural: number; semantic: number; relational: number; conformance: number };
  };
  items: DiffItem[];
};

type DiffItem =
  | StructuralItem
  | SemanticItem
  | RelationalItem
  | ConformanceItem;

type SeverityTag = "routine" | "substantive" | "breaking" | "requires-judgment";

type StructuralItem = {
  id: string;            // stable identifier: <chapter>/<anchor>
  granularity: "structural";
  severity: SeverityTag;
  change_kind: "added" | "removed";
  component: string;     // "Aside" | "KeyEquation" | "MultiRep" | "Intervention" | "Objective" | ...
  subtype?: string;      // "definition" | "key-insight" | "misconception" | "note" | ...
  chapter: string;
  anchor: string;        // canonical anchor (def-, eq-, ki-, fig-, misc-, dd-, omi-, ch-, lo-, rp-, sp-, sk-) per pedagogy-index.ts
  title?: string;
  preview?: string;      // 1-2 sentence excerpt
};

type SemanticItem = {
  id: string;
  granularity: "semantic";
  severity: SeverityTag;
  change_kind: "body_changed" | "title_changed" | "caption_changed";
  component: string;
  subtype?: string;
  chapter: string;
  anchor: string;
  title?: string;
  // payload depends on change_kind:
  body_diff?: { before_words: number; after_words: number };
  equation_diff?: { before_tex: string; after_tex: string };
  text_diff?: { before_text: string; after_text: string };
};

type RelationalItem = {
  id: string;
  granularity: "relational";
  severity: SeverityTag;
  change_kind: "resolved" | "broken" | "target_changed" | "list_changed";
  component: string;     // "EqRef" | "FigureRef" | "GlossaryTerm" | "ChapterRef" | ...
  chapter: string;
  anchor: string;
  before_target?: string;
  after_target?: string;
  before_prereqs?: string[];
  after_prereqs?: string[];
  before_addresses?: string;
  after_addresses?: string;
};

type ConformanceItem = {
  id: string;
  granularity: "conformance";
  severity: SeverityTag;
  change_kind: "audit_warning_added" | "audit_warning_cleared" | "audit_warning_level_changed" | "contract_field_changed";
  invariant_id?: string; // NR1 | MR2 | MG3 | I1 | PC1 | AC1 | ...
  level?: "INFO" | "WARNING" | "ERROR" | "cleared";
  target_anchor?: string;
  message?: string;
  chapter?: string;
  // for contract_field_changed:
  field?: string;
  before?: unknown;
  after?: unknown;
  // for ai_contribution integration:
  ai_contribution?: {
    drafted_by?: string;
    instructor_reviewed?: boolean;
    last_review_date?: string;
    transparency_note?: string;
  };
  trigger_reason?: string;
};
```

## Classification rules — coverage testing

A central goal of the taxonomy is **completeness**: every change
the `PedagogyIndex` can express maps to exactly one granularity
axis and a derivable severity. The post-code-PR test suite
guarantees this by:

- Enumerating every component type known to `PedagogyIndex`
  (sourced from the Zod schema in `@sophie/core/schema`).
- Asserting each has a classification entry in
  `@sophie/core/diff/classify.ts`.
- Failing the build if a new component type is added without a
  classification entry.

This is the moral equivalent of an audit invariant for the diff
itself (per ADR 0045 §Decision — "completeness tests ensuring
every known component type maps to taxonomy axes").

## References

- [ADR 0045 — Pedagogical Diff + Curriculum CI](../decisions/0045-pedagogical-diff-curriculum-ci.md) —
  the authoring decision; full rationale and alternatives
  considered.
- [sophie-diff-cli.md](sophie-diff-cli.md) — the user-facing CLI
  surface that emits items in this taxonomy.
- [ADR 0038 — Pedagogy-index pattern](../decisions/0038-pedagogy-index-pattern.md) —
  the `PedagogyIndex` shape that defines which components carry
  classification entries.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) —
  drives `requires-judgment` classification for ledger-staleness
  and contract changes.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md) —
  NR/MR invariants surface in the `conformance` granularity bucket.
- [ADR 0044 — Misconception Graph + Intervention Library](../decisions/0044-misconception-graph-and-intervention-library.md) —
  MG/I invariants surface in `conformance`; prerequisite-cycle
  detection drives `breaking` severity.
- [Chapter components reference](chapter-components.md) — the
  authoring surface whose changes feed this taxonomy.
