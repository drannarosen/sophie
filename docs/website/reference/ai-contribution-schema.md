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

## Schema overview

Top-level `ai_contribution` object in chapter MDX frontmatter:

| Field | Required | Type | Purpose |
|---|---|---|---|
| `drafted_by` | required | string | AI session/model identifier |
| `instructor_reviewed` | required | boolean | Has the instructor reviewed the draft? |
| `last_review_date` | required | ISO 8601 date | When the most recent review happened |
| `transparency_note` | recommended | prose string | Plain-language footer note for readers |
| `brainstormed_by` | optional | string \| list | AI session(s) used for ideation pre-draft |
| `reviewed_by` | optional | string \| list | AI session(s) used for review/critique passes |
| `instructor_decisions` | optional | list of strings | Notes recording load-bearing instructor judgment calls |

## Field specifications

### `drafted_by` (required)

Identifies the AI session or model that produced the draft. Format
is free-form string — typical values:

- `"claude-opus-4.7-2026-05-14-session-abc123"` (Anthropic with
  session ID)
- `"gpt-5.5-2026-05-14"` (OpenAI dated)
- `"none"` (chapter authored entirely by the instructor; rare but
  permitted when explicit disclosure helps SoTL claims)

The string is opaque to the schema — it's recorded for
auditability, not parsed. Consistent format within a course is
the author's responsibility; the field accepts any non-empty
string.

### `instructor_reviewed` (required)

Boolean. `true` if the instructor has reviewed the draft for
scientific accuracy, pedagogical fit, and citation completeness.
`false` if the chapter is still in pre-review draft state.

Audit invariant **AC1** (per ADR 0042) flags published chapters
with `instructor_reviewed: false` as a WARNING. (Build doesn't
fail — the field's purpose is *disclosure*, not *gating*. The
warning surfaces in the build report.)

### `last_review_date` (required)

ISO 8601 date (`YYYY-MM-DD`) of the most recent instructor review.
Updated whenever the instructor reviews a revision.

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
  drafted_by: "claude-opus-4.7-2026-08-15-session-7f2a9c"
  instructor_reviewed: true
  last_review_date: "2026-08-18"

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

## Rendering surfaces

### Per-chapter footer (visible default)

When `ai_contribution.transparency_note` is present, the
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

`<AiLedgerPage.astro>` aggregates `ai_contribution` from every
chapter in the course and renders:

- Course-level summary stats (N chapters with AI assistance; M
  reviewed; etc.)
- Per-chapter record table sorted by date
- Drill-down per chapter showing the full `ai_contribution` record
  including `instructor_decisions` list

This is the *SoTL-citable artifact* — the public URL a paper, grant
proposal, or tenure-case narrative points to as evidence of
responsible AI use.

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
