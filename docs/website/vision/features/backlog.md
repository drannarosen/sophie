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

## B1. Equation Biography — promoted to A7 (2026-05-14)

Promoted to [accepted-pending-ADR as A7](accepted.md#a7-equation-biography)
on 2026-05-14 after a six-question brainstorm resolved the open
design questions (component shape, assumption typing, rendering
surface, audit invariants, NR cross-ref depth, scope).

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

## B3. Pedagogical Diff / Curriculum CI — promoted to A6 (2026-05-14)

Promoted to [accepted-pending-ADR as A6](accepted.md#a6-pedagogical-diff-curriculum-ci)
on 2026-05-14 after a six-question brainstorm resolved the open
design questions (taxonomy shape, output formats, index-pair source,
CLI shape, AI Ledger integration depth, scope).

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

---

## B8. Semester Journal + AI Context Surface

**Motivating use case.** During the 2026-05-14 foundation hardening
brainstorm, ADR 0040's evidence-rigor sub-decisions surfaced a
distinct authoring artifact that TDRs do *not* cover: longitudinal
*observations + in-flight notes* (not yet decisions, not yet
evidenced) that should both (a) accumulate as instructor
professional-development memory and (b) feed the AI primary author
as additional context. Anna explicitly named this in-thread:
"I'll be patient 0 for my courses." The journal needs to be usable
by Anna in fa26 when ASTR 201 migration happens.

Distinct from TDRs (TDRs are decisions with evidence; the journal
is freeform observations that *seed* future TDRs). Distinct from
B4 Course Brain (B4 is index-as-AI-context; the journal is
human-authored prose, longitudinal, freeform).

**Design sketch.** Per-semester markdown file
(`docs/journals/<course>-<semester>.md`) with optional
chapter-scoped sub-entries. Schema-loose by design: each entry is
a dated section with freeform body. CLI surface: `sophie journal
new <slug>` opens a templated entry; `sophie journal context
--for=<chapter>` extracts journal entries relevant to a chapter
as an AI prompt-context block. Storage is plain markdown in the
consumer-course repo (same persistence model as TDRs).

**Estimated cost.** Small — ~1 day. The freeform structure is
intentional; tooling is mostly extraction + templating, not
schema.

**Dependencies.** A1 (TDRs) shipped (so the journal-vs-TDR
distinction is clean) + the consumer-course migration starting
(so there's a real chapter to journal about).

**Open questions.** Journal entries are always `visibility:
internal` (per the ADR 0040 hardening lock). Promotion path: a
journal entry that becomes a decision graduates to a TDR; the
original entry remains for historical traceability. Should the
CLI auto-detect "this journal entry references a recent commit"
and offer to create a TDR seed? Possibly, but YAGNI for v1.

**Status.**
- 2026-05-14 — surfaced during ADR 0040 evidence-rigor brainstorm
  as a missing-domain gap from the foundation review
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: ASTR 201 fa26 starts and Anna
  needs the journal to begin accumulating observations. ADR for
  it would naturally pair with the AI authoring loop ADR work
  (Phase 3 of the Sophie roadmap).

---

## B9. Learning Telemetry (outcome-side measurement)

**Motivating use case.** ADR 0047 (Empirical Validation Plan)
ships Sophie's authoring-side metrics in v1, but explicitly defers
outcome-side measurement — concept inventory Hake gain,
calibration improvement, time-on-task distributions, code-cell
error trajectories — to a future ADR. Paper #2 of the SoTL
strategy (PER-audience, outcome-side claims) requires this
infrastructure.

The deferral is deliberate (per Anna's directive: ship the
instructor version first; outcomes follow once the conformance
discipline is exercised in production). But the telemetry needs
to be designed with paper #2's joins in mind: per-chapter outcome
× per-chapter conformance state, anchored on
`course-version × chapter-anchor × semester-id`.

Distinct from `ai_ledger` (ledger is what the instructor did);
distinct from M1-M8 metrics (those are structured-data-derived);
this is *student-behavior data with consent*.

**Design sketch.** Extend `ResponseStore` (per ADR 0007 +
ADR 0047's preservation commitment) with additive telemetry
tables: per-submission correctness + confidence-calibration
deltas; timing-anchored engagement signals under explicit opt-in
consent per ADR 0007's strict data minimization policy. Some
form of audit-invariant family (consent-UI presence,
telemetry-schema versioning, per-chapter coverage) — invariant
codes and severities deferred to the eventual B9 ADR, not
pre-committed at backlog tier. CLI surface for aggregated,
anonymized outcome export to paper-writing pipelines.

The B9 ADR will formally answer: what's the consent UI?
Where does aggregated outcome data live (in-tree commits, or
external storage with a controlled join key)? How does the v3
cross-device sync seam (per ADR 0007) interact with opt-in
telemetry? Which subset of telemetry is paper #2's load-bearing
outcome signal?

**Estimated cost.** Medium — ~2-3 weeks. Schema design + consent
UI + audit invariants + outcome-export pipeline. The persistence
substrate is already in place via ADR 0007; B9 is additive over
it.

**Dependencies.** A3 (Pedagogy Contract + AI Ledger) — telemetry
ties outcomes to the chapters that produced them, which requires
the contract to be live. A6 (sophie diff) for course-version
joins. ASTR 201 + COMP 521 fa26 in production (so there's actual
student-outcome data to design against).

**Open questions.** Default consent posture (opt-in vs opt-out
— Anna's stated preference per ADR 0007 is opt-in only). What
data is collected without consent (presumably: nothing). FERPA
compliance: per-course-database boundaries per ADR 0007 already
support FERPA; B9 adds analytics that must respect the same
boundary. Outcome metrics paper #2 will use: which subset of
B9 telemetry are the load-bearing outcome signals?

**Status.**
- 2026-05-14 — surfaced during ADR 0047 brainstorm as a
  missing-domain gap from the foundation review; deferred to
  ship the instructor-side metrics first
- 2026-05-14 — promoted to backlog
- Promotion criteria for accepted: ADR 0047's M1-M8 metrics
  validated through one full ASTR 201 semester, AND paper #1
  draft underway (so paper #2's data needs are concrete), AND
  bandwidth to design the consent UI carefully (FERPA-sensitive
  work that can't be rushed).

References:

- ADR 0047 Empirical Validation Plan (Paper #2 of the SoTL
  strategy is the outcome-side paper this backlog entry serves;
  see `strategy/papers/paper-2-hitl.md`).

---

## B10. Recurring schedule events with DST-aware rules

**Motivating use case.** ADR 0052 (Scheduled Publication) +
ADR 0054 (Course Schedule + Calendar Page) ship per-event
absolute ISO-8601 timestamps in v1 — every lecture, assignment,
exam, and reading is declared individually in `schedule.yaml`.
A 14-week course with weekly lectures means ~30 event entries
per semester per course, distributed across weekly sections.

The deferral is deliberate (DST is structurally bulletproof
under absolute timestamps; recurrence-with-DST tooling is
exactly where DST bugs hide). But if authoring data shows the
per-event approach scales poorly (multi-course instructors;
many-week courses; tight cadences like daily readings), a
recurrence-rule extension would reduce authoring overhead.

**Design sketch.** Extend `schedule.yaml` event shape with an
optional `recurrence:` field accepting RFC 5545 RRULE syntax
(`FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261215T235959`). At build
time, the recurrence expands to individual VEVENTs in the iCal
feed using a tested library (likely `ical.js` from Mozilla;
~30 KB; bundled DST/IANA tz data). The Sophie build pipeline
emits proper `VTIMEZONE` blocks in the feed when recurrence
rules are present. Audit invariants extend SC family with a
recurrence-DST sanity check (does the rule cross a DST
transition? does the iCal feed's VTIMEZONE block contain the
DST rule?).

**Estimated cost.** Small-to-medium — ~3–5 days. Schema field +
`ical.js` integration + audit invariant + tests covering DST
transitions in the IANA tz database.

**Dependencies.** ADR 0054 shipped. Real authoring data from
ASTR 201 fa26 + COMP 521 fa26 (and ideally sp27) showing
per-event authoring is producing real friction.

**Open questions.** Should recurrence rules be authored in
`schedule.yaml` or in a separate `recurrences.yaml`? Probably
inline in `schedule.yaml` (one file is simpler). What's the
default RRULE for "the rest of the semester through the end
tag"? Probably explicit `UNTIL=<end-tag-date>` per RFC 5545.

**Status.**
- 2026-05-15 — surfaced during ADR 0052 + 0054 hardening
  brainstorm; deferred deliberately to keep v1 DST-bulletproof
- 2026-05-15 — promoted to backlog
- Promotion criteria for accepted: ASTR 201 fa26 + sp27
  authoring data shows recurrence-rule demand (e.g., authoring
  >100 events per semester becomes a real pain point), OR an
  external adopter with daily-cadence content surfaces.
