---
title: sophie publish-state + sophie publish-schedule CLI reference
short_title: sophie publish-state CLI
description: >-
  User-facing specification for build-time scheduled publication and visibility
  windows.
tags:
  - cli
  - reference
  - publication
  - scheduling
  - lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# `sophie publish-state` + `sophie publish-schedule`

The user-facing CLI contract for build-time scheduled publication.
The underlying decision lives in
[ADR 0052](../decisions/0052-scheduled-publication-visibility.md);
this page pins the contract.

The two verbs form a paired surface:

- `sophie publish-state` — inspect or verify the build's
  publication-gating state.
- `sophie publish-schedule` — query upcoming publication events.

Neither verb modifies the build; both are read-only inspection.

## `sophie publish-state`

### Synopsis

```text
sophie publish-state [--check --deployed-base=<url>]
                     [--as-of=<iso-timestamp>]
                     [--format=text|json]
```

### Default behavior

Without flags, prints a human-readable summary of the current
publication state:

```text
$ sophie publish-state
Current state (as of 2026-09-08T14:00:00-07:00):

Chapters INCLUDED:
  - flux-luminosity-distance        (status: stable)
  - luminosity-distance             (status: stable)
  - apparent-magnitude              (status: stable)
  - inverse-square-law              (status: review, badge will show)

Chapters EXCLUDED (publishes_at in future):
  - practice-problems-solutions     → 2026-09-15T08:00:00-07:00 (in 7d)
  - exam-1-answer-key               → 2026-10-21T17:00:00-07:00 (in 43d)

Chapters EXCLUDED (unpublishes_at in past):
  (none)

Chapters EXCLUDED (status: draft):
  - speculative-relativity-chapter
  - in-progress-syllabus-rewrite

Component reveals upcoming (next 30d):
  - flux-luminosity-distance:solution-q1   <Solution>          2026-09-15T08:00:00-07:00
  - apparent-magnitude:reveal              <ScheduledReveal>   2026-09-12T08:00:00-07:00

Build is reproducible. Use --as-of=<timestamp> to preview a future state.
```

### `--check` flag

Performs a post-deploy check: fetches the deployed site's actual
content and compares against the publication state that should
be live at the current clock. Suitable for a cron-driven monitor
that verifies the deployed site hasn't drifted from what the
schedule expects.

