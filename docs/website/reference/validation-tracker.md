---
title: Validation tracker schema
short_title: Validation tracker
description: >-
  Reference for the `validation:` frontmatter block that every ADR + reference
  doc carries (ADR 0056). Covers the schema, the per-page admonition rendering
  contract, the audit invariants V0–V8, and the build-generated dashboard at
  `/status/validation/`.
tags:
  - validation
  - reference
  - schema
  - audit
  - lds
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: manual
      ref: docs/website/decisions/0056-validation-tracker.md
      date: "2026-05-16"
      notes: "ADR 0056 is the contract this reference doc specs; ADR 0056 itself is validated in PR 6 Workstream D."
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-audit/runner.ts
      date: "2026-05-16"
      notes: "All nine audit invariants V0–V8 specified in this doc are live and tested."
    - kind: test
      ref: packages/astro/src/lib/validation-index-generator.integration.test.ts
      date: "2026-05-16"
      notes: "Dashboard-pin integration test enforces the regen workflow this doc specifies."
  notes: "Reference doc shipped in PR 6 Workstream A; specifies the schema + admonition contract + audit invariants + dashboard workflow. Graduated to validated alongside ADR 0056 itself after the curated-pass + V1/V2 promotion landed in the same PR."
status: shipped
---

# Validation tracker schema

Every ADR (`docs/website/decisions/NNNN-*.md`) and every reference
doc (`docs/website/reference/*.md`) carries a `validation:`
frontmatter block. The block declares whether the contract has
been confirmed against real shipped usage, what evidence supports
that claim, and when the confirmation was last re-checked. The
tracker has two reader-facing surfaces (per-contract admonition +
build-generated dashboard) and one author-facing surface (audit
invariants V0–V8).

The full rationale lives at
[ADR 0056 — Validation tracker](../decisions/0056-validation-tracker.md).
This reference doc is the operational specification.

## See also: chapter status vs contract validation

Sophie has **two sibling status surfaces** that read similarly but
mean different things. They MUST NOT be conflated.

| Surface | Spec | Where it lives | Vocabulary | Who reads it |
|---|---|---|---|---|
| **Chapter status** | [ADR 0051](../decisions/0051-chapter-status-course-versioning.md) | `frontmatter.status` on every `*.mdx` chapter | `draft` / `review` / `stable` | Author (gating student build); reader (course site) |
| **Contract validation status** | [ADR 0056](../decisions/0056-validation-tracker.md) (this doc) | `frontmatter.validation.status` on every ADR + reference doc | `unvalidated` / `in-progress` / `validated` / `re-validation-needed` | Author (which contracts need confirmation); SoTL paper #1 |

The two surfaces share a key (`status`) but live on different
artifacts (chapters vs contracts) and answer different questions
(is this chapter ready for students vs has this contract been
confirmed against shipped usage). They evolve independently;
graduating a chapter from `review` to `stable` says nothing about
whether the ADRs that chapter exercises are validated, and
vice-versa.

## Schema overview

The `validation:` block is a top-level frontmatter object with
four keys. All four are required at v1 — the audit will fire V1
or V2 (WARNING in PRs 3–5; **ERROR as of PR 6**) on any ADR or
reference doc that omits the block.

| Key | Type | Required | Default | Purpose |
|---|---|---|---|---|
| `status` | enum | yes | `unvalidated` | Lifecycle state of the contract's validation |
| `last_validated_date` | ISO date string or `null` | yes | `null` | When the latest validated/in-progress status was set |
| `evidence` | list of structured records | yes | `[]` | What backs the validation claim |
| `notes` | prose string (optional) | no | omitted | Author's free-text gloss on what's validated / what's deferred |

A minimal block (the default on every new contract):

```yaml
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
```

A fully-filled block (the ADR 0007 example):

