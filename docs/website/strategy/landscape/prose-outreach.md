---
title: PROSE Consortium outreach
short_title: PROSE outreach
description: Draft email and talking points for a low-key, low-cost introduction to a PROSE Consortium PI. Goal is mutual awareness, not consortium commitment.
tags: [strategy, outreach, prose, pretext, runestone]
---

# PROSE Consortium outreach

This page holds the draft email, talking points, and target-PI
shortlist for one low-key outreach exchange with the PROSE
Consortium. The goal is mutual awareness — a 30-minute
conversation, a possible CAREER letter writer, an early critique —
not consortium membership or collaboration commitment.

Sophie is teaching infrastructure that overlaps with PROSE's domain
([comparators § PreTeXt + Runestone](comparators.md)). Honest
acknowledgment now is cheaper than a defensive landscape paragraph
in proposal review later.

Last revision: **2026-05-22**.

## Why one email, not consortium engagement

The clarified scope ([positioning § origin and scope](../positioning.md#origin-and-scope))
makes full PROSE engagement overkill. Sophie does not need to win
the schema-driven-accessible-STEM-textbook competition. It needs
to acknowledge PROSE accurately and avoid an avoidable critique in
review.

One thoughtful email + a 30-minute conversation is sufficient to:

- **Surface a critique now** that would have been worse in a
  proposal review.
- **Open a possible letter-writer relationship** for Cottrell or
  CAREER.
- **Establish honest mutual awareness** so a future reviewer with
  PROSE connections sees engagement, not avoidance.

Further engagement happens only if PROSE reciprocates interest.

## Target-PI shortlist

The PROSE Consortium is multi-PI; pick one whose work overlaps
Sophie's interests. From the [PROSE roster](https://prose.runestone.academy/)
*(retrieved 2026-05-22)*, candidates in priority order:

1. **A PI working on accessibility / inclusive STEM textbook
   pipeline** — best match for Sophie's WCAG-at-commit angle and
   the most likely positive reception.
2. **A PI from the PROTEUS award (U-Michigan Marsal)** — the
   accessibility-deepening grant. Strong alignment.
3. **A PI from the Runestone analytics / learning-engineering
   side** — interesting for Sophie's future SoTL data
   conversations, but lower priority for Cottrell / CAREER
   review.

Confirm current PI list before sending — the consortium roster may
have shifted since 2026-05-22.

## Draft email

Subject: *Sophie — teaching-infrastructure overlap with PROSE
Consortium — quick introduction?*

```
Dear Dr. [Name],

I'm Anna Rosen, an assistant professor of astronomy at SDSU. I've
been building a small open-source teaching-infrastructure platform
called Sophie (https://github.com/drannarosen/sophie) that grew out
of my own need to author across multiple courses (ASTR 201, ASTR
101, COMP 521) without duplicating effort per course. It overlaps
your work with PROSE / PreTeXt enough that I wanted to introduce
myself rather than let you encounter Sophie cold in a review or
landscape paragraph somewhere.

Sophie is AGPL-licensed, MDX+Zod-based (rather than XML/RELAX-NG),
and adds a few things on top of schema-driven publishing: an
explicit misconception graph with bound canonical interventions, an
equation-biography schema (assumptions / validity domain / common
misuse per equation), and a per-PR axe-core accessibility CI gate.
It is *teaching infrastructure first* — I'm not pivoting from
astrophysics, and Sophie is producing at most one or two SoTL
papers for me, not a research program. But the architectural
overlap with PROSE / PreTeXt is real, and I'd rather acknowledge it
honestly than position competitively.

Would you have 30 minutes in the next few weeks for an
introductory conversation? I'd like to understand where PROSE is
heading on the accessibility-deepening front (PROTEUS) and where
schema-driven authoring is heading more broadly. I'm happy to walk
you through what Sophie does, and especially interested in any
honest critique — Sophie hasn't shipped to non-SDSU users yet, and
external eyes are valuable.

Best regards,
Anna Rosen
Assistant Professor of Astronomy, San Diego State University
alrosen@sdsu.edu
https://github.com/drannarosen/sophie
```

## Talking points for the 30-minute conversation

If the PI accepts, the conversation should accomplish three things,
in order:

### First 10 minutes — listen and learn

Open by asking about PROSE's current trajectory:

- What's the PROTEUS award doing concretely on accessibility?
- Where is the PreTeXt schema heading in 2026–2027?
- What are the recurring pain points in the consortium model?
- What does PROSE wish other platforms in the space did
  differently?

Take notes. Do not pitch yet.

### Middle 10 minutes — describe Sophie honestly

Lead with origin, not architecture:

- "Sophie emerged from my own need to author across three
  courses without rebuilding infrastructure each time."
- "Astrophysics remains my primary research; Sophie produces
  one or two SoTL papers and is teaching infrastructure
  otherwise."
- "MDX+Zod rather than XML/RELAX-NG, chosen because LLM
  emission is easier into typed JSX than into XML."
- "The pedagogical layers are an epistemic-role contract,
  misconception graph with canonical interventions, equation
  biographies, axe-core a11y gate."
- "I have not shipped to non-SDSU users."

Avoid: language that competes with PROSE on PROSE's home turf
(braille, RELAX-NG, multi-institution consortium scale).

### Last 10 minutes — invite critique

- "What concerns you about the schema choices we've made?"
- "Where does this overlap with PROSE in ways I should think
  about?"
- "Are there NSF programs or reviewers I should be aware of?"
- "Would you be willing to write a CAREER letter if I were to
  apply this cycle?"

Last question is the optional upside. The first three are the
load-bearing asks.

## Aftermath actions

If the conversation produces a critique:
- Add it to [risks and discipline](risks-and-discipline.md) within
  one week.
- If the critique is severe, draft a positioning update before
  the next proposal.

If the conversation produces a letter-writer:
- Note in [grants](../grants/index.md) by name and program-fit.
- Send a brief thank-you with the project's current
  one-paragraph summary so they have material to write from.

If the conversation produces a collaboration opportunity:
- Do not commit on the call. "Let me think about what would
  serve both projects" is the right answer.
- Bring the question back to scope-discipline: does this
  collaboration help Sophie's teaching-infrastructure mission,
  or does it pull Sophie toward becoming a research-program
  centerpiece (which is not the goal)?

If the conversation produces nothing actionable:
- That is also a valid outcome. Mutual awareness was the
  primary goal.

## Do not do

- **Do not commit to consortium membership.** Sophie's scope does
  not support consortium overhead.
- **Do not promise interop work** (e.g., PreTeXt import / export)
  speculatively. Only commit to interop if a real adopter asks.
- **Do not promise co-authorship** on PROSE papers. Letter
  writing is a one-way ask; co-authorship implies sustained
  collaboration Anna's research bandwidth does not support.
- **Do not over-pitch.** The honest scope ("teaching
  infrastructure that produces 1–2 SoTL papers") is the right
  framing; over-claiming will land badly with a multi-PI
  consortium PI.

## When to send

Best window: **after** the [red-team report plan](red-team-report-plan.md)
has a target chapter chosen and the first draft of condition A is
underway, so the email can carry one concrete artifact reference.
Realistic timing: late June 2026, just before Cottrell submission
(2026-07-01). That timing gives the PI an honest project to react
to and a realistic short-window response window.

If the email is sent without the red-team report in flight,
substitute a reference to the existing
[M2-L3 spectra-and-composition pilot](../../pilots/m2-l3-spectra-composition.md).

## See also

- [Comparators § PreTeXt + Runestone](comparators.md)
- [Risks and discipline § 2 PROSE Consortium](risks-and-discipline.md)
- [PROSE Consortium home](https://prose.runestone.academy/)
  *(retrieved 2026-05-22)*
- [PROTEUS award page (U-Michigan Marsal)](https://marsal.umich.edu/grants-awards/collaborative-research-pretext-runestone-open-textbooks-engaging-undergraduates-stem)
  *(retrieved 2026-05-22)*