Required parameter: `--deployed-base=<https-url>` (the deployed
site's root URL).

- Exit `0` if the deployed site's actual content matches the
  expected publication state for the current clock — every
  chapter with `publishes_at` in the past is present at its URL;
  every chapter with `publishes_at` in the future is absent;
  every `unpublishes_at` boundary is respected.
- Exit `1` if any chapter or component's deployed visibility
  diverges from its expected state. Useful for "the cron didn't
  fire" or "the deployment lagged" detection.

This is distinct from a *local-build* check — checking the
local working tree's build output against `now()` is tautological
(the build evaluated `now()` to produce that output). The
deployment-vs-clock comparison is what catches real drift.

Use case: a separate scheduled GitHub Actions workflow (running
hourly, say) calls `sophie publish-state --check
--deployed-base=https://courses.example.edu/astr201-fa26` and
alerts if exit code is 1 — the cron job didn't keep up.

### `--as-of=<iso-timestamp>` flag

Previews the publication state at any future timestamp. Useful
for "what will students see on the day of the exam?"

```text
$ sophie publish-state --as-of=2026-10-21T17:30:00-07:00

State as of 2026-10-21T17:30:00-07:00:

Chapters INCLUDED:
  - flux-luminosity-distance        (status: stable)
  - luminosity-distance             (status: stable)
  - apparent-magnitude              (status: stable)
  - inverse-square-law              (status: stable)
  - practice-problems-solutions     (status: stable, published 2026-09-15)
  - exam-1-answer-key               (status: stable, published 2026-10-21T17:00)

Chapters EXCLUDED:
  (none)

Component reveals as of now:
  - flux-luminosity-distance:solution-q1   (revealed 2026-09-15)
  - apparent-magnitude:reveal              (revealed 2026-09-12)
  - exam-1-answer-key:q1-key               (revealed 2026-10-21T17:00)
```

### `--format=json` flag

Machine-readable output:

```json
{
  "as_of": "2026-09-08T14:00:00-07:00",
  "chapters": {
    "flux-luminosity-distance": {
      "status": "stable",
      "included": true,
      "publishes_at": null,
      "unpublishes_at": null
    },
    "practice-problems-solutions": {
      "status": "stable",
      "included": false,
      "exclusion_reason": "publishes_at_future",
      "publishes_at": "2026-09-15T08:00:00-07:00",
      "unpublishes_at": null
    },
    "speculative-relativity-chapter": {
      "status": "draft",
      "included": false,
      "exclusion_reason": "draft_status",
      "publishes_at": "2026-10-01T08:00:00-07:00",
      "draft_overrides_publish": true
    }
  },
  "component_reveals": [
    {
      "chapter": "flux-luminosity-distance",
      "id": "solution-q1",
      "component": "Solution",
      "unlocks_at": "2026-09-15T08:00:00-07:00",
      "revealed": false
    }
  ]
}
```

## `sophie publish-schedule`

### Synopsis

```text
sophie publish-schedule list [--next=<duration>] [--since=<duration>] [--format=text|json|ical]
sophie publish-schedule list --semester=<id>
```

### `list` subcommand

Lists scheduled publication events.

Default range: the next 30 days from now.

```text
$ sophie publish-schedule list --next=30d

Next 30 days (from 2026-09-08T14:00:00-07:00):

2026-09-10T23:59:00-07:00  reveal     flux-luminosity-distance:misconception-reveal (<ScheduledReveal>)
2026-09-12T08:00:00-07:00  reveal     apparent-magnitude:practice-reveal (<ScheduledReveal>)
2026-09-15T08:00:00-07:00  publish    practice-problems-solutions (chapter)
2026-09-15T08:00:00-07:00  reveal     flux-luminosity-distance:solution-q1 (<Solution>)
2026-10-21T17:00:00-07:00  publish    exam-1-answer-key (chapter)
2026-10-21T17:00:00-07:00  reveal     exam-1-answer-key:q1-key (<ExamKey>)
2026-10-21T17:00:00-07:00  reveal     exam-1-answer-key:q2-key (<ExamKey>)
```

### `--next=<duration>` and `--since=<duration>`

Range filters. Durations accept human-readable forms (`30d`,
`2w`, `90d`, `1y`). `--since` accepts negative durations
(`--since=7d` is "7 days ago"; `--since=-30d` is also valid).

### `--semester=<id>`

Resolves to the range
`<course>-<semester>-start`..`<course>-<semester>-end` (per ADR
0051's bookend tag convention). Shows all scheduled events
within the semester's window.

### `--format=ical`

Emits the schedule as an iCalendar (RFC 5545) feed:

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sophie//sophie publish-schedule//EN
BEGIN:VEVENT
UID:flux-luminosity-distance-solution-q1@sophie
DTSTART:20260915T150000Z
SUMMARY:Reveal: flux-luminosity-distance:solution-q1 (Solution)
DESCRIPTION:Scheduled reveal of <Solution> component.
END:VEVENT
[...]
END:VCALENDAR
```

The iCal output is consumed by
[ADR 0054](../decisions/0054-course-schedule-calendar.md)'s
`<ScheduleICal>` component to embed calendar feeds in course
schedule pages.

## Interaction with `sophie audit`

The audit's SP family (per ADR 0052) runs in the standard `sophie
audit` flow. The `sophie publish-*` verbs are purely inspection
and do not affect audit semantics.

### SP invariants surfaced

- **SP1** (INFO): chapter has both `status: draft` and
  `publishes_at`. Visible in `sophie audit --verbose`.
- **SP2** (WARNING): `publishes_at` in past, chapter excluded
  for other reason. Visible in `sophie audit`.
- **SP3** (ERROR): `<ExamKey>` without `unlocks_at`. Blocks CI.
- **SP4** (WARNING): timestamp without timezone. Visible in
  `sophie audit`.

## Recommended GitHub Actions integration

Per ADR 0052:

```yaml
# .github/workflows/sophie-scheduled-publish.yml
name: Sophie scheduled publish

on:
  schedule:
    - cron: "0 */6 * * *"   # every 6 hours
  workflow_dispatch: {}

jobs:
  rebuild-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm sophie build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
```

The default 6-hour cron means worst-case 6-hour latency between
an `unlocks_at` time and the content actually appearing.
`workflow_dispatch` lets the instructor manually rebuild on
demand.

For deployment-vs-clock drift monitoring, a *separate* workflow
calls `sophie publish-state --check --deployed-base=<url>`
on its own schedule (typically hourly, to catch missed cron
firings); see the `--check` flag documentation above.

The cron interval is **configurable per course**. Tighten to 1
hour for high-frequency unlock patterns; loosen to 24 hours for
weekly cadences.

## Exit codes

### `sophie publish-state`

- `0` — state inspected (no `--check`), OR state matches
  expectation (with `--check`).
- `1` — `--check` failure: deployed state differs from
  expected.
- `2` — internal CLI error (config parse failure, etc.).

### `sophie publish-schedule list`

- `0` — schedule listed (may be empty).
- `2` — internal CLI error.

## See also

- [ADR 0052 — Scheduled Publication & Visibility Windows](../decisions/0052-scheduled-publication-visibility.md)
- [ADR 0051 — Chapter Status + Course Versioning](../decisions/0051-chapter-status-course-versioning.md)
  — chapter `status: draft` overrides `publishes_at`; bookend
  tags resolve `--semester=`.
- [ADR 0053 — Conformance Failure Modes](../decisions/0053-conformance-failure-modes.md)
  — `audit_overrides` can suppress SP1/SP2/SP4; SP3 cannot be
  overridden.
- [ADR 0054 — Course Schedule + Calendar Page](../decisions/0054-course-schedule-calendar.md)
  — `<ScheduleICal>` consumes `--format=ical` output.
