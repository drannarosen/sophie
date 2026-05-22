---
date: 2026-05-21T00:00:00.000Z
tags:
  - ux
  - student-facing
  - cockpit
  - metacognition
  - absence-recovery
  - tier-1
  - course-website
status: accepted-design
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0076: Student Learning Cockpit + Absence Recovery (Tier 1, local-first metacognition surface)

:::{admonition} ADR metadata

- **Status**: accepted
- **Deciders**: anna
- **Amends**: [0007](./0007-persistence-indexeddb.md) (Cockpit state
  lives in the existing IndexedDB ResponseStore pattern), [0029](./0029-broadcast-channel-last-write-wins.md)
  (cross-tab Cockpit sync uses BroadcastChannel LWW)

:::

## Context

The course-website roadmap (lines covering Schedule, FSRS, BKT,
practice, diagnostics, and Library cheatsheets) shows Sophie *has*
all the ingredients for a student-side metacognition surface, but
those ingredients are scattered across multiple pages with no unified
"daily entry point" for the student. The student-facing analog of
the Tier 3 Instructor room (Console + Prep) is missing. Students
visit the Schedule page for due dates, the Library for spec pages,
the Section for practice, the per-Unit reading for prose — but
nowhere is there a single surface that answers the student's actual
day-to-day question: *what should I do next?*

The external review of 2026-05-21 (ChatGPT, follow-up 25-idea
proposal) flagged this as the top-priority addition, paired with a
related observation: **many students do not know how to study STEM
effectively.** A passive content site teaches content; an active
cockpit can quietly teach learning *skills* — prioritization, spaced
review, metacognitive monitoring, recovery from setbacks. That's a
meaningfully different value proposition.

The Absence Recovery use case is specifically motivated by Anna's
ASTR 201 experience: students miss class, find a pile of slides +
links in Canvas, and have no sense of the *minimum viable path*
back to the course's current state. Current LMSs treat missed
classes as a file inventory problem; Sophie's pedagogy graph + prereq
machinery can do better — for each missed unit, Sophie knows what
the LOs were, what equations/misconceptions were targeted, what
follow-on units depend on this one, and what the smallest recovery
sequence is.

This ADR also pairs explicitly with [ADR 0075 (Student UX
cognitive-load governance)](./0075-student-ux-cognitive-load-governance.md)'s
*"surveillance vs. study-tool"* design commitment: the Cockpit is
load-bearing for that promise. If Sophie ships student-side state
infrastructure *without* a corresponding student-facing surface that
returns value, the infrastructure looks like (and is functionally
indistinguishable from) instructor surveillance plumbing. The
Cockpit is the visible payoff that justifies the data collection in
the first place.

The trigger is that the post-Wedge-A schema layer
([ADR 0073 BKTState + ADR 0069 FSRSRecord + ADR 0066 BaseRecord +
ADR 0067 Unit/Section/Artifact](./0073-unified-assessment-schema.md))
now has every persisted-state shape the Cockpit needs to read.
Building the Cockpit on top is a thin Tier 1 deliverable; deferring
it leaves the student-side promise of Sophie's roadmap unaddressed.

## Decision

Ship a **Student Learning Cockpit** as a Tier 1 student-facing
surface at `/cockpit/` (or `/my/`, label TBD per ADR 0075's
quiet-by-default principle), with these tabs:

1. **Today** — primary entry point; surfaces the day's actionable
   prompts.
2. **Before Next Class** — just-in-time pre-class preparation
   (prereq check + prediction prompt + 5-minute prep reading).
3. **Review Queue** — FSRS-due retrieval prompts, spaced practice,
   weak-mastery flagged items.
4. **Catch-Up** (Absence Recovery Mode) — minimum-viable-recovery
   path for any Unit the student marks "missed."
5. **My Notes / Bookmarks** — per-browser bookmarks, highlights,
   instructor-style "this matters" pins.

