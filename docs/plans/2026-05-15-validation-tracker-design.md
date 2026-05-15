---
title: "Validation tracker — contract-level validation status surface for Sophie docs"
date: 2026-05-15
status: brainstorm-locked; awaiting ADR draft
phase: Phase 3+ (docs-infrastructure; composes with ADR 0047 empirical-validation plan)
predecessor: validation-tracker brainstorm 2026-05-15 (this session); Anna's flag during the interactive-figures brainstorm
successor: future ADR (next available number)
---

# Validation tracker — contract-level validation status surface (design doc)

## Context

Sophie's docs site today carries five surfaces:

| Surface | What it answers |
|---|---|
| **Roadmap** (`status/roadmap.md`) | What's planned per phase. |
| **Decisions** (`decisions/*.md`) | Why each load-bearing choice was made. |
| **Reference** (`reference/*.md`) | What each contract specs. |
| **Status** (`status/changelog.md`, phase reports) | When each phase shipped. |
| **Reviews** (`docs/reviews/*.md`) | Audit grades for cross-cutting batches. |

**The missing surface**: *has each contract been validated against
real usage, with what evidence?* The validation tracker fills this
gap. It serves three audiences and one paper:

- **Anna (today)**: "What still needs validation work? Which
  contracts are stale post-revision?"
- **Anna (next semester)**: "What did I confirm held under ASTR 201
  fa26 cohort use, and where's the evidence?"
- **External instructors (post-launch)**: "Which contracts have
  empirical track records? Where's the evidence for adoption
  decisions?"
- **SoTL Paper #1** (ADR 0047): authoring-conformance evidence
  layer; the tracker IS the evidence-collection mechanism.

This design doc locks the substrate for the validation tracker.
**Pre-launch posture**: instructor-only / private; revisit visibility
when Sophie opens to external instructors.

## Decisions locked during brainstorming (2026-05-15)

Seven design questions, each answered through prose Q&A; all locked
before drafting this doc.

