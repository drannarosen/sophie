---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - diff
  - audit
  - ci
  - tooling
  - lds
validation:
  status: in-progress
  last_validated_date: "2026-05-16"
  evidence:
    - kind: review
      ref: docs/reviews/2026-05-14-adrs-0040-0045-foundation-review.md
      date: "2026-05-14"
    - kind: manual
      ref: docs/website/reference/sophie-diff-cli.md
      date: "2026-05-14"
      notes: "sophie diff CLI reference doc shipped."
    - kind: manual
      ref: docs/website/reference/pedagogical-change-taxonomy.md
      date: "2026-05-14"
    - kind: deployment
      ref: null
      date: null
      notes: "@sophie/cli sophie diff command + commit-trailer enforcement hook not yet shipped; TDR ↔ commit traceability remains opt-in. See ADR 0045 follow-up issues."
  notes: "Contract + taxonomy stable; CLI implementation + CI enforcement land in follow-up PRs."
---

# ADR 0045: Pedagogical Diff + Curriculum CI

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

The 2026-05-14 LDS conformance foundation tranche
([ADR 0040](./0040-teaching-decision-records.md),
[ADR 0041](./0041-teaching-move-library.md),
[ADR 0042](./0042-pedagogy-contract-and-ai-contribution-ledger.md),
[ADR 0043](./0043-notation-registry-multirep-alignment-audit.md),
[ADR 0044](./0044-misconception-graph-and-intervention-library.md))
shipped five paired contracts: per-chapter Teaching Decision
Records, a canonical Teaching Move Library, the Pedagogy Contract +
AI Contribution Ledger, the Notation Registry + `<MultiRep>` +
Representation Alignment Audit, and the Misconception Graph +
Intervention Library. Together with the [Bucket-C pedagogy-index
pattern](./0038-pedagogy-index-pattern.md), they declare four
named audit-invariant families that fire against course content:
**D / E / F / C / O / K** (pedagogy-index integrity), **PC / AC**
(pedagogy contract + AI ledger), **NR / MR** (notation registry +
multirep), and **MG / I** (misconception graph + interventions).

What that foundation does not yet do: **report on how the
PedagogyIndex changes across revisions.** Today's `git diff` shows
text changes; it can't tell a reviewer that a PR added two
misconceptions, removed one learning objective, broke an `<EquationRef>`,
or introduced a new MR2 WARNING. Each invariant fires against a
*single snapshot*; reviewers infer "what changed" by eye.

This is the gap A6 closes. With AI as the primary author (per
[ADR 0030](./0030-audience-and-ai-author-model.md)) and instructor
supervision the structural HITL gate, the volume of revision review
is the dominant authoring cost. A tool that *categorizes*
pedagogical change — by what changed and by how much human
attention it needs — turns the audit invariants from "Sophie checks
at build time" into "Sophie polices across revisions."

This ADR is the sixth graduation through the
[staging-area lifecycle](../vision/transitions/index.md) — the
[`vision/features/accepted.md`](../vision/features/accepted.md) A6
entry was promoted from backlog [B3](../vision/features/backlog.md)
on 2026-05-14 after a six-question brainstorm resolved the open
design questions; this ADR ratifies them.

Unlike ADRs 0040–0044, A6 does **not** add a new contract on
content. It adds a *tool over the existing contracts* — the
difference matters for the ADR's shape: no new audit-invariant
family ships, and the v1 surface is a CLI command + Zod schema
rather than a schema + component + invariants triple.

## Decision

Sophie ships **four paired artifacts**: a `sophie diff <ref>` CLI
command, a persisted index build artifact emitted by `sophie
build`, a canonical pedagogical-change taxonomy (Zod schema), and
three output formatters (text, JSON, markdown).

### Artifact 1: `sophie diff <ref>` CLI command

A top-level peer of `sophie audit` / `sophie build` /
`sophie validate` / `sophie fmt` / `sophie preview`. Mirrors the
`git diff` mental model: one verb per question. `sophie audit`
answers *"is this good?"*; `sophie diff` answers *"what changed?"*

