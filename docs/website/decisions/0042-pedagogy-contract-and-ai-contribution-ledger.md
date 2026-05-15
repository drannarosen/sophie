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

### Artifact 1: `pedagogy-contract.yaml` at consumer repo root

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

# Hardening 2026-05-14: course-level AI provenance + Ledger preamble
ai_training_provenance:            # required (per PC2-A)
  models_allowed: ["claude-opus-4-7", "gpt-5", "gemini-3"]
  known_limitations: |
    AI models used may have been trained on copyrighted astronomy
    textbooks. Sophie does not pretend otherwise.
  primary_source_policy: |
    All quantitative claims and historical citations are
    independently verified against peer-reviewed sources or
    canonical textbooks listed in /references. AI-generated
    citations are never accepted without independent confirmation.

ai_ledger:                         # required only if any chapter is visibility: public (per PC2-B)
  preamble: |
    This course is authored with AI as the primary drafter under
    instructor supervision. That choice is deliberate: it relocates
    my labor from prose-drafting to pedagogical decision-making
    (which students need, what they get confused by, how to verify
    learning), which is where my expertise actually applies and
    where AI cannot substitute. The structured records below
    surface what AI drafted and how I reviewed it. The intent is
    visibility, not penance.

tdr_coverage:                       # optional; gates ADR 0040 TDR-1 invariant
  min_ratio: 0.1                    # 1 TDR per 10 load-bearing entities
```

**Source of truth**: the YAML file. All downstream surfaces (rendered
page, AI tooling, audit invariants) read from it.

**`ai_training_provenance`** is the course's public stance on AI
training data. Always required at the contract level (PC2-A); the
structural-stance is public independent of per-chapter visibility.
Mixed shape (structured `models_allowed` list + prose
`known_limitations` + prose `primary_source_policy`) follows the
**structured-for-facts, prose-for-stances** principle introduced in
[ADR 0043 hardening](./0043-notation-registry-multirep-alignment-audit.md).

**`ai_ledger.preamble`** is the framing copy rendered at the top
of the `/about-this-course/ai-ledger` route. Required only if any
chapter has `visibility: public` (PC2-B). Anchored on the
**structural-labor argument** — AI-primary authoring relocates
instructor labor from prose-drafting to pedagogical decision-making +
verification, not a workaround but a structural enabler per ADR 0030's
2026-05-14 amendment. Without the preamble, the public view would
be naked data critics could read uncharitably.

### Artifact 2: per-chapter `ai_contribution` frontmatter (hardened 2026-05-14)

Each chapter MDX file optionally carries an `ai_contribution` block
in its frontmatter. The shape was restructured in the 2026-05-14
hardening pass: coarse booleans replaced with structured objects;
`visibility` field added; default visibility is **internal**.

```yaml
---
title: "Lecture 1 — Spoiler Alerts"
slug: spoiler-alerts
module: 01-foundations
ai_contribution:
  visibility: internal              # default; opt-in 'public' for SoTL/tenure citation

  ai_workflow:
    models: ["claude-opus-4-7"]     # required: list of AI models involved
    generation_share: ai-primary    # required: ai-primary | mixed | instructor-primary
    iterations: 3                   # optional: AI↔instructor handoff count
    edit_intensity: heavy           # optional: light | moderate | heavy | rewrite

  instructor_reviewed:
    by: alrosen                     # required when block present
    date: 2026-05-14                # required
    depth: full-pass                # required: line-by-line | full-pass | skim
    against:                        # required: dimensions checked (non-empty list)
      - pedagogy_contract
      - scientific_accuracy
      - citation_check
      - misconception_handling

  transparency_note: |              # optional but recommended
    [Anna's voice, course-specific framing of this chapter's
    AI-instructor collaboration. Renders in the chapter footer when
    visibility: public.]
