---
title: sophie refactor CLI reference
short_title: sophie refactor CLI
description: >-
  User-facing specification for `sophie refactor <entity> <op>` — subcommands,
  operations, dry-run defaults, atomic apply, TDR-seed generation.
tags:
  - cli
  - reference
  - refactor
  - lds
  - sophie-lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# `sophie refactor` CLI

The deterministic-refactoring verb family for Sophie's structured
LDS entities. The underlying decision lives in
[ADR 0049](../decisions/0049-sophie-refactor-cli.md); this page
pins the contract.

`sophie refactor` operates on slugged entities — misconceptions,
concepts, equations (and in future versions: interventions, TDRs)
— performing slug-level rename / split / merge / delete with
atomic apply, audit-revert-on-new-ERRORs, and auto-generated
TDR-seed stubs.

## Synopsis

```text
sophie refactor <entity-type> <operation> [args...] [--apply] [--mechanical] [options]
```

### Entity types (v1)

- `misconception` — operates on `misconception-graph.yaml` and
  `<MisconceptionRef>` / `<Intervention addresses=…>` /
  `prerequisite_misconceptions:` call sites.
- `concept` — operates on `notation-registry.yaml` and
  `<KeyEquation>` math / `<MultiRep refName=…>` /
  `<RepEquation>` / `equivalent_to:` call sites.
- `equation` — operates on `<KeyEquation id=…>` and `<EqRef
  slug=…>` / `<ChapterEquations>` / biography references.

### Operations

- `rename <old-slug> <new-slug>` — change a slug everywhere.
- `split <old-slug> <new-slug-a> <new-slug-b> [--map=<path>]` —
  replace one with two; consumer references reassigned
  interactively or via mapping file.
- `merge <slug-a> <slug-b> --into=<target-slug> [--surviving-body=<slug>]` —
  collapse two into one.
- `delete <slug> [--force]` — remove an entity; `--force`
  required if active references remain.

## Default behavior: dry-run

`sophie refactor <entity> <op> [args]` **without `--apply`** runs
in dry-run mode. The CLI:

1. Computes the change plan (every file + line that would be
   modified).
2. Computes the pre-refactor audit set.
3. Computes the post-refactor audit set (in-memory).
4. Emits a human-readable plan + audit-delta preview.

No files are written. No commits are created.

### Dry-run output

```text
$ sophie refactor misconception rename intensity-vs-luminosity flux-vs-luminosity

Dry run. No files changed. Pass --apply to execute.

Plan:
  1. misconception-graph.yaml: rename slug
     intensity-vs-luminosity → flux-vs-luminosity
  2. Update 3 prerequisite_misconceptions entries:
     - inverse-square-not-internalized.prerequisite_misconceptions[0]
     - chains-flux-with-luminosity.prerequisite_misconceptions[1]
     - distance-doubles-flux.prerequisite_misconceptions[0]
  3. Update 7 <MisconceptionRef> sites:
     - src/content/textbook/flux-luminosity-distance.mdx:42
     - src/content/textbook/flux-luminosity-distance.mdx:118
     - src/content/textbook/luminosity-distance.mdx:34
     - src/content/textbook/luminosity-distance.mdx:79
     - src/content/textbook/apparent-magnitude.mdx:55
     - src/content/textbook/apparent-magnitude.mdx:201
     - src/content/textbook/wien-revisit.mdx:33
  4. Update 4 <Intervention addresses=...> sites: [...]
  5. TDR seed: .sophie/refactor-seeds/2026-05-15-rename-misconception-intensity-vs-luminosity.md

Audit preview (against post-refactor state):
  ERRORS:    0 (no new errors)
  WARNINGS:  0 (no new warnings)
  INFO:      0

Pass `sophie refactor misconception rename intensity-vs-luminosity flux-vs-luminosity --apply` to execute.
```

## `--apply`: atomic execution

When `--apply` is passed:

