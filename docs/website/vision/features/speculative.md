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

---

## S7. Lightweight engagement analytics for chapter authors

**What it is.** A page-view-level analytics layer for live Sophie
courses, separate from B9's outcome-side research telemetry. The
canonical implementation would be Umami Cloud's free tier (or
self-hosted Umami): cookie-less, no-PII, no consent-banner-required
page-view + time-on-page metrics. The signal it carries: "which
chapters got visited," "average time-on-chapter," "bounce rate per
chapter." Author-facing only — answers the "is the chapter landing
at all?" question without per-student tracking.

**Why it might matter.** Cheap visibility for chapter authors to
spot regressions ("Chapter 11 dropped from 28 visits to 12"). Useful
informal evidence for the teaching-effectiveness portion of a
tenure file ("students engaged with interactive figures at X% rate
across the semester"). Privacy-respecting by design, so adding it
doesn't compromise Sophie's local-first posture (per ADR 0007). One
hour of setup; ~$0/month at any plausible scale (free tier covers
thousands of students before paid-tier).

**Why it might not.** Three real costs that aren't on the bill:

1. **Cognitive overhead.** Even free dashboards add a thing to
   periodically check. For a pre-tenure astrophysicist whose binding
   constraint is research time, not money, an end-of-semester
   anonymous survey (Google Form, 5 min for students) gives richer
   *qualitative* signal than 14 weeks of quantitative dashboards.
2. **Gross-engagement-metrics rarely change decisions.** Page-view
   counts at 30 students don't reach statistical significance for
   anything. Author's own classroom observations + TA reports +
   end-of-semester survey already cover the "is this landing?"
   question at higher information density.
3. **Wrong stepping stone if/when DBER becomes part of the tenure
   case.** B9's structured outcome telemetry is the real research
   substrate. Umami-style page metrics aren't a precursor — they're
   an orthogonal layer that adds no infrastructure value to B9 if
   B9 ever ships.

Explicitly distinct from:

- **B9** (Learning Telemetry, outcome-side measurement): structured
  per-submission correctness, calibration deltas, time-on-task
  joined to chapter-version, IRB-gated. Research-grade.
- **S5** (Cohort comparison + SoTL analytics): multi-cohort
  longitudinal claims. Far-future.

**Estimated cost.** Trivially small — 1 hour to deploy Umami Cloud,
zero ongoing. The cost is attention, not engineering.

**Status.**
- 2026-05-17 — surfaced + explicitly skip-for-now during a session
  about how Anna would collect engagement data for ASTR 201 fa26.
  Anna recalibrated the framing: astrophysicist using Sophie as
  double-duty teaching infrastructure, not committed to DBER. End-
  of-semester anonymous survey covers the actual need; analytics
  adds attention-cost without proportional value at 30-student
  scale.
- Promotion criteria: any one of
  (a) class scales beyond ~100 students (informal awareness no
      longer feasible),
  (b) Anna's chair-mentor conversation confirms DBER/teaching-infra
      counts toward tenure AND survey-only evidence proves
      insufficient,
  (c) Sophie hosts a course with shared instructor team where
      asynchronous engagement signal is the only viable check.
