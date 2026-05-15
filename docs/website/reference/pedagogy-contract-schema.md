---
title: Pedagogy Contract schema
short_title: Pedagogy contract
description: YAML schema for a Sophie-LDS-compliant course's pedagogy-contract.yaml — the course-level declaration of teaching philosophy, standards, AI policy, and out-of-scope commitments. Includes a fully-filled ASTR 201 example.
tags: [pedagogy, reference, contract, schema, responsible-ai, lds]
---

# Pedagogy Contract schema

The course-level pedagogy contract lives at the consumer repo root
as `pedagogy-contract.yaml`. It declares the course's teaching
philosophy, standards, AI policy, and what the course deliberately
does NOT cover. The contract is **public-facing**: rendered on the
course site at `/about-this-course/pedagogy-contract/` and readable
by both humans and AI tools.

The full rationale lives at
[ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md).

## Schema overview

Top-level keys (all required at v1 unless marked optional):

| Key | Type | Purpose |
|---|---|---|
| `course` | object | Identity metadata (slug, title, instructor, last_updated) |
| `teaching_philosophy` | prose string | Course's pedagogical commitments in plain language |
| `reasoning_style` | list of Teaching Move IDs | Which moves from ADR 0041 the course privileges |
| `math_and_units_standards` | object | STEM-specific rules (units, approximations, variable definitions) |
| `citation_standards` | object | When/how citations are required |
| `accessibility_standards` | object | WCAG target, alt-text policy, etc. |
| `ai_policy` | object | Instructor authority, AI use boundaries, review requirements |
| `out_of_scope` | list of prose entries (optional) | Topics deliberately excluded + reason |
| `superseded_by` | string (optional) | Pointer to a replacement contract when this one is retired |
| **`ai_training_provenance`** | object | **NEW (2026-05-14 hardening, required)**: course's public stance on AI training data |
| **`ai_ledger`** | object | **NEW (2026-05-14 hardening, conditional)**: framing preamble for the public AI Ledger; required only when any chapter has `visibility: public` |
| **`tdr_coverage`** | object (optional) | **NEW (2026-05-14 hardening)**: gates TDR-1 audit invariant from ADR 0040; sets minimum TDR-coverage ratio |
| **`tdr_traceability`** | object (optional) | **NEW (2026-05-15)**: configures the optional CI enforcement of ADR 0045's `TDR:` commit-trailer convention |

## Hardening 2026-05-14 — three new top-level fields

Per [ADR 0042](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md),
three new top-level fields were added in the 2026-05-14 hardening
pass.

### `ai_training_provenance` (required, per PC2-A)

The course's public stance on AI training data. Required at the
contract level regardless of per-chapter visibility — the course
declares its position even when no per-chapter records are
published. Mixed shape per the *structured-for-facts, prose-for-
stances* principle (ADR 0043 hardening): the allowed-models list
is structured; limitations and policy are prose.

```yaml
ai_training_provenance:
  models_allowed: ["claude-opus-4-7", "gpt-5", "gemini-3"]
  known_limitations: |
    AI models used may have been trained on copyrighted astronomy
    textbooks. Sophie does not pretend otherwise.
  primary_source_policy: |
    All quantitative claims and historical citations are
    independently verified against peer-reviewed sources or
    canonical textbooks listed in /references. AI-generated
    citations are never accepted without independent confirmation.
```

- `models_allowed` (required list of strings) — AI model identifiers
  the course permits. Other models flagged by audit if encountered
  in chapter `ai_workflow.models`.
- `known_limitations` (required prose) — author's narrative
  acknowledgment of training-data limitations and how the course
  mitigates them.
- `primary_source_policy` (required prose) — author's narrative
  policy on citation verification.

### `ai_ledger.preamble` (required only when any chapter is public, per PC2-B)

Framing copy rendered at the top of the
`/about-this-course/ai-ledger` route. Required only if any chapter
declares `ai_contribution.visibility: public`. Anchored on the
**structural-labor argument** per ADR 0030's amendment — AI-primary
authoring relocates instructor labor from prose-drafting to
pedagogical decision-making + verification.

```yaml
ai_ledger:
  preamble: |
    This course is authored with AI as the primary drafter under
    instructor supervision. That choice is deliberate: it relocates
    my labor from prose-drafting to pedagogical decision-making
    (which students need, what they get confused by, how to verify
    learning), which is where my expertise actually applies and
    where AI cannot substitute. The structured records below
    surface what AI drafted and how I reviewed it. The intent is
    visibility, not penance.
```

### `tdr_coverage` (optional)

Gates the TDR-1 audit invariant from
[ADR 0040](../decisions/0040-teaching-decision-records.md).
Configures the minimum TDR-coverage ratio for the course.

```yaml
tdr_coverage:
  min_ratio: 0.1   # default: 1 TDR per 10 load-bearing entities
```

Load-bearing entities counted: `<KeyEquation>` instances,
`<Aside kind="misconception">` instances, `<LearningObjectives>`
items. If `tdr_coverage` is omitted entirely, defaults to
`{min_ratio: 0.1}`. Tune up or down based on course-authoring
practice.

