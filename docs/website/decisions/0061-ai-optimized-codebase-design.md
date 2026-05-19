---
date: 2026-05-18T00:00:00.000Z
tags:
  - architecture
  - codebase-design
  - ai-authoring
  - philosophy
  - foundation
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0061: AI-optimized codebase design

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0023](./0023-vertical-slice-build-order.md), [0030](./0030-audience-and-ai-author-model.md)
- **Related**: [0058](./0058-epistemic-component-contract.md), [0060](./0060-registry-ecosystem.md)
:::

## Context

[ADR 0030](./0030-audience-and-ai-author-model.md) established AI as
Sophie's *primary author of content* (textbook prose, components,
chapters), with the instructor as supervisor. What ADR 0030 left
implicit — and what the 2026-05-18 post-PR-A codebase audit made
explicit — is that **AI is also Sophie's primary author of platform
code**. Anna spends supervisor time reviewing and directing PRs;
nearly all line-level Sophie code is written through AI-assisted
coding sessions (Claude Code or equivalent).

That observation has structural consequences the existing ADRs don't
address. The audit caught two patterns:

1. **The `pedagogy-index-extractor.ts` file at 2,454 LOC and
   `pedagogy-audit.ts` at 1,478 LOC** reached those sizes by
   accretion. Each PR added ~50–200 LOC. No structural pressure
   caught them at 500, 800, or 1,500 LOC. By 2,400 LOC the file is
   actively hostile to AI-assisted editing: `Edit` tool collisions
   on common patterns (`z.object({`, `describe(`), large context-
   window cost per read, no filename-based discovery of related
   functions.

2. **Doc drift after the `<EqRef>` → `<EquationRef>` hard rename**.
   The rename was atomic in code (Batch 5a of PR-A deleted the
   directory + migrated every callsite in one commit). But 12
   references to the old shape persisted across vision /
   explanation / decisions / overview docs, *including ADR 0045's
   own diff-CI examples*. Stale ADR examples become bad templates
   the next AI session copies → wrong shape → audit errors.

The deeper issue is that **the codebase itself is one of the tools
AI uses to extend Sophie**. A codebase organized only for human
readability (large aggregate files, sparse filenames, inline
templates buried mid-file) imposes a continuous tax on every AI
authoring session. A codebase organized with AI-assisted authoring
as a first-class concern compounds the other way: each well-shaped
file is a template the next session copies, each focused module is
a cheap context load, each filename-as-content-key is a routing
shortcut.

[ADR 0023](./0023-vertical-slice-build-order.md) said *"refactor
outward as patterns emerge."* The patterns have emerged. The
post-PR-A audit is the trigger for the outward refactor — but
applied with one explicit lens: **what does this do to AI-assisted
authoring?**

## Decision

Adopt **AI-optimized codebase design** as a first-class architectural
principle, with effect from this ADR forward. Six concrete rules
follow.

### Rule 1 — Prefer many focused files over giant aggregates

When two design shapes serve the same role, prefer the one with more
focused files. Sibling-files-with-similar-shape is a *template
surface* the AI uses to add new entries mechanically.

Concrete: `schema/intervention.ts` (159 LOC) + `schema/multirep.ts`
(137 LOC) + `schema/equation-biography.ts` (158 LOC) are templates
the AI can copy when adding a new entry type. `schema/pedagogy-index.ts`
inlining 13 simpler entry types in a 420-LOC aggregate is *not* a
template — it's a registry the AI has to mentally parse to extract
the pattern.

### Rule 2 — Optimize for `Write`-new-file over `Edit`-into-giant-file

When extending the codebase, prefer adding a new file over editing
a large existing one. `Edit` tool reliability degrades non-linearly
with file size: collision risk on common patterns (`z.object({`,
`describe(`, `export const`) rises, required surrounding context
balloons, and the failure mode is silent (wrong edit applied to
wrong section).

`Write` of a new file has zero collision risk and verifies its own
shape via the type system + tests.

### Rule 3 — File-level LOC budget

Apply a soft per-file LOC budget as a Biome custom rule or CI gate:

- **300 LOC — info**: review whether a split would help; not required.
- **500 LOC — warning**: split planned for the next refactor cycle.
- **800 LOC — error**: split required before the next feature PR.

These thresholds catch accretion at the cost-of-fix order of
magnitude where it's still cheap (a 600-LOC file is ~1 hour to
split; a 2,400-LOC file is the C1 effort: ~3 hours plus blast-radius
risk).

Exemptions: schema *registry* files (zod definitions only, no logic)
and barrel files (`index.ts` re-exports only) get a higher threshold
because they're scannable end-to-end; their growth dynamic is
different from procedural code.

### Rule 4 — Filename as discovery key

A file's name should answer the question *"if I'm working on X,
which file do I open?"* Filename routing (`grep -l X .` returns the
right file) is the AI's primary discovery surface. Naming patterns:

- One file per entry type (`schema/definition.ts`,
  `schema/key-insight.ts`) rather than `schema/entries.ts`.
- One file per invariant *family* (`audit/invariants/registry.ts`,
  `audit/invariants/biography.ts`) rather than `audit/checks.ts`.