1. **Plan computation** (same as dry-run).
2. **In-memory mutation** — files are NOT yet written to disk.
3. **Audit preview** against the in-memory state.
4. **Revert check** — if the audit produces any *new*
   ERROR-severity finding compared to pre-refactor:
   - Discard the in-memory mutation.
   - Print the new ERROR(s).
   - Exit with status 1.
   - **No files written. No commit created.**
5. **Disk write** — apply the in-memory mutation to the working
   tree.
6. **TDR-seed generation** — write the seed stub to
   `.sophie/refactor-seeds/<date>-<op>-<entity-type>-<slug>.md`.
7. **Git staging + commit** — stage the changed files plus the
   TDR seed, create a commit with the format below.
8. **Exit 0.**

### Apply commit message format

```text
refactor(<entity-type>): <op-summary>

Sophie refactor: <entity-type> <operation>
Mechanical changes:
  - N <something> updates
  - M <something else> updates
  ...

TDR seed: .sophie/refactor-seeds/<date>-<slug>.md
Author: resolve the seed then amend the TDR: trailer below.

TDR: pending-seed-<slug>
Co-authored-by: sophie-refactor <noreply@sophie.cli>
```

The `TDR:` trailer follows
[ADR 0045 §Bidirectional TDR ↔ commit traceability](../decisions/0045-pedagogical-diff-curriculum-ci.md).
The `pending-seed-<slug>` placeholder is the unresolved state;
the author amends it to either `TDR: <N>` (substantive — seed
promoted to a real TDR-N) or `TDR: none` (mechanical — seed
deleted).

The commit is created on the current branch; the author still
owns the commit and can amend, edit the TDR seed, resolve the
trailer, or split the commit before pushing.

### `--mechanical` flag (skip seed; emit `TDR: none` directly)

For refactors the author already knows are mechanical (typo
fixes, slug spelling corrections, name-only churn that doesn't
reflect a pedagogical position change), pass `--mechanical`:

```bash
sophie refactor misconception rename old-slug-typoo old-slug-typo --apply --mechanical
```

Behavior change vs. default `--apply`:

- **No TDR seed generated.** Nothing written to
  `.sophie/refactor-seeds/`.
- **Commit trailer is `TDR: none` directly** (not
  `pending-seed-<slug>`). No author follow-up needed for the
  trailer.
- Commit message body still surfaces the mechanical-changes
  list; only the trailer + seed path differ.

The flag is off by default. The expected substantive flow is to
let the CLI generate a seed and resolve it post-hoc; `--mechanical`
is the ergonomic escape hatch for batch operations where the
author already knows the seed would just be delete-this-stub
work.

## Atomicity guarantee

A `sophie refactor … --apply` either succeeds end-to-end or
leaves the working tree identical to its pre-`--apply` state.

There is no partial state. The atomicity is implemented by
**staging in-memory first**, **previewing the audit**, **then
writing**, rather than by writing-and-rolling-back. (Write-then-
revert would race with editor state and unmerged user changes.)

### What atomicity does NOT cover

- **Uncommitted user changes**. If you have uncommitted
  modifications to files the refactor would touch, the CLI
  refuses to proceed; commit or stash your work first.
- **Plugin-contributed entries**. A consumer course cannot
  refactor plugin entries (per ADR 0048's plugin-immutability
  guarantee from the consumer side). Use the override mechanism
  instead.
- **External cross-references** in non-Sophie-tracked files
  (e.g., a misconception slug referenced in a static markdown
  file outside `src/content/`). The CLI scans Sophie-tracked
  paths only; external references are the author's responsibility.

## Audit-revert-on-new-ERRORs

The single most load-bearing safety guarantee. Behavior:

- The CLI computes **pre-refactor** and **post-refactor** audit
  sets.
- The **delta** is the set of findings in post-only.
- If any delta finding is **ERROR** severity, the refactor is
  reverted (in-memory changes discarded, exit 1).
- WARNING and INFO deltas do not trigger revert; they are surfaced
  in the apply-log so the author can address them in a follow-up.

This matches existing `sophie audit` CI semantics: ERROR blocks,
WARNING is reviewable.

