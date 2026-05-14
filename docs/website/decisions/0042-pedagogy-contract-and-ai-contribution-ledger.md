---
date: 2026-05-14
tags: [pedagogy, decisions, ai-contribution, responsible-ai, consumer-repo-contract, sotl, lds]
---

# ADR 0042: Pedagogy Contract + AI Contribution Ledger

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's [CLAUDE.md](../../../CLAUDE.md) Engineering Principles
codify the *platform-level* responsible-AI workflow: HITL mandate,
no back-compat pre-launch, build the best now, SoTA over simple, the
Sophie-as-supervisor framing. These rules govern how Anna and Claude
collaborate on Sophie-the-platform itself.

What's missing is the *course-level* analog: how does each course
authored on Sophie declare its own pedagogy, AI-use, and accountability
commitments? When ASTR 201 ships at `drannarosen.github.io/astr201/`,
a student, reviewer, tenure committee, or adopting instructor should
be able to read *the course's contract* — what teaching philosophy
the course encodes, what standards govern math/units/citations/
accessibility, what AI tools were used and how, what the course will
*never* do. Today: that contract lives implicitly in the chapter
prose. Tomorrow: it's a *first-class artifact* per course.

Three converging needs make this load-bearing:

1. **Responsible-AI demonstrator** for the tenure case + grant
   proposals + cultural intervention in higher ed. Sophie's claim is
   that AI use can be *structured, supervised, documented* — not
   banned, not hidden. Demonstrating that claim requires *concrete
   visible artifacts* per course, not just rhetorical assertions in
   platform docs.

2. **AI-tools-readable course context** for future AI authoring
   workflows (Phase 3+). When AI scaffolds a new chapter under
   instructor supervision, it should read the course's pedagogy
   contract as *binding constraints* on the draft (e.g., "this
   course requires units on every numerical equation; do not draft
   prose that violates this").

3. **SoTL paper credibility**. A claim that "this course was authored
   with AI under responsible supervision" needs an *evidence base* —
   per-chapter `ai_contribution` records that survive review and can
   be cited. Without per-chapter data, the responsibility claim
   stays rhetorical.

This ADR is the third graduation through the
[staging-area lifecycle](../vision/transitions/index.md) — the
[`vision/features/accepted.md`](../vision/features/accepted.md) A3
entry surfaced the open ADR questions; this ADR resolves them.

It is also the **second ADR to define a consumer-repo contract**
(after [ADR 0040 — TDRs](./0040-teaching-decision-records.md)).
Together, ADR 0040 + ADR 0041 + ADR 0042 form the *Sophie LDS
conformance triple*: a course is Sophie-LDS-compliant when it has
TDRs (the curriculum-design audit trail), references the Teaching
Move Library (the pedagogical vocabulary), and declares a Pedagogy
Contract + AI Contribution Ledger (the accountability layer).

## Decision

Sophie ships two paired schemas plus a public-facing rendering
contract.

### Artifact 1: `pedagogy_contract.yaml` at consumer repo root

Each consumer course repo maintains a single top-level YAML file at
the repository root:

```
drannarosen/astr201/
  ├── pedagogy-contract.yaml       ← this artifact
  ├── teaching-decisions/          ← per ADR 0040
  │     └── 001-...md
  ├── src/content/...              ← chapters, modules, slides
  └── package.json
```

The full schema spec lives at
[`reference/pedagogy-contract-schema.md`](../reference/pedagogy-contract-schema.md).
Top-level keys (all required at v1 unless noted):

```yaml
course: { slug, title, instructor, last_updated }
teaching_philosophy: prose
reasoning_style:                   # references Teaching Move IDs
  - observable-model-inference-scaffold
  - …
math_and_units_standards:
  require_units: true
  …
citation_standards:
  empirical_claims_require_citation: true
  …
accessibility_standards:
  wcag_target: "2.1 AA"
  …
ai_policy:
  instructor_final_authority: true
  …
out_of_scope:                      # optional but recommended
  - "detailed tensor notation: reserved for ASTR 596"
  …
```

**Source of truth**: the YAML file. All downstream surfaces (rendered
page, AI tooling, audit invariants) read from it.

### Artifact 2: per-chapter `ai_contribution` frontmatter

Each chapter MDX file optionally carries an `ai_contribution` block
in its frontmatter:

```yaml
---
title: "Lecture 1 — Spoiler Alerts"
slug: spoiler-alerts
module: 01-foundations
ai_contribution:
  drafted_by: "claude-opus-4.7-2026-05-14-session-abc123"
  instructor_reviewed: true
  last_review_date: "2026-05-14"
  transparency_note: |
    This chapter was drafted with AI assistance, then reviewed and
    revised by Anna Rosen for scientific accuracy, pedagogical
    fit with ASTR 201's predict-then-reveal contract, and
    citation completeness. The "spoiler alerts" framing and all
    misconception targeting were instructor-authored.
---
```

The full schema spec lives at
[`reference/ai-contribution-schema.md`](../reference/ai-contribution-schema.md).

**Minimum required fields** (every chapter that opts in must include
these):

- `drafted_by`: string identifying the AI session/model that drafted
- `instructor_reviewed`: boolean
- `last_review_date`: ISO 8601 date

**Recommended fields** (the template includes these by default):

- `transparency_note`: prose paragraph for the chapter footer

**Optional rich fields**:

- `brainstormed_by`: AI session(s) used for ideation before drafting
- `reviewed_by`: AI session(s) used for review passes
- `instructor_decisions`: list of natural-language notes recording
  where the instructor overrode AI suggestions or made load-bearing
  judgment calls

Chapters that were *not* AI-assisted are not required to include
`ai_contribution` at all; the field's absence is meaningful. (When
the field is absent, the rendered footer simply omits the
transparency note rather than asserting either AI or non-AI
authorship.)