All state is per-browser at Tier 1 + 2 (IndexedDB via
[ADR 0007](./0007-persistence-indexeddb.md) + the `BaseRecordSchema`
shape from Wedge A); cross-device sync arrives with Tier 3 LTI
launch per [ADR 0066](./0066-pseudonymous-first-data-model.md)'s
pseudonymous-first contract.

### Today tab

The default landing surface. Renders a prioritized **"What should I
do next?"** list synthesized from:

- Upcoming deadlines within a configurable window (default 7 days)
  pulled from the existing Schedule cluster (Unit + Assessment
  frontmatter dates)
- FSRS-due retrieval prompts that surfaced today's review queue
- Weak prerequisite skills surfaced by BKT (mastery below a
  configurable threshold, default 0.4) for any upcoming Unit
- "Continue where you left off" — the last Reading the student had
  scroll-progress on
- Recent progress mini-summary: items completed in the last 24 hr,
  with a non-gamified encouragement line

The list is rank-ordered by **time-sensitivity × prerequisite-blocking
× student-elective preference** (with an explicit user override —
the student can pin / dismiss / defer items). Cockpit recommendations
are *suggestions*, never mandatory tasks, never gated. ADR 0075's
"primary action per page" principle still applies; the Cockpit's
primary action is "choose your next step," not "do all five things
right now."

### Before Next Class tab

For each upcoming lecture-shape Unit on the schedule:

- 5-minute prep reading slot (drawn from Unit `pre.prep`
  artifact when authored, or auto-generated by AI co-author when not
  per ADR 0030)
- Prerequisite-skills checklist using BKT mastery estimates;
  weak items link to the relevant `<SkillReview>` or bridge surface
- Prediction prompt (`<Predict>` component) to be answered before
  class for productive surprise + lecture-time engagement

This surface motivates the **Pre / In-class / Post-lecture Triad**
schema addition catalogued in the roadmap's Tier B (Unit gets
optional `phases: { pre, live, post }` per future schema extension);
Cockpit reads from those phases when present and gracefully degrades
when absent.

### Review Queue tab

The FSRS-scheduled retrieval queue (per
[ADR 0069](./0069-fsrs-spaced-repetition-engine.md)) rendered as a
single-stream practice surface. Optional filter "review weak skills
first" reads BKT state to reorder. Distinct from the Today tab's
mixed-priority list — Review Queue is for dedicated review sessions
(e.g., 15-min daily review session), Today is for "what's
most-pressing right now."

### Catch-Up tab — Absence Recovery Mode

For each Unit the student marks "missed" (one-click action; or
auto-inferred from "Unit was scheduled, no progress recorded"):