## TDR-seed stubs

Every `--apply` invocation emits a TDR-seed file:

```text
.sophie/refactor-seeds/<YYYY-MM-DD>-<op>-<entity-type>-<slug>.md
```

The stub contains:

- **Filled-in frontmatter** for the structural fields the CLI
  can determine deterministically: `title`, `date`, `scope`,
  `visibility: internal`, `affects_anchors` (the slugs the
  refactor touched), `affects_versions: []` (author to fill).
- **Empty `evidence_type:` and `evidence_strength:` fields** —
  the eight valid evidence-type values (per ADR 0040) are
  pedagogically distinct; the CLI cannot guess which applies.
  The seed includes comments listing all valid values for the
  author to pick from. A mechanical rename has no TDR at all
  (delete the seed); a substantive rename has an
  author-chosen evidence type.
- **Guidance block** (blockquote at the top of the seed):
  prompts the author to decide substantive-vs-mechanical, with
  explicit instructions for both paths.
- **Filled-in "What changed" section**: mechanical narrative
  derived from the refactor.
- **Empty "Why" section**: author to fill.
- **Empty "How to apply" section**: author to fill.
- **Empty "Evidence" section**: author to fill.
- **References section**: pointer to the refactor commit + relevant
  ADRs.

### Seed lifecycle

The seed is **staged with the refactor commit** at its
`.sophie/refactor-seeds/` path (so it travels through any
branch/PR flow with the refactor). The author resolves it
post-hoc.

Substantive workflow:

1. `sophie refactor misconception rename ... --apply` lands the
   refactor commit. Commit's `TDR:` trailer is
   `pending-seed-<slug>`; seed file is in
   `.sophie/refactor-seeds/`.
2. Author edits the seed: picks `evidence_type` and
   `evidence_strength`, completes Why / How / Evidence sections,
   sets `tdr_number` to the next sequential number.
3. Author moves the seed to its TDR home (`docs/decisions/tdrs/`
   or wherever the course stores TDRs).
4. Author commits the completed TDR.
5. Author **amends the refactor commit's `TDR:` trailer** from
   `TDR: pending-seed-<slug>` to `TDR: <N>` matching the new
   TDR's number.

Mechanical workflow (post-hoc decision):

1. `sophie refactor misconception rename ... --apply` lands the
   refactor commit as above.
2. Author decides the refactor doesn't warrant a TDR (typo fix,
   slug spelling correction, name-only churn).
3. Author deletes the `.sophie/refactor-seeds/<file>.md` stub.
4. Author **amends the refactor commit's `TDR:` trailer** to
   `TDR: none`.

Mechanical workflow (decided at refactor time): pass
`--mechanical` to `sophie refactor … --apply`. The CLI emits
`TDR: none` directly and skips seed generation; no follow-up
needed.

Refactors that genuinely *do not need a TDR* (mechanical slug
fixes, typo corrections) can have the seed deleted without
filling. Refactors that do need a TDR have the seed serve as the
unfilled-stub mechanism.

## Operation details

### `rename`

Unambiguous. Every reference to `<old-slug>` becomes a reference
to `<new-slug>`. No author input needed beyond the two args.

### `split <old> <new-a> <new-b>`

Interactive disambiguation by default:

```text
$ sophie refactor misconception split intensity-vs-luminosity \
    flux-doubles-misread inverse-square-not-internalized

Found 7 references to intensity-vs-luminosity. Re-assigning to either:
  a = flux-doubles-misread
  b = inverse-square-not-internalized

  1/7  flux-luminosity-distance.mdx:42  [a/b/skip] _
  ...
```

Non-interactive via `--map=mapping.yaml`:

```yaml
flux-luminosity-distance.mdx:42: a
flux-luminosity-distance.mdx:118: b
[...]
```

`skip` defers the reassignment — the reference keeps the old
slug, which becomes a dangling reference, which will surface as
an audit ERROR if the old slug is no longer declared. (The old
slug is removed from the catalog when split completes; "skip"
typically means the author wants to handle that reference
manually post-refactor.)

