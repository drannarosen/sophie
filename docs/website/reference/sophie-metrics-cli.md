---
title: sophie audit --metrics + sophie metrics history CLI reference
short_title: sophie metrics CLI
description: User-facing specification for the empirical-measurement CLI surface — `--metrics` flag and `metrics history` subcommand.
tags: [cli, reference, metrics, validation, sotl, sophie-lds]
---

# `sophie audit --metrics` + `sophie metrics history`

The empirical-measurement CLI surface for Sophie's LDS conformance
foundation. The underlying decision lives in
[ADR 0047](../decisions/0047-empirical-validation-plan.md); this
page pins the user-facing contract.

The two verbs are a paired surface:

- `sophie audit --metrics` — *snapshot* of structured-data metrics
  for the current working tree.
- `sophie metrics history` — *series* over committed snapshots.

Neither verb gates CI. They are emission surfaces, not invariants.

## `sophie audit --metrics`

### Synopsis

```text
sophie audit --metrics [--output=<path>] [--format=json|table]
```

Equivalent to `sophie audit` plus computation of the eight metrics
defined in ADR 0047. The audit's standard exit codes and report
remain unchanged; the metric artifact is an additional emission.

### Output

Default output path: `.sophie/metrics-<sha>.json` where `<sha>`
is the working tree's HEAD commit (or `WORK` if uncommitted
changes exist).

Override via `--output=<path>`.

### Schema

```json
{
  "$schema": "https://schemas.sophie.tools/metrics/v1.json",
  "sha": "a1b2c3d4e5f6g7h8",
  "computed_at": "2026-05-15T08:00:00Z",
  "course": "astr201",
  "semester": "fa26",
  "course_version": "astr201-fa26-v1.2.0",
  "metrics": {
    "M1_misconception_coverage": 0.83,
    "M2_tdr_provenance_rate": 0.71,
    "M3_audit_findings": {
      "errors": 0,
      "warnings": 12,
      "info": 47,
      "by_family": {
        "MG": {"errors": 0, "warnings": 2, "info": 5},
        "NR": {"errors": 0, "warnings": 1, "info": 8},
        "PC": {"errors": 0, "warnings": 0, "info": 1},
        "...": {}
      }
    },
    "M4_nr_coverage": 0.94,
    "M5_ai_contribution_depth": {
      "light": 3,
      "moderate": 18,
      "heavy": 9,
      "rewrite": 2
    },
    "M6_cross_chapter_graph_density": 8.4,
    "M7_diff_churn": 0,
    "M8_equation_biography_coverage": 0.42
  },
  "by_chapter": {
    "flux-luminosity-distance": {
      "M1_misconception_coverage": 1.0,
      "M2_tdr_provenance_rate": 1.0,
      "M3_audit_findings": {"errors": 0, "warnings": 2, "info": 4},
      "M4_nr_coverage": 1.0,
      "M5_ai_contribution_depth": "moderate",
      "M6_cross_chapter_graph_density": 11,
      "M7_diff_churn": 0,
      "M8_equation_biography_coverage": 0.67
    },
    "luminosity-distance": { /* ... */ }
  }
}
```

### Eight metrics — exact formulas

#### M1 — Misconception coverage ratio

```text
M1 = |{m ∈ misconceptions : ∃ <Intervention addresses=m> in chapters}|
     / |misconceptions|
```

Per ADR 0044 MG3. Course-level value is the ratio across all
declared misconceptions. Per-chapter value is the ratio within
that chapter's referenced misconceptions.

Range: 0.0 – 1.0. ADR 0047 names ≥0.8 as the "well-conformed"
threshold for paper #1.

#### M2 — TDR provenance rate

```text
M2 = |{c ∈ commits-touching-chapters : c has TDR-NNN reference}|
     / |commits-touching-chapters|
```

Commits "touch chapters" if they modify any path under
`src/content/textbook/` or `content/chapters/`. TDR references
recognized in:

- Commit message body (e.g., `Refs: TDR-14`).
- Commit trailer (`TDR: 14`).
- PR body annotation (per ADR 0045's intentional-change tagging).

Range: 0.0 – 1.0. No threshold attached in v1.

#### M3 — Audit findings

The current `sophie audit` finding counts by severity. The metric
artifact carries the full breakdown by invariant family (per the
families listed in `audit-and-ai-authoring.md` §1). No formula —
it's the audit summary.

#### M4 — Notation Registry coverage

```text
M4 = |{symbol ∈ <KeyEquation> math : symbol resolves in NR}|
     / |{symbol ∈ <KeyEquation> math : symbol is non-transient}|
```

Per ADR 0043 NR1. Symbols flagged `transient: true` are excluded
from the denominator (they are intentionally one-off, not
registry-tracked).

Range: 0.0 – 1.0. M4 = NULL if the course has not opted into the
Notation Registry (no `notation-registry.yaml`); this is
distinguished from M4 = 0.0 (registry exists but coverage is
zero).

#### M5 — AI contribution depth distribution

A histogram (not a scalar). Counts of chapters by
`ai_contribution.ai_workflow.edit_intensity` value:

```text
{ "light": N_l, "moderate": N_m, "heavy": N_h, "rewrite": N_r }
```

Per ADR 0042. Chapters lacking `ai_workflow` (older chapters
pre-hardening; non-AI-authored chapters) are excluded from the
denominator — the histogram represents AI-touched chapters only.

#### M6 — Cross-chapter graph density

```text
M6 = sum over chapters of (# resolved refs in chapter)
     / |chapters|
```

Refs counted: `<EqRef>`, `<MisconceptionRef>`, `<ChapterRef>`,
`<TDRRef>`, `<GlossaryTerm>`, `<FigureRef>`. Only refs that
resolve are counted (dangling refs are excluded; they are
already surfaced by audit invariants D5/E4/F2/etc.).

Range: 0.0 – unbounded. Higher = denser cross-references between
chapters.

#### M7 — Pedagogical-diff churn rate

```text
M7 = count of `sophie diff` change events
     between (start-of-semester tag) and (current HEAD)
     / |chapters|
```

Per-chapter version: count of change events targeting that
chapter. Course-level version is the sum normalized by chapter
count.

Requires a `<course>-<semester>-start` git tag to anchor the
"start of semester" baseline. If the tag is missing, M7 = NULL
(distinguished from M7 = 0.0).

#### M8 — Equation Biography coverage ratio

```text
M8 = |{eq ∈ <KeyEquation> : eq has ≥1 biography child}|
     / |<KeyEquation> instances|
```

Per ADR 0046. Biography children = `<Observable>`, `<Assumption>`,
`<Units>`, `<BreaksWhen>`, `<CommonMisuse>`.

Range: 0.0 – 1.0. M8 = NULL if the course has no `<KeyEquation>`
instances (distinguished from 0.0).

### Exit code

`sophie audit --metrics` has the same exit semantics as
`sophie audit`: 0 if no ERROR-level audit findings, 1 if any. The
metric artifact emits regardless of exit code.

## `sophie metrics history`

### Synopsis

```text
sophie metrics history [<since-ref>..<until-ref>] [options]
sophie metrics history --semester=<semester-id>
```

Aggregates committed `.sophie/metrics-*.json` files in the repo
into a time series. Each metric file is a point in the series; the
series is ordered by file's `computed_at` field.

### Arguments

#### `<since-ref>..<until-ref>` (optional)

Git ref range filtering which committed metric files to include.
Default: all committed metric files.

#### `--semester=<id>` (optional)

Resolves to the range
`<course>-<semester>-start`..`<course>-<semester>-end`, filtering
to one semester's worth of data.

### Options

#### `--format=json|table|csv` (default: `table`)

- `json` — full series as a JSON array of metric snapshots.
- `table` — pretty-printed terminal table; one row per snapshot,
  one column per metric.
- `csv` — paper-writing-friendly CSV; headers match the JSON
  schema field names.

#### `--metric=<id>` (optional, repeatable)

Filter to specific metrics. Default: all eight.

#### `--by-chapter` (optional)

Emit per-chapter rows rather than course-level rows. Each
chapter × snapshot is one row.

### Example: paper #1 data extraction

```bash
sophie metrics history --semester=astr201-fa26 \
    --metric=M1 --metric=M2 --metric=M3 --metric=M4 \
    --format=csv \
    --by-chapter \
    > paper-1-data.csv
```

Output (truncated):

```csv
sha,computed_at,chapter,M1_misconception_coverage,M2_tdr_provenance_rate,M3_errors,M3_warnings,M3_info,M4_nr_coverage
a1b2c3d,2026-08-15T08:00:00Z,flux-luminosity-distance,0.83,0.71,0,2,4,1.0
a1b2c3d,2026-08-15T08:00:00Z,luminosity-distance,0.91,0.85,0,1,3,1.0
[...]
```

### Exit codes

`0` — series emitted (may be empty if no committed metric files in
the range).

## Where the metric artifacts live

By convention:

- **Per-snapshot artifacts**: `.sophie/metrics-<sha>.json`.
- **Committed on `main`** by a GitHub Actions workflow (typical
  shape):

  ```yaml
  # .github/workflows/sophie-metrics.yml
  on:
    push:
      branches: [main]
  jobs:
    metrics:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - run: pnpm install --frozen-lockfile
        - run: pnpm sophie audit --metrics
        - uses: stefanzweifel/git-auto-commit-action@v5
          with:
            commit_message: "metrics: snapshot for ${{ github.sha }}"
            file_pattern: ".sophie/metrics-*.json"
  ```

- **Not committed on PRs**. PR builds may emit the artifact for
  PR-time inspection (CI logs) but should not commit it; only
  `main` merges produce committed artifacts.

This convention is per-consumer-course; the platform itself does
not enforce it.

## Stability commitments

ADR 0047 commits the following:

- **The eight metric IDs (M1–M8) are stable.** Future ADRs may
  add metrics (M9, M10, …); the existing IDs do not get
  redefined.
- **The JSON schema is versioned.** Future schema changes bump
  `$schema` URL minor; consumer paper-pipelines pin a version.
- **The IndexedDB persistence layer remains additive** under B9
  (Learning Telemetry), per ADR 0047's preservation commitment.
  Paper #2's outcome metrics will reference fields defined by
  B9 *in addition to* M1–M8, not in place of them.

## See also

- [ADR 0047 — Empirical Validation Plan](../decisions/0047-empirical-validation-plan.md)
- [ADR 0040 — Teaching Decision Records](../decisions/0040-teaching-decision-records.md)
  — TDR references that M2 counts.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md)
  — NR1 that M4 derives from.
- [ADR 0044 — Misconception Graph + Intervention Library](../decisions/0044-misconception-graph-and-intervention-library.md)
  — MG3 that M1 derives from.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](../decisions/0045-pedagogical-diff-curriculum-ci.md)
  — diff events that M7 counts.
- [ADR 0046 — Equation Biography](../decisions/0046-equation-biography.md)
  — biography children that M8 counts.
- [`vision/features/backlog.md`](../vision/features/backlog.md) —
  B9 Learning Telemetry (outcome metrics).