### `tdr_traceability` (optional, added 2026-05-15)

Configures the optional CI enforcement of the **bidirectional
TDR ↔ commit traceability** convention from
[ADR 0045](../decisions/0045-pedagogical-diff-curriculum-ci.md).
The convention itself (commits carry `TDR: <N>`, `TDR: none`, or
`TDR: pending-seed-<slug>` trailers) is always available; this
block controls whether absence is *enforced* at CI time.

```yaml
tdr_traceability:
  enforce_commit_trailers: false       # default; opt in when authoring
                                       # discipline is ready
  trailer_severity: warning            # warning | error
  excluded_paths:
    - "*.css"
    - "*.scss"
    - "package.json"
    - "pnpm-lock.yaml"
```

- `enforce_commit_trailers` (default `false`) — when `true`, the
  audit (or a pre-receive hook / GitHub Action) checks every
  chapter-touching commit on `main` for a `TDR:` trailer and
  trips the configured severity on bare commits.
- `trailer_severity` (default `warning`) — `warning` surfaces
  bare-trailer commits in the audit report; `error` blocks CI on
  them. Most courses opt for `warning` initially and tighten to
  `error` once authoring discipline is steady.
- `excluded_paths` (default empty list; commonly populated as
  shown above) — glob patterns for paths that don't need
  trailers even when enforcement is on. Use for CSS/lockfile/
  build-config changes that aren't pedagogical.

If `tdr_traceability` is omitted entirely, defaults to
`{enforce_commit_trailers: false, trailer_severity: warning,
excluded_paths: []}` — i.e., the trailer convention is available
but not enforced. The block is forward-compatible with future
fields (e.g., per-author exemptions) that ADR 0045 may add.

## Field specifications

### `course`

```yaml
course:
  slug: "astr201"
  title: "Astronomy 201 — Stars, Galaxies, and Cosmology"
  instructor: "Anna Rosen, San Diego State University"
  semester: "Fall 2026"          # optional
  last_updated: "2026-05-14"
```

### `teaching_philosophy`

Plain-language prose (1–3 paragraphs) declaring the course's
commitments. This section is the *human-readable preamble* — the
elevator pitch a student, reviewer, or adopting instructor reads
first.

```yaml
teaching_philosophy: |
  ASTR 201 commits to observable-first reasoning. Students should
  leave this course able to distinguish what we measure from what
  we infer; able to follow a derivation with explicit
  assumptions; and able to recognize their own prior models when
  they conflict with evidence.

  The course privileges depth over coverage. Topics are sequenced
  so each concept's prerequisites land before it does. Students
  are expected to actively engage — predict before being told,
  derive rather than memorize, and articulate their reasoning in
  their own words.
```

### `reasoning_style`

A list of Teaching Move IDs (from
[`reference/teaching-moves.md`](teaching-moves.md)) that the course
privileges. These IDs reference moves the AI authoring workflow
(future) should bias toward when scaffolding chapter content for
this course.

```yaml
reasoning_style:
  - observable-model-inference-scaffold
  - elicit-prior-model
  - productive-cognitive-conflict
  - predict-observe-explain
  - misconception-confrontation
  - approximation-honesty
  - multiple-representations-binding
```

Listing a move here does **not** mean every section uses it; it
means the course's default rhythm leans toward it. Specific
sections may use other moves (recorded in TDRs).

### `math_and_units_standards`

Booleans + lists declaring the course's math/notation/units rules.

```yaml
math_and_units_standards:
  require_units: true              # All numerical results carry units
  distinguish_approximation_symbols: true   # =/≈/∼ used carefully
  define_variables_before_use: true
  declare_approximation_validity: true      # Per ADR 0042 + B2 backlog
  notation_registry: "astr201"     # References A4 Notation Registry
  scalar_first_for_new_concepts: true
```

Boolean fields are machine-checkable; audit invariants can flag
prose violating them. Tag-list fields (like `notation_registry`)
reference other Sophie artifacts.

### `citation_standards`

```yaml
citation_standards:
  empirical_claims_require_citation: true
  historical_attributions_required: true
  ai_drafted_facts_require_source: true   # Anti-hallucination guard
  citation_style: "AAS"                   # AAS journal style
  external_link_validation: true
```

### `accessibility_standards`

```yaml
accessibility_standards:
  wcag_target: "2.1 AA"
  alt_text_required: true
  caption_required_for_figures: true
  color_not_sole_signal: true
  motion_respects_reduced_preference: true
  audio_transcripts_required: true        # When media pipeline ships
```

### `ai_policy`

The course's responsible-AI declarations.

```yaml
ai_policy:
  instructor_final_authority: true
  no_unreviewed_ai_content: true
  transparency_notes_required: true       # Triggers ai_contribution disclosure
  citations_required_for_empirical_claims: true
  instructor_voice_cloning: "prohibited"  # Sophie-wide stance per ADR 0042
  student_ai_use_policy: "see /about-this-course/ai-policy-for-students"
  ai_drafted_chapters_marked: true        # Public ai_contribution.transparency_note
```

### `out_of_scope` (optional)

A list of topics deliberately excluded, each with a reason. Useful
for:

- Setting student expectations ("we don't cover X — that's ASTR 596")
- Documenting curriculum decisions for adopting instructors
- Preventing AI from scope-creeping into deferred content

```yaml
out_of_scope:
  - topic: "detailed general-relativistic cosmology"
    reason: "reserved for ASTR 596; ASTR 201 stays in Newtonian + special-relativistic regime"
  - topic: "MHD and plasma physics"
    reason: "out of scope for sophomore-level cosmology survey"
  - topic: "observational data reduction techniques"
    reason: "covered in ASTR 351 — Observational Astronomy lab course"
```

## Fully-filled example: ASTR 201

A complete pedagogy-contract.yaml for ASTR 201 illustrating real
values. This is **not** an empty template — it's an example showing
the voice, depth, and cross-referencing expected.

```yaml
course:
  slug: "astr201"
  title: "Astronomy 201 — Stars, Galaxies, and Cosmology"
  instructor: "Anna Rosen, San Diego State University"
  semester: "Fall 2026"
  last_updated: "2026-05-14"

teaching_philosophy: |
  ASTR 201 commits to observable-first reasoning. Students should
  leave this course able to distinguish what we measure from what
  we infer; able to follow a derivation with explicit
  assumptions; and able to recognize their own prior models when
  they conflict with evidence.

  The course privileges depth over coverage. Topics are sequenced
  so each concept's prerequisites land before it does. Students
  are expected to actively engage — predict before being told,
  derive rather than memorize, and articulate their reasoning in
  their own words. Misconceptions are treated as load-bearing
  curriculum content, not edge cases.

reasoning_style:
  - observable-model-inference-scaffold
  - elicit-prior-model
  - productive-cognitive-conflict
  - predict-observe-explain
  - misconception-confrontation
  - approximation-honesty
  - multiple-representations-binding
  - bridging-analogy
  - retrieval-practice
  - frontier-flagging

math_and_units_standards:
  require_units: true
  distinguish_approximation_symbols: true
  define_variables_before_use: true
  declare_approximation_validity: true
  notation_registry: "astr201"
  scalar_first_for_new_concepts: true

citation_standards:
  empirical_claims_require_citation: true
  historical_attributions_required: true
  ai_drafted_facts_require_source: true
  citation_style: "AAS"
  external_link_validation: true

accessibility_standards:
  wcag_target: "2.1 AA"
  alt_text_required: true
  caption_required_for_figures: true
  color_not_sole_signal: true
  motion_respects_reduced_preference: true
  audio_transcripts_required: true

ai_policy:
  instructor_final_authority: true
  no_unreviewed_ai_content: true
  transparency_notes_required: true
  citations_required_for_empirical_claims: true
  instructor_voice_cloning: "prohibited"
  student_ai_use_policy: "see /about-this-course/ai-policy-for-students"
  ai_drafted_chapters_marked: true

out_of_scope:
  - topic: "detailed general-relativistic cosmology"
    reason: "reserved for ASTR 596; ASTR 201 stays in Newtonian + special-relativistic regime"
  - topic: "MHD and plasma physics"
    reason: "out of scope for sophomore-level cosmology survey"
  - topic: "observational data reduction techniques"
    reason: "covered in ASTR 351 — Observational Astronomy lab course"
  - topic: "stellar nucleosynthesis derivations"
    reason: "results stated; derivations deferred to ASTR 412"
```

## Rendering on the course site

A Sophie-LDS-compliant course renders the contract at
`/about-this-course/pedagogy-contract/`. The rendering page reads
the YAML (single source of truth) and displays sections as
collapsible blocks with the field labels as headings. Implementation
lands in the follow-up code PR (per
[ADR 0042 Consequences](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md#consequences))
via `PedagogyContractPage.astro`.

## Updating the contract

Contract revisions follow the TDR-supersession pattern:

1. Edit `pedagogy-contract.yaml` directly.
2. Update `course.last_updated`.
3. Write a TDR (per [ADR 0040](../decisions/0040-teaching-decision-records.md))
   recording the revision + reason. The TDR's References section
   cites the contract section being revised.
4. If the change is *load-bearing* (e.g., changes the `ai_policy` or
   removes a `reasoning_style` move), mark it as a Human Expertise
   Required gate (per backlog B5) and require explicit instructor
   approval at PR review.

Retired contracts (e.g., when a course is completely redesigned)
set `superseded_by: "path/to/new-contract.yaml"` and remain in the
repo as audit history.

## Adding a custom field

The schema can be extended per-course. Custom fields under
`extensions:` are tolerated by the Zod schema (passthrough mode);
audit invariants ignore unknown keys.

```yaml
extensions:
  course_research_context: |
    ASTR 201's cosmology curriculum is informed by Anna Rosen's
    ongoing research in observational galactic astronomy. Selected
    examples in the course are drawn from her current Cottrell-
    funded work.
  funding_acknowledgement: "Cottrell Scholar Award 2026–2028"
```

Custom fields are not rendered by `PedagogyContractPage.astro` at v1
unless the course author adds rendering logic. The schema accepts
them so consumer courses aren't blocked from carrying course-
specific metadata Sophie hasn't anticipated.
