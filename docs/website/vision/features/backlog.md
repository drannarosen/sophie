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

## Entry template

```markdown
## Feature name

**Motivating use case.** One concrete situation where this feature
matters.

**Design sketch.** A few sentences on how it would work.

**Estimated cost.** Order of magnitude.

**Dependencies.** Other features / ADRs / platform work this requires.

**Open questions.** What's not yet figured out.

**Status.** When did it land here; what would move it to accepted.
```

## Entries (initial seeds, to be filled out)

Initial candidates from the [features index](index.md):

- Equation Biography (extends `<KeyEquation>`)
- Approximation Honesty (`<Approximation>` primitive)
- Pedagogical Diff / Curriculum CI
- Course Brain (serialized pedagogy index for AI consumption)
- Human Expertise Required gates
- AI Literacy callouts for student-facing prose
- Multi-modal generation pipeline (audio overviews, Socratic podcasts,
  retrieval audio, Manim animations)
- Course as Research Object (versioned SoTL artifact)
- AI Misuse Warnings (per-assignment-type)
- Red-Team-the-Chapter as a slash command
- Pedagogy Notebooks (likely subsumed by TDRs)

Each will be written up using the template above in subsequent
sessions.