```yaml
validation:
  status: validated
  last_validated_date: "2026-05-14"
  evidence:
    - kind: test
      ref: packages/components/src/runtime/useInteractive.test.ts
      date: "2026-05-12"
      notes: "Covers IndexedDB write/read cycle + MemoryResponseStore fallback + BroadcastChannel LWW"
    - kind: chapter
      ref: examples/smoke/src/content/chapters/01-foundations/spoiler-alerts.mdx
      date: "2026-05-14"
      notes: "1347-line real chapter; exercises Predict + Reflection + ComprehensionGate persistence"
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
      notes: "D1 boundary purity = 20/20; D4 type safety = 20/20"
  notes: "Build-time + smoke-environment validation complete; multi-cohort outcomes deferred to B9."
```

## Field specifications

### `status` (required)

Four-state lifecycle enum:

| Value | Meaning |
|---|---|
| `unvalidated` | No validation work has happened. Default for every new contract. |
| `in-progress` | Validation work has started but evidence is partial — typically tests-only without a chapter callsite, or contracts spec'd but only partially shipped. |
| `validated` | Contract has been confirmed against shipped evidence. Requires `last_validated_date` and at least one evidence row. |
| `re-validation-needed` | Was `validated`, but the contract has been revised since (build-time auto-flip when `Revisions[-1].date > last_validated_date`). |

**Conservative-judgment rule.** When the evidence is partial,
prefer `in-progress` over `validated`. The four-state
vocabulary is load-bearing because it lets the dashboard
distinguish "we haven't checked yet" (`unvalidated`) from "we've
checked partway, deferring multi-cohort confirmation" (`in-progress`)
from "we've fully confirmed and it's held" (`validated`).

### `last_validated_date` (required)

ISO `YYYY-MM-DD` string, or `null`.

- Required-and-non-null when `status` is `validated` or `re-validation-needed`.
  V3 (ERROR) fires on violations.
