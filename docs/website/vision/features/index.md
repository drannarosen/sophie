---
title: Feature aspirations
short_title: Features
description: Sophie's feature wishlist organized by status — speculative ideas, backlog candidates, accepted-pending-ADR commitments, and graduated features that have moved to decisions/ + roadmap.
tags: [vision, features, wishlist, staging-area, roadmap]
---

# Feature aspirations

The staging area for feature ideas Sophie might grow into. Every
entry has an explicit status; ideas flow from *speculative* →
*backlog* → *accepted-pending-ADR* → *graduated* (with the
corresponding [ADR](../../decisions/) and
[roadmap](../../status/roadmap.md) entry).

The lifecycle rules and graduation criteria are documented in
[Transitions](../transitions/index.md).

## The four statuses

| Status | What it means | What goes in | Files |
|---|---|---|---|
| **Speculative** | A blue-sky idea. We're considering whether it's worth pursuing. May never ship. | Anything plausible — quotes from conversations, research-paper-inspired ideas, "what if Sophie could…" thoughts | [`speculative.md`](speculative.md) |
| **Backlog** | An idea that has earned consideration. We've decided it *might* be worth shipping, but it's not committed. | Ideas with a clear motivating use case + at least a sketch of how they'd work + a sense of cost | [`backlog.md`](backlog.md) |
| **Accepted-pending-ADR** | A committed feature. We're going to ship it; an ADR is needed before implementation can begin. | Ideas with a use case, a design sketch, an estimated cost, and a defended priority claim | [`accepted.md`](accepted.md) |
| **Graduated** | An idea that has become an [ADR](../../decisions/) and (usually) a [roadmap](../../status/roadmap.md) entry. The vision/ entry becomes a pointer. | Pointer entries with one-sentence summaries + cross-link to the originating ADR | Linked from [`accepted.md`](accepted.md) |

## How an idea moves

```text
        speculative
            │
            │  earns a motivating use case + sketch + cost
            ▼
         backlog
            │
            │  earns a defended priority claim + design sketch
            ▼
   accepted-pending-ADR
            │
            │  ADR drafted, reviewed, accepted
            ▼
        graduated
            │
            │  may show up on the roadmap
            ▼
    (decisions/ + status/)
```

Demotion is possible: an *accepted-pending-ADR* item can move back to
*backlog* if it loses priority; a *backlog* item can move to
*speculative* if its use case evaporates. Movement is documented in
[Transitions](../transitions/index.md).

## Initial top-of-mind aspirations (to be sorted into status files)

Surfaced during the 2026-05-14 vision-section brainstorm with
Anna + Claude + ChatGPT input. These need triage into the four
statuses above:

- **Teaching Decision Records (TDRs)** — pedagogy's equivalent of ADRs;
  capture *why* a curriculum was designed this way. Promising fast-track candidate.
- **Teaching Move Library** — name the pedagogical-choreography
  vocabulary Sophie's components already implement (Predict → Cognitive
  Conflict → Derivation → Unit Check → Visualization → Transfer Prompt
  → Reflection). Each existing component gets a `pedagogy_intent`
  metadata field.
- **AI Contribution Ledger + Pedagogy Contract** — per-course
  artifact codifying what [CLAUDE.md](../../../CLAUDE.md) Engineering
  Principles does informally. Per-chapter `ai_contribution` metadata;
  per-course `pedagogy_contract.yaml`.
- **Misconception Graph + Intervention Library** — extend
  [PR-C4](../../../docs/plans/2026-05-14-pr-c4-overview.md)'s
  `misconceptions` index with graph structure (related concepts,
  prerequisite misconceptions, addressed-by chapters/components) and
  a reusable misconception → intervention pairing library.
- **MultiRep + Notation Registry + Representation Alignment Audit**
  — STEM-specific; bind representations of the same idea (prose,
  equation, plot, code, diagram, physical intuition) so the audit
  catches notation conflicts or missing representations.
- **Equation Biography** — `<KeyEquation>` extended with
  observable-meaning, assumptions, units, common-misuses metadata;
  auto-generates equation glossary + audit checks.
- **Approximation Honesty** — new `<Approximation>` primitive
  declaring `valid_when` / `breaks_when` / `why_useful`. Audit flags
  ≈/∼/"roughly" prose without declared validity regime.
- **Pedagogical Diff / Curriculum CI** — software-engineering rigor
  applied to curriculum changes. `sophie audit` extended with
  pedagogy-aware diff output.
- **Course Brain / structured AI memory** — serialized representation
  of the populated pedagogy index for AI consumption (already exists
  implicitly in `<script id="sophie-pedagogy-*">` tags).
- **Human Expertise Required gates** — frontmatter flag on operations
  that require explicit instructor judgment (concept introduction,
  learning objective changes).
- **Multi-modal generation pipeline** — `MediaSpec` → `AudioScript`
  / `AnimationSpec` → `VoiceProvider` interface → audit. Audio
  overviews, two-voice Socratic podcasts, retrieval audio, Manim
  animations. Strict no-instructor-voice-cloning policy.
- **AI Literacy callouts** — student-facing scaffolding teaching
  responsible AI use. "How AI can help here / what AI may get wrong."
- **Course as Research Object** — versioned pedagogy changes,
  component usage, misconception targets, AI contribution records;
  the SoTL artifact for the tenure case.

Each will be triaged into [`accepted.md`](accepted.md),
[`backlog.md`](backlog.md), or [`speculative.md`](speculative.md) in
subsequent sessions.
