---
date: 2026-05-15T00:00:00.000Z
tags:
  - foundation
  - validation
  - docs-infrastructure
  - audit
  - sotl
validation:
  status: validated
  last_validated_date: "2026-05-16"
  evidence:
    - kind: test
      ref: packages/core/src/schema/validation.test.ts
      date: "2026-05-15"
      notes: "ValidationSchema + V3 refinement parse coverage (PR #43)."
    - kind: test
      ref: packages/astro/src/lib/validation-extractor.test.ts
      date: "2026-05-15"
      notes: "Extractor + V0/V8 finding emission (PR #51)."
    - kind: test
      ref: packages/astro/src/lib/pedagogy-audit.test.ts
      date: "2026-05-16"
      notes: "V1–V7 audit invariants tested; V1+V2 ERROR-grade (PR 6 Workstream C)."
    - kind: test
      ref: packages/astro/src/lib/validation-admonition-plugin.test.ts
      date: "2026-05-15"
      notes: "Per-page admonition rendering tested (PR #50)."
    - kind: test
      ref: packages/astro/src/lib/validation-admonition-plugin.axe.test.ts
      date: "2026-05-15"
      notes: "axe-core a11y coverage for the admonition (PR #50)."
    - kind: test
      ref: packages/astro/src/lib/validation-admonition-plugin.integration.test.ts
      date: "2026-05-16"
      notes: "Every-contract integration test extended to walk all ADR + reference doc artifacts (PR 6 Workstream E)."
    - kind: test
      ref: packages/astro/src/lib/validation-index-generator.test.ts
      date: "2026-05-15"
      notes: "Dashboard generator unit tests (PR #52)."
    - kind: test
      ref: packages/astro/src/lib/validation-index-generator.integration.test.ts
      date: "2026-05-16"
      notes: "Committed dashboard pinned against generator output (PR 6 Workstream E)."
    - kind: test
      ref: packages/astro/src/lib/validation-index-writer.test.ts
      date: "2026-05-15"
      notes: "Writer env-flag + I/O wrapper tests (PR #52)."
    - kind: audit
      ref: packages/astro/src/lib/pedagogy-audit.ts
      date: "2026-05-16"
      notes: "Audit invariants V0–V8 live; V1+V2 ERROR-grade post PR 6."
    - kind: chapter
      ref: docs/website/status/validation.md
      date: "2026-05-16"
      notes: "Build-generated dashboard reports 78 contracts: 12 validated, 14 in-progress, 52 unvalidated."
    - kind: manual
      ref: docs/website/reference/validation-tracker.md
      date: "2026-05-16"
      notes: "Companion reference doc shipped (PR 6 Workstream A); itself graduated to validated in this same PR."
    - kind: review
      ref: docs/reviews/2026-05-15-bucket-b-c-architecture-audit.md
      date: "2026-05-15"
      notes: "Architecture audit confirms the pedagogy-index pattern this tracker extends held under bucket B+C work."
    - kind: deployment
      ref: null
      date: null
      notes: "Public visibility flip + external-instructor adoption deferred per ADR 0056 §Decision item 7."
  notes: "All six PRs (#43 schema, #44 bulk migration, #50 admonition, #51 audit, #52 index, this PR curated-pass + reference doc + V1/V2 promotion) shipped. Self-referential validation complete; tracker is the source of truth for every ADR + reference doc's validation state as of 2026-05-16."
---

# ADR 0056: Validation tracker — contract-level validation status surface

:::{admonition} ADR metadata
- **Status**: proposed
- **Deciders**: anna
:::

## Context

Sophie's docs site today carries five surfaces — roadmap (what's
planned), decisions (why), reference (what each contract specs),
status (when phases shipped), reviews (audit grades for cross-cutting
batches). What it doesn't carry: **for each contract, has it been
validated against real usage, with what evidence?**

The gap matters to four readers:

- **Anna (today)**: which contracts still need validation work; which
  flipped to stale post-revision.
- **Anna (next semester)**: what was confirmed under ASTR 201 fa26
  cohort use, and where's the evidence trail.
- **External instructors (post-launch)**: which contracts have
  empirical track records for adoption decisions.
- **SoTL Paper #1** ([ADR 0047](0047-empirical-validation-plan.md)):
  the validation tracker IS the evidence-collection mechanism Paper
  #1's authoring-conformance metrics will aggregate.

Sophie has ~74 contracts today (54 ADRs + ~20 reference docs) and
the count grows linearly. A surface for declaring + browsing
validation state is now load-bearing infrastructure, not a v2 polish.