### Artifact 3: public-facing rendering contract

Each Sophie-LDS-compliant course site renders three surfaces:

1. **Per-chapter footer transparency note** — when the chapter has
   `ai_contribution.transparency_note`, the prose renders at the
   bottom of the chapter. Single, visible, in-context.
2. **`/about-this-course/pedagogy-contract` route** — the
   `pedagogy_contract.yaml` rendered as a readable page (`.astro`
   page reads the YAML, displays it with proper sections + headings).
3. **`/about-this-course/ai-ledger` route** — aggregated
   `ai_contribution` data across all chapters. Each chapter's
   record shown chronologically + summary stats.

All three surfaces are **public-facing by default**. A course may
choose to keep a specific `instructor_decisions` list private (e.g.,
behind dual-profile per ADR 0001 + Phase 5 work), but the contract
itself and the transparency notes are public.

### What lives in code vs. what lives in docs

This ADR + the two reference doc files ship as **docs only**. The
schema *enforcement code* lands in a follow-up PR:

- `packages/core/src/schema/pedagogy-contract.ts` — Zod
  `PedagogyContractSchema` matching the YAML structure.
- `packages/core/src/schema/ai-contribution.ts` — Zod
  `AiContributionSchema` for per-chapter frontmatter.
- `packages/astro/src/components/PedagogyContractPage.astro` —
  renders the YAML at `/about-this-course/pedagogy-contract`.
- `packages/astro/src/components/AiLedgerPage.astro` — renders the
  aggregated ledger at `/about-this-course/ai-ledger`.
- `packages/astro/src/components/ChapterFooter.astro` — extended
  with the `transparency_note` rendering.
- New audit invariants in `packages/astro/src/lib/pedagogy-audit.ts`:
  - **PC1**: consumer repo with chapters but no `pedagogy_contract.yaml`
    (WARNING — non-conformance with Sophie-LDS, not a build failure)
  - **AC1**: chapter declares `ai_contribution.instructor_reviewed: false`
    while published (WARNING — flagging unreviewed AI content)
  - **AC2**: chapter declares `drafted_by` with an AI session but
    omits `transparency_note` (INFO — recommended but not required)

That code PR follows the standard branch + PR cadence per
[`feedback_branch_pr_scope`](../../../) memory.

## Rationale

### Two paired schemas beats one combined schema

The Pedagogy Contract is *course-level* (one file per course); the
AI Contribution Ledger is *per-chapter* (one block per chapter MDX
file). Mixing them into one schema would force either course-level
policy into chapter frontmatter (awkward) or chapter-level data into
the course-wide YAML (unmaintainable). The two-schema split matches
the natural granularity of the data they capture.

### Public-facing by default beats instructor-only

