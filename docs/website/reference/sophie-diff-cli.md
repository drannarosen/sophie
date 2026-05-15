---
title: sophie diff CLI reference
short_title: sophie diff CLI
description: User-facing specification for `sophie diff <ref>` — flags, output formats, exit codes, and worked examples.
tags: [cli, reference, diff, audit, sophie-lds]
---

# `sophie diff` CLI

The `sophie diff <ref>` command compares the **pedagogical state**
of the current working tree (HEAD) against a git ref, emitting a
structured pedagogical-change set categorized by *granularity* and
*severity*. This page is the user-facing CLI contract. The
underlying decision and rationale live in
[ADR 0045](../decisions/0045-pedagogical-diff-curriculum-ci.md);
the taxonomy specification lives in
[pedagogical-change-taxonomy.md](pedagogical-change-taxonomy.md).

`sophie diff` is a top-level peer of `sophie audit` / `sophie
build` / `sophie validate` / `sophie fmt` / `sophie preview`,
matching the `git diff` mental model: one verb per question.
`sophie audit` answers *"is this good?"*; `sophie diff` answers
*"what changed?"*

## Synopsis

```text
sophie diff [<ref> | --semester=<id>] [options]
```

## Arguments

### `<ref>` (required unless `--semester` is given)

Any git ref valid for `git worktree add`: branch name (`main`),
short SHA (`a1b2c3d`), full SHA, tag (`v1.0.0`), or relative ref
(`HEAD~1`, `HEAD~5`).

The base ref is materialized in a temporary worktree
(`/tmp/sophie-diff-<sha>`) and built with `sophie build` to produce
the base `PedagogyIndex`. The worktree is removed on success or
failure.

### `--semester=<semester-id>` (alternative to `<ref>`, hardened 2026-05-14)

Semester-aware ref resolution. Resolves to a git tag following the
convention `<course>-<semester>-start` (e.g., `--semester=astr201-fa25`
resolves to tag `astr201-fa25-start`).

Examples:

```sh
sophie diff --semester=astr201-fa25       # "what changed since fa25?"
sophie diff --semester=astr201-sp26       # "what changed since sp26?"
```

If the matching tag doesn't exist, exits code 2 with a hint:

```text
No tag found for semester 'astr201-fa25'. Consider:
  git tag astr201-fa25-start <sha>
```

The convention is documented in ADR 0051 (Chapter Status + Course
Versioning). Consumer repos that follow it gain calendar-aware
diff ergonomics without manual ref-lookup. Note: this is a
*shortcut*, not a magic resolution — Sophie doesn't know what
"last semester" means calendrically; it knows the tag exists or
doesn't.

## Options

### `--format=<text|json|markdown>`

Output format. Default: `text` when stdout is a TTY, `json` when
stdout is piped (modern CLI convention).

- **`text`** — TTY-friendly. One-line summary at top, per-axis
  breakdown below. Color-coded by severity (matches `sophie audit`
  conventions). Designed for interactive review.
- **`json`** — Zod-schema-validated. Canonical machine-readable
  artifact. Includes diff metadata (`base_ref`, `head_ref`,
  `generated_at`, `sophie_version`) plus the current
  `ai_contribution` block per chapter (per ADR 0045 §Artifact 4).
  Downstream tools consume this.
- **`markdown`** — Mustache-style template over the JSON. Designed
  for GitHub PR comments and AI Contribution Ledger entries.
  Severity-keyed sections, collapsible per-item detail, anchor
  links into chapter routes.

### `--base-index=<path>`

Skip the worktree build; read the base `PedagogyIndex` from
`<path>` instead. Reserved for future cache-as-caller flows (CI
runners that already produced the base index in an earlier
pipeline step). The path must point to a Sophie-emitted
`pedagogy-index.json` matching the current schema version, or the
command exits with code 2.

### `--include-routine`

By default `routine` severity items (typos, formatting) are
suppressed from the text formatter to keep the summary
actionable. JSON output always includes them. This flag forces
text output to include routine items too.

### `-h, --help`

Print the help text and exit 0.

### `-V, --version`

Print the Sophie version and exit 0.

## Exit codes