| # | Question | Decision |
|---|---|---|
| **1** | Scope — what artifacts get tracked | **B — ADRs + reference docs**. ~74 pages today; grows linearly. Plans inherit validation through their successor ADR. Explanation / how-to / tutorial pages aren't contracts and stay untracked. |
| **2** | Validation state vocabulary | **Option 3 — four-state**: `unvalidated` / `in-progress` / `validated` / `re-validation-needed`. Matches the natural lifecycle; staleness becomes an observable explicit state, not a build-time inference. |
| **3** | Evidence shape | **C — structured records + optional prose `notes` field**. Six-kind enum: `test` / `chapter` / `review` / `deployment` / `audit` / `manual`. Per-record `notes` for in-record caveats; block-level `notes` for scope-of-validation caveats. |
| **4** | Surface — index page vs. per-page | **B — dual surface**. Auto-generated `/status/validation/` index page + per-contract admonition rendered from frontmatter at the top of each ADR + reference doc. Status-keyed CSS class drives visual at-a-glance reading. |
| **5** | Authoring model | **A — manual authoring + build-time staleness detection only**. Status, evidence, notes are authored (AI-authored under Anna's supervision per ADR 0030; same pattern as TDR / pedagogy-contract / AI-contribution-ledger). Build-time detects staleness via `Revisions[-1].date > validation.last_validated_date` and auto-flips the rendered status. |
| **6** | CI integration | **A — informational only**. CI never blocks on validation state. The tracker pulls action through visibility, not pressure. |
| **7** | Public visibility | **B — instructor-only / private (pre-launch)**. Page excluded from the public docs build; Anna sees it during local dev. Revisit before Sophie opens to external instructors; flipping public later is a single-flag change. |

## Frontmatter schema

The `validation:` block lives in the frontmatter of every ADR
(`decisions/NNNN-*.md`) and every reference doc (`reference/*.md`).
Zod schema:

```typescript
// @sophie/core/schema/validation.ts (proposed path)

const ValidationKindSchema = z.enum([
  "test",        // automated test (unit / e2e / axe-core)
  "chapter",     // consumer chapter exercising the contract
  "review",      // audit review doc in docs/reviews/*
  "deployment",  // real-cohort deployment outcome (ASTR 201, COMP 521, etc.)
  "audit",       // audit-invariant pass-rate summary
  "manual",      // manual verification (human-reviewed; no automation)
]);

const ValidationEvidenceSchema = z.object({
  kind: ValidationKindSchema,
  ref: z.string().nullable(),    // file path / URL / null for deferred
  date: z.string().nullable(),   // ISO date / null for deferred
  notes: z.string().optional(),
});

const ValidationStatusSchema = z.enum([
  "unvalidated",
  "in-progress",
  "validated",
  "re-validation-needed",
]);

const ValidationSchema = z.object({
  status: ValidationStatusSchema,
  last_validated_date: z.string().nullable(),  // ISO; required when status is validated or re-validation-needed
  evidence: z.array(ValidationEvidenceSchema).default([]),
  notes: z.string().optional(),
});
```

## Frontmatter example

A typical post-validation block on a foundation ADR:

```yaml
---
date: 2026-05-14
implemented_in: "#39"
tags: [pedagogy, audit, foundation]
validation:
  status: validated
  last_validated_date: 2026-05-14
  evidence:
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit.test.ts
      date: 2026-05-13
      notes: "10 invariants covered; D4/D5/E1/E4/E6/F1/F2/F4/C1/O1/O2/K1"
    - kind: chapter
      ref: examples/smoke/src/content/modules/m1/c1-measuring-the-sky.mdx
      date: 2026-05-14
      notes: "1198-line real chapter; exercises all 10 invariants"
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: 2026-05-15
      notes: "Independent A-grade audit; D2 pedagogy-index pattern coherence = 19/20"
    - kind: deployment
      ref: null
      date: null
      notes: "ASTR 201 fa26 deployment pending"
  notes: |
    Build-time + smoke-environment validation is complete. Real-cohort
    deployment evidence (HSI outcomes data) is part of B9 (Learning
    Telemetry), deferred per ADR 0047 outcome-side paper gating.
---
```

An unvalidated block (default for new ADRs):

```yaml
---
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---
```

An in-progress block (validation work has started):

```yaml
---
validation:
  status: in-progress
  last_validated_date: null
  evidence:
    - kind: test
      ref: packages/astro/src/lib/scene-registry.test.ts
      date: 2026-06-15
      notes: "8 of 12 IF-invariants covered; remaining 4 in flight"
---
```

## Rendered admonition (per-contract page surface)

A custom MyST directive — `:::{validation}` — reads the frontmatter
block and emits an admonition at the top of the doc body (after the
H1 + ADR-metadata admonition where applicable):

```markdown
:::{admonition} Validation
:class: validation-validated
- **Status:** validated
- **Last validated:** 2026-05-14
- **Evidence:** ✓ test (2026-05-13) · ✓ chapter (2026-05-14) · ✓ review (2026-05-15) · ⏸ deployment (deferred)
- **Notes:** Build-time + smoke-environment validation is complete. Real-cohort deployment evidence (HSI outcomes data) is part of B9 (Learning Telemetry), deferred per ADR 0047 outcome-side paper gating.
:::
```

Status-keyed CSS classes drive visual presentation (proposed
palette ties to `@sophie/theme` tokens):

| Class | Background tint | Left-edge stripe |
|---|---|---|
| `validation-unvalidated` | `--sophie-bg-neutral-subtle` | `--sophie-border-neutral` |
| `validation-in-progress` | `--sophie-bg-info-subtle` | `--sophie-border-info` |
| `validation-validated` | `--sophie-bg-success-subtle` | `--sophie-border-success` |
| `validation-re-validation-needed` | `--sophie-bg-warning-subtle` | `--sophie-border-warning` |

Evidence row icons: `✓` for present-with-date; `⏸` for deferred
(ref + date both `null`); `?` for present-but-undated.

## Generated index page

A Vite/MyST plugin walks `decisions/` + `reference/` at build time,
collects all `validation:` blocks, and emits a generated page at
`docs/website/status/validation.md`. The page's layout:

```markdown
# Validation status

> Auto-generated from frontmatter on each ADR + reference doc.
> See [validation tracker design](../../plans/2026-05-15-validation-tracker-design.md)
> for what each status means.

## Summary

| Status | Count |
|---|---:|
| Validated | 12 |
| In progress | 8 |
| Re-validation needed | 3 |
| Unvalidated | 51 |
| **Total** | **74** |

## By kind of evidence (across validated + in-progress contracts)

| Kind | Contracts with this evidence type |
|---|---:|
| test | 18 |
| chapter | 9 |
| review | 6 |
| audit | 4 |
| deployment | 0 |
| manual | 2 |

## All contracts

| Contract | Status | Last validated | Evidence | Notes |
|---|---|---|---|---|
| [ADR 0001 Platform not monorepo](../decisions/0001-platform-not-monorepo.md) | validated | 2026-05-12 | test · chapter | — |
| [ADR 0007 Persistence IndexedDB](../decisions/0007-persistence-indexeddb.md) | validated | 2026-05-14 | test · chapter · review | CF5 fallback covered |
| [ADR 0042 Pedagogy contract + AI ledger](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) | re-validation-needed | 2026-04-30 | test · chapter | Revised 2026-05-15 — ai_workflow block changed |
| [ADR 0046 Equation biography](../decisions/0046-equation-biography.md) | unvalidated | — | — | — |
| … | | | | |
```

The "By kind of evidence" cross-tabulation is the natural source for
SoTL Paper #1's authoring-conformance metrics ("X% of contracts have
test+chapter evidence; Y% have deployment evidence; Z% have
multi-cohort longitudinal evidence").

## Build-time staleness detection

The single automated transition: `validated` → `re-validation-needed`
when the contract has been revised post-validation.

Detection logic (pseudocode):

```typescript
function detectStaleness(doc: ContractDoc): ValidationStatus {
  const { validation } = doc.frontmatter;
  if (validation.status !== "validated") return validation.status;

  const lastRevisedDate = getLastRevisionDate(doc);
  if (lastRevisedDate === null) return "validated";

  if (lastRevisedDate > validation.last_validated_date) {
    return "re-validation-needed";
  }
  return "validated";
}

function getLastRevisionDate(doc: ContractDoc): Date | null {
  // For ADRs: look at the Revisions section (post-implementation).
  // For reference docs: look at git history (most recent edit excluding
  //   typo/formatting commits — conventional commits filtered).
  // Falls back to frontmatter `date` if neither signal is present.
}
```

The auto-flip is **render-time only**. The frontmatter source still
says `status: validated`; the rendered admonition shows
`re-validation-needed` until the author manually re-confirms (which
updates `last_validated_date` to a newer date and the staleness
flag clears).

This keeps the audit trail honest: the author's last *committed*
validation claim is preserved in frontmatter; the platform flags
when that claim no longer applies.

## Plugin / pipeline architecture

Two build-time hooks; both follow the pedagogy-index pattern
(ADR 0038):

### Hook 1: Per-contract admonition renderer

A MyST plugin (`@sophie/myst-validation-admonition`, proposed
package name) reads the `validation:` frontmatter block and inserts
a `:::{admonition}` directive into the AST after the H1 (and after
the ADR-metadata admonition for ADRs). Runs during MyST's transform
phase; no separate build step.

The plugin also runs the staleness-detection logic and rewrites the
rendered status accordingly.

### Hook 2: Index page generator

A Vite plugin (`@sophie/vite-validation-index`, proposed) walks
`docs/website/decisions/*.md` + `docs/website/reference/*.md` at
build time, parses each frontmatter, aggregates into the index
shape, and emits `docs/website/status/validation.md` as a generated
file.

The generated file:

- Lives outside source control (gitignored or emitted to a build dir).
- Is regenerated on every build.
- Carries a header noting auto-generation + link back to this design
  doc / future ADR.

Both plugins follow the same architectural pattern as
`pedagogy-index-extractor.ts` (ADR 0038): pure functions over
frontmatter, integrated via the Sophie integration entry point.

## Private rendering posture (pre-launch)

Per Q7 lock, the tracker is private for now. Two implementation
mechanisms (final choice in the ADR; both viable):

| Mechanism | How it works |
|---|---|
| **Build flag** | `SOPHIE_DOCS_INCLUDE_VALIDATION=1 npx mystmd build` enables the tracker; default omits. Per-contract admonitions and the index page both gated. |
| **MyST toc / frontmatter tag** | Tracker pages carry `tags: [private]`; the public-build MyST config filters them out. Local dev includes everything. |

Either way, **the frontmatter `validation:` blocks always exist** in
each ADR + reference doc. Only the rendering / index-page emission
is gated. When Anna decides to flip public, it's a single config
change — no migration, no content rewrite.

## Migration plan

Backfilling 74 existing contracts is the largest one-time cost. Two
approaches:

| Approach | Effort | Quality |
|---|---|---|
| **Bulk default-unvalidated.** A single PR adds `validation: { status: unvalidated, last_validated_date: null, evidence: [] }` to every ADR + reference doc. | ~30 min (mostly mechanical) | All 74 start at `unvalidated`; Anna graduates them organically as validation work happens. |
| **Curated initial pass.** Anna (with AI authoring) audits each contract and assigns initial status + evidence based on existing test/chapter/review state. | ~4–8 hours | More accurate starting state; the index page is useful immediately rather than after months of organic graduation. |

Recommendation: **bulk default-unvalidated** for the schema rollout
PR; **then a follow-up curated pass** that lifts the substantial
contracts (foundation ADRs, ADR 0007, ADR 0038, ADRs 0040–0046,
0047–0054) to their actual current state. The follow-up runs after
the schema and tooling have settled so changes to authoring don't
churn the curated evidence.

## Audit / validation invariants

The tracker introduces a small set of self-referential invariants —
the audit checks the validation blocks for shape:

| Code | Check | Severity |
|---|---|---|
| **V1** | Every ADR (`decisions/NNNN-*.md`) has a `validation:` block | WARNING (rollout grace); promote to ERROR after migration |
| **V2** | Every reference doc (`reference/*.md`) has a `validation:` block | WARNING (rollout grace); promote to ERROR after migration |
| **V3** | If `status: validated` or `re-validation-needed`, `last_validated_date` is non-null | ERROR |
| **V4** | If `status: unvalidated`, `evidence: []` and `last_validated_date: null` | ERROR (catches stale half-filled blocks) |
| **V5** | Every evidence `ref:` that's non-null resolves to a real file or URL | ERROR (build-time file-existence check) |
| **V6** | Evidence `date:` values are valid ISO dates | ERROR |
| **V7** | `last_validated_date` is not in the future | WARNING |

Severity philosophy follows the canonical
[audit-and-ai-authoring.md](../website/explanation/audit-and-ai-authoring.md):
ERROR = catastrophic-if-deployed; WARNING = reviewable; INFO = surfaced.

## Test strategy

- **Unit tests** on the MyST plugin:
  - Frontmatter parse + Zod validation.
  - Admonition emission for each of four states.
  - Staleness detection across {has Revisions / no Revisions} × {recent / stale}.
  - CSS class assignment.
- **Unit tests** on the Vite plugin:
  - Index page generation from fixture frontmatter sets.
  - Summary count accuracy.
  - Cross-tabulation of evidence kinds.
- **e2e (Playwright)**:
  - Render a fixture chapter with a validation admonition; verify visual class + content.
  - Render the generated index page; verify table content matches fixture frontmatter.
  - axe-core on both rendered surfaces.
- **Audit invariant tests**: one fixture per V1–V7 firing the right severity.

## Open questions for follow-up ADR

These don't block the substrate; they're surface decisions the ADR
should lock:

1. **Severity philosophy: where does validation state sit relative
   to ADR `status:`?** ADR `status: accepted` is a lifecycle claim;
   `validation: validated` is an empirical-confidence claim. They're
   orthogonal but their wording overlaps. Worth a one-paragraph
   reconciliation in the ADR.
2. **Cross-cutting validation records.** Some contracts span
   multiple ADRs (e.g., the pedagogy-index pattern spans ADR 0038 +
   a dozen consumer components). One validation block per ADR with
   shared evidence references? Or a meta-validation record? v1
   default: one block per contract page; shared evidence cited by
   reference. Revisit if pattern emerges.
3. **AI authoring kit integration.** The `chapter-drafter` and
   future `validation-tracker-skill` should be able to draft
   validation entries. Likely a CLI surface (`sophie validation
   draft <adr-id>`) that the skill consumes. Defer to ADR.
4. **Exact admonition title / wording.** "Validation" vs "Validation
   status" vs "Empirical status." Defer to ADR + Anna's preference.
5. **Index page navigation placement.** Under "Status" section in
   the MyST toc? Sibling to roadmap/changelog? Defer to ADR.
6. **Private-rendering mechanism.** Build flag vs. MyST tag-based
   exclusion vs. separate-target build. Both viable; ADR picks one.
7. **Re-validation prompts.** When a contract auto-flips to
   `re-validation-needed`, should the tracker surface a "draft
   re-validation entry" prompt? Likely a future Sophie audit-skill
   feature; defer.
8. **Validation block migration backfill ordering.** Foundation ADRs
   first? By ADR number? By feature graduation date? Defer to ADR or
   to the migration-PR description.

## Validation hooks (self-referential)

When the validation tracker ships, its own ADR + reference doc get
`validation:` frontmatter blocks. The tracker tracks itself. The
status at-ship is `in-progress` with evidence:

- `kind: test` — the MyST/Vite plugin unit + e2e tests.
- `kind: chapter` — Sophie's own ADR + reference docs as the
  consumer set (74 callsites).

Graduates to `validated` once the curated initial-pass migration PR
lands and the tracker's at-a-glance reading proves accurate against
manual spot-check.

## References

- [interactive-figures design doc](2026-05-15-interactive-figures-design.md) —
  predecessor brainstorm; its validation-hooks placeholder points here.
- [overview.md §14](../website/overview.md) — current state, including
  the 74-ish contract count this design pre-computes.
- [ADR 0030](../website/decisions/0030-audience-and-ai-author-model.md) —
  AI-primary authoring; validation entries are AI-authored under
  Anna's supervision.
- [ADR 0038](../website/decisions/0038-pedagogy-index-pattern.md) —
  pattern this design follows (frontmatter declaration + build-time
  index emitter + per-page surface).
- [ADR 0042](../website/decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md) —
  pedagogy-contract + AI-ledger; precedent for structured-records-
  plus-notes frontmatter shape.
- [ADR 0047](../website/decisions/0047-empirical-validation-plan.md) —
  empirical-validation plan; validation tracker IS Paper #1's
  evidence-collection mechanism.
- [contributing/adr-process.md](../website/contributing/adr-process.md) —
  state-dependent ADR editing; Revisions section is the signal
  staleness detection consumes.
- [explanation/audit-and-ai-authoring.md](../website/explanation/audit-and-ai-authoring.md) —
  canonical severity philosophy; V1–V7 invariants follow it.
- Predecessor design docs in the same shape:
  [`<Aside>`](2026-05-13-aside-design.md),
  [`<InteractiveFigure>`](2026-05-15-interactive-figures-design.md).