```
sophie diff [<ref> | --semester=<id>] [--format=text|json|markdown] [--base-index <path>] [--include-routine]
```

- `<ref>` — any git ref valid for `git worktree add` (branch name,
  SHA, tag, `HEAD~N`, etc.).
- `--semester=<id>` (**new in 2026-05-14 hardening**) — semester-
  aware alternative to `<ref>`. Resolves to a git tag following
  the convention `<course>-<semester>-start` (e.g.,
  `astr201-fa25` resolves to `astr201-fa25-start`). Convention
  documented in `sophie-diff-cli.md`; if the matching tag doesn't
  exist, exits code 2 with a `git tag astr201-fa25-start <sha>`
  hint. Lets `sophie diff --semester=astr201-fa25` answer "what
  changed between last fall and now" without manual ref-lookup.
- `--format` — output format. Default: `text` when stdout is a TTY,
  `json` when piped (modern CLI convention). Markdown is a thin
  template over the JSON; useful for PR-comment integrations and
  AI Ledger entries.
- `--base-index <path>` (**operationalized in 2026-05-14
  hardening**) — skip the worktree build and read the base
  `PedagogyIndex` from `<path>` instead. v1 ships a canonical
  GitHub Actions workflow that builds the base index once per PR
  as a cached artifact and passes it via `--base-index` to avoid
  per-PR worktree-build overhead. Worked example in
  `sophie-diff-cli.md` *CI integration* section.
- `--include-routine` (**new in 2026-05-14 hardening**) — text
  formatter suppresses `routine` severity items by default; flag
  forces inclusion. JSON output always includes them.

Exit codes:

- `0` — diff completed; no `breaking` items.
- `1` — diff completed; one or more `breaking` items present
  (broken refs, new ERROR-tier audit warnings).
- `2` — diff could not run (worktree failure, missing artifact,
  schema mismatch).

The CLI surface contract is specified in detail in
[sophie-diff-cli.md](../reference/sophie-diff-cli.md).

### Artifact 2: Persisted index build artifact

`sophie build` is amended to write
`dist/.sophie/pedagogy-index.json` as a byproduct. This file is
the HEAD snapshot — the same `PedagogyIndex` that
`runPedagogyAudit(index)` consumes, serialized to disk.

The artifact is the **contract between `sophie build` and `sophie
diff`**: diff does not import in-process from build; it reads the
JSON. This keeps the two commands independent (a future
`@sophie/diff` package could ship without depending on
`@sophie/astro`).

`sophie diff <ref>` materializes the base ref via:

```text
git worktree add --detach /tmp/sophie-diff-<sha> <ref>
cd /tmp/sophie-diff-<sha>
sophie build
# reads dist/.sophie/pedagogy-index.json from the worktree
cd <original>
git worktree remove /tmp/sophie-diff-<sha>
```

No parallel static-MDX extractor; the diff and the audit must
read the *same* index code path so they cannot disagree about
what the index contains. (See *Alternatives considered* below
for why the static-extractor path was rejected.)

### Artifact 3: Canonical pedagogical-change taxonomy

A Zod-schema'd structured type in `@sophie/core/diff` capturing
every pedagogical change as a two-axis record:

- **Granularity axis** (what kind of change):
  - `structural` — a component instance was added or removed
    (Aside, KeyEquation, Figure, Objective, MultiRep, Intervention,
    Predict, etc.).
  - `semantic` — body or content of an existing entry changed
    (definition body, equation body, misconception text, intervention
    text, LO description).
  - `relational` — a cross-reference resolution changed (an
    `<EquationRef>` newly resolves, was newly broken, or moved targets;
    similarly for `<FigureRef>`, `<GlossaryTerm>`, `<ChapterRef>`,
    misconception `prerequisite_misconceptions`, `concept_refs`).
  - `conformance` — the audit-warning set changed vs base (new
    NR/MR/MG/I/PC/AC/D/E/F/C/O/K warnings or errors introduced or
    cleared).