Hidden AI-use disclosures don't demonstrate responsible AI; they
demonstrate compliance theater. Sophie's positioning — "AI use is
structured, supervised, documented, *and disclosed*" — depends on
the disclosure being publicly visible. The tenure case wants
something citable; the grant proposal wants something demonstrable;
the SoTL paper wants something reproducible. All three want a
**public URL**, not an instructor-only artifact.

The carve-out for instructor-only `instructor_decisions` data
preserves space for sensitive review notes (e.g., "rejected the
AI's framing because it would have been inappropriate for the
student demographic in section B") while keeping the structural
disclosure visible. Dual-profile work (Phase 5, per
[`status/roadmap.md`](../status/roadmap.md)) is where this lands.

### YAML at repo root beats Astro content collection

Three reasons to prefer root YAML:

1. **Discoverability**. A reviewer (tenure committee, grant
   reviewer, adopting instructor) browsing the consumer repo
   immediately sees `pedagogy-contract.yaml` next to `README.md`.
   Burying it in `src/content/...` requires knowing the project
   structure.

2. **AI tool loadability**. The future `sophie-chapter-author`
   workflow (deferred per [`vision/features/backlog.md`](../vision/features/backlog.md))
   reads the contract via direct file load. Going through Astro's
   content-collection API would couple AI tooling to the build
   pipeline.

3. **Parity with ADR 0040's `teaching-decisions/`**. TDRs live at
   the repo root in a directory; the pedagogy contract lives at the
   repo root as a file. Consumer repos have a small flat surface of
   Sophie-LDS-compliance artifacts at the top level —
   discoverable + auditable + uniform.

### Minimum-required + recommended + optional tiered schema beats single mandatory schema

Forcing every chapter that opts in to populate the full rich schema
(brainstormed_by + reviewed_by + instructor_decisions + transparency_note)
would create authoring friction that suppresses adoption. Authors
would either skip `ai_contribution` entirely or write fields without
care. The three-tier shape — minimum (required), recommended
(template default), optional (when warranted) — keeps the
disclosure bar low enough to encourage adoption while permitting
deep ledger entries where appropriate.

This mirrors the [PR-C4 Figure schema](./0038-pedagogy-index-pattern.md)
shape: `name`/`src`/`alt` required; `caption`/`credit`/`width`/`height`
optional. Authors include what they have; the schema doesn't punish
incompleteness.

### CLAUDE.md remains the platform-level contract

`CLAUDE.md` at the Sophie-platform-repo root governs how Anna +
Claude collaborate on *Sophie-the-platform itself*. It is not the
per-course contract; it is the meta-contract for Sophie's own
development. ADR 0042 deliberately does not move CLAUDE.md or
expand it — Sophie's platform-level commitments and each course's
commitments are different artifacts at different scopes.

A future evolution may extract the structural overlap (HITL mandate,
SoTA-over-simple, no back-compat pre-launch) into a shared schema
that both CLAUDE.md and consumer `pedagogy-contract.yaml` import.
That's out of scope here.

## Consequences

### For Sophie-the-platform (this commit)

This commit ships **docs only**:

1. ADR 0042 (this file).
2. [`reference/pedagogy-contract-schema.md`](../reference/pedagogy-contract-schema.md).
3. [`reference/ai-contribution-schema.md`](../reference/ai-contribution-schema.md).
4. `myst.yml` registers all three.
5. `vision/features/accepted.md` collapses A3 to graduated pointer.
6. `vision/features/index.md` notes third graduation.

### For Sophie-the-platform (future code PR)

A subsequent code PR ships:

1. `packages/core/src/schema/pedagogy-contract.ts` —
   `PedagogyContractSchema`.
2. `packages/core/src/schema/ai-contribution.ts` —
   `AiContributionSchema`.
3. Three new components: `PedagogyContractPage.astro`,
   `AiLedgerPage.astro`, `ChapterFooter.astro` extension.
4. Three new audit invariants: PC1, AC1, AC2.

### For consumer repos

A Sophie-LDS-compliant course needs:

1. `pedagogy-contract.yaml` at the repo root.
2. Chapters that opt into AI disclosure include `ai_contribution`
   frontmatter (minimum required fields at minimum).
3. Course-site routing for the three rendering surfaces
   (per-chapter footer + two `/about-this-course/` pages).

### For TDRs (per [ADR 0040](./0040-teaching-decision-records.md))

TDR References sections may cite the course's pedagogy contract
when a curriculum decision is grounded in (or revises) a contract
commitment. Example: a TDR that revises the math_and_units_standards
to permit unit-less display of dimensionless ratios cites the
contract section being modified.

### For AI authoring (future)

The `sophie-chapter-author` workflow reads `pedagogy-contract.yaml`
as binding context. The AI's draft proposals must respect contract
declarations (require units → AI flags any prose lacking units;
no_unreviewed_ai_content: true → AI does not assume publish
authorization; observable-model-inference-scaffold required → AI
structures sections to follow the scaffold).

### For SoTL paper + tenure case

The Pedagogy Contract + AI Contribution Ledger are *citable
artifacts*. Paper-1-methods can describe "this course declared a
pedagogy contract (see DOI / archived URL); per-chapter AI
contribution records are available in the ledger" with the actual
contract + ledger as supporting evidence. The cultural-intervention
claim — "AI use can be structured, supervised, and disclosed in
higher-ed" — has a *concrete public demonstration* rather than a
rhetorical assertion.

### For dual-profile build (Phase 5)

When [ADR 0001](./0001-platform-not-monorepo.md) dual-profile work
ships in Phase 5, the `instructor_decisions` list inside an
`ai_contribution` block can be marked instructor-only via the same
mechanism that handles solution visibility (per the Phase 4 sprint
plan's chapter-anchored content model). The Pedagogy Contract
itself stays public.

## Alternatives considered

### One combined schema covering both course + chapter levels

Reject on data granularity grounds — see Rationale §1.

### Instructor-only / hidden AI contribution data

Reject on responsible-AI-demonstrator grounds — see Rationale §2.
Sophie's positioning depends on public disclosure being load-bearing.

### Contract in chapter frontmatter (option c)

Reject because (a) deep nested YAML in MDX frontmatter is awkward
to maintain (multiple sections per ChatGPT's discussion; tens of
keys total); (b) the contract is *course-level*, not chapter-level,
so binding it to one chapter file misframes the artifact's scope.

### Contract in Astro content collection (option b)

Reject because (a) it requires knowing the Astro project structure
to find; (b) it couples AI-tool loadability to the build pipeline;
(c) it disrupts the parity with ADR 0040's repo-root
`teaching-decisions/` placement.

### Single-tier mandatory schema (all fields required)

Reject because authoring friction suppresses adoption. See Rationale
§4.

### Free-form prose contract (no schema)

Reject because then AI tools can't read it as binding constraints,
and the audit can't validate compliance. The structured shape is
what makes the contract *enforceable*.

### Extending CLAUDE.md to be per-course instead

Reject because CLAUDE.md is platform-level (governs Sophie's own
development); per-course contracts are course-level. Mixing them
would make CLAUDE.md grow unboundedly with every adopted course
and would muddle Sophie-the-platform's commitments with each
course's commitments.

## Revisions

*None yet.*

## References

- [`reference/pedagogy-contract-schema.md`](../reference/pedagogy-contract-schema.md)
  — the YAML schema spec + ASTR 201 example.
- [`reference/ai-contribution-schema.md`](../reference/ai-contribution-schema.md)
  — the per-chapter frontmatter schema spec + example.
- [ADR 0001 — platform not monorepo](./0001-platform-not-monorepo.md)
  — textbook/course-site separation this ADR aligns with.
- [ADR 0030 — audience and AI author model](./0030-audience-and-ai-author-model.md)
  — the AI-supervision framing operationalized here.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — first ADR to define a consumer-repo contract; this is the second.
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md)
  — `reasoning_style` field in the contract references move IDs.
- [`CLAUDE.md`](../../../CLAUDE.md) — Sophie-the-platform's
  Engineering Principles (the analog at the platform level).
- [`vision/features/accepted.md`](../vision/features/accepted.md) A3
  — the staging-area entry this ADR graduates.
- [`vision/index.md`](../vision/index.md) — the Sophie-as-LDS
  positioning.
- [`status/roadmap.md`](../status/roadmap.md) — Phase 4 launches
  the first course using this contract; Phase 5 brings dual-profile
  handling for `instructor_decisions`.