---
```

The full schema spec lives at
[`reference/ai-contribution-schema.md`](../reference/ai-contribution-schema.md).

**Required top-level field**:

- `visibility`: `internal` (default) | `public` — TDRs-style two-tier
  visibility. Most chapters stay internal (frank reflection, in-flight
  calibration, no public exposure). Opt-in `public` for SoTL citation,
  departmental sharing, or tenure-case artifacts. Surfaces on the
  public Ledger render only when `public`.

**Required structured fields when AI was involved (`ai_workflow` present)**:

- `ai_workflow.models` — list of AI model identifiers (e.g.,
  `["claude-opus-4-7"]`). List supports multi-model authoring (rare
  but real).
- `ai_workflow.generation_share` — categorical, three values:
  `ai-primary`, `mixed`, `instructor-primary`. Captures the
  collaboration shape; categorical over percentage because nobody
  can estimate "80% AI" reliably and three buckets capture what's
  knowable. **Sophie's default workflow is `ai-primary`** per ADR
  0030's amendment (AI-primary by design, not by accident).

**Optional `ai_workflow` fields**:

- `iterations` (integer) — count of AI↔instructor handoff cycles.
- `edit_intensity` — categorical, four values: `light`, `moderate`,
  `heavy`, `rewrite`. The analog of `instructor_reviewed.depth` for
  the editing pass.

**Required `instructor_reviewed` fields when block present** (absence
means not-yet-reviewed):

- `by` — reviewer identifier (instructor username/email).
- `date` — ISO 8601 date of the review.
- `depth` — categorical, three values: `line-by-line`, `full-pass`,
  `skim`. Captures the review effort honestly.
- `against` — list of review-dimension keywords; the four v1
  recognized values are `pedagogy_contract`, `scientific_accuracy`,
  `citation_check`, `misconception_handling`. Authors articulate
  *which* dimensions they actually verified.

**The top-level `last_review_date` field is deprecated.** It now
lives at `instructor_reviewed.date`. No back-compat shim per Sophie's
pre-launch no-back-compat stance.

**Optional rich fields** (carried forward from the pre-hardening
shape):

- `transparency_note` — prose paragraph for the chapter footer
  (rendered only on `visibility: public` chapters in student build).
- `brainstormed_by` — AI session(s) used for ideation before drafting.
- `reviewed_by` — AI session(s) used for review passes.
- `instructor_decisions` — list of natural-language notes recording
  where the instructor overrode AI suggestions or made load-bearing
  judgment calls.

**Chapters that were not AI-assisted** declare `ai_workflow: null`
(or omit the entire `ai_contribution` block) — the field's absence
or null is meaningful and not asserted as AI or non-AI authorship
positively.

### Artifact 3: public-facing rendering contract (hardened 2026-05-14)

Each Sophie-LDS-compliant course site renders three surfaces. The
visibility model was **restructured in the 2026-05-14 hardening**:
per-chapter `ai_contribution` records are **internal by default**;
opt-in `visibility: public` per chapter is the exceptional path.
The course-level *stance* (Pedagogy Contract + AI Training
Provenance) stays public always.

1. **`/about-this-course/pedagogy-contract` route** — *always public*.
   Renders the `pedagogy-contract.yaml` including
   `ai_training_provenance`, `ai_policy`, `teaching_philosophy`,
   `out_of_scope`, etc. The course's permanent declared stance.
2. **`/about-this-course/ai-ledger` route** — *conditional rendering*.
   When no chapters have `visibility: public`, renders only the
   `ai_ledger.preamble` (if declared) + a placeholder *"per-chapter
   records will publish as the course matures"*. When some chapters
   are `public`, renders the preamble + per-chapter `ai_contribution`
   blocks for those chapters only (internal chapters silently
   omitted). When all chapters are `public`, renders the full
   per-chapter ledger.
3. **Per-chapter footer transparency note** — *conditional*. Renders
   `ai_contribution.transparency_note` at chapter footer **only when
   `visibility: public`** for that chapter. Internal-visibility
   chapters render the chapter prose without a footer note.

**Two-tier visibility model summary**:

| Layer | Visibility | Where it lives |
|---|---|---|
| Course stance (`ai_training_provenance` + `ai_policy` + `teaching_philosophy`) | **Always public** | `pedagogy-contract.yaml` rendered at `/about-this-course/pedagogy-contract` |
| Ledger preamble (`ai_ledger.preamble`) | **Public when any chapter is public** | Top of `/about-this-course/ai-ledger` |
| Per-chapter `ai_contribution` records | **Internal by default; opt-in `public`** | Chapter frontmatter; published chapters surface on `/about-this-course/ai-ledger` |
| Per-chapter `transparency_note` | **Renders on chapter footer only when chapter is `public`** | Chapter frontmatter |

This shape — public *stance*, internal *operational records*,
selectively-published per-chapter detail — is parallel to TDR
visibility (ADR 0040) and serves the same separation: frank
operational records protected; public accountability visible.

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
- New audit invariants in `packages/astro/src/lib/pedagogy-audit.ts`
  (hardened 2026-05-14):
  - **PC1** (ERROR, raised from WARNING in hardening): consumer
    repo with chapters but no `pedagogy-contract.yaml`. Foundation
    bar — courses claiming Sophie-LDS conformance must declare
    their contract.
  - **PC2-A** (ERROR): `pedagogy-contract.yaml` lacks
    `ai_training_provenance`. The course's public stance on AI
    training data is required at the contract level regardless of
    per-chapter visibility.
  - **PC2-B** (ERROR, conditional): `pedagogy-contract.yaml` lacks
    `ai_ledger.preamble` AND at least one chapter has
    `ai_contribution.visibility: public`. Preamble required only
    when there's a public Ledger surface to frame.
  - **AC1** (ERROR): chapter with `status: stable` (per
    [ADR 0051](./0051-chapter-status-and-course-versioning.md))
    declares `ai_workflow` but lacks `instructor_reviewed`.
    Published AI-contributed content must be reviewed before
    shipping.
  - **AC2** (WARNING): `instructor_reviewed.date` predates the
    most recent change touching the chapter (stale review). The
    `requires-judgment` taxonomy classifier in
    [ADR 0045](./0045-pedagogical-diff-curriculum-ci.md) surfaces
    this in `sophie diff` output.
  - **AC3** (INFO): `ai_workflow.generation_share` is a valid
    enum value when present (schema-validation surface).
  - **AC4** (WARNING): `ai_workflow.generation_share = ai-primary`
    AND `instructor_reviewed.depth = skim`. Framed as protection
    of the AI-primary model — instructor value-add lives in
    review depth; skim review of ai-primary content abdicates the
    labor relocation that makes ai-primary defensible.
  - **AC5** (INFO): `ai_contribution.visibility = public` AND
    `instructor_reviewed.depth = skim`. Discourages publishing
    skim-reviewed records. Internal records can be any depth;
    public records imply "I stand behind this."

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

### Public *stance*, internal *operational records* (hardened 2026-05-14)

The original ADR framing was *"public-facing by default beats
instructor-only"*. The 2026-05-14 hardening refined this into a
**two-tier visibility model**:

- **Course-level stance** — `pedagogy-contract.yaml` including
  `ai_training_provenance`, `ai_policy`, `teaching_philosophy` —
  remains **always public**. This is the course's permanent
  declared position on AI use; hidden stance defeats the purpose.
- **Per-chapter operational records** — the `ai_contribution`
  blocks — are now **internal by default**, with opt-in
  `visibility: public` for the records the instructor chooses to
  publish (typically for SoTL citation, departmental sharing, or
  tenure-case artifacts).

Why per-chapter internal-default: (1) frank reflection requires
safety — early-semester records may include calibration-in-flight
data the instructor doesn't yet stand behind publicly; (2) AI
authorship is a moving target (models change every 6–12 months;
field expectations are mid-shift), so published records age
quickly; (3) **Anna is patient-zero** for Sophie courses, exactly
the instructor whose early-calibration records should not be
broadcast prematurely.

The transformative-value claim (public AI Ledger ahead of HE
publishing norms) is preserved through the **course-level stance**
being public — anyone reading the contract sees Sophie's
disclosure commitment. The per-chapter detail accumulates as
internal-discipline records; selective opt-in publication happens
as records mature.

This parallels the TDR visibility decision in
[ADR 0040](./0040-teaching-decision-records.md) and the Semester
Journal (B8 backlog): same two-layer pattern — internal
operational layer for in-flight work; public accountability layer
for stable claims.

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

## References

- [`reference/pedagogy-contract-schema.md`](../reference/pedagogy-contract-schema.md)
  — the YAML schema spec + ASTR 201 example; updated to include
  `ai_training_provenance`, `ai_ledger.preamble`, `tdr_coverage`.
- [`reference/ai-contribution-schema.md`](../reference/ai-contribution-schema.md)
  — the per-chapter frontmatter schema spec + example; updated to
  include `ai_workflow` + `instructor_reviewed` structured objects
  + `visibility` field.
- [ADR 0001 — platform not monorepo](./0001-platform-not-monorepo.md)
  — textbook/course-site separation this ADR aligns with.
- [ADR 0030 — audience and AI author model](./0030-audience-and-ai-author-model.md)
  — the AI-supervision framing operationalized here; per the
  2026-05-14 amendment, also documents Sophie's explicit
  commitment to AI-primary authoring as deliberate design.
- [ADR 0040 — Teaching Decision Records](./0040-teaching-decision-records.md)
  — first ADR to define a consumer-repo contract; this is the
  second. TDR `visibility: internal | public` field parallels
  the same shape here. TDR `affects_anchors` integrates with this
  ADR via `audit_overrides` in chapter frontmatter (per ADR 0053).
- [ADR 0041 — Teaching Move Library](./0041-teaching-move-library.md)
  — `reasoning_style` field in the contract references move IDs.
- [ADR 0043 — Notation Registry + MultiRep + Alignment Audit](./0043-notation-registry-multirep-alignment-audit.md)
  — introduced the *structured-for-facts, prose-for-stances*
  principle that `ai_training_provenance` follows.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — `instructor_reviewed.date` staleness surfaces in the diff
  taxonomy's `requires-judgment` severity classifier.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-and-course-versioning.md)
  — AC1 fires only on `status: stable` chapters; review staleness
  measured against `course_version`.
- [ADR 0053 — Conformance Failure Modes](./0053-conformance-failure-modes.md)
  — chapter-frontmatter `audit_overrides` reference TDRs whose
  `affects_anchors` resolve audit invariants; the override
  framework spans this ADR's PC/AC family.
- [`CLAUDE.md`](../../../CLAUDE.md) — Sophie-the-platform's
  Engineering Principles (the analog at the platform level).
- [`vision/features/accepted.md`](../vision/features/accepted.md) A3
  — the staging-area entry this ADR graduates.
- [`vision/index.md`](../vision/index.md) — the Sophie-as-LDS
  positioning.
- [`status/roadmap.md`](../status/roadmap.md) — Phase 4 launches
  the first course using this contract; Phase 5 brings dual-profile
  handling for `instructor_decisions`.
