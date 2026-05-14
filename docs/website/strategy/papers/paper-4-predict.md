---
title: "Paper #4 — Predict-then-run (stretch)"
short_title: "Paper #4"
description: "Stretch-goal empirical paper on confidence calibration in interactive astronomical reasoning using Sophie's Predict components. Target Q4 2027 if bandwidth permits."
tags: [strategy, papers, empirical, calibration, prper, stretch]
---

# Paper #4 — Predict-then-run (stretch)

## Working title

> **Predict-then-run: confidence calibration in interactive
> astronomical reasoning**

## Target venue

- **Primary**: [Physical Review Physics Education Research (PRPER)](https://journals.aps.org/prper/) —
  highest-impact venue for fine-grained physics-education
  measurements.
- **Alternate**: [Computers & Education](https://www.sciencedirect.com/journal/computers-and-education) —
  broader audience; pedagogy-tech focus.

## Type

Empirical paper focused on a specific pedagogical pattern. The
contribution is a quantitative study of how Sophie's
**predict-then-run** components affect confidence-calibration
accuracy in astronomical reasoning tasks.

## Timing

- **Drafting**: Fall 2027.
- **Submission**: December 2027.
- **Decision**: Q2 2028.

## Why this is stretch-goal

Paper #4 is desirable but not load-bearing:

- The tenure case is already supported by Papers #1, #2, and #3 —
  methods + conceptual + empirical outcomes.
- The data collection for Paper #4 overlaps with Paper #3's data
  collection (same ASTR 201 cohorts), so the marginal pre-work is
  small *if* Sophie's `<Predict>` component logs the right
  telemetry.
- The contribution is *narrower* than Paper #3 (one pedagogical
  pattern, not overall outcomes) but *deeper* (fine-grained
  measurement of a specific cognitive mechanism).

Treat as stretch: write if bandwidth permits in fall 2027. Drop if
tenure-case preparation or other priorities crowd it out.

## Why predict-then-run specifically

The predict-then-run pattern (predict an outcome, then run a
simulation or observation, then reflect on the gap) has strong
learning-science backing:

- **Confidence calibration** — predicting outcomes and then observing
  results explicitly trains metacognitive calibration. Tetlock and
  colleagues have shown this is trainable.
- **Productive failure** — predictions made and then disconfirmed by
  observation are the canonical productive-failure structure.
- **Astronomical reasoning** — astronomy is full of scale and
  estimation problems where prediction-versus-actual gaps illuminate
  reasoning weaknesses (predict the apparent size of the Moon vs.
  observed; predict orbital period vs. simulated).

Sophie's `<Predict>` component logs every prediction and lets the
platform compare predictions against subsequent observations. This
produces telemetry no static textbook can produce — predict-then-run
*becomes measurable* in a way prediction prompts in prose textbooks
do not.

## Abstract sketch

> Confidence calibration in scientific reasoning is teachable but
> rarely measured at fine granularity in undergraduate astronomy
> courses. We report a quantitative study of confidence-calibration
> accuracy among ASTR 201 undergraduates using Sophie's predict-then-
> run interactive components across 8 astronomical-reasoning tasks
> spanning scale, motion, and observation. Telemetry from the
> platform records each student's prediction, confidence rating
> (1–5), and subsequent comparison against the simulated or observed
> outcome. We analyze the trajectory of calibration accuracy across
> the semester, comparing first-attempt and repeat-attempt
> calibration, and disaggregate by prior physics background and
> first-generation status. [Results placeholder.] We discuss
> implications for the design of interactive scientific reasoning
> components in AI-coauthored educational platforms.

## Required pre-work

Paper #4 leverages most of Paper #3's infrastructure:

1. **Same IRB protocol** as Paper #3 — extend to cover
   predict-then-run telemetry analysis. Minimal additional approval
   work.
2. **Sophie's `<Predict>` component must log adequate telemetry.**
   Confirm by end of summer 2026: each prediction is logged with
   timestamp, confidence rating, and outcome comparison.
3. **Validated calibration measure.** Use Brier scores or
   Roy-Hassmén formulations from existing literature; consult with
   stats methodology co-author from Paper #3.

If `<Predict>` telemetry is missing or inadequate, Paper #4 is not
feasible. Verify this before committing to the paper.

## Co-author considerations

Same co-author set as Paper #3 — stats methodology + optional DBER
co-author. Paper #4 is more deeply pedagogy-research-flavored than
Paper #3, so a DBER co-author adds more value here.

## Risks

- **Predict-then-run usage too sparse to support analysis.**
  Mitigation: explicitly design ASTR 201 chapter content to require
  predict-then-run interactions throughout the semester. Plan ~20
  predict-then-run tasks across the course; even 50% engagement
  yields ~1500 predictions per cohort.
- **Calibration effect size very small.** A semester of calibration
  practice may not produce dramatic calibration shifts. Mitigation:
  preregister analysis; treat null result as publishable
  (calibration *trajectory* even with small main effect is a
  contribution).
- **Bandwidth shortfall.** This is the stretch paper; drop if Q4
  2027 is consumed by tenure-case prep.

## See also

- [Papers overview](index.md) — full publication pipeline
- [Paper #3 — Learning outcomes](paper-3-outcomes.md) — shared infrastructure
- [Pedagogical foundations](../../explanation/pedagogical-foundations.md) — calibration literature
