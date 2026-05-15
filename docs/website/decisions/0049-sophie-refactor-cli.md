---
date: 2026-05-14
tags: [pedagogy, decisions, cli, refactoring, tooling, lds]
---

# ADR 0049: `sophie refactor` CLI Family

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The 2026-05-14 foundation review's S4 systemic concern named a
load-bearing operational gap: **the foundation ADRs (0040–0046)
declare structured entities — misconceptions, concepts, equations,
TDRs, interventions — but the platform ships no first-class
tooling for refactoring them across the corpus.** When ASTR 201's
`flux-distance-doubles` misconception turns out to be better
modeled as two misconceptions (`flux-doubles-misread` +
`inverse-square-not-internalized`), the instructor's options today
are:

1. Find-and-replace across MDX files (error-prone; misses
   cross-references in YAML; produces no TDR seed).
2. Hand-author the migration (slow; depends on remembering every
   call site).
3. Skip the refactor (the structured corpus accumulates
   technical debt).

This is a special case of the platform's broader posture toward
deterministic operations: when a transformation is structurally
representable (rename slug X to slug Y across the entire
PedagogyIndex + every `<MisconceptionRef>` site + every
`prerequisite_misconceptions:` list), it should not require AI
judgment — but it does require atomic guarantees the CLI can
provide and a casual editor cannot.

The 2026-05-14 brainstorm locked `sophie refactor` as a
**subcommand-per-entity-type** CLI family with **operations
rename / split / merge / delete**, **dry-run as default**,
**atomic staged commits**, **audit-revert-on-new-ERRORs**, and
**auto-generated TDR-seed stubs**.

This ADR pins the CLI surface and the operational guarantees. The
implementation is a follow-up code PR.

## Decision

Sophie ships a **`sophie refactor` CLI family** with subcommands
for each entity type in the LDS foundation:

```text
sophie refactor misconception   <op> [args]
sophie refactor concept         <op> [args]
sophie refactor equation        <op> [args]
sophie refactor intervention    <op> [args]  # future
sophie refactor tdr             <op> [args]  # future
```

v1 ships `misconception`, `concept`, `equation` subcommands.
`intervention` and `tdr` defer to a future ADR — interventions
have a simpler structure (refactor reduces to slug rename via
`misconception` impact); TDRs are immutable as an audit-trail
discipline (delete is rare; merging two TDRs requires explicit
narrative).

### Four operations per subcommand

Each entity-type subcommand supports four operations:

| Op | Synopsis | Description |
|---|---|---|
| `rename` | `sophie refactor misconception rename <old-slug> <new-slug>` | Change an entity's slug everywhere it is declared or referenced. |
| `split` | `sophie refactor misconception split <old-slug> <new-slug-a> <new-slug-b>` | Replace one entity with two; consumer chapters get an interactive (or `--map`-driven) re-assignment. |
| `merge` | `sophie refactor misconception merge <slug-a> <slug-b> --into=<target-slug>` | Collapse two entities into one; consumer references get redirected. |
| `delete` | `sophie refactor misconception delete <slug>` | Remove an entity. Requires `--force` if any active references remain. |

The operation set is deliberately small. More exotic
transformations (e.g., "promote a misconception to a concept") are
out of scope for v1 and likely belong as AI-assisted slash
commands rather than deterministic refactors.

### Dry-run as default

`sophie refactor <entity> <op>` without `--apply` is **dry-run by
default.** Output:

