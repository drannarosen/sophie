---
title: Backlog features
short_title: Backlog
description: Feature ideas with a clear motivating use case, design sketch, and rough cost estimate — but not yet committed to ship. Promotion to accepted requires a defended priority claim.
tags: [vision, features, backlog, sophie-lds]
---

# Backlog features

Ideas that have earned consideration. Each has a motivating use case,
a design sketch, and a rough cost estimate — but it's not yet
committed to ship.

Promotion to [accepted-pending-ADR](accepted.md) requires a defended
*priority claim*: why does this earn a slot ahead of other backlog
items? See [Transitions](../transitions/index.md) for the gate
criteria.

## B1. Equation Biography (`<KeyEquation>` extended fields)

**Motivating use case.** STEM equations are not just rendered math —
they have stories: what they observe, what assumptions they encode,
what units they require, where they break, what students commonly
misuse. ASTR 201's Wien's law has all of these (`λ_peak = b/T`, valid
for blackbody only, implies Planck-distribution, students misuse for
non-thermal emission). Sophie's `<KeyEquation>` currently captures
the equation and a title; the rest lives in surrounding prose if
anywhere.

**Design sketch.** Extend `<KeyEquation>` props (and the equations
index) with optional fields: `observable_meaning`, `assumptions: []`,
`units: { symbol → unit }`, `common_misuses: []`, `breaks_when`.
Existing chapters don't break (fields optional); new chapters opt
in. Sophie auto-generates an equation-glossary view + an equation
biography appendix per chapter when fields are populated.

**Estimated cost.** Schema extension + audit invariant (~3–4 hours)
+ rendering for the new fields in chapter consumers (~half-day) +
documentation (~1 hour). Total: ~1 day.

**Dependencies.** Notation Registry (A4) — `units` field references
the registry's symbol entries. Should land after or alongside A4.

**Open questions.** Is the equation-biography view a per-equation
expander on hover, an appendix at chapter-end, both, or a separate
`/equations` route enhancement? Should `assumptions` be free-form or
typed (`small-angle`, `non-relativistic`, `thermal-equilibrium`)?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog (motivating use case clear;
  depends on A4)
- Promotion criteria for accepted: Module 1 of ASTR 201 has at least
  one equation that *wants* the affordance (likely Wien's law or
  Hubble–Lemaître).

---

## B2. Approximation Honesty (`<Approximation>` primitive)

**Motivating use case.** STEM teaching is dense with approximations:
"For nearby galaxies, redshift ≈ v/c"; "the small-angle approximation
gives parallax distance in parsecs as 1/p"; "treat the star as a
perfect blackbody." Students rarely understand *when* the
approximation is exact, when it breaks, and why it's used at all.
Today: approximations hide in prose with `≈`, `∼`, or "roughly."
Tomorrow: they're declared and audited.

**Design sketch.** New `<Approximation>` source component (extracted
to the pedagogy index) declaring `statement`, `valid_when`,
`breaks_when`, `why_useful`. Audit invariant flags `≈`/`∼`/`roughly`
prose in chapter content that isn't inside an `<Approximation>` block
(or excused via `<Aside kind="note">`-style override).

**Estimated cost.** Small — new source-component pattern follows
established Bucket C precedent (~1 day for component + extractor +
audit invariant).

**Dependencies.** None hard. Notation Registry (A4) would polish the
unit-handling but isn't required.

**Open questions.** Is `<Approximation>` block-level (its own visual
treatment, like `<Aside kind="key-insight">`) or inline (`<Approximation
limit="z << 1">redshift ≈ v/c</Approximation>` mid-prose)?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog (small + STEM-valuable; deferred
  because no accepted item depends on it)
- Promotion criteria for accepted: first chapter authoring needs the
  affordance (Hubble's law chapter likely will — explicit `z << 1`
  regime).

---

## B3. Pedagogical Diff / Curriculum CI

**Motivating use case.** When AI (or Anna) revises a chapter, `git
diff` shows text changes but not *pedagogical* changes. Did this
revision add or remove a `<Predict>`? Change a definition? Break a
cross-reference? Introduce a new misconception target? Today: the
human reviewer (Anna) compares pre/post manually. Tomorrow: `sophie
diff` shows the pedagogical change set.

**Design sketch.** Build on PR-C4's audit invariants. Diff = compare
the PedagogyIndex between two refs (pre/post commit) and emit a
structured pedagogical-change report: "Added 2 retrieval prompts, 1
worked example, removed 1 misconception target, broke 1 equation
reference, introduced 3 uncited claims." Surface in `sophie audit`
CLI output and (eventually) GitHub PR comments.

**Estimated cost.** ~2–3 days. Real implementation work; the audit
substrate exists (PR-C4 + post-Bucket-C cleanup), but the diff
computation + report formatting is new.

**Dependencies.** None hard. Multi-modal (B6) and AI Contribution
Ledger (A3) integrate naturally if both ship.

**Open questions.** What's the canonical change taxonomy? Where does
the diff render — terminal output, JSON for tooling, HTML for PR
comments, all three?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: AI-authoring volume grows to where
  manual revision review is the bottleneck (likely Phase 4 mid-sprint
  or later).

---

## B4. Course Brain (serialized pedagogy index for AI consumption)

**Motivating use case.** When AI scaffolds a new section, it should
know: what students have already seen, what notation has been used,
what misconceptions are active, what demos exist, what's coming
later. Sophie's PedagogyIndex *already serializes* this via
`<script id="sophie-pedagogy-*">` tags emitted by `TextbookLayout`.
But there's no clean AI-readable prompt-context dump — the JSON tags
are designed for browser-side hydration, not LLM context windows.