### `merge <slug-a> <slug-b> --into=<target>`

Every reference to `slug-a` or `slug-b` becomes a reference to
`target`. (Target may be one of the two source slugs or a new
slug.) The body that survives in the catalog:

- Default: `target`'s body if target is one of `slug-a` /
  `slug-b`; `slug-a`'s body otherwise.
- Override: `--surviving-body=<slug>` selects which source body
  survives.

### `delete <slug>`

Refuses to proceed if active references remain, unless `--force`
is passed. With `--force`, references become dangling and
surface as audit ERRORs (which trigger revert, so a `--force
delete` of an actively-referenced slug effectively fails
loudly).

## Interaction with `sophie diff`

A `refactor(...)` commit is recognized by `sophie diff` and
surfaced as a one-line summary instead of N+1 individual diffs:

```text
$ sophie diff HEAD~3

[Commits 1, 2]: standard diff output

[Commit 3 — refactor]:
  refactor(misconception): rename intensity-vs-luminosity → flux-vs-luminosity
  Classified: relational × non-substantive
  7 call sites updated, 3 prerequisite refs updated, 4 intervention refs updated.
  TDR pending: .sophie/refactor-seeds/2026-05-15-rename-misconception-intensity-vs-luminosity.md
```

Classification by operation:

- `rename` → relational × non-substantive.
- `split` → relational × substantive.
- `merge` → relational × substantive.
- `delete` → relational × breaking.

## Interaction with `sophie publish-state`

A refactor commit's auto-generated TDR seed is detected by
`sophie publish-state --check` (per
[ADR 0052](../decisions/0052-scheduled-publication-visibility.md))
as an unresolved-seed signal. The check does not block publish-
state determination but surfaces the unresolved seed in its
report.

## Pre-PR hook (recommended)

The convention for consumer courses:

```bash
# .git/hooks/pre-push
#!/bin/bash
unresolved=$(find .sophie/refactor-seeds -name "*.md" 2>/dev/null | wc -l)
if [ "$unresolved" -gt 0 ]; then
  echo "Unresolved refactor-seeds: $unresolved"
  find .sophie/refactor-seeds -name "*.md"
  echo "Complete the TDR or delete the seed before pushing."
  exit 1
fi
```

This is a convention, not a CLI feature. v1 does not ship a
sophie-managed hook.

## Exit codes

- `0` — dry-run completed, or `--apply` completed cleanly.
- `1` — `--apply` was reverted due to new audit ERRORs, or
  invalid arguments, or uncommitted user changes blocked the
  apply, or `delete` refused without `--force` on an active slug.
- `2` — internal CLI error (file I/O, AST parse failure, etc.).

## See also

- [ADR 0049 — `sophie refactor` CLI Family](../decisions/0049-sophie-refactor-cli.md)
- [ADR 0040 — Teaching Decision Records](../decisions/0040-teaching-decision-records.md)
  — TDR template that seed stubs scaffold.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](../decisions/0043-notation-registry-multirep-alignment-audit.md)
  — `concept` entity definition.
- [ADR 0044 — Misconception Graph + Intervention Library](../decisions/0044-misconception-graph-and-intervention-library.md)
  — `misconception` entity definition.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](../decisions/0045-pedagogical-diff-curriculum-ci.md)
  — `refactor(...)` commit classification.
- [ADR 0046 — Equation Biography](../decisions/0046-equation-biography.md)
  — `equation` entity definition.
- [ADR 0048 — Sophie LDS Content Plugin System](../decisions/0048-sophie-lds-content-plugins.md)
  — plugin entries are not refactorable from consumer side.
- [ADR 0052 — Scheduled Publication & Visibility Windows](../decisions/0052-scheduled-publication-visibility.md)
  — `sophie publish-state` surfaces unresolved seeds.
- [sophie-diff-cli.md](sophie-diff-cli.md) — diff classifier
  integration with `refactor(...)` commits.