- One file per extractor pass (`pedagogy-index/extractors/figures.ts`)
  rather than `pedagogy-index/extract-all.ts`.

### Rule 5 — Docs land atomically with code

When a code change renames, reshapes, or replaces anything that
appears in `docs/website/` (component names, prop shapes, ADR
examples, schema fields, MyST TOC entries), the docs updates land
in the *same PR* as the code change. No deferred "doc-update
follow-up" tickets.

Rationale: docs are *templates the AI copies* when authoring new
content. Stale ADR examples are worse than missing ADRs — they
actively mislead the next session. See
[[feedback_docs_no_drift]] for the failure-mode log (12 stale
`<EqRef>` references caught in the 2026-05-18 audit).

### Rule 6 — Tests split with source

When a source file is split per Rules 1–3, the corresponding test
file splits along the same seams. A 910-LOC test file is where the
AI does its most concentrated editing; the AI-optimization wins
compound for tests at least as much as for source.

Concrete: `pedagogy-index.test.ts` (910 LOC) splits when
`pedagogy-index.ts` splits; `pedagogy-index-extractor.test.ts`
(2,540 LOC) splits as part of C3 in the locked Bucket-C plan.

## Consequences

### Codebase-shape consequences

The 2026-05-18 post-PR-A audit Bucket-C plan expands per these rules:

| Item | Pre-ADR-0061 disposition | Post-ADR-0061 disposition |
|------|--------------------------|---------------------------|
| **C1** `pedagogy-index-extractor.ts` split (2,454 → 11 files in `pedagogy-index/`) | Locked | Locked |
| **C2** `pedagogy-audit.ts` split (1,478 → 14 invariant files in `pedagogy-audit/`) | Locked | Locked |
| **C3** Test-file restructuring (post-C1/C2) | Locked | Locked, expanded scope (Rule 6) |
| **C4** `schema/pedagogy-index.ts` (420 LOC) | "Don't split" | **Domain-group split**: ~6 files in `pedagogy-index-entries/` (Rule 1) |
| **C5** `lib/validation/` cluster grouping (4 files, 835 LOC) | "P2 candidate" | **Locked** (Rules 1 + 4) |
| **C7** `aside-positioning.ts` (259 LOC) seam split | "P4 defer" | **Active** — split `compute-placements.ts` (pure) + `install-positioning.ts` (DOM) (Rule 4) |
| **P6** LOC budget as Biome rule | "Future maturity" | **Ship in same arc** (Rule 3) |

### Doc-discipline consequences

The audit's P1 doc-drift sweep (12 files referencing `<EqRef>` or
pre-rename `<KeyEquation id title>`) becomes a Bucket-B item — not
because it was undone in PR-A, but because Rule 5 retroactively
requires it.

Future PRs that rename/reshape Sophie code automatically include
their doc updates by this ADR's authority. Reviewers (human or AI)
should flag PRs that touch authoring shapes but don't include doc
updates.

### Out-of-scope (intentionally)

- **No required-LOC budget per *function*.** Functions can grow
  larger than files; the AI-edit dynamic is per-file (where `Edit`
  collisions live), not per-function.
- **No mandate to split barrel files.** `packages/components/src/index.ts`
  at 293 LOC is 74 re-export statements; it's a routing surface,
  not a logic surface. Same exemption as schema registries.
- **No retroactive splitting of every 300+ LOC file.** Rule 3's
  thresholds apply *going forward*; existing files at 300–500 LOC
  are inspected individually for whether splitting helps (Rule 1's
  template-surface criterion).

## Alternatives considered

### A1. Status quo — let files grow, refactor reactively

What we've been doing. Patterns emerged (per ADR 0023), and at
2,454 LOC the extractor became the C1 refactor target.
**Rejected** because reactive refactoring is N× more expensive than
proactive splitting, and the cost-of-fix curve is concave — every
PR that adds to a giant file makes the eventual split harder.

### A2. AI-optimization without an ADR (just a memory + audit doc)

Save the principle as `feedback_codebase_optimized_for_ai.md` and
let the audit doc drive the refactor. **Rejected** because (a)
memories don't survive every cross-session context cleanly, (b)
the principle is load-bearing enough to deserve cite-ability in
commit messages + PR descriptions, and (c) Sophie's ADR-driven
discipline (audit grade A) benefits from documenting structural
philosophy ADRs at the same level as technical ADRs.

### A3. Hard LOC limit (e.g., 500 LOC hard cap on every file)

**Rejected.** The "schema registry" exemption is real: scrolling
420 LOC of zod type declarations end-to-end is a different
cognitive task from scrolling 420 LOC of procedural orchestration.
The Rule 3 tiered structure (info → warning → error) gives
flexibility while still applying pressure.

## Status

**Accepted 2026-05-18**, immediately following the post-PR-A audit.
Concrete refactor work begins with Bucket B (doc-drift sweep, B4)
and Bucket C (expanded scope per the consequences table above).

## Revisions

§1 — 2026-05-18 — ADR created alongside the post-PR-A audit. First
application: the audit's revised Bucket-C scope.