**Design sketch.** Add a `sophie brain dump` CLI command that emits
a curated AI-readable representation: course concepts, learning
objectives, misconceptions, equations, figures, demos, assignments,
TDRs (when shipped), pedagogy contract (when shipped), known student
pain points. Output format: a single Markdown file or JSON depending
on consumer. Optional: stratified summaries (course-level overview,
module-level details, chapter-level specifics).

**Estimated cost.** Small — ~half-day. Mostly serialization +
formatting work over existing index data.

**Dependencies.** None hard. Benefits enormously from A1 (TDRs) and
A3 (Pedagogy Contract) being present.

**Open questions.** Token-budget sensitivity — when do we summarize
vs include verbatim? Should the dump be cached as a build artifact
in the consumer repo, or always regenerated on demand?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: AI authoring volume grows to where
  prompt-context bloat is measurable, OR a `/sophie-scaffold-chapter`
  skill wants this as input.

---

## B5. Human Expertise Required gates

**Motivating use case.** Some content changes require explicit
instructor judgment: introducing a new major concept, changing a
learning objective, revising a core definition, adding an empirical
claim, changing AI policy. Today: nothing flags these — AI (or
casual contributors) could change them silently. Tomorrow: Sophie
marks them as "Requires instructor judgment" and a CI gate enforces
the flag.

**Design sketch.** A frontmatter flag `requires_instructor_judgment:
true` on operations or chapter regions. CI invariant: any PR touching
a flagged region requires an `instructor-approved` label from a
GitHub user with the instructor role (anna). Optional: per-chapter
list of flagged-by-default operations.

**Estimated cost.** Small — ~half-day. Frontmatter convention + CI
workflow + docs.

**Dependencies.** Depends on A1 (TDRs) — the gates reference TDR
identifiers ("changing this requires updating TDR-007"). Implementable
after A1 ships.

**Open questions.** How granular — per-chapter-region (markdown
range), per-component (every `<KeyEquation>`), per-collection-entry?
GitHub-label-enforcement vs. some other workflow (e.g., dual-PR-approval)?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: first non-Anna contributor (or
  first AI revision PR that touches a load-bearing concept) — whichever
  surfaces the need first.

---

## B6. Multi-modal generation pipeline

**Motivating use case.** A rigorously-structured chapter is a *source
of truth* that can responsibly generate many learning modalities —
audio overview, two-voice Socratic podcast, narrated mini-lecture,
Manim-style animation, retrieval audio for commute review, study
guide. Today: each modality is a separate manual production. Tomorrow:
the chapter is the source; Sophie generates instructor-reviewed,
misconception-aware, accessible variants under an audit contract.

**Design sketch.** Abstractions: `MediaSpec` (what to generate +
target audience + duration + concepts + misconceptions),
`AudioScript` (synthesizable audio with stage directions),
`AnimationSpec` (Manim storyboard), `VoiceProvider` (TTS interface
abstraction), `MediaProvenance` (versioning + chapter-source-of-truth
links). Workflow: Chapter → MediaSpec → MediaScript/Storyboard →
Instructor Review → Render → QA → Publish. Strict no-instructor-
voice-cloning policy.

**Estimated cost.** Multi-sprint (~6–10 weeks at full scope). v1
might ship audio overview + retrieval audio + transcripts (~2 weeks);
v2 adds Manim integration (~2–3 weeks); v3 adds the studio UI and
versioning (~1–2 weeks). Each sub-feature can ship independently.

**Dependencies.** A1 (TDRs) + A3 (AI Contribution Ledger) — media
audit references both. Notation Registry (A4) for Manim's equation
notation consistency.

**Open questions.** Voice provider selection — single vs abstracted?
Local/free draft tier (Piper, Kokoro) vs production tier (ElevenLabs,
OpenAI, Cartesia)? Default voice personalities for Sophie? Manim
rendering: in-CI or local?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: Module 1 of ASTR 201 migration
  validates the chapter-anchored model AND a real student need
  surfaces (commute audio, exam review podcast, etc.).
- Sub-features that may promote independently: **AI Literacy callouts**
  (student-facing prose), **AI Misuse Warnings** (per-assignment-type),
  **Red-Team-the-Chapter slash command** (a Sophie skill that emits
  Student Confusion Forecasts).

---

## B7. Course as Research Object (SoTL/tenure artifact)

**Motivating use case.** Sophie's git-versioned curriculum + TDRs +
AI Contribution Ledger + audit history + (eventually) anonymized
learning analytics = a *reproducible curriculum intervention*. That's
unusual in higher-ed scholarship. The artifact already largely
exists; what's missing is the *framing piece* — a publishable
description of "ASTR 201 as a Sophie course" with methodology,
artifacts, evolution, lessons.

**Design sketch.** Not a code artifact. A *publication* — likely a
SoTL paper or a chapter in a learning-engineering anthology — that
treats the Sophie-built ASTR 201 (post-Phase-4) as a reproducible
artifact. Sophie-platform docs include the methodology section
(`vision/research-artifact.md` or similar) so other instructors can
adopt the framing.

**Estimated cost.** ~1–2 weeks of paper-drafting (Anna's writing
time, not platform implementation). The platform features it depends
on are already accepted or graduated.

**Dependencies.** A1 (TDRs) + A3 (AI Contribution Ledger) — together
they ARE the research artifact. Need both shipped + populated with
real entries for ASTR 201 before the paper can be written.

**Open questions.** Venue (ed-tech journal, learning-science journal,
discipline-specific journal)? Co-author scope? When in the timeline
relative to ASTR 201 Phase-4 launch?

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: A1 + A3 shipped AND ASTR 201
  Phase 4 launched AND Anna has paper-writing bandwidth (likely
  Spring 2027 or summer 2027 per strategy/papers/ planning).