- Permitted-as-null when `status` is `unvalidated` or `in-progress`.
- V7 (WARNING) fires when the date is in the future (date-only ISO
  compare against today's UTC date — timezone-stable).

### `evidence` (required, list; may be empty)

Each evidence row is a structured record:

```yaml
- kind: test           # required, enum
  ref: packages/...    # required, repo-root-relative path or null
  date: 2026-05-12     # required, ISO YYYY-MM-DD or null
  notes: "..."         # optional, prose
```

Six-kind enum for `kind`:

| Kind | What it cites |
|---|---|
| `test` | A Vitest / Playwright / axe-core test file that exercises the contract |
| `chapter` | A real chapter MDX file that uses the components/patterns the contract specs |
| `review` | A `docs/reviews/*.md` review document |
| `deployment` | A production deployment artifact (URL, release tag, or cohort identifier) |
| `audit` | A pedagogy-audit invariant code (e.g. `V5`, `O1`) that enforces the contract |
| `manual` | An author's manual confirmation — a prose claim with date-stamped review |

**Deferred-evidence rows are valid.** Both `ref` and `date` may
be `null` to record intent-to-validate. Example:

```yaml
- kind: deployment
  ref: null
  date: null
  notes: "ASTR 201 fa26 cohort pending"
```

The audit treats null refs/dates as deliberate sentinels and
skips V5/V6 existence + format checks for those rows.

### `notes` (optional)

Free prose at the block level. Use for:

- Summarizing what's validated and what's deferred (most common).
- Recording the rationale when the assigned status is non-obvious.
- Flagging known limitations the dashboard reader should know about.

Per-row `notes` (under each evidence entry) is also supported and
narrates *that specific piece of evidence*. Reserve block-level
notes for the whole-contract gloss.

## Audit invariants V0–V8

The pedagogy audit (`pedagogy-audit.ts`) enforces nine invariants
against the validation surface. Three layers participate:

- **Schema layer** (`@sophie/core/schema` ValidationSchema, PR #43)
  — Zod parse + `refine()`. Catches malformed types at parse time.
- **Extractor layer** (`validation-extractor.ts`, PR #51) — reads
  raw frontmatter, runs ValidationSchema, emits V0 and V8 findings
  into `PedagogyIndex.extractorFindings`.
- **Audit layer** (`pedagogy-audit.ts`, PR #51) — surfaces V0 + V8
  from the extractor layer, plus V1–V7 against already-typed blocks.

The full severity table:

| Code | Severity | Layer | What it catches |
|---|---|---|---|
| V0 | ERROR | extractor | Validation block failed `ValidationSchema.safeParse` (malformed YAML, wrong types, bad enum value) |
| V1 | **ERROR** | audit | ADR is missing the `validation:` block entirely |
| V2 | **ERROR** | audit | Reference doc is missing the `validation:` block entirely |
| V3 | ERROR | audit | `status` is `validated` or `re-validation-needed` but `last_validated_date` is null. **Defense-in-depth**: the schema's `refine()` catches this at parse time + V0 surfaces parse failures; V3 here covers bypassed-extractor inputs (direct `ContractValidationEntry` construction in tests or future synthesizers). |
| V4 | ERROR | audit | `status` is `unvalidated` but `evidence` or `last_validated_date` is non-empty |
| V5 | ERROR | audit | Evidence `ref` does not exist on disk (refs are repo-root-relative; resolved via `AuditExtras.repoRoot`) |
| V6 | ERROR | audit | Evidence `date` is not a valid ISO `YYYY-MM-DD` |
| V7 | WARNING | audit | `last_validated_date` is in the future (date-only ISO compare against today's UTC date) |
| V8 | INFO | extractor | Validation block has an unknown key (Zod 4 `.strip()` silently drops them; V8 surfaces typos like `last_validation_date`) |

**V1 + V2 were WARNING during the migration rollout** (PRs 3–5) and
**graduated to ERROR in PR 6** after the bulk migration in PR #44
guaranteed every ADR + reference doc carries a block. New ADRs
created after PR 6 MUST land with the default block (see [Migration
guidance for new ADRs](#migration-guidance-for-new-adrs) below).

**V8 is INFO and never blocks CI.** `auditExitCode(report)` returns
0 when only INFO findings are present — V8 will fire whenever an
author experiments with a new key or fat-fingers an existing one,
and forcing a build break on that would erode the audit's signal
(per `explanation/audit-and-ai-authoring.md`).

**V3's defense-in-depth note matters.** Three things keep
`validated` blocks honest about their date:

1. The Zod schema's `.refine()` rejects malformed inputs at parse time.
2. The extractor emits V0 ERROR when the schema rejects.
3. V3 ERROR fires on inputs that bypass both — direct construction
   of `ContractValidationEntry` objects (tests, synthesizers).

Each layer catches a different failure mode; the redundancy is
the point.

## Per-page admonition rendering contract

PR #50 (`docs/website/scripts/validation-admonition-plugin.mjs`)
injects a MyST admonition at the top of every ADR and reference
doc. The admonition reads the page's frontmatter `validation:`
block and renders one of four states, each with its own CSS class
the docs theme styles independently:

| Frontmatter status | CSS class | Visual treatment |
|---|---|---|
| `unvalidated` | `validation-unvalidated` | Neutral grey — "no validation work yet" |
| `in-progress` | `validation-in-progress` | Amber — "partial validation, deferred work tracked" |
| `validated` | `validation-validated` | Green — "confirmed against shipped evidence" |
| `re-validation-needed` | `validation-re-validation-needed` | Red — "was validated, now stale post-revision" |

The admonition body lists the evidence rows as a bulleted list
with kind + ref + date columns. Missing-evidence rows
(`ref: null, date: null`) render with their `notes` only —
useful for "ASTR 201 fa26 cohort pending" sentinels.

### Staleness auto-flip

The plugin computes staleness at render time:

- It scans the page's `Revisions` section (if present) for the
  latest revision date.
- If `Revisions[-1].date > validation.last_validated_date`, it
  auto-flips the rendered class to `validation-re-validation-needed`
  **without mutating the frontmatter**.
- The dashboard at `/status/validation/` consumes the
  *as-authored* frontmatter, so the dashboard reports the
  declared state and the per-page admonition reports the
  effective-post-staleness state. The asymmetry is deliberate:
  the dashboard is for tracking-the-tracker; the per-page
  admonition is for in-context reader-confidence.

### Env-flag gating

The plugin is gated behind `SOPHIE_DOCS_INCLUDE_VALIDATION`:

- `SOPHIE_DOCS_INCLUDE_VALIDATION=1` (default in dev): renders the
  admonition + the dashboard page.
- `SOPHIE_DOCS_INCLUDE_VALIDATION=0`: skips both. The frontmatter
  data layer remains intact (it's still parsed and validated at
  build time); only the rendered output is suppressed.

The flag exists for pre-launch privacy — the validation surface
ships private until Sophie opens to external instructors, at
which point the default flips.

## Build-generated dashboard

The `/status/validation/` page is a build-generated artifact at
`docs/website/status/validation.md`. It carries a
`tags: [private]` frontmatter block — **note that MyST 1.x has no
`excludeTagged` mechanism today**; the tag is forward-compat for
when a public docs deployment ships. The actual privacy gates
right now are:

1. `SOPHIE_DOCS_INCLUDE_VALIDATION=0` — suppresses both the
   per-page admonition AND the dashboard regeneration, so the
   committed `status/validation.md` is the stale-but-safe snapshot
   when the flag is off.
2. The Sophie docs site being dev-only pre-launch — no public
   deployment exists yet to leak the dashboard.

When a public docs deployment is wired up, add
`status/validation.md` to `project.exclude:` in a separate
`myst.public.yml` or via a build wrapper script. Tracked as a
follow-up issue.

### Sections

The generator (`validation-index-generator.ts`, PR #52) emits five
sections in order:

1. **Frontmatter + generated-source banner** — `tags: [private]`
   plus an HTML-comment banner instructing readers not to
   hand-edit (overwritten on every regen).
2. **Status summary** — count per status + missing-block count + total.
3. **Evidence kinds cross-tab** — count per kind across all blocks.
4. **Extractor findings** — V0 + V8 counts and per-finding listing
   (or "no extractor findings" when the build is clean).
5. **Per-contract listing** — table grouped by ADRs / reference
   docs. Sorted alphabetically by path. Columns: contract path
   (linked to the rendered page), status, last validated date,
   evidence kinds (comma-joined), notes.

### Regeneration workflow

The smoke build's pagefind-postbuild pass runs with `cwd=examples/smoke`,
which has no `docs/website/` directory; the writer ENOENT-short-
circuits without writing. **The canonical regeneration path is the
explicit script**:

```bash
pnpm tsx scripts/regenerate-validation-index.mts
```

Run this script:

- After updating any `validation:` block on an ADR or reference doc.
- Before opening a PR that touches frontmatter on those files.
- As the last step in a curated-pass batch (so the dashboard ships
  in the same PR as the frontmatter edits).

The integration test in `validation-index-generator.integration.test.ts`
pins the committed `docs/website/status/validation.md` against the
output the generator would emit today; the test fails CI with a
hint to re-run the regen script when the committed dashboard
drifts from current frontmatter.

When `SOPHIE_DOCS_INCLUDE_VALIDATION=0` is set in the env, the
script returns early without writing — symmetric with the
admonition plugin's env-flag behavior.

## Migration guidance for new ADRs

After PR 6, V1 + V2 are ERROR-grade. **Every new ADR + reference
doc MUST ship with a `validation:` block** — the build will fail
otherwise.

### Default block for new ADRs

Copy this block into the frontmatter of any new ADR or reference
doc:

```yaml
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
```

The `decisions/template.md` file is exempt from V1 — the audit
skips templates explicitly.

### Status promotion conditions

| Promote to | When |
|---|---|
| `in-progress` | Contract is partially shipped (e.g. spec'd + extractor done, components pending), OR tests exist but no chapter callsite, OR multi-cohort outcomes still pending. Add at least one evidence row + set `last_validated_date`. |
| `validated` | Contract is fully shipped AND tested AND exercised in at least one real chapter (for content contracts) or one real consumer (for infra contracts). Add ≥1 evidence row of each applicable kind. |
| `re-validation-needed` | Build-time auto-flip when `Revisions[-1].date > last_validated_date`. The plugin handles this at render time; the frontmatter need not be manually set. If you DO want to set it manually (e.g. you know a revision is coming), the dashboard will surface it. |

Use the same conservative-judgment rule as the initial curated
pass: when in doubt, stay at `in-progress` and add a `notes`
field explaining what's deferred. The dashboard's "in-progress"
column is the honest middle ground.

## Updating an existing validation block

1. Edit the `validation:` block in the contract's frontmatter.
2. Update `last_validated_date` to today's ISO date if you're
   promoting status or adding new evidence.
3. Re-run `pnpm tsx scripts/regenerate-validation-index.mts`.
4. Commit both the contract edit and the regenerated dashboard
   in the same commit (or PR).

## Known limitations

Two architectural questions surfaced during the PR #59
comprehensive review were locked as deferrals rather than
implemented. Future work — particularly SoTL Paper #1 aggregation
— may revisit them; this section preserves the deferral context so
future readers find the rationale before re-litigating.

### V5 vs V9 escape-path split (deferred)

V5 currently fires ERROR when an evidence `ref` does not resolve on
disk, including for refs that are not repo-root-relative (the most
common author error). The reviewer's V9 split would carve the
"not-repo-root-relative" case into its own code with a distinct
message; the cleaner taxonomy would help SoTL Paper #1 aggregate
"author-confusion-about-ref-shape" separately from
"ref-pointing-at-deleted-file".

**Why deferred**: until Paper #1 actually aggregates V-series
findings, the V5 escape-path message ("must be repo-root-relative")
already disambiguates at the human-reader level. Promoting to V9 is
mechanical work whose value is unlocked only by the aggregation.

**Revisit**: when Paper #1 begins consuming the
`extractorFindings` + audit-findings stream.

### Dashboard evidence-kinds count semantics (deferred)

The dashboard's evidence-kinds cross-tab currently counts rows
including deferred-null-ref evidence (the "ASTR 201 fa26 pending"
sentinels — null `ref` + null `date` + prose notes). This inflates
the `deployment` count relative to actual shipped deployments. The
reviewer's split would annotate each kind as
`N total (M with deferred null-ref)` so the dashboard distinguishes
"intent-to-validate" from "validated".

**Why deferred**: the dashboard's current consumer is Anna; the
inflation is legible because she authored the sentinels. When Paper
#1 begins reading the dashboard, the annotation becomes
load-bearing.

**Revisit**: when Paper #1's authoring-conformance metrics begin
consuming the cross-tab — split annotation at that point, alongside
the V9 split above (both are Paper-#1-triggered).

## References

- [ADR 0056](../decisions/0056-validation-tracker.md) — the
  contract this reference doc specs.
- `docs/plans/2026-05-15-validation-tracker-design.md` —
  full design with the seven-question Q&A trace (in-repo only,
  not part of the published docs site).
- [ADR 0038](../decisions/0038-pedagogy-index-pattern.md) — the
  pedagogy-index pattern this design follows.
- [ADR 0047](../decisions/0047-empirical-validation-plan.md) —
  SoTL Paper #1, the downstream consumer of the dashboard's
  evidence-kinds cross-tab.
- [ADR 0051](../decisions/0051-chapter-status-course-versioning.md) —
  the sibling status surface for chapters (see the [comparison
  block above](#see-also-chapter-status-vs-contract-validation)).
- [explanation/audit-and-ai-authoring.md](../explanation/audit-and-ai-authoring.md) —
  canonical severity philosophy; V1–V8 follow it.
- [`packages/astro/src/lib/pedagogy-audit/runner.ts`](../../../packages/astro/src/lib/pedagogy-audit/runner.ts) —
  audit invariants V0–V8 source.
- [`packages/astro/src/lib/validation/extractor.ts`](../../../packages/astro/src/lib/validation/extractor.ts) —
  extractor (V0 + V8 source).
- [`packages/astro/src/lib/validation/index-generator.ts`](../../../packages/astro/src/lib/validation/index-generator.ts) —
  dashboard generator.
- [`scripts/regenerate-validation-index.mts`](../../../scripts/regenerate-validation-index.mts) —
  canonical regen entrypoint.