```text
$ sophie refactor misconception rename intensity-vs-luminosity flux-vs-luminosity

Dry run. No files changed. Pass --apply to execute.

Plan:
  1. misconception-graph.yaml: rename slug intensity-vs-luminosity → flux-vs-luminosity
  2. Update 3 prerequisite_misconceptions entries:
     - inverse-square-not-internalized.prerequisite_misconceptions[0]
     - chains-flux-with-luminosity.prerequisite_misconceptions[1]
     - distance-doubles-flux.prerequisite_misconceptions[0]
  3. Update 7 <MisconceptionRef> sites:
     - chapter:flux-luminosity-distance:42
     - chapter:flux-luminosity-distance:118
     - chapter:luminosity-distance:34
     - chapter:luminosity-distance:79
     - chapter:apparent-magnitude:55
     - chapter:apparent-magnitude:201
     - chapter:wien-revisit:33
  4. Update 4 <Intervention addresses=…> sites:
     [...]
  5. TDR seed: TDR-NEW (.sophie/refactor-seeds/2026-05-15-rename-misconception.md)

Audit preview (against post-refactor state):
  ERRORS:    0
  WARNINGS:  0 (no new warnings)
  INFO:      0

Pass `sophie refactor misconception rename intensity-vs-luminosity flux-vs-luminosity --apply` to execute.
```

The dry-run output includes (a) the file-by-file plan, (b) an
audit preview against the post-refactor state, (c) the auto-
generated TDR-seed path.

### `--apply` performs an atomic staged commit

When `--apply` is passed:

1. CLI **applies the plan to the working tree** (mutates files).
2. CLI **runs `sophie audit` against the post-refactor state**.
3. CLI **inspects audit deltas**: any *new* ERROR-severity finding
   (one that did not exist in the pre-refactor audit) triggers
   **automatic revert**.
4. If audit is clean (no new ERRORs), CLI **stages all changed
   files via `git add -p`-equivalent** and **commits with the
   format**:
   ```text
   refactor(misconception): rename intensity-vs-luminosity → flux-vs-luminosity

   Sophie refactor: misconception rename
   Mechanical changes:
     - 1 misconception-graph.yaml slug update
     - 3 prerequisite_misconceptions reference updates
     - 7 <MisconceptionRef> site updates
     - 4 <Intervention addresses=...> updates

   TDR seed: .sophie/refactor-seeds/2026-05-15-rename-misconception.md
   Author: complete the TDR before merging, then amend
   `TDR: pending-seed-...` below to the resolved trailer.

   TDR: pending-seed-rename-misconception
   Co-authored-by: sophie-refactor <noreply@sophie.cli>
   ```
5. CLI emits the path to the auto-generated TDR-seed stub and
   exits with status 0.

The `TDR:` trailer follows ADR 0045's bidirectional traceability
convention. `pending-seed-<slug>` is a placeholder; the author
amends it to `TDR: <N>` (substantive — seed promoted to a real
TDR) or `TDR: none` (mechanical — seed deleted).

#### `--mechanical` flag

`sophie refactor <entity> <op> [args] --apply --mechanical` skips
seed generation entirely and emits `TDR: none` in the commit
trailer directly. Use for refactors the author already knows are
mechanical: typo fixes, slug spelling corrections, name-only
churn that doesn't reflect a pedagogical position change.

Default off. The expected flow for substantive refactors is to
let the CLI generate a seed (and `TDR: pending-seed-<slug>`
placeholder) and resolve it post-hoc. `--mechanical` is an
ergonomic shortcut for batch operations where the author already
knows seed generation would just produce delete-this-stub work.

### Atomicity guarantee

A `sophie refactor … --apply` either:

- **Succeeds end-to-end:** working tree mutated, audit clean, commit
  staged. The author still owns the commit (they can amend, edit
  the TDR seed, etc., before pushing).
- **Reverts the working tree:** if audit produces new ERRORs, the
  CLI walks back every file change. The working tree is identical
  to its pre-`--apply` state. Exit code 1.

There is **no partial state**. Either the refactor lands cleanly
or it doesn't land at all. This matches the user expectation of
operations that touch ≥10 files.

The atomicity is implemented by **staging in-memory** first,
**previewing the audit**, **then writing**, rather than by writing
and rolling back. (Rollback would race with editor state and
unmerged user changes; staged-in-memory is cleaner.)

### Auto-generated TDR-seed stubs

Every `--apply` invocation emits a TDR-seed file at
`.sophie/refactor-seeds/<YYYY-MM-DD>-<op>-<entity-type>-<slug>.md`:

