---
title: Cottrell Scholar Award — 2026
short_title: Cottrell 2026
description: Sprint plan for the Cottrell Scholar Award proposal (July 1, 2026 deadline) — narrative arc, week-by-week, budget shape, internal review.
tags: [strategy, grants, cottrell, 2026]
---

# Cottrell Scholar Award — 2026

The Cottrell Scholar Award from the Research Corporation for Science
Advancement (RC). Pre-tenure-only, restricted to astronomy / physics /
chemistry, $120K over 3 years, designed to recognize and support
faculty who integrate research with teaching. The 2026 deadline is
**July 1, 2026**.

This is the **highest-probability/effort grant in Sophie's 2026
pipeline.** Anna's profile (year-3 reappointed pre-tenure astro at an
R2 HSI, building an integrated AI-authoring research-and-teaching
program) is the program's literal target demographic.

## Program quick facts

- **Funder**: [Research Corporation for Science Advancement](https://rescorp.org/cottrell-scholars/cottrell-scholar-award/)
- **Eligibility**: Pre-tenure (3rd-year reviewed) Assistant Professor
  in astronomy / physics / chemistry at a PhD-granting US institution.
  SDSU qualifies (offers PhD in astronomy via the joint SDSU/UCSD
  program).
- **Award**: $120,000 over 3 years ($40K/yr).
- **Deadline**: July 1, 2026.
- **Decision timeline**: Decision typically Q4 of submission year
  (October–December).
- **Selection rate**: Highly competitive — ~10% acceptance based on
  past cycles.

## Why this is the right grant

- **Pre-tenure-only.** Anna will not be eligible after tenure.
- **Disciplinary fit.** Astronomy is named in the eligible disciplines.
- **Integration emphasis.** Cottrell's distinguishing feature is the
  required *integration* of research and teaching — exactly Sophie's
  shape.
- **Proposal scale.** ~5-page narrative + budget + biosketch. Smallest
  proposal in the 2026 pipeline. Fits a 4–6 week sprint.
- **Network value.** Cottrell Scholars form a strong cohort; awards
  amplify subsequent NSF CAREER review.

## Proposal sections

Per RC's current guidance, the proposal contains:

1. **Research description** (~2 pages) — Anna's research program.
2. **Educational description** (~2 pages) — Anna's teaching program.
3. **Integration of research and teaching** (~1 page) — *what Cottrell
   uniquely rewards.* Reviewers explicitly score the integration.
4. **Budget + budget justification**.
5. **NSF-style biographical sketch**.

## Narrative arc

The story Anna tells across the proposal:

### Research thread

**AI-augmented authoring of structured scientific content** as a
research program. Three deliverables tied to the funded period:

- **Empirical comparison of AI-author vs. human-author content** —
  accuracy, pedagogical fidelity, reading comprehension. Methods-paper
  contribution targeted at JOSS or Computers & Education.
- **Learning-outcomes study** from disaggregated ASTR 201 cohorts —
  HSI demographic provides strong Broader Impacts angle. Target:
  AER (Astronomy Education Research) or PRPER.
- **The pedagogy-index pattern** ([ADR 0038](../../decisions/0038-pedagogy-index-pattern.md))
  as generalizable architecture, written up as a methods/infrastructure
  contribution.

### Teaching thread

**ASTR 101 + ASTR 201 + COMP 521** as the live testbed for Sophie.
Sophie is the engine; each course is an iteration cycle. Specifically:

- ASTR 201 (intro astronomy for science majors) — migrated from
  Quarto; new interactive components built into Sophie; learning
  outcomes measured.
- ASTR 101 (gen-ed astronomy) — uses Sophie for distinct
  audience-tuned content.
- COMP 521 (scientific computing in Python) — greenfield textbook in
  Sophie; demonstrates platform's discipline generality.

### Integration

**Sophie *is* the integration.** Its development is the research
output; its deployment is the teaching; its student outcomes are
publishable research artifacts. The cycle is explicit:

```text
authoring → teaching → measurement → revision → next paper
```

Each iteration produces (a) better course materials, (b) data for the
next paper, (c) feature requests that shape the next iteration of
Sophie. The platform structurally couples the research and teaching
threads — neither can advance without the other.

### Why this is novel (the proposal's "intellectual merit" anchor)

- Almost no production educational platforms instantiate **structural
  HITL** (vs. ad-hoc AI use) as their core architecture (see
  [Why now](../why-now.md)).
- Sophie operationalizes evidence-based pedagogy primitives (retrieval
  practice, confidence calibration, predict-then-run) as schema-level
  authoring components, not best-practice prose.
- The integrated research-and-teaching cycle is unusual in pre-tenure
  faculty: Anna is *simultaneously* the research subject and the
  research investigator.

## Sprint plan (May 15 → June 25, 2026)

Six weeks of focused work at ~10 hr/week. Submit by July 1.

| Week | Dates | Focus | Output |
|------|-------|-------|--------|
| 1 | May 15–21 | Research description draft + literature scan (AI-authoring, OER, DBER baseline) | 2-page research draft |
| 2 | May 22–28 | Teaching description draft + course-by-course mapping | 2-page teaching draft |
| 3 | May 29–Jun 4 | Integration narrative + biosketch | 1-page integration + biosketch |
| 4 | Jun 5–11 | Budget + budget justification; full draft to mentor + 1 senior colleague | Full draft + reviewer feedback |
| 5 | Jun 12–18 | Revise based on reviews; identify and address weaknesses | Near-final draft |
| 6 | Jun 19–25 | Final polish; sign-offs; submit | Submitted |

## Budget shape

$40K/year × 3 years = $120K total. Typical Cottrell budget uses:

- **Summer salary** for the PI (largest line; ~$15–25K/yr depending on
  current salary).
- **Undergraduate or graduate RA support** for Sophie-related
  research (ideally 1 RA at part-time, ~$10K/yr).
- **Equipment / infrastructure** for Sophie (Sophie Cloud hosting,
  domain registrations, possibly a workstation). $1–3K/yr.
- **Conference travel** (AAS, AAPT, AAS-EPD). $2–4K/yr.
- **Open-access publication fees**. $1–2K/yr.

A clean, justified budget reads as competent. Don't pad.

## Internal review plan

Two readers, both in weeks 4–5:

1. **Tenure mentor** — best read for tenure-case framing.
2. **Senior SDSU astronomy faculty member** who has served on RC
   selection committees or has been a Cottrell Scholar themselves.
   Ask the chair or the RC mentorship network for connections.

Optional third read: a **previous Cottrell awardee** at another
institution. The cohort is small (~10–15/year per discipline), so
reach via chair, RC mentorship network, or AAS-EPD network.

## Tactical notes

- **Read 3–5 recent successful Cottrell proposals** if obtainable
  through your mentor or the RC mentorship network. The genre is
  specific; reading examples saves drafting time.
- **The integration page is the make-or-break page.** Drafts that
  treat research and teaching as parallel-but-separate sections
  underperform. Reviewers want to see that the research *needs* the
  teaching and vice versa.
- **Cite Sophie's ADRs in the research section** as evidence of
  disciplined open-source development.
- **HSI / CSU mission framing** appears in the Broader Impacts of the
  research section and again in the teaching section's audience
  description.
- **Don't overload the budget narrative.** RC reviewers know what $40K
  buys; a focused, well-justified ask reads as serious.

## Outcome scenarios

- **Awarded**: $120K over 3 years + Cottrell Scholar designation.
  Cohort access, amplification for CAREER review. Use Year 1 funding
  for summer salary + an RA who begins the empirical work.
- **Declined with feedback**: Almost all unsuccessful proposals get
  written feedback. Use it for resubmission in 2027 (still
  pre-tenure-eligible).
- **Declined without feedback**: Probably indicates a structural
  mismatch. Reassess fit before resubmission.

## See also

- [NSF CAREER 2026](career-2026.md) — the larger proposal that
  shares narrative material
- [2026 calendar](../2026-calendar.md) — the week-by-week timeline
  for both sprints
- [DBER positioning](../dber-positioning.md) — the open question
  whose answer shapes the framing
- [Cottrell Scholar Award program page](https://rescorp.org/cottrell-scholars/cottrell-scholar-award/)
