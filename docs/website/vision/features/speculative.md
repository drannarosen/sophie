---
title: Speculative features
short_title: Speculative
description: Blue-sky ideas. We're considering whether they're worth pursuing. May never ship. Lowest writing bar; highest authenticity.
tags: [vision, features, speculative, blue-sky]
---

# Speculative features

Blue-sky ideas. We're considering whether they're worth pursuing.
May never ship; that's fine.

Promotion to [backlog](backlog.md) requires picking up a motivating
use case + design sketch + rough cost. See
[Transitions](../transitions/index.md) for the gate criteria.

## S1. Learning Arc Simulator / Course Load Map

**What it is.** Structural analysis of a course graph predicting
bottlenecks — which modules introduce too many new terms, which
chapters lack retrieval practice, where prerequisites pile up.

**Why it might matter.** A course-level "audit" beyond per-chapter
checks. Useful for AI authors thinking about pacing; useful for Anna
when refining Module N after teaching it once.

**Why it might not.** Real simulation requires real student data;
without it, the "simulator" is a heuristic dressed in fancy
language. The heuristic is plausibly captured by simpler audit
invariants (B3 Pedagogical Diff over the index could surface
new-term-count, equation density, prereq violations) without needing
"simulation" framing.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: B3 (Pedagogical Diff) ships, demonstrates the
  audit substrate is rich enough to support simulation OR a
  course-load-map artifact becomes useful in Phase 4 mid-sprint.

---

## S2. Student Confusion Forecast (AI-generated)

**What it is.** Auto-generated predictions of where students might
be confused in a given chapter, based on the chapter's content +
the misconception graph.

**Why it might matter.** A pedagogy-aware code review for chapters.
Could catch student-confusing language Anna wrote on autopilot.

**Why it might not.** AI hallucinates confusion patterns that don't
exist; misses real patterns Anna knows from teaching the course
five times. Better shape (in backlog as part of B6's Red-Team-the-
Chapter): a TDR template the instructor fills in with AI-suggested
*support*, not an AI predicting confusion authoritatively.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: Misconception Graph (A5) ships with real ASTR
  201 misconception entries + intervention library entries; THEN an
  AI-generated forecast has enough structured ground truth to be
  useful.

---

## S3. Learning Design Genome (declared per-chapter design metadata)

**What it is.** A per-chapter `learning_design:` frontmatter block
declaring `cognitive_load.new_terms`, `representations: [prose,
equation, plot, …]`, `target_misconceptions: [...]`, etc., as
authored metadata.

**Why it might matter.** Makes the *shape* of learning declarable
and queryable. Sounds rigorous.

**Why it might not.** Mostly redundant — these properties are
*derivable* from the chapter content via audit (count `<Aside>`s,
count `<KeyEquation>`s, count `<Figure>`s, scan misconception
references). Declared-metadata-that-mostly-repeats-observable-state
is *ceremony*, not value. Better shape: B3 Pedagogical Diff derives
all of this from existing schemas; no new authored metadata
required.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: real evidence that derived audit insufficient
  for some pedagogical analysis we can't do today. Probably never
  promotes.

---

## S4. Closed-loop pedagogy (anonymized student responses feed misconception graph)

**What it is.** Student responses to `<Predict>` / `<ConfidenceCheck>`
/ `<ComprehensionGate>` feed back (anonymized, opt-in) into the
misconception graph's prevalence field; chapters surfacing misconceptions
that persist post-instruction flag for revision.

**Why it might matter.** Closes the curriculum-design feedback loop.
The deepest version of Sophie's "evidence-based curriculum
improvement" claim.

**Why it might not.** Requires anonymized opt-in student data
infrastructure that doesn't exist; ethics + IRB framework needed;
storage + analytics tooling. All Phase 6+ scope per the roadmap.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: dual-profile build (Phase 5) ships AND a
  per-course ethics/IRB framework exists AND a real student cohort
  generates enough opt-in data to warrant the infrastructure.

---

## S5. Cohort comparison + SoTL analytics

**What it is.** Anonymized cross-cohort pedagogy-impact studies:
"Spring 2027 cohort showed 60% misconception persistence on X;
Spring 2028 cohort, after revised intervention, shows 30%."

**Why it might matter.** Big research opportunity; Sophie courses
become reproducible interventions whose impact is measurable.

**Why it might not.** Needs S4's data infrastructure + multiple
cohorts of opted-in data + statistical methods. Phase 6+; likely
Phase 7+.

**Status.**
- 2026-05-14 — surfaced (speculative)
- Promotion criteria: S4 ships first; THEN multi-cohort data exists.

---

## S6. Pedagogy Notebooks (demoted 2026-05-14)

**What it is.** A Jupyter-notebook-style artifact for curriculum
design: pedagogical goal → known misconception → teaching move →
AI brainstorm → instructor decision → final component selection,
all in one document.

**Why it might matter.** Makes invisible instructional design
visible as a working document.

**Why it might not.** Subsumed by Teaching Decision Records (A1 in
[accepted](accepted.md)). TDRs are the audit-trail-of-curriculum-
design artifact; a "pedagogy notebook" is essentially a draft TDR.
Don't build a separate artifact when one already does the job.

**Status.**
- 2026-05-14 — surfaced (speculative)
- 2026-05-14 — promoted to backlog briefly
- 2026-05-14 — demoted to speculative; subsumed by A1 (TDRs)
- Promotion criteria: TDRs ship and don't capture some
  notebook-shaped need we can't yet articulate. Probably never
  promotes.