```markdown
---
tdr_number: NEW  # author: replace with next sequential number
title: "Rename misconception: intensity-vs-luminosity → flux-vs-luminosity"
date: 2026-05-15
scope: course_shell
evidence_type: forward_hypothesis  # author: adjust as appropriate
evidence_strength: exploratory
visibility: internal  # author: adjust if surfacing publicly
affects_anchors:
  - misc-intensity-vs-luminosity
  - misc-flux-vs-luminosity
affects_versions: []  # author: list affected course-versions
---

## What changed

Renamed misconception `intensity-vs-luminosity` to
`flux-vs-luminosity` across the ASTR 201 course corpus.

## Why

<!-- Author: complete this section. The CLI knows _what_ changed
mechanically; only the author knows _why_ the rename happened.
Common reasons:
- Original slug name was misleading.
- A pedagogical re-think suggested a different framing.
- A misconception-graph review surfaced inconsistent naming.
-->

## How to apply

<!-- Author: brief instructions for adopting the rename in
downstream consumer courses, if any. -->

## Evidence

<!-- Author: brief evidence narrative. For exploratory renames,
the evidence is usually "internal-review reflection." -->

## References

- Mechanical change set: see commit refactor(misconception):
  rename intensity-vs-luminosity → flux-vs-luminosity
- ADR 0040 (TDR template) for field semantics.
- ADR 0049 (sophie refactor CLI) for the auto-seed generator.
```

The stub is **not auto-committed alongside the refactor**. The
author edits the stub (filling in *why*, *how to apply*, *evidence*)
and commits it as a TDR in a follow-up step. The refactor commit
references the seed path so it can be located later.

This pairing — mechanical change as one commit, TDR-with-rationale
as another — keeps audit-trail discipline honest. A mechanical
rename without a TDR can land (small enough); a deliberate
pedagogical re-framing without a TDR cannot, because the seed
sits in `.sophie/refactor-seeds/` until the author resolves it.

### Audit-revert-on-new-ERRORs

The 2026-05-14 brainstorm flagged this as the single most
load-bearing safety guarantee. Concretely:

- CLI computes the **pre-refactor audit set** (all findings).
- CLI applies the refactor in-memory.
- CLI computes the **post-refactor audit set**.
- CLI computes the **delta**: which findings are *new* (post-only).
- If any new finding is ERROR severity, **revert the in-memory
  changes; do not write to disk; exit 1 with the error list.**
- If no new ERROR findings, write to disk and commit.

WARNINGs are not revert-triggers; a refactor that produces 3 new
WARNINGs lands but surfaces them in the apply-log. This matches
the existing `sophie audit` CI semantics (ERRORs block CI;
WARNINGs are reviewable).

### Interactive disambiguation for `split` / `merge`

`rename` and `delete` are unambiguous; `split` and `merge` require
re-assignment decisions.

`split` (one → two):

```text
$ sophie refactor misconception split intensity-vs-luminosity flux-doubles-misread inverse-square-not-internalized

Found 7 references to intensity-vs-luminosity. Re-assigning to either flux-doubles-misread (a) or inverse-square-not-internalized (b):

  1/7  chapter:flux-luminosity-distance:42  [a/b/skip] _
  2/7  chapter:flux-luminosity-distance:118 [a/b/skip] _
  ...
```

Non-interactive mode via `--map=mapping.yaml`:

```yaml
# mapping.yaml
chapter:flux-luminosity-distance:42: a
chapter:flux-luminosity-distance:118: b
chapter:luminosity-distance:34: a
chapter:luminosity-distance:79: b
chapter:apparent-magnitude:55: a
chapter:apparent-magnitude:201: a
chapter:wien-revisit:33: b
```

`merge` (two → one): every reference goes to the target slug; no
disambiguation needed. Optional `--surviving-body=<slug>` flag
selects which entity's body text survives (default: the target
slug's body).

### Interaction with version pinning

A `sophie refactor … --apply` produces a refactor commit. The
**course-level version tag** (per ADR 0051) typically advances on
the next student-build deploy; the refactor's TDR cites the
version range it applies to (`affects_versions:
[astr201-fa26-v1.2.0]`). Plugin entries (per ADR 0048) cannot be
refactored by consumer courses; consumer overrides remain the
correct path.

