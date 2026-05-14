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

## Entry template

```markdown
## Idea name

**What it is.** One paragraph.

**Why it might matter.** One paragraph.

**Why it might not.** One paragraph — the honest skepticism.

**Status.** When did the idea surface; what would move it to backlog.
```

## Entries (initial seeds)

Initial candidates from the [features index](index.md):

- **Learning Arc Simulator / Course Load Map** — structural analysis
  of a course graph predicting bottlenecks. Speculative because real
  simulation requires real student data; without it, the "simulator"
  is a heuristic dressed up as more.
- **Student Confusion Forecast (AI-generated)** — auto-generated
  predictions of where students might be confused. Risk: AI
  hallucinates confusion patterns that don't exist; misses real ones
  the instructor knows. Better shape (in backlog) is a TDR template
  the instructor fills in with AI-suggested support.
- **Learning Design Genome** — declaring `cognitive_load.new_terms: 6`
  upfront as authored metadata. Mostly redundant with what an audit
  can *derive* from the chapter; speculative because it might be
  ceremony rather than value.
- **Closed-loop pedagogy** — student responses feeding back into the
  misconception graph's prevalence field; chapters surfacing for
  revision when misconceptions persist. Real value, but requires
  anonymized opt-in student data — Phase 6+ territory.
- **Cohort comparison + SoTL analytics** — anonymized cross-cohort
  pedagogy-impact studies. Big research opportunity; needs ethics
  framework + opt-in infrastructure that doesn't exist.

Each idea here is a candidate for promotion to backlog when it earns
a use case worth defending.