- **Severity axis** (how much human attention is needed, derived
  from the change content):
  - `routine` — typographic or formatting change that does not
    affect pedagogical meaning. Whitespace, punctuation, code-
    style.
  - `substantive` — real pedagogical change. New misconception
    introduced, equation body edited, intervention text rewritten.
  - `breaking` — broken cross-reference, new ERROR-tier audit
    warning, cycle introduced in misconception prerequisites.
    Exit code 1.
  - `requires-judgment` — change touches a field that ADR 0040–
    0044 marks as instructor-judgment-load-bearing: learning-
    objective body, definition body, `ai_policy`, pedagogy-contract
    field, misconception prerequisite ordering, OR
    `ai_contribution.last_review_date` predates the change.
    Surfaces a `requires-judgment` line in the summary; does not
    fail CI alone, but flags the item for human review.

Every diff item carries both labels independently — they are
orthogonal. The top-line summary is severity-keyed (`3 substantive
· 1 breaking · 1 requires-judgment`); per-item detail surfaces
both axes.

The full taxonomy specification — every change category, what
triggers it, what fields it surfaces, and worked examples for each
component type — lives in
[pedagogical-change-taxonomy.md](../reference/pedagogical-change-taxonomy.md).
A **precise severity-threshold reference table** at the top of
that doc (hardened 2026-05-14) lists every triggers→severity rule
explicitly — readers consult the table rather than scanning
narrative prose.

### Intentional-change demotion via TDR `affects_anchors`

A diff item whose anchor is listed in any HEAD TDR's
`affects_anchors` field (per
[ADR 0040](./0040-teaching-decision-records.md)) is
**demoted one severity level** and tagged with the source TDR-id.
Honors intentional changes automatically by reading provenance
from the TDR itself; no manual annotation required at diff time.

Demotion ladder:

| Original severity | Demoted to |
|---|---|
| `breaking` | `substantive` (with TDR-id annotation) |
| `substantive` | `routine` (with TDR-id annotation) |
| `requires-judgment` | `routine` (with TDR-id annotation) |
| `routine` | (no change; already lowest) |

Example: a TDR removes the Drake equation from ch3 and lists
`affects_anchors: [eq-drake-equation, misc-overconfident-civilization-counting]`.
Without the TDR, `sophie diff` would emit:

```text
breaking: <EquationRef refId="drake-equation"> broken (eq removed)
```

With the TDR, it emits:

```text
substantive: <EquationRef refId="drake-equation"> broken
  (intentional, see TDR-007)
```

CI doesn't fail; the diff report still surfaces the change with
provenance. This is *automatic* (not opt-in) because
`affects_anchors` is *intentional declaration by definition* —
if a TDR lists anchors it affects, the author is claiming they
meant to affect them.