### Interaction with `sophie diff`

A `sophie refactor … --apply` commit shows up in `sophie diff` as
a **massive-but-classified** change set:

- `rename`: relational × non-substantive (one slug renamed; no
  semantic body change). The diff classifier recognizes refactor
  commits via the `refactor(<entity-type>):` prefix and surfaces a
  one-line "refactor: <slug-old> → <slug-new> (N call sites
  updated)" summary instead of N+1 individual diffs.
- `split`: relational × substantive (one decomposed into two;
  consumer-chapter mappings are semantic decisions).
- `merge`: relational × substantive (two collapsed; the body
  choice is semantic).
- `delete`: relational × breaking (a slug removed; any unmigrated
  reference is a hard break).

The classifier integration is part of the v1 implementation; the
diff taxonomy itself (ADR 0045) does not change.

## Rationale

### Subcommand per entity type, not one polymorphic `sophie refactor`

A polymorphic `sophie refactor <slug> --to=<new-slug>` would
require type inference (is the slug a misconception or a
concept?). Two slugs with the same string in different namespaces
(e.g., `inverse-square` as a concept and `inverse-square-misread`
as a misconception) make the inference brittle. Explicit
subcommand-per-entity-type is mechanically simpler and reads
better.

This also aligns with `git`'s subcommand pattern (`git merge`,
`git rebase`, `git branch`) rather than `git refactor --type=
branch ...`.

### Four operations: rename / split / merge / delete

The minimal coherent set. Renaming covers slug churn; splitting
covers "this is actually two things"; merging covers "these are
the same thing"; deleting covers retirement. Anything more exotic
either decomposes into these (e.g., "rename + change body" is
rename followed by edit) or belongs in AI-assisted territory.

### Dry-run by default, `--apply` required for write

Sophie's existing CLI verbs (`audit`, `build`, `diff`) are
read-only; `refactor` is the first write-side verb. Defaulting to
dry-run is the conservative shape — authors who run `sophie
refactor` casually see a plan; they cannot accidentally rewrite
files.

This matches `terraform plan` / `terraform apply` and `git
rebase --interactive` (preview before commit).

### Atomic staged commit over partial application

A multi-file refactor that half-applied would leave the working
tree in a structurally-invalid state (slug renamed in chapter A,
not in chapter B; references resolve in chapter A and dangle in
chapter B). Authors would have to manually reconcile.

In-memory staging + audit preview + atomic write avoids this
entirely. The implementation is mildly more complex than
write-then-validate, but the safety property is worth it.

### Audit-revert-on-new-ERRORs over user opt-in

The brainstorm considered "always commit; warn on ERROR" vs
"never commit; revert on ERROR." Anna's lock: **revert on new
ERROR.** Reasoning: the deterministic audit is the platform's
correctness floor; a refactor that breaks it produces a broken
corpus, which is harder to debug than a refactor that *didn't
land*. The "did not land" outcome is recoverable (re-run with
different args); the "broken corpus" outcome cascades through
every consumer chapter.

WARNINGs are different: they signal stylistic or coverage issues,
not correctness. A WARNING-producing refactor lands and surfaces
the warnings so the author can address them in a follow-up.

### Auto-TDR-seed stubs over either nothing or auto-committed TDRs

Without TDR-seed stubs: refactors land without provenance; the
audit-trail discipline of ADR 0040 erodes.

With auto-committed TDRs: every rename produces a TDR auto-
commit, polluting the TDR catalog with mechanical-only changes
(`TDR-47: Renamed slug X to Y. No pedagogical reason.`).

Seed stubs split the difference: the *mechanical* change auto-
generates the seed; the *pedagogical narrative* (why, how to
apply, evidence) requires the author to complete the stub before
the TDR commits. A refactor without a real reason becomes an
unfilled seed that surfaces in pre-PR checks — not an artifact
that pollutes the catalog.

### TDR + Intervention deferral

