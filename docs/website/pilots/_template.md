---
title: 'Pilot report template'
short_title: 'Pilot template'
description: 'Section skeleton for chapter-migration pilot reports per ADR 0064.'
---

# Pilot report template

Copy this file to `docs/website/pilots/<chapter-slug>.md`, replace the
frontmatter, and fill each section in order. Do not reshape the
section list — its shape is locked by [ADR 0064](../decisions/0064-chapter-migration-playbook.md)
§2. Sections that genuinely do not apply (e.g. *OMI arcs* for a
non-OMI-framed chapter) should still appear with an explicit "not
applicable, because …" rather than being omitted.

The frontmatter to copy:

```yaml
---
title: 'Pilot report: <Course> <Module> <Lecture> — <Chapter title>'
short_title: 'Pilot: <Module>-<Lecture> <slug>'
description: '<one-sentence summary of what this pilot validated>'
authors:
  - name: <author>
date: <YYYY-MM-DD>
---
```

## Pilot context

What chapter; why it's the next pilot (cite the
[ADR 0064](../decisions/0064-chapter-migration-playbook.md) §4 second-
chapter criterion this addresses); what consumer course it serves;
what scope this report covers; what is explicitly out of scope.

## Shortcode → component dictionary

| Source shortcode / pattern | Sophie target | Status | Notes |
|---|---|---|---|
| … | … | ✅ direct \| ⚠️ gap \| ❌ blocked | … |

Gap rows feed §3 *Platform issues to file*.

## Pedagogy structure map

### OMI arcs (if framed `OMI`)

| Arc | Observable | Model | Inference | `<OMIFlow id=…>` |
|---|---|---|---|---|
| … | … | … | … | … |

### Eight-role component-mapping decisions (per [ADR 0058](../decisions/0058-epistemic-component-contract.md))

For each epistemic role exercised in this chapter, list the
components that carry it.

- **`observable`** — …
- **`model`** — …
- **`inference`** — …
- **`assumption`** — …
- **`approximation`** — …
- **`misconception`** — …
- **`numerical`** — …
- **`uncertainty`** — …

### Multi-representation usage (if applicable; per [ADR 0043](../decisions/0043-notation-registry-multirep-alignment-audit.md))

…

## Pedagogical decisions log

Decisions where authoring judgment departed from a literal source-
rename. Cross-link to TDRs in the consumer-course repo when relevant.

- …
- …

## Time spent per phase

| Phase | Original estimate | Actual |
|---|---|---|
| Phase 1 inventory + dictionary | … | … |
| Phase 2 conversion | … | … |
| Phase 3 verification | … | … |
| Platform-shaping (sprints / hardening / new components) | … | … |
| Pilot report | … | … |

Distinguish *conversion time* (chapter-specific) from *platform-
shaping time* (carries forward to future chapters). This ratio
informs §4's second-chapter selection.

## Surprises

Numbered list. Each surprise is a candidate for either a fix-and-
close (one-off) or a doctrine bump (pattern). Doctrine bumps surface
as ADR amendments or as candidates for new ADRs.

**1.** …

**2.** …

## Recommendations + ADR backlog

What this pilot teaches the next one. Candidate ADRs go here; do not
draft ADRs in the pilot report itself.

- …

## Platform issues to file

One bullet per gap identified in the dictionary. Pre-file when
blocking the conversion per [ADR 0064](../decisions/0064-chapter-migration-playbook.md)
§3.

1. …
2. …

## Success criteria

The acceptance checklist for the pilot's stated goal.

- ✅ / ⚠️ / ❌ …
- ✅ / ⚠️ / ❌ …