Cross-ADR coupling: **TDR-2** (INFO, per ADR 0040) verifies that
every anchor in `affects_anchors` resolves in the *base*
PedagogyIndex (the anchor existed before the TDR's effect was
applied — that's why it was changeable). Authoring-correctness
nudge for this flow.

### Bidirectional TDR ↔ commit traceability

The `affects_anchors:` mechanism above answers *"what anchors
does TDR-14 change?"* from the TDR's perspective. The dual
question — *"which TDR does commit `a1b2c3d` implement?"* — is
answered by a **structured commit trailer** on the commit itself.

The two mechanisms are dual, not redundant. Together they enable
bidirectional traceability: `git log --grep="TDR: 14"` shows every
commit citing a decision; the TDR's `affects_anchors:` shows every
anchor that decision affects; their intersection is the well-
explained subset of the course's authoring activity. ADR 0047's
M2 metric measures exactly this intersection.

#### Commit trailer convention

Chapter-modifying commits carry a `TDR:` trailer using git's
standard `interpret-trailers` convention (RFC822-style key-value
pairs at the bottom of the commit message):

```text
feat(astr201): tighten Wien's law intervention

Reworked the contrasting-cases intervention based on fa25
evidence that students were collapsing two misconceptions
into one.

TDR: 14
```

**Allowed values:**

- `TDR: <N>` — commit implements the decision recorded in TDR-N.
  Multi-trailer support: commits implementing multiple decisions
  carry multiple `TDR:` lines (one per implemented decision).
- `TDR: none` — commit deliberately carries no pedagogical
  intent (typo fix, formatting, dependency bump, mechanical
  refactor per ADR 0049 `--mechanical`). Explicit declaration,
  not omission.
- `TDR: pending-seed-<slug>` — emitted by `sophie refactor` when
  it auto-generates an unfilled TDR seed (per
  [ADR 0049](./0049-sophie-refactor-cli.md)). The author resolves
  to `TDR: <N>` (substantive — seed promoted to a real TDR) or
  `TDR: none` (mechanical — seed deleted) by amending the
  commit's trailer after deciding.

The trailer convention is platform-standard
(`git interpret-trailers` parses it natively); SoTA tooling
treats trailers as first-class metadata, not as prose
annotation.

#### Optional CI enforcement

Consumer courses opt in to enforcement via
`pedagogy-contract.yaml`:

```yaml
tdr_traceability:
  enforce_commit_trailers: true       # default false
  trailer_severity: warning           # warning | error
  excluded_paths:
    - "*.css"
    - "*.scss"
    - "package.json"
    - "pnpm-lock.yaml"
```

When `enforce_commit_trailers: true`, the audit (via a pre-receive
hook, GitHub Action, or `sophie audit --trailers` invocation)
checks every chapter-touching commit on `main` for a `TDR:`
trailer. Commits without one trip the configured severity.
`excluded_paths:` covers non-pedagogical surfaces that don't need
trailers even when enforcement is on.

Default disabled. Courses opt in when they're ready — typically
after Phase 4 launches and authoring discipline is settled.

#### Sophie refactor integration

`sophie refactor --apply` (per
[ADR 0049](./0049-sophie-refactor-cli.md)) auto-emits the `TDR:`
trailer in the commit it creates. Substantive refactors emit
`TDR: pending-seed-<slug>` (with the author amending after seed
resolution); `--mechanical` invocations emit `TDR: none`
directly.

### Artifact 4: Output formatters

Three v1 formatters in `@sophie/core/diff/format/`:

- **Text** — TTY-friendly. One-line summary at the top, then a
  per-axis breakdown. Color-coded by severity (matches
  `sophie audit` color conventions). Designed for interactive
  review during `sophie diff main` at the terminal.
- **JSON** — Zod-schema-validated. The structured taxonomy
  serialized verbatim, plus diff metadata (`base_ref`, `head_ref`,
  `generated_at`, `sophie_version`, current `ai_contribution`
  blocks per chapter for AI-Ledger integration per Q5). The
  canonical machine-readable artifact; downstream tools consume
  this.
- **Markdown** — Mustache-style template over the JSON, designed
  for two consumers: GitHub PR comments and AI Contribution
  Ledger entries (when a reviewer wants to paste the diff summary
  into a ledger update). Includes severity-keyed sections,
  collapsible per-item detail, anchor links into the chapter.

### What lives in code vs. what lives in docs

This ADR + its two reference docs ship as **docs only**, matching
the ADR 0040–0044 precedent. The code PR follows separately:

- `packages/core/src/diff/schema.ts` — Zod schema for the
  two-axis taxonomy.
- `packages/core/src/diff/compute.ts` — diff computation against
  two `PedagogyIndex` snapshots; classification rules mapping
  per-component changes to taxonomy axes.
- `packages/core/src/diff/format/{text,json,markdown}.ts` —
  formatters.
- `packages/cli/src/commands/diff.ts` — the `sophie diff` command
  wiring, worktree orchestration, TTY-default detection.
- `packages/astro/src/integration.ts` — amend `sophie build` to
  emit `dist/.sophie/pedagogy-index.json`.
- `packages/core/src/diff/__tests__/` — completeness tests
  ensuring every known component type maps to taxonomy axes;
  schema round-trip tests; severity-classification regression
  tests.

That code PR follows the standard branch + PR cadence per
[`feedback_branch_pr_scope`](../../../) memory.

**No new audit-invariant family.** ADR 0045 differs in shape from
ADRs 0042–0044: those add *contracts on content* with invariants
that fire against course content. ADR 0045 adds a *tool over the
existing contracts*. The diff's correctness is governed by:

1. **Diff schema validation** (Zod) — every emitted item satisfies
   the structured taxonomy; well-formedness is unit-tested.
2. **Severity-classification completeness** — the classification
   rules are tested for coverage against every known component
   type, so adding a new component without updating the classifier
   fails CI.
3. **CI consumption of existing audit families** — a diff with
   new ERROR-tier items in the `conformance` granularity bucket
   (the audit picked up new warnings vs base) is the meaningful
   CI signal. This is a *consumer pattern* of the existing
   NR/MR/MG/I/PC/AC/D/E/F/C/O/K invariants, not a new family.

## Rationale

### Two-axis taxonomy over one-axis

The brainstorm framed Q1 as a choice between three taxonomy
shapes: granularity-only (structural / semantic / relational /
conformance), severity-only (routine / substantive / breaking /
requires-judgment), or two-axis (both). Two-axis wins:

- **Granularity-only loses reviewer-attention triage.** Anna
  cares which changes need her *judgment* and which are
  mechanical. Without a severity dimension, a 30-item structural
  diff has to be read sequentially to find the one that touches
  a definition body.
- **Severity-only loses structural detail.** "3 substantive
  changes" doesn't tell a reviewer whether those are 3 new
  misconceptions, 3 changed equations, or one of each. The
  granularity dimension keeps the per-item detail audit-trail-
  grade.
- **Two-axis sets up B5 cleanly.** A future "Human Expertise
  Required" gate (backlog [B5](../vision/features/backlog.md))
  fires on the `requires-judgment` severity bucket; CI gating
  doesn't need to redesign the taxonomy to land.

### Three output formats with smart TTY default

Q2's three-format choice (text + JSON + markdown) over text+JSON
or JSON-only is driven by Sophie's three v1 consumers:

- **Anna at the terminal** — text default during local review.
- **CI runners** — JSON via `sophie diff main | jq ...`; the TTY-
  detection default means no flag-fiddling.
- **PR-comment integrations + AI Ledger writers** — markdown for
  human-readable paste-in.

Markdown is cheap (a thin template over JSON). Shipping it in v1
avoids the "downstream tools write ad-hoc JSON→markdown converters"
pattern that ages badly. Per the "build the best now" preference,
the cost is bounded and the leverage is high.

### Worktree build over static extractor or cache-first

Q3's choice was the most consequential. The `PedagogyIndex` is
accumulated during render (per
[ADR 0038](./0038-pedagogy-index-pattern.md)) — each component
registers itself with `indexAccumulator` as Astro renders it.
There is no parse-only code path that extracts the index from
MDX source files.

Two paths to a base-ref index:

- **Static MDX extractor** — walk MDX source files at the base
  ref via `git show`, re-implement the component-registration
  logic outside Astro. *Rejected:* duplicates the extraction
  logic; introduces a second source of truth for "what an Aside
  contributes to the index"; bugs in either extractor make diff
  and audit disagree. Reviewer can no longer trust that `sophie
  diff` reports the same content `sophie audit` validates.
- **Run the same build pipeline at the base ref** — `git
  worktree add` materializes the base sources; `sophie build`
  produces the base index via the same code path that produces
  the HEAD index. *Accepted.*

Worktree is cheap (a checkout into a tmp directory; `git worktree
remove` cleans up; the working tree is untouched). Local courses
build in 5–30 seconds; `sophie diff main` end-to-end is on the
order of 10–60 seconds, which is fine for interactive review
once per PR.

Cache-first (storing per-SHA index snapshots in
`.sophie/cache/`) was deferred because Sophie has no CI pressure
yet; cache invalidation is real complexity. The `--base-index
<path>` flag is the clean seam — when a cache or CI artifact-
passing flow is needed later, callers pre-compute the base index
and hand it in; `sophie diff` doesn't change.

### Top-level peer over subcommand

Q4's `sophie diff <ref>` over `sophie audit --diff <ref>` or
`sophie diff pedagogy <ref>`. One verb per question matches:

- The existing Sophie CLI surface (`sophie audit`, `sophie build`,
  `sophie validate`, `sophie fmt`, `sophie preview` are all
  top-level peers).
- The `git diff` / `kubectl diff` / `terraform plan` mental model.
- The semantic distinction: `audit` answers *"is this good?"*;
  `diff` answers *"what changed?"*. Conflating them under
  `audit --diff` muddies the model and saves one verb once.

Subcommand-style (`sophie diff pedagogy <ref>`) is reserved for
when a second diff kind exists. Today there is one. YAGNI says
don't pre-abstract; the subcommand can be added under the same
top-level later without breaking existing usage.

### AI Ledger report-only over write-through

Q5's choice: notice + report staleness as `requires-judgment`;
no writes.

The AI Contribution Ledger (per ADR 0042) is *intentionally
authored* — `instructor_reviewed: true` and `last_review_date:
2026-05-14` are meant to be conscious instructor signals. A CLI
that auto-bumps those fields defeats the audit-trail purpose
that the Ledger exists to provide. The HITL mandate (per
[ADR 0030](./0030-audience-and-ai-author-model.md)) applies to
the Ledger too: Sophie never writes content silently.

Write-through (even opt-in via a `--update-ledger` flag) was
rejected because the flag itself is a social-engineering anti-
pattern: once it exists, reviewers under time pressure use it
without thinking, and the conscious-review signal degrades.
Better to make the suggestion visible (via the `requires-judgment`
severity line + the current `ai_contribution` block in JSON output)
and force the human to update the Ledger themselves.

A future ADR could add a dedicated `sophie ledger update`
command with its own review workflow; that's a separate decision
from `sophie diff`'s shape.

### Textbook only over textbook + course-shell

Q6's scope. Course shells (`src/content/courses/fa26/`) contain
schedule, assignment dates, and module organization — all of
which can have *pedagogical* significance ("is chapter X
scheduled before its prerequisites?") but none of which currently
have audit invariants. Shipping diff over unaudited course-shell
content in v1 would emit noise: changes get listed without a
severity signal because there are no rules to map them through.

Course-shell audit + diff is a future ADR (likely paired with B5
Human Expertise Required, or a dedicated "Course Shell Audit"
ADR). Diff's architecture extends naturally when those invariants
ship — the same two-axis taxonomy applies, with new categories
under `relational` (prerequisite ordering) and new triggers under
`requires-judgment` (schedule changes that move LO order).

### One ADR over splitting CLI from taxonomy

The `sophie diff` CLI and the pedagogical-change taxonomy are
tightly coupled: the CLI emits what the taxonomy describes; the
taxonomy is meaningful only because the CLI produces output in its
shape. Splitting would force forward-references — same pattern as
ADRs 0042 + 0043 + 0044 each bundling schema + component +
audit.

## Consequences

### For Sophie-the-platform (this commit)

- ADR 0045 ships docs-only on 2026-05-14, alongside
  [sophie-diff-cli.md](../reference/sophie-diff-cli.md) and
  [pedagogical-change-taxonomy.md](../reference/pedagogical-change-taxonomy.md).
- [`vision/features/accepted.md`](../vision/features/accepted.md)
  A6 entry transitions to graduated.
- [`vision/features/backlog.md`](../vision/features/backlog.md) B3
  is already collapsed to a one-line pointer (per the 2026-05-14
  promotion commit).
- [`status/roadmap.md`](../status/roadmap.md) §"Current status"
  gains A6 as a sixth row in the LDS-conformance-foundation
  table.

### For Sophie-the-platform (future code PR)

- New package directory: `packages/core/src/diff/` with Zod
  schema, computation, classifier, three formatters, and tests.
- New CLI command in `packages/cli/src/commands/diff.ts`.
- Amendment to `packages/astro/src/integration.ts`: emit
  `dist/.sophie/pedagogy-index.json` as a build byproduct.
- Coverage tests: every component type known to `PedagogyIndex`
  has a classification mapping; adding a new component type
  without updating the classifier fails the build.
- E2e test: `sophie build` on smoke chapter; mutate a chapter;
  `sophie diff HEAD~1` produces the expected structured output
  (one per granularity axis exercised).

### For consumer repos

No required action. `sophie diff` works against any consumer repo
once the code PR lands; chapters do not need to change. The
artifact at `dist/.sophie/pedagogy-index.json` is created
automatically by `sophie build`; it is `.gitignore`-d like the
rest of `dist/`.

Optional: consumer repos may add a CI step running `sophie diff
$BASE_REF --format=json | <filter>` to gate PRs on `breaking`
items. The recommended default gate is exit-code-based: `sophie
diff $BASE_REF` returns 1 if any `breaking` item exists, suitable
for `gh pr checks`.

### For TDRs (per [ADR 0040](./0040-teaching-decision-records.md))

`sophie diff` output is a natural artifact to *cite* in a Teaching
Decision Record. A TDR entry that reads "I removed three
misconceptions from the Hubble chapter because students aren't
encountering them in practice" can attach a `sophie diff
HEAD~5 --format=markdown` snippet documenting exactly which
three. The markdown formatter is designed for that paste-in
flow.

### For the Teaching Move Library (per [ADR 0041](./0041-teaching-move-library.md))

The classifier maps changes touching specific components to
specific moves: e.g., a new `<Intervention type="contrasting-
cases">` shows up in the diff as `structural` granularity +
`substantive` severity, tagged with the `comparison-cases` move
ID from the Teaching Move index. This lets a future tool answer
"which teaching moves did this PR add or remove?" without a
separate analysis.

### For the Pedagogy Contract (per [ADR 0042](./0042-pedagogy-contract-and-ai-contribution-ledger.md))

Two integration points:

- The `ai_contribution` block per chapter feeds the
  `requires-judgment` classifier. JSON output includes the
  current block so downstream tools can compute concrete update
  suggestions.
- Pedagogy-contract changes (e.g., `math_and_units_standards.notation_registry`
  flipped from false to true) surface as `requires-judgment`
  conformance-axis items because they change which audit
  families fire.

### For the Notation Registry + Misconception Graph (ADRs 0043 + 0044)

`conformance`-granularity items reference audit invariants by
ID (NR1, MR2, MG3, I1, ...). The classifier consumes the same
`runPedagogyAudit(index)` output that `sophie audit` consumes;
no parallel implementation.

### For AI authoring (future)

The taxonomy + JSON output is the natural input to a future
`/sophie-review` slash command or a `sophie-revision-reviewer`
skill (per
[ADR 0030](./0030-audience-and-ai-author-model.md)'s
multi-role AI model). The skill consumes the diff JSON, surfaces
`requires-judgment` items in priority order, and produces a
structured review note ready for instructor sign-off.

### For SoTL paper + tenure case

The diff artifact, attached to a TDR or AI Contribution Ledger
entry, makes pedagogical revisions *reproducible*. "What did I
change between sp26 and fa26?" becomes a concrete pedagogical-
change set rather than a `git log` recitation. This advances B7
(Course as Research Object) without that ADR yet existing.

## Alternatives considered

### Static MDX extractor (parse-only base index)

*Rejected.* Would duplicate the component-registration logic
outside Astro. Diff and audit could disagree about what the
index contains; reviewers lose the trust that diff reports what
audit validates.

### Cache-first base index (`.sophie/cache/<sha>.json`)

*Deferred.* Solves a perf problem (multi-second worktree builds)
that doesn't exist yet (no production CI). Introduces a real
problem (cache invalidation, location of cache, version
compatibility). The `--base-index <path>` seam admits a cache as
a caller without redesigning diff.

### Subcommand of audit (`sophie audit --diff <ref>`)

*Rejected.* Saves one verb at the cost of muddying the audit /
diff semantic distinction. `audit` answers "is this good?";
`diff` answers "what changed?". Different questions; different
verbs.

### Subcommand-style (`sophie diff pedagogy <ref>`)

*Deferred.* Right shape *if* a second diff kind exists. Today
there is one. YAGNI; the subcommand can be added under the
top-level later.

### One-axis taxonomy (granularity-only or severity-only)

*Rejected.* Granularity-only loses reviewer-attention triage;
severity-only loses structural detail. Two-axis is the SoTA-
correct shape and sets up B5 cleanly.

### Write-through AI Ledger updates

*Rejected.* Even opt-in via flag, the existence of the flag
degrades the conscious-review signal the Ledger exists to
provide. HITL mandate applies to the Ledger.

### Textbook + course-shell unified in v1

*Deferred.* Course-shell audit invariants don't exist yet;
shipping diff over unaudited course-shell content emits noise.
Course-shell diff is a future ADR.

### Splitting CLI from taxonomy ADR

*Rejected.* Tightly coupled; splitting forces forward-references.
Same pattern as ADRs 0042/0043/0044 bundling schema + component +
audit per coherent contract.

## References

- [ADR 0030 — Audience + AI author model](./0030-audience-and-ai-author-model.md)
  — HITL mandate; AI primary-authors, instructor supervises. Per
  the 2026-05-14 amendment, also documents Sophie's commitment to
  AI-primary authoring as deliberate design.
- [ADR 0038 — Pedagogy-index pattern](./0038-pedagogy-index-pattern.md)
  — `PedagogyIndex` shape; render-time accumulator pattern.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — TDRs as the curriculum audit trail; diff output is a natural
  artifact to cite. **TDR `affects_anchors` field** (hardened
  2026-05-14) feeds the intentional-change demotion classifier;
  TDR-2 invariant verifies anchors resolve in base PedagogyIndex.
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md)
  — `move-index.ts`; the classifier tags diff items with move
  IDs.
- [ADR 0042 — Pedagogy Contract + AI Contribution Ledger](./0042-pedagogy-contract-and-ai-contribution-ledger.md)
  — `ai_contribution.instructor_reviewed.date` staleness feeds
  the `requires-judgment` classifier; pedagogy-contract changes
  (e.g., `ai_training_provenance` updates) surface in `conformance`
  axis.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — NR1–NR4 + MR1–MR6 invariants surface in `conformance` axis;
  the *structured-for-facts, prose-for-stances* principle (declared
  in 0043 hardening) constrains diff classifier shape.
- [ADR 0044 — Misconception Graph + Intervention Library](./0044-misconception-graph-and-intervention-library.md)
  — MG1–MG4 + I1–I4 invariants surface in `conformance` axis;
  prerequisite-cycle introduction is a `breaking` item.
- [ADR 0049 — `sophie refactor` CLI Family](./0049-sophie-refactor-cli.md)
  — refactor commands auto-generate TDR-seed stubs with
  `affects_anchors` pre-populated; intentional-change demotion
  flows from refactor → TDR → diff.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-course-versioning.md)
  — `--semester=<id>` flag resolves to `<course>-<semester>-start`
  tag per ADR 0051's git-tag convention; diff can plot across
  course versions.
- [ADR 0053 — Conformance Failure Modes](./0053-conformance-failure-modes.md)
  — chapter-frontmatter `audit_overrides` reference TDRs;
  CF1–CF5 invariants extend the diff's conformance-axis surface.
- [`vision/features/backlog.md`](../vision/features/backlog.md) —
  B3 entry surfaced this ADR; collapsed to one-line pointer in
  the 2026-05-14 promotion commit.
- [`vision/features/accepted.md`](../vision/features/accepted.md)
  A6 — defended priority claim and brainstorm Q1–Q6 summaries.
- [sophie-diff-cli.md](../reference/sophie-diff-cli.md) — the
  user-facing CLI spec; includes CI integration section + worked
  example workflow YAML.
- [pedagogical-change-taxonomy.md](../reference/pedagogical-change-taxonomy.md)
  — full taxonomy specification with per-component triggers +
  precise severity-threshold reference table (hardened 2026-05-14).
