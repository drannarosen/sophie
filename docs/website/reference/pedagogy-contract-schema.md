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