`sophie refactor intervention` reduces to (a) rename slug in
catalog, (b) update consumer `<Intervention type=…>` sites. v1
covers the common case via `sophie refactor misconception` (since
interventions reference misconceptions). A dedicated
`intervention` subcommand can land later if a use case surfaces.

`sophie refactor tdr` is more sensitive — TDRs are an audit-trail
discipline; renaming or deleting them retroactively undermines
the trail. A `merge` operation specifically would require
explicit narrative that the CLI cannot generate. Deferred to a
future ADR with a clearer use case.

## Consequences

**Easier:**

- Slug-naming evolution is no longer a deterrent to maintaining
  the structured corpus.
- Cross-corpus refactors are auditable (one commit per refactor;
  TDR-seed pairs with mechanical change).
- The "fear of breaking references" is removed; the audit-revert
  guarantee makes refactors safe to attempt.

**Harder:**

- CLI implementation is non-trivial: ASTs for MDX + YAML, atomic
  staging, audit-delta computation, TDR-seed templating. Likely
  ≥1 substantial PR.
- Documentation (`sophie-refactor-cli.md`) needs precise
  semantics for `split` mapping syntax and `merge` body
  resolution.
- TDR-seed cleanup discipline: stale seeds in `.sophie/refactor-
  seeds/` need to be either completed-and-committed or
  explicitly discarded. A future pre-PR hook could surface
  unresolved seeds.

**Triggers:**

- v1 of this ADR ships docs-only on 2026-05-14.
- Implementation PR: `packages/cli/src/refactor/`, with
  per-entity-type sub-modules and the in-memory staging engine.
- Reference doc:
  [sophie-refactor-cli.md](../reference/sophie-refactor-cli.md).
- Future: pre-PR hook for unresolved TDR seeds; integration with
  `sophie publish-state` (per ADR 0052) to surface seeds in
  publish-time gates.

## Alternatives considered

### Polymorphic `sophie refactor <slug>`

*Rejected.* Type inference is brittle; explicit subcommand is
mechanically simpler.

### Single `sophie refactor rename` with `--type` flag

*Considered.* Equivalent ergonomics in practice. Subcommand
shape matches `git`'s convention more closely and reads better
in scripts. Either works; subcommand-per-type is the convention
pick.

### Write-then-revert on new ERRORs

*Rejected.* Race conditions with editor state; in-memory staging
is cleaner.

### Auto-commit TDRs alongside the refactor

*Rejected.* See Rationale. Mechanical-only TDRs pollute the
catalog.

### No TDR-seed generation

*Rejected.* Erodes the audit-trail discipline of ADR 0040.

### `sophie refactor intervention` + `sophie refactor tdr` in v1

*Deferred.* Use cases not yet sharp enough; v1 covers the common
case via `misconception` + `concept` + `equation`.

### Always-commit (no `--apply` distinction; dry-run via separate
verb)

*Rejected.* `sophie refactor` is the first write-side verb;
defaulting to dry-run keeps the safety property visible.

## References

- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDR template that refactor-seed stubs scaffold; `scope`,
  `affects_anchors`, `affects_versions` fields used by the
  generator.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — `sophie refactor concept` operates on Notation Registry
  entries.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — `sophie refactor misconception` operates on the graph.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — `refactor(<entity>):` commit prefix integrates with the
  diff classifier.
- [ADR 0046 — Equation Biography](./0046-equation-biography.md)
  — `sophie refactor equation` covers slug + symbol churn.
- [ADR 0048 — Sophie LDS Content Plugin System](./0048-sophie-lds-content-plugins.md)
  — plugin entries are not refactorable by consumer courses;
  overrides are the supported path.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-course-versioning.md)
  — `affects_versions:` connects refactor commits to course
  tags.
- [audit-and-ai-authoring.md](../explanation/audit-and-ai-authoring.md)
  — `sophie refactor` was previously listed in the "not in the
  CLI by design" section; this ADR moves it into the v1 CLI
  surface.
- [sophie-refactor-cli.md](../reference/sophie-refactor-cli.md)
  — user-facing spec.