| Code | Meaning |
|---|---|
| **0** | Diff completed; no `breaking`-severity items. |
| **1** | Diff completed; one or more `breaking`-severity items present (broken refs, new ERROR-tier audit warnings, prerequisite-cycle introduced). The command output still describes the full diff. |
| **2** | Diff could not run. Possible causes: `<ref>` does not exist; worktree creation failed; `sophie build` failed in the worktree; `--base-index` path is missing or schema-mismatched. The command output describes the failure. |

The exit-code semantics are designed for direct use in CI:

```sh
sophie diff $BASE_REF || exit 1   # fails if any breaking item
```

Severity counts (other than `breaking`) do not influence exit
code. `requires-judgment` items surface in the summary as a
*signal*, not a gate — gating on judgment items is a future ADR
(likely [B5 Human Expertise Required](../vision/features/backlog.md#b5-human-expertise-required-gates)).

## Output: text formatter

Example interactive run against the smoke chapter after editing
the *luminosity* definition body and adding one misconception:

```text
$ sophie diff main

Diff: HEAD vs main  (smoke / ch1)
─────────────────────────────────
  2 substantive  ·  0 breaking  ·  1 requires-judgment

Substantive
  + <Aside kind="misconception" title="luminosity-is-intrinsic">       structural
       "Students often think luminosity is a property of brightness..."
  ~ <Aside kind="definition" title="luminosity">                       semantic
       body changed (37 → 42 words)

Requires judgment
  ! ai_contribution.last_review_date: 2026-04-01 predates the most
       recent change touching ch1; consider re-reviewing and bumping.

Worktree: /tmp/sophie-diff-a1b2c3d (cleaned up)
Took 18s.
```

Glyph key:

- `+` added (structural)
- `−` removed (structural)
- `~` changed (semantic)
- `→` relational (cross-ref resolution changed)
- `*` conformance (audit-warning delta)
- `!` requires-judgment severity tag

Color: `breaking` red, `requires-judgment` yellow, `substantive`
cyan, `routine` dim. Glyphs render in monochrome for non-color
terminals.

## Output: JSON formatter

The canonical machine-readable shape. Schema specified in
[pedagogical-change-taxonomy.md](pedagogical-change-taxonomy.md);
abbreviated here:

```json
{
  "schema_version": "1",
  "sophie_version": "0.x.y",
  "base_ref": "main",
  "head_ref": "feat/expand-luminosity",
  "generated_at": "2026-05-14T18:30:00Z",
  "summary": {
    "by_severity": { "routine": 0, "substantive": 2, "breaking": 0, "requires-judgment": 1 },
    "by_granularity": { "structural": 1, "semantic": 1, "relational": 0, "conformance": 0 }
  },
  "items": [
    {
      "id": "ch1/misc-luminosity-is-intrinsic",
      "granularity": "structural",
      "severity": "substantive",
      "change_kind": "added",
      "component": "Aside",
      "subtype": "misconception",
      "chapter": "ch1",
      "anchor": "misc-luminosity-is-intrinsic",
      "title": "luminosity-is-intrinsic",
      "preview": "Students often think luminosity is a property..."
    },
    {
      "id": "ch1/def-luminosity",
      "granularity": "semantic",
      "severity": "substantive",
      "change_kind": "body_changed",
      "component": "Aside",
      "subtype": "definition",
      "chapter": "ch1",
      "anchor": "def-luminosity",
      "title": "luminosity",
      "body_diff": { "before_words": 37, "after_words": 42 }
    },
    {
      "id": "ch1/ai-contribution-stale",
      "granularity": "conformance",
      "severity": "requires-judgment",
      "change_kind": "ledger_stale",
      "chapter": "ch1",
      "ai_contribution": {
        "drafted_by": "claude-opus-4-7",
        "instructor_reviewed": true,
        "last_review_date": "2026-04-01"
      },
      "trigger_reason": "most_recent_chapter_change_postdates_last_review"
    }
  ]
}
```

## Output: markdown formatter

Designed for paste-in to GitHub PR comments and AI Contribution
Ledger entries. Abbreviated:

```markdown
### Pedagogical diff: HEAD vs `main` — `smoke/ch1`

**2 substantive  · 0 breaking  · 1 requires-judgment**

<details><summary>Substantive (2)</summary>

- **Added** `Aside kind="misconception" title="luminosity-is-intrinsic"` (structural).
  > Students often think luminosity is a property of brightness...
- **Changed** `Aside kind="definition" title="luminosity"` body (semantic). 37 → 42 words.

</details>

<details><summary>Requires judgment (1)</summary>

- `ai_contribution.last_review_date` for `ch1` is `2026-04-01`,
  predating the most recent change. Consider re-reviewing and bumping.

</details>

<sub>Generated by `sophie diff` v0.x.y at 2026-05-14T18:30:00Z.</sub>
```

## Worked examples

### Local review during AI-driven authoring

```sh
# AI just produced a chapter revision on the current branch
$ sophie diff main
# … review the structured diff; spot one breaking item
$ git diff packages/smoke/ch1
# … investigate the source change
$ sophie diff main --include-routine
# … include the 12 routine whitespace changes to confirm scope
```

### CI gate on breaking items (with --base-index optimization, hardened 2026-05-14)

The recommended v1 workflow uses `--base-index` to avoid per-PR
worktree-rebuild overhead. The base index is built once per PR
(against the PR's target branch), uploaded as an artifact, then
consumed by the diff job:

```yaml
# .github/workflows/pedagogical-diff.yml (consumer repo)
on: [pull_request]

jobs:
  build-base:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: ${{ github.base_ref }} }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec sophie build
      - uses: actions/upload-artifact@v4
        with:
          name: base-pedagogy-index
          path: dist/.sophie/pedagogy-index.json

  diff:
    needs: build-base
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: base-pedagogy-index
          path: /tmp/
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec sophie build
      - run: |
          pnpm exec sophie diff origin/${{ github.base_ref }} \
            --base-index /tmp/pedagogy-index.json
```

Job fails (exit 1) if any `breaking` items exist.
`requires-judgment` items surface in the log but don't fail the
job. Cache the base-index artifact between PR runs if the base
ref didn't change to avoid re-running `build-base`.

### Simpler CI workflow (slower, no optimization)

If the `--base-index` optimization isn't needed (small course,
infrequent PRs), the single-job form works:

```yaml
jobs:
  pedagogical-diff:
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec sophie diff origin/main
```

The diff command runs both builds internally (HEAD + worktree
at base); slower per-PR but simpler workflow.

### PR-comment integration

```sh
$ sophie diff origin/main --format=markdown > /tmp/diff.md
$ gh pr comment $PR_NUMBER --body-file /tmp/diff.md
```

The markdown formatter is designed for this paste-in pattern.

### Citing in a Teaching Decision Record

```sh
# Snapshot the diff at the time the TDR is written
$ sophie diff @{2.weeks.ago} --format=markdown >> \
    teaching-decisions/007-remove-three-misconceptions.md
```

TDRs (per [ADR 0040](../decisions/0040-teaching-decision-records.md))
benefit from concrete change sets attached as evidence of *what
specifically* was revised.

## Performance notes

The worktree build is the dominant cost. For Sophie-sized
courses (~14–18 chapters), a clean `sophie build` is typically
5–30 seconds; `sophie diff` end-to-end runs in 10–60 seconds.

The `--base-index` flag is the optimization seam: CI runners that
already built the base ref in an earlier pipeline step pass the
artifact in and skip the second build.

A future cache (per-SHA index snapshots in `.sophie/cache/`) is
admitted by the `--base-index` flag without changing the command
surface. Cache design is deferred until measured CI pressure
warrants it.

## References

- [ADR 0045 — Pedagogical Diff + Curriculum CI](../decisions/0045-pedagogical-diff-curriculum-ci.md) —
  the authoring decision; full rationale, alternatives, and
  consequences.
- [pedagogical-change-taxonomy.md](pedagogical-change-taxonomy.md) —
  full taxonomy specification: every change category, what
  triggers each, what fields the JSON surfaces.
- [ADR 0038 — Pedagogy-index pattern](../decisions/0038-pedagogy-index-pattern.md) —
  the `PedagogyIndex` accumulator model that `sophie diff`
  consumes via `dist/.sophie/pedagogy-index.json`.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) —
  the `ai_contribution` block feeds the `requires-judgment`
  classifier.
- [CLI reference](cli.md) — the full list of `sophie` subcommands.