The full design is captured in
[`docs/plans/2026-05-15-validation-tracker-design.md`](file:///Users/anna/Teaching/sophie/docs/plans/2026-05-15-validation-tracker-design.md);
seven brainstorm questions were locked through prose Q&A on
2026-05-15 (interactive-figures + validation-tracker were the
session's two parallel design tracks). This ADR formalizes those
locks as a binding contract.

## Decision

Sophie ships a **validation tracker** with seven properties:

1. **Scope**: every ADR (`decisions/NNNN-*.md`) and every reference
   doc (`reference/*.md`) carries a `validation:` frontmatter block.
   Plans / explanation / how-to / tutorial pages don't.
2. **State vocabulary**: four states — `unvalidated`, `in-progress`,
   `validated`, `re-validation-needed`. Build-time auto-flip from
   `validated` to `re-validation-needed` when
   `Revisions[-1].date > validation.last_validated_date`.
3. **Evidence shape**: structured records with optional per-record
   and block-level `notes` fields. Six-kind enum:
   `test` / `chapter` / `review` / `deployment` / `audit` / `manual`.
4. **Surface**: dual — per-contract `:::{admonition} Validation`
   block rendered at the top of each ADR + reference doc, plus an
   auto-generated `/status/validation/` index page aggregating all
   blocks.
5. **Authoring model**: manual (AI-authored under Anna's supervision
   per [ADR 0030](0030-audience-and-ai-author-model.md)). Build-time
   does *only* staleness detection; no other auto-inference.
6. **CI integration**: informational only. CI never blocks on
   validation state.
7. **Public visibility (pre-launch)**: instructor-only / private.
   Tracker pages + per-contract admonitions excluded from the public
   docs build via a build flag. Revisited before Sophie opens to
   external instructors; flipping public is a single config change.

## Rationale

- **The gap is real and load-bearing.** ADR 0047's empirical-
  validation plan assumes evidence-collection infrastructure exists;
  it doesn't, yet. Building the tracker now means Paper #1's
  authoring-conformance metrics have a source-of-truth from day one,
  rather than being reconstructed from commit history later.
- **Frontmatter + build-time emission matches Sophie's existing
  pattern.** The pedagogy-index ([ADR 0038](0038-pedagogy-index-pattern.md))
  pattern is: declare at the doc level; aggregate at build time;
  surface twice (in-context + indexed). Validation follows the same
  shape. No new architecture; minimal new infrastructure.
- **Four-state vocabulary captures the lifecycle without
  over-engineering.** The fourth state (`re-validation-needed`)
  exists because Sophie's
  [state-dependent ADR editing rule](../contributing/adr-process.md)
  means contracts get revised post-acceptance; without an explicit
  staleness state, validation claims silently drift to lies.
- **Manual authoring respects HITL.** Validation is a supervisory
  claim ("I've reviewed the evidence and confirm the contract
  holds"). Per [ADR 0030](0030-audience-and-ai-author-model.md), the
  instructor is supervisor and final decider; auto-inference would
  make the platform the validator. Staleness auto-detection is the
  only safe automation — it raises a flag, doesn't make a claim.
- **Informational CI keeps the audit-presence trap from
  compounding.** Per [audit-and-ai-authoring.md](../explanation/audit-and-ai-authoring.md),
  audit invariants are gameable-by-design at the contract layer;
  making validation a hard CI gate would create pressure to mark
  contracts validated just to ship, which compounds the audit-lie
  failure mode rather than mitigating it.
- **Private-by-default pre-launch keeps the door open.** Anna is
  patient zero; the tracker's data shape will iterate. Public
  visibility is reversible (one build flag); pre-publishing a still-
  iterating shape risks confusing external readers.

## Alternatives considered

The seven brainstorm questions surfaced ~22 candidate options total;
the most significant rejected alternatives:

- **Wider scope — track every docs page (Q1 Option C/D)**: rejected
  because explanation / how-to / tutorial pages aren't contracts —
  they're informational. Tracking their "validation" misuses the
  vocabulary. Plans (Q1 Option C) are transitional → ADRs; tracking
  them duplicates the eventual ADR validation state.
- **Binary state vocabulary (Q2 Option 1)**: rejected because
  staleness becomes a build-time inference rather than an explicit
  observable state. Contract revisions silently invalidate prior
  validation; the tracker reports stale "validated" claims as
  current.
- **Free-text prose evidence (Q3 Option A)**: rejected because it
  blocks build-time evidence-integrity checks (file existence,
  date validity), filtering on the index page, and Paper #1's
  cross-tabulation of evidence kinds.
- **Auto-inference of validation status (Q5 Option B)**: rejected
  because heuristics ("tests pass + chapter deployed → validated")
  conflate test-pass with empirical-confirmation. Wrong inference
  marks contracts validated when they aren't — exactly the audit-
  lie failure ADR 0047 was written to prevent.
- **Hard CI gate (Q6 Option C)**: rejected because pre-launch
  Sophie has 51-of-74 contracts unvalidated by default; flipping
  the gate today would brick the repo. Also conflicts with HITL —
  the platform deciding what ships supersedes the instructor's
  authority.
- **Public visibility from launch (Q7 Option A)**: deferred (not
  rejected) — Anna's call as patient zero is to let the data shape
  settle before exposing externally. Revisited when Sophie opens to
  external instructors.

## Consequences

### Easier

- **SoTL Paper #1 evidence aggregation.** The index page's cross-
  tabulation of evidence kinds is directly consumable by Paper #1's
  authoring-conformance metrics.
- **Onboarding new contracts.** Every new ADR (and reference doc)
  ships with a default `unvalidated` validation block; the tracker
  surfaces the new contract immediately. Discipline is automatic at
  authoring time.
- **In-context confidence reading.** A reader landing on
  ADR 0042 (or any contract) sees its current validation state at
  the top of the page without context-switching to the tracker.
- **AI authoring kit composability.** Future skills (chapter-drafter,
  audit-reporter, validation-tracker-skill) consume the structured
  validation records introspectably.

### Harder

- **Migration burden.** ~74 existing contracts need backfilled
  `validation:` frontmatter blocks. Mitigated by the two-pass plan
  in the design doc: bulk default-unvalidated PR first, curated
  initial-pass after tooling stabilizes.
- **Frontmatter discipline.** Every new ADR + reference doc now
  carries a validation block. The audit invariants V1–V2 fire
  WARNING during rollout grace and promote to ERROR after migration
  completes.
- **Build-time staleness detection cost.** Computing
  `Revisions[-1].date > validation.last_validated_date` per contract
  per build adds a small build-time pass. Cheap (~74 frontmatter
  reads + a regex over Revisions sections); negligible against
  Sophie's existing pedagogy-index extraction.

### Triggers

- **Implementation work (Phase 3)**: MyST plugin
  (`@sophie/myst-validation-admonition`) for per-page admonition
  rendering; Vite plugin (`@sophie/vite-validation-index`) for the
  generated index page. Both follow the pedagogy-index pattern.
- **Reference doc**: a `reference/validation-tracker.md` companion
  reference doc that specs the frontmatter schema, the admonition
  rendering contract, and the audit invariants V1–V7.
- **Migration PRs**: (a) bulk default-unvalidated frontmatter blocks
  added to all 74 contracts; (b) curated initial-pass that lifts
  substantial contracts to actual current state.
- **Build flag wiring**: `SOPHIE_DOCS_INCLUDE_VALIDATION=1` (or a
  MyST tag-exclusion mechanism — implementation chooses) for
  pre-launch private rendering.
- **Future ADR (when Sophie opens to external instructors)**: revisit
  Q7 — flip visibility from private to public; potentially adjust
  evidence-record references to sanitize FERPA-sensitive paths.
- **Self-referential validation**: this ADR + its reference doc
  carry their own validation blocks; graduate from `in-progress` to
  `validated` once the migration completes and the tracker's
  accuracy is spot-check-verified.

## References

- [`docs/plans/2026-05-15-validation-tracker-design.md`](file:///Users/anna/Teaching/sophie/docs/plans/2026-05-15-validation-tracker-design.md) —
  full design with frontmatter schema, plugin architecture,
  migration plan, V1–V7 audit invariants, open questions.
- [ADR 0030](0030-audience-and-ai-author-model.md) — AI-primary
  authoring; validation entries are AI-authored under Anna's
  supervision.
- [ADR 0038](0038-pedagogy-index-pattern.md) — pattern this design
  follows (frontmatter declaration + build-time emitter + dual
  surface).
- [ADR 0042](0042-pedagogy-contract-and-ai-contribution-ledger.md) —
  precedent for structured-records-plus-notes frontmatter shape.
- [ADR 0047](0047-empirical-validation-plan.md) — empirical-
  validation plan; this tracker is Paper #1's evidence-collection
  mechanism.
- [contributing/adr-process.md](../contributing/adr-process.md) —
  state-dependent ADR editing; Revisions section is the signal
  staleness detection consumes.
- [explanation/audit-and-ai-authoring.md](../explanation/audit-and-ai-authoring.md) —
  canonical severity philosophy; V1–V7 invariants follow it.