- Generated **Minimum Viable Recovery Path**:
  1. 8-minute summary (drawn from the Unit's reading + synthesis
     artifacts, AI-condensed if needed)
  2. 3–5 key slides (highest-`prominence` slides from the slide
     deck per ADR 0075's pedagogical-prominence schema)
  3. 1–3 retrieval prompts (the Unit's most-load-bearing concepts)
  4. 1 worked example (the most representative)
  5. Prerequisite-skills check for the *next* Unit (so missed Unit
     doesn't cascade)

The recovery path is computed from the Unit's pedagogy graph + AI
co-author summarization; instructor can override the auto-generated
path per Unit via a `recovery_path:` Unit-frontmatter override.
Names considered: Catch-Up Path / Recovery Path / Missed Class Mode
/ Minimum Viable Recovery / Back on Track. Default label: **"Catch
up"** (quiet, action-oriented; per ADR 0075).

### My Notes / Bookmarks tab

Local-first (per-browser) highlights, bookmarks, and free-text
notes. Each note is tagged with the Unit/Section it lives in; the
tab provides cross-Unit search + filter. Tier 3 sync uses the same
pseudonymous LTI sub claim as the rest of the persistence layer.

### Data model

Each Cockpit-state record extends `BaseRecordSchema` per
[ADR 0066](./0066-pseudonymous-first-data-model.md):

- `state_type: "cockpit_preference"` — student's pin/dismiss/defer
  history; window size; tab defaults
- `state_type: "cockpit_bookmark"` — per-Unit / per-anchor bookmarks
- `state_type: "cockpit_note"` — free-text notes
- `state_type: "absence_marked"` — Units the student marked missed
- `state_type: "recovery_progress"` — partial-completion of recovery
  path steps

Cross-tab consistency uses BroadcastChannel LWW
([ADR 0029](./0029-broadcast-channel-last-write-wins.md)) — same pattern as
existing `useInteractive`.

### Out of scope (deferred)

- **Instructor-side cohort view of who's behind** — that's the
  Tier 3 Instructor Console, not the Cockpit; the Cockpit is
  strictly student-facing.
- **Adaptive difficulty modulation** based on Cockpit usage —
  separate ADR if/when warranted; Cockpit ships with student
  agency primary, AI guidance secondary.
- **Social features** (study groups, peer help, shared notes) —
  ADR 0010 (discussions Tier 3) covers this elsewhere.
- **Gamification** (points, streaks, badges) — explicitly out
  of scope; conflicts with ADR 0075's "study tool, not surveillance"
  principle.

## Rationale

The Cockpit is the right addition to make now because:

1. **The schema layer just landed.** Wedge A shipped BKTState,
   FSRSRecord, BaseRecord, Unit, Section, Artifact. The Cockpit
   is *thin* on top — a UI surface that reads existing data, not
   a new data infrastructure.

2. **It closes the surveillance loop.** ADR 0075 commits Sophie to
   "telemetry feels like personal study tools, not surveillance."
   That commitment is unfulfilled without a visible student-side
   payoff. The Cockpit IS the payoff.

3. **It's the right pairing for ADR 0074's authoring-cost claim.**
   ADR 0074 measures the cost to the instructor; the Cockpit
   measures the benefit to the student. Both metrics are needed
   to make Sophie's full SoTL claim: "low instructor cost +
   measurable student benefit + auditable pedagogy quality."

4. **Absence Recovery is a real differentiator.** No major LMS or
   course platform does this well today. Sophie's pedagogy
   graph + prereq machinery + AI co-author together make it
   cheap (one new schema field, one new template, one
   auto-generation pipeline) and distinctively compassionate.

5. **Tier 1, local-first, no compliance load.** No PII, no server,
   no Canvas dependency. Ships in static-deploy hosting like the
   rest of Tier 1.

6. **Aligns with the metacognition literature.** Self-regulated
   learning research (Zimmerman, Pintrich) consistently shows
   that students who can monitor + plan + reflect on their own
   learning outperform those who can't — and that many novice
   STEM students lack these skills. A cockpit that quietly
   *models* metacognition (showing priorities, surfacing weak
   skills, suggesting recovery paths) teaches the skill by
   example, in a way passive content sites cannot.

## Alternatives considered

- **Defer to Tier 3** (Instructor room + Cockpit as a pair).
  Pros: builds it once with auth + cross-device sync from day
  one. Cons: leaves a 1–2 year gap in the student-side value
  proposition; Tier 1+2 ships with infrastructure but no visible
  student payoff for it. Rejected because the "surveillance
  problem" (ADR 0075) is real now, not later.

- **Skip the Cockpit; rely on the existing Schedule page +
  per-Section practice surfaces.** Pros: zero new surface to build.
  Cons: the student must hop between 4+ pages to assemble what the
  Cockpit assembles for them; the most-pressing task is never
  obvious; recovery from absence remains a manual scavenger hunt.
  Rejected.

- **Build only the Today tab; defer Catch-Up + Notes + Bookmarks.**
  Pros: smaller initial slice; faster ship. Cons: the Catch-Up
  feature is what makes the Cockpit *distinctive*; shipping
  Today-only is "another Schedule view." Rejected in favor of
  shipping the full surface; individual tabs can phase in across
  multiple wedges if needed but the Cockpit-as-a-concept lands as
  one ADR.

- **Make Catch-Up an opt-in extension component instead of a
  Cockpit tab.** Pros: instructor controls the surface. Cons:
  the value of Catch-Up is precisely that the student doesn't
  have to ask permission to recover from missing class; it must
  be always-available. Rejected.

## Consequences

What this decision makes:

- **Easier**:
  - Students have a single daily entry point that answers "what's
    next?" without scavenging across multiple pages.
  - Absence Recovery becomes a one-click flow instead of a
    file-inventory problem.
  - ADR 0075's "study tool, not surveillance" promise gets a
    concrete instantiation.
  - The student-side pedagogy graph becomes legible to the student
    themselves, not just to instructor analytics.
  - SoTL paper #1 (per ADR 0047) gains a student-engagement axis:
    Cockpit-usage rates correlate with attendance + practice
    completion + retrieval-frequency metrics that already exist in
    the platform.
  - Future B9 Learning Telemetry sprint inherits a natural
    student-side surface for opt-in study-pattern measurement.

- **Harder**:
  - New surface to design, build, and test against axe-core +
    ADR 0075's cognitive-load WARN thresholds. Substantial Tier 1
    work.
  - Absence Recovery's auto-generated paths require AI co-author
    quality good enough that the path *helps* rather than
    misleads — engineering challenge for the AI co-author
    prompts.
  - The Cockpit's "what's next" prioritization is itself a
    pedagogical opinion; getting the ranking wrong is worse than
    not ranking at all.
  - New Cockpit-state schema rows are persisted state that any
    future schema migration must carry forward.

- **Triggers**:
  - **New wedge** (call it Wedge B.5 — Student Cockpit + Absence
    Recovery) between or alongside Wedge B (Tier 1 pedagogy
    components) and Wedge C (Library room). The cockpit reads
    state Wedge A laid; it doesn't need Wedges C–G to ship.
  - Implementation plan to live in `docs/plans/<date>-cockpit.md`
    when scoped.
  - Schema additions: 5 new `state_type` values on `BaseRecordSchema`
    (cockpit_preference / cockpit_bookmark / cockpit_note /
    absence_marked / recovery_progress); no new top-level schema.
  - Future Pre/In/Post Triad addition (roadmap Tier B) becomes the
    natural data source for the "Before Next Class" tab.
  - AI co-author prompt-template addition: "given Unit content,
    generate the minimum-viable-recovery path."

## References

- [ADR 0007 — Persistence (IndexedDB + ResponseStore)](./0007-persistence-indexeddb.md)
- [ADR 0029 — BroadcastChannel LWW](./0029-broadcast-channel-last-write-wins.md)
- [ADR 0030 — Audience + AI Author Model](./0030-audience-and-ai-author-model.md)
- [ADR 0066 — Pseudonymous-first data model](./0066-pseudonymous-first-data-model.md)
- [ADR 0067 — Section-level artifacts (Section/Subsection/Unit/Artifact)](./0067-section-level-artifacts.md)
- [ADR 0069 — FSRS spaced-repetition engine](./0069-fsrs-spaced-repetition-engine.md)
- [ADR 0073 — Unified Assessment schema + BKT mastery](./0073-unified-assessment-schema.md)
- [ADR 0075 — Student UX cognitive-load governance](./0075-student-ux-cognitive-load-governance.md) (paired ADR: governs the Cockpit's prominence + reveal-state defaults)
- [ADR 0047 — Empirical validation plan](./0047-empirical-validation-plan.md) (Cockpit-usage rates feed Paper #1's engagement axis)
- [course-website-roadmap.md § Future capabilities — Tier A](../status/course-website-roadmap.md)
- **Zimmerman, B. J.** Self-regulated learning research (theoretical foundation)
- **Pintrich, P. R.** Metacognitive monitoring + control (theoretical foundation)
