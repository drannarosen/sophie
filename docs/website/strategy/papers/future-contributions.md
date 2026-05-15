---
title: Future contributions (brainstorming)
short_title: Future contributions
description: Research threads under consideration but not yet committed — a structural-HITL conceptual paper, an HSI outcomes study, and a predict-then-run calibration study. None are committed papers; only Paper #1 (methods) is locked.
tags: [strategy, papers, brainstorming, future]
---

# Future contributions (brainstorming)

These are research threads Sophie's deployment opens up. **None of
them are committed papers.** The only committed paper is
[Paper #1 — Methods / infrastructure](paper-1-methods.md), aligned
with [ADR 0047](../../decisions/0047-empirical-validation-plan.md)'s
authoring-side empirical validation plan and targeted for Q4 2026.

The threads below are kept as a parking lot so the proposal narrative
(CAREER, Cottrell, Sloan) can reference them honestly as "research
directions opened by the platform" without committing to specific
papers, target venues, or timelines. Each becomes a real paper only
if data, bandwidth, and tenure-case priorities align.

## Thread A — Structural HITL as a generalizable model

**Working framing:** *AI-primary, instructor-supervised: a structural
human-in-the-loop model for educational content authoring.*

Paper #1 documents Sophie's specific architecture. This thread
abstracts the *pattern* — structural HITL as a model that other
AI-augmented educational platforms could adopt. The conceptual
contribution would rest on:

- Naming the model — "structural HITL" as distinct from "AI-assisted
  authoring" and "AI-as-tutor" framings.
- Decomposing the four AI roles per
  [ADR 0030](../../decisions/0030-audience-and-ai-author-model.md)
  (primary author, pedagogy expert, domain expert, brainstorming
  partner) as a checklist for AI integration in educational platforms.
- Articulating the platform-level supervision invariants (schema
  validation, audit pipelines, contributor agreements, visible
  revision history) that distinguish structural from advisory HITL.
- Connecting to evidence-based pedagogy — showing the model
  accommodates retrieval, spacing, interleaving, confidence
  calibration, productive failure, dual coding, worked examples.

**Plausible venues if pursued:** IJAIED, AERA Open, Educational
Researcher (stretch). All accept conceptual + methodological
contributions of this shape.

**Why this is not yet a committed paper:** the conceptual contribution
benefits substantially from validation by a DBER co-author Anna
hasn't yet recruited; bandwidth tradeoff against the committed
Paper #1 + the empirical threads below is real.

## Thread B — HSI learning-outcomes comparative study

**Working framing:** *Learning outcomes from Sophie-authored content
in undergraduate astronomy: a comparative study at a Hispanic-Serving
Institution.*

If pursued, this would be a quasi-experimental matched-cohort study
in ASTR 201 at SDSU comparing Sophie cohorts against prior-textbook
cohorts. Outcome measures would include a validated astronomy concept
inventory (Light & Spectroscopy Concept Inventory), confidence
calibration, and course-grade performance, disaggregated by
demographics (first-generation status, Hispanic/Latine
self-identification, transfer/continuing enrollment).

This thread aligns with [ADR 0047](../../decisions/0047-empirical-validation-plan.md)'s
*outcome-side* paper — the empirical complement to Paper #1's
authoring-side metrics. ADR 0047 explicitly gates outcome-side
metrics on backlog item B9 (Learning Telemetry), which is itself not
yet committed.

**Heaviest pre-work** if pursued: IRB approval (critical-path item;
SDSU IRB protocol typically 1–2 months); stats methods co-author;
concept-inventory licensing confirmation; pilot funding via
[SDSU URP](../grants/sdsu-internal.md) or similar.

**Plausible venues if pursued:** AER (discipline-specific, friendlier
to broader study designs), PRPER (highest-prestige, expects rigorous
methodology), Computers & Education (broader pedagogy-tech audience).

**Why this is not yet a committed paper:** depends on B9 (Learning
Telemetry) landing, IRB cycle timing, and stats co-author
availability. All three are real gates and none is yet cleared.

## Thread C — Predict-then-run calibration study

**Working framing:** *Predict-then-run: confidence calibration in
interactive astronomical reasoning.*

A narrower-but-deeper empirical thread: fine-grained measurement of
how Sophie's `<Predict>` components affect confidence-calibration
accuracy across astronomical reasoning tasks. Telemetry from the
platform would record each student's prediction, confidence rating,
and subsequent comparison against the simulated or observed outcome.

This thread leverages most of Thread B's infrastructure (IRB
extension, stats co-author, ASTR 201 cohorts) but requires that
`<Predict>` log adequate telemetry. The pedagogical motivation is
strong — confidence calibration is teachable (Tetlock and
colleagues), predict-then-run is the canonical productive-failure
structure, and astronomy is full of scale and estimation problems
where prediction-versus-actual gaps illuminate reasoning weaknesses.

**Plausible venues if pursued:** PRPER (best fit for fine-grained
physics-ed measurements), Computers & Education.

**Why this is not yet a committed paper:** depends on Thread B's
infrastructure landing first, plus confirmation that `<Predict>`
telemetry is adequate for calibration analysis (Brier scores,
Roy-Hassmén formulations). Treat as opportunistic if Thread B runs.

## Mixing DBER and astronomy frames

Per [DBER positioning](../dber-positioning.md), the tenure case is
strongest if the publication record reads coherently regardless of
whether SDSU astronomy counts DBER. Threads B and C are the
strongest candidates for hybrid framing — an HSI-focused
astronomical-reasoning paper reads as both DBER and astronomy
education research.

## Co-author candidate pool

The strongest candidates fall into four buckets, useful regardless of
which thread (if any) graduates to a committed paper:

- **SDSU CRMSE** (Center for Research in Math and Science Education) —
  walk-over introduction; look for a physics-ed or astronomy-ed
  faculty member open to a Sophie-flavored collaboration.
- **SDSU stats / quantitative methods** — for any experimental-design
  thread (B or C).
- **AAS-EPD community** — members of the AAS Education and Public
  Engagement Division; AAS summer meeting is the cold-introduction
  venue. The
  [AAS-EPD Mini-Grant](../grants/aas-epd-mini.md) application is a
  credible community-entry move.
- **External DBER stars** (cold-email candidates): Edward Prather
  (CAE Arizona), Janelle Bailey (Temple), Stephanie Slater (CAPER
  Wyoming), Tim Slater (former CAE director, consulting).

## Open-access plan

Any thread that graduates to a committed paper should target
open-access. JOSS is OA by design; PRPER, AER, IJAIED, AERA Open all
support OA; Computers & Education offers an OA option (~\$3K APC).
NSF and Cottrell both fund OA publication costs.

## See also

- [Paper #1 — Methods / infrastructure](paper-1-methods.md) — the
  one committed paper.
- [ADR 0047](../../decisions/0047-empirical-validation-plan.md) —
  empirical validation plan; authoring-side (committed) +
  outcome-side (gated on B9).
- [Backlog](../../vision/features/backlog.md) — B9 (Learning
  Telemetry) is the gate for Threads B and C.
- [DBER positioning](../dber-positioning.md) — framing implications.
- [Funding roadmap](../funding-roadmap.md) — how the publication
  pipeline supports the tenure case.
