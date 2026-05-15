---
title: AI Contribution schema
short_title: AI contribution
description: Per-chapter frontmatter schema for `ai_contribution` — the chapter-level disclosure of AI authoring assistance + instructor review. Includes a fully-filled example from ASTR 201 Module 1.
tags: [pedagogy, reference, ai-contribution, schema, responsible-ai, transparency, lds]
---

# AI Contribution schema

Each chapter MDX file in a Sophie-LDS-compliant course optionally
carries an `ai_contribution` block in its frontmatter. The block
declares which AI sessions contributed to the chapter and whether
the instructor has reviewed it. The chapter's `transparency_note`
renders publicly at the chapter footer; the full ai_contribution
record renders on the course-wide ledger at
`/about-this-course/ai-ledger/`.

The full rationale lives at
[ADR 0042 — Pedagogy Contract + AI Contribution Ledger](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md).

## Why disclosure matters

Sophie's positioning ([`vision/index.md`](../vision/index.md))
makes responsible-AI-use *visible*. Per-chapter ai_contribution
records turn the rhetorical claim ("we use AI responsibly") into
a concrete public artifact ("here is which AI session drafted this
chapter; here is what the instructor reviewed; here is when").

Absence of the field on a chapter is *meaningful*: it indicates the
chapter was not AI-assisted (or pre-dates Sophie's adoption of the
schema). The rendered footer simply omits the transparency note
rather than asserting either AI or non-AI authorship.

## Schema overview (hardened 2026-05-14)

Per [ADR 0042](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md),
the schema replaces coarse booleans with structured objects and
adds a `visibility` field (default **internal**).

Top-level `ai_contribution` object in chapter MDX frontmatter:

| Field | Required | Type | Purpose |
|---|---|---|---|
| `visibility` | optional, default `internal` | `internal` \| `public` | Two-tier visibility — internal records stay private; opt-in `public` surfaces on `/about-this-course/ai-ledger` |
| `ai_workflow` | required when AI was involved | object | Replaces `drafted_by`; structured workflow shape |
| `instructor_reviewed` | required when reviewed | object | Replaces binary; structured review shape (`by` + `date` + `depth` + `against`) |
| `transparency_note` | recommended | prose string | Plain-language footer note (renders only when `visibility: public`) |
| `brainstormed_by` | optional | string \| list | AI session(s) used for ideation pre-draft |
| `reviewed_by` | optional | string \| list | AI session(s) used for review/critique passes |
| `instructor_decisions` | optional | list of strings | Notes recording load-bearing instructor judgment calls |
| ~~`drafted_by`~~ | **deprecated** | — | Replaced by `ai_workflow.models` |
| ~~`last_review_date`~~ | **deprecated** | — | Replaced by `instructor_reviewed.date` |

No back-compat shim per Sophie's pre-launch no-back-compat stance.
Chapters using the pre-hardening shape get hard-renamed at the
v1 platform code PR.

## Field specifications

### `visibility` (optional, default `internal`)

Two-tier visibility per the 2026-05-14 hardening. Most chapters
stay internal — frank operational records protected; opt-in
`public` for SoTL citation, departmental sharing, or tenure-case
artifacts.

```yaml
ai_contribution:
  visibility: internal      # default
# OR
ai_contribution:
  visibility: public        # opt-in
```

Render behavior:

| Visibility | `/about-this-course/ai-ledger` | Chapter footer |
|---|---|---|
| `internal` (default) | Not rendered | No `transparency_note` rendered |
| `public` | Full `ai_contribution` block rendered | `transparency_note` rendered if present |

The course-level *stance* (Pedagogy Contract + AI Training
Provenance) stays public regardless of per-chapter visibility —
the contract declares the course's position even when no
per-chapter records are published.

### `ai_workflow` (required when AI was involved)

Structured object replacing `drafted_by`. Captures the
collaboration shape, not just identity.

```yaml
ai_contribution:
  ai_workflow:
    models: ["claude-opus-4-7"]     # required: list of AI model identifiers
    generation_share: ai-primary    # required: ai-primary | mixed | instructor-primary
    iterations: 3                   # optional: AI↔instructor handoff count
    edit_intensity: heavy           # optional: light | moderate | heavy | rewrite
```

- **`models`** (required, list of strings) — AI model identifiers
  involved in drafting. List supports multi-model authoring (rare
  but real). Must be drawn from `pedagogy-contract.yaml`'s
  `ai_training_provenance.models_allowed` list; otherwise audit
  flags.
- **`generation_share`** (required, three-value enum) —
  categorical share of generation between AI and instructor.
  Values:
  - `ai-primary` — AI drafted the majority; instructor edited.
    **Sophie's default workflow per ADR 0030 amendment**.
  - `mixed` — substantial co-authoring; neither dominant.
  - `instructor-primary` — instructor drafted; AI assisted at the
    margins.
  Categorical over percentage because nobody can estimate "80%
  AI-generated" reliably; three buckets capture what's knowable.
- **`iterations`** (optional, integer) — count of AI↔instructor
  handoff cycles during drafting.
- **`edit_intensity`** (optional, four-value enum) — the analog of
  review depth for the editing pass:
  - `light` — typos and small tweaks
  - `moderate` — paragraph-level edits
  - `heavy` — restructuring
  - `rewrite` — fundamental rewrite of AI's draft

Chapters that were *not* AI-assisted set `ai_workflow: null` (or
omit `ai_contribution` entirely). The field's null/absence is
meaningful — does not assert AI or non-AI authorship positively.

### `instructor_reviewed` (required when reviewed)

Structured object replacing the binary. Absence-means-not-reviewed
— omit the block entirely if review hasn't happened yet.

```yaml
ai_contribution:
  instructor_reviewed:
    by: alrosen               # required when block present
    date: 2026-05-14          # required (replaces top-level last_review_date)
    depth: full-pass          # required: line-by-line | full-pass | skim
    against:                  # required: non-empty list
      - pedagogy_contract
      - scientific_accuracy
      - citation_check
      - misconception_handling
```

- **`by`** (required, string) — reviewer identifier (typically
  instructor username or email). Sets up for future shared-course
  scenarios where multiple reviewers may sign.
- **`date`** (required, ISO 8601 date) — when the review happened.
  Replaces deprecated top-level `last_review_date`.
- **`depth`** (required, three-value enum) — captures review
  effort honestly:
  - `line-by-line` — every line examined
  - `full-pass` — read end-to-end, key sections scrutinized
  - `skim` — quick pass for obvious errors
- **`against`** (required, list, must be non-empty) — review-
  dimension keywords. The v1 recognized values:
  - `pedagogy_contract` — verified against the course's contract
  - `scientific_accuracy` — checked claims for correctness
  - `citation_check` — verified all cited sources
  - `misconception_handling` — verified misconception coverage
  Other values land in v2 as authoring surfaces them (e.g.,
  `accessibility_check`, `tone_and_voice`, `code_correctness`).

Audit invariants per ADR 0042:

- **AC1** (ERROR): chapter with `status: stable` declares
  `ai_workflow` but lacks `instructor_reviewed`. Published AI-
  contributed content must be reviewed before shipping.
- **AC2** (WARNING): `instructor_reviewed.date` predates the most
  recent change touching the chapter (stale review).
- **AC4** (WARNING): `ai_workflow.generation_share = ai-primary`
  AND `instructor_reviewed.depth = skim`. The highest-risk
  combination; instructor value-add lives in review depth.
- **AC5** (INFO): `visibility: public` AND
  `instructor_reviewed.depth = skim`. Discourages publishing
  skim-reviewed records.

### `last_review_date` (deprecated)

Replaced by `instructor_reviewed.date` in the 2026-05-14
hardening. Old field removed; no back-compat.

### `transparency_note` (recommended)

A plain-language paragraph (1–3 sentences) summarizing the AI's
involvement for a public reader. This is the field that *renders
visibly* at the chapter footer — it's the student-facing
disclosure.

Style guidance:

- Plain language, no jargon.
- Describes *what AI did* + *what the instructor did*.
- Avoids over-claiming (don't claim "AI ensures accuracy" — claim
  "AI drafted; instructor verified accuracy").
- Avoids under-claiming (don't say "minor AI assistance" if the
  chapter is 90% AI-drafted).

### `brainstormed_by` (optional)

AI session(s) used for ideation/conceptual brainstorming before
the draft was written. Useful when the *thinking* about a chapter
was AI-assisted but the *drafting* was not (e.g., AI suggested
the misconception to target; instructor wrote the prose).

### `reviewed_by` (optional)

AI session(s) used for review or critique passes after the draft
was written. Useful when a different AI session (or the same one
in a different role) audited the chapter for issues.

### `instructor_decisions` (optional)

List of natural-language notes recording places where the
instructor made load-bearing judgment calls — typically where AI
suggestions were overridden, where pedagogical choices required
domain expertise, or where ethical/political considerations
shaped the final form.

This list is the deepest part of the ledger. It's what
distinguishes a *supervised* AI-authored chapter from a
*rubber-stamped* one. When deployed thoroughly, it's also the
artifact most useful for SoTL papers and the tenure case.

Dual-profile work (Phase 5 per [`status/roadmap.md`](../status/roadmap.md))
may eventually allow `instructor_decisions` to be marked
instructor-only on a per-entry basis. At v1, the entire list is
public-by-default.

## Fully-filled example: ASTR 201 Lecture 1

Drawn from the same "spoiler alerts" lecture used as the TDR-001
example. Shows the schema filled in with realistic depth.

```yaml
---
title: "Lecture 1 — Spoiler Alerts: The Universe Is Weird"
slug: spoiler-alerts
module: 01-foundations
lectureNumber: 1
date: "2026-08-26"

ai_contribution:
  visibility: internal

  ai_workflow:
    models: ["claude-opus-4-7"]
    generation_share: ai-primary
    iterations: 3
    edit_intensity: heavy

  instructor_reviewed:
    by: alrosen
    date: 2026-08-18
    depth: full-pass
    against:
      - pedagogy_contract
      - scientific_accuracy
      - citation_check
      - misconception_handling

  transparency_note: |
    This chapter was drafted with AI assistance, then reviewed and
    revised by Anna Rosen for scientific accuracy, pedagogical fit
    with ASTR 201's predict-then-reveal contract, and citation
    completeness. The "spoiler alerts" framing and the specific
    misconceptions targeted (universe-with-a-center; recession-as-
    ordinary-motion) were instructor-authored; AI drafted the
    surrounding prose connecting them. See teaching-decisions/001-…
    for the pedagogical rationale.

  brainstormed_by:
    - "claude-opus-4.7-2026-08-10-session-3d4e1b (initial framing)"
    - "gpt-5.5-2026-08-12 (analogy generation)"

  reviewed_by:
    - "claude-opus-4.7-2026-08-17-session-9a0c2e (misconception
      coverage check)"

  instructor_decisions:
    - "Rejected AI suggestion to introduce dark energy in Lecture 1
      (out of scope per pedagogy-contract.yaml#out_of_scope; ASTR
      201 stays in Newtonian + special-relativistic regime in
      Module 1)."
    - "Replaced AI-drafted balloon analogy with an instructor-
      authored expanding-grid analogy. The balloon analogy implies
      a center (per misconception-graph entry expansion-from-center)
      and contradicts the predict-then-reveal sequence intended for
      this section."
    - "Verified every claim about Hubble's 1929 observation against
      primary sources; corrected one date AI had wrong (the
      observational paper was Lemaître 1927 for the theoretical
      prediction; AI initially attributed it to Hubble 1929 alone)."
    - "Added the citation to Posner et al. 1982 grounding the
      predict-then-reveal sequence; AI had referenced 'cognitive
      conflict literature' generically without specific citation."
---
```

## Rendering surfaces (hardened 2026-05-14)

Render behavior was restructured in the 2026-05-14 hardening
pass — per-chapter records are visibility-gated; only the
course-level stance is always public.

### Per-chapter footer (renders only when `visibility: public`)

When `ai_contribution.visibility == "public"` AND
`ai_contribution.transparency_note` is present, the
`<ChapterFooter>` component renders:

```html
<aside class="ai-transparency-note">
  <h3>About this chapter</h3>
  <p>This chapter was drafted with AI assistance, then reviewed and
  revised by Anna Rosen...</p>
  <p><a href="/about-this-course/ai-ledger#spoiler-alerts">
  View full AI contribution record →</a></p>
</aside>
```

Single, visible, in-context. Implementation lands in the follow-up
code PR per [ADR 0042 Consequences](../decisions/0042-pedagogy-contract-and-ai-contribution-ledger.md#consequences).

### Course-wide ledger page (`/about-this-course/ai-ledger/`)

`<AiLedgerPage.astro>` renders conditionally based on per-chapter
visibility:

- **When no chapters have `visibility: public`**: renders only
  `pedagogy-contract.yaml`'s `ai_ledger.preamble` (if declared) +
  a placeholder note *"per-chapter records will publish as the
  course matures."*
- **When some chapters are `public`**: renders the preamble +
  per-chapter `ai_contribution` blocks for those chapters only;
  internal chapters silently omitted.
- **When all chapters are `public`**: full per-chapter ledger.

The `ai_training_provenance` block from `pedagogy-contract.yaml`
renders at the top of the page regardless (it's the course's
permanent public stance, independent of per-chapter visibility).

This is the *SoTL-citable artifact* — the public URL a paper, grant
proposal, or tenure-case narrative points to as evidence of
responsible AI use. Per the hardening, the artifact accumulates
selectively as the instructor opts records into public visibility;
the course-level stance (contract + provenance + preamble) is the
permanent anchor.

## Updating an ai_contribution record

When a chapter is revised:

1. Update `drafted_by` if a new AI session contributed.
2. Set `instructor_reviewed: false` if the revision invalidates the
   prior review.
3. Update `last_review_date` only after a fresh review.
4. Append a new entry to `instructor_decisions` describing what
   changed and why.
5. Update `transparency_note` if the disclosure framing changes.

The ledger is *append-mostly*: prior `instructor_decisions` entries
are retained as audit history. The most recent state of the chapter
is what the rendered surfaces display, but the underlying record
preserves the revision trail.

## Authoring tips

- **Write the `transparency_note` first**. Forcing yourself to
  articulate the chapter's AI history in plain language often
  reveals what the more-structured fields should record.
- **Keep `instructor_decisions` specific.** "Reviewed for accuracy"
  is too vague; "verified the value of H₀ against the Planck 2020
  result" is useful.
- **Disclose the *interesting* decisions**, not the routine ones.
  A list with 50 entries ("fixed typo on line 23") buries the
  load-bearing decisions; a list with 5 well-chosen entries
  surfaces them.
- **Don't fake disclosure**. If the AI did 90% of the writing, the
  transparency note should reflect that. Sophie's responsibility
  claim depends on the disclosure being *honest*, not
  *self-flattering*.
