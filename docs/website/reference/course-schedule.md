---
title: Course Schedule reference
short_title: Course Schedule
description: >-
  User-facing specification for schedule.yaml, the four schedule components, and
  the /schedule.ics route.
tags:
  - reference
  - schedule
  - calendar
  - ical
  - components
  - lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# Course Schedule + Calendar Page

User-facing reference for Sophie's course-schedule surface. The
underlying decision lives in
[ADR 0054](../decisions/0054-course-schedule-calendar.md); this
page pins the schema, component contracts, and the
`/schedule.ics` route.

## `schedule.yaml` schema

Lives at `<course-root>/schedule.yaml`. Optional file — courses
without it simply don't get a schedule page.

```yaml
course: <course-slug>       # required, must match pedagogy-contract
semester: <semester-slug>   # required, must match pedagogy-contract
timezone: <iana-timezone>   # required, IANA Time Zone Database name
                            # e.g., America/Los_Angeles, America/New_York,
                            #       Europe/London, Asia/Tokyo

weeks:
  - week: <int>             # week number, 1-indexed
    start: <YYYY-MM-DD>     # week start date (typically Monday)
    end: <YYYY-MM-DD>       # week end date (typically Sunday)
    topic: <string>         # short topic name for the week
    chapters: [<slug>, ...] # chapter slugs covered this week
    events:
      - <event>             # see Event schema below
```

### Event schema

Five event kinds. All share an optional `title:` field; specific
kinds add their own required fields.

#### `lecture`

```yaml
- kind: lecture
  date: <iso-8601-with-tz>   # required
  title: <string>            # required
  chapter: <slug>            # optional; lecture's primary chapter
  location: <string>         # optional
```

#### `assignment`

```yaml
- kind: assignment
  due: <iso-8601-with-tz>    # required
  title: <string>            # required
  chapter: <slug>            # optional but recommended; SC2 fires
                             # if chapter doesn't exist
  url: <string>              # optional; external assignment link
                             # (e.g., LMS)
```

#### `exam`

```yaml
- kind: exam
  date: <iso-8601-with-tz>   # required; start time
  end: <iso-8601-with-tz>    # optional; end time
  title: <string>            # required
  location: <string>         # optional
  chapters: [<slug>, ...]    # optional; review chapter list
```

#### `reading`

```yaml
- kind: reading
  due: <iso-8601-with-tz>    # required; reading-completion target
  chapter: <slug>            # required
  title: <string>            # optional; defaults to chapter title
```

#### `reveal` (auto-extracted)

Authors typically do NOT declare `reveal` events manually; they
auto-extract from chapter `publishes_at` and component
`unlocks_at` per ADR 0052.

Manual declaration is allowed for non-Sophie-managed reveals
(e.g., "answer key posted to LMS at this time").

```yaml
- kind: reveal
  date: <iso-8601-with-tz>   # required
  title: <string>            # required
  chapter: <slug>            # optional
  component: <id>            # optional; if reveal targets a
                             # specific component
```

## Components

Four components in `@sophie/components/schedule/`. All accept
the standard component-contract props (per ADR 0004) plus their
specific props.

### `<CourseSchedule>`

Narrative weekly schedule layout. The default schedule page
component.

```mdx
<CourseSchedule />
```

Optional props:

- `weeks={range}` — limit rendering to a week range (e.g.,
  `weeks="1-6"` for first half of semester).
- `compact` — boolean; suppress weekly headings, render as one
  flat list.

### `<ScheduleTable>`

Tabular at-a-glance view.

```mdx
<ScheduleTable />
```

Optional props:

- `columns={["week", "dates", "topic", "chapters", "assignments"]}` —
  customize column set. Default shown.
- `weeks={range}` — same semantics as `<CourseSchedule>`.

### `<ScheduleCalendar>`

Monthly grid view.

```mdx
<ScheduleCalendar month="2026-09" />
```

Required prop:

- `month` — one of `<YYYY-MM>` (single month), `current` (the
  build's current calendar month), `course` (multi-month grid
  spanning the semester).

Optional props:

- `event_kinds={["lecture", "assignment", "exam"]}` — filter
  which event kinds appear on the grid. Default: all.

### `<ScheduleICal>`

Embed-helper that renders a subscribe link to `/schedule.ics`.

```mdx
<ScheduleICal />
```

Optional props:

- `format` — `"subscribe" | "download" | "both"` (default
  `"both"`). `"subscribe"` emits a `webcal://` link only;
  `"download"` emits an HTTPS `.ics` link with a `download`
  attribute for one-time snapshot; `"both"` (default) renders
  both side-by-side with the subscribe option labeled
  "(recommended)". The default exists because `webcal://` is
  honored unevenly across calendar apps; the download
  fallback works universally but loses the auto-update behavior.
- `subscribe_label` — string; the subscribe link's text. Default:
  `"📅 Subscribe (recommended) — auto-updates as schedule changes"`.
- `download_label` — string; the download link's text. Default:
  `"⬇ Download .ics — one-time snapshot"`.

## `/schedule.ics` route

Auto-emitted at course root. RFC 5545 iCalendar. Generated at
build time; refreshed on every `sophie build`.

### Calendar feed structure

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sophie//Course Schedule//EN
X-WR-CALNAME:<Course Title> <Semester>
X-WR-CALDESC:Schedule for <Course Title> <Semester>. Auto-generated
            by Sophie.

BEGIN:VEVENT
UID:<unique-event-id>@<course>-<semester>
DTSTART:<UTC instant, YYYYMMDDTHHMMSSZ>
DTEND:<UTC instant, YYYYMMDDTHHMMSSZ>
SUMMARY:<event title with kind prefix>
DESCRIPTION:<longer description, includes week + chapter link if any>
URL:<course-relative URL if applicable>
END:VEVENT
[...]

END:VCALENDAR
```

**No `VTIMEZONE` block.** Each event's source ISO-8601
timestamp from `schedule.yaml` (e.g.,
`2026-09-02T10:00:00-07:00`) is converted to UTC for emission
(`20260902T170000Z`). DST transitions are baked into the source
timestamp's offset (pre-DST `-07:00` vs post-DST `-08:00` in
Pacific); the UTC conversion is unambiguous. Display timezone is
the calendar app's responsibility, not Sophie's, so
`X-WR-TIMEZONE` is also omitted.

This matches ADR 0052's per-event-absolute-timestamp convention.
Recurrence rules (which would require VTIMEZONE blocks for
DST-aware expansion) are deferred to backlog B10.

### Event UIDs

UIDs are deterministic from event content, so re-deploys do not
duplicate events in subscribers' calendars:

- Lecture: `lecture-<YYYY-MM-DD>-<HHMM>@<course>-<semester>`
- Assignment: `assignment-<title-slug>@<course>-<semester>`
- Exam: `exam-<YYYY-MM-DD>@<course>-<semester>`
- Reading: `reading-<chapter>-<YYYY-MM-DD>@<course>-<semester>`
- Reveal: `reveal-<chapter>[-<component>]@<course>-<semester>`

### Summary line conventions

Event summaries include a kind prefix for visual scannability in
calendar apps:

- `Lecture: <title>`
- `Due: <title>` (assignments)
- `Exam: <title>`
- `Reading due: <chapter title>`
- `Reveal: <title>` (reveals)

## SC audit invariants

Per ADR 0054:

| ID | Level | Fires when |
|---|---|---|
| **SC1** | ERROR | `schedule.yaml` exists but is structurally invalid (missing required top-level fields, malformed YAML, invalid event kind). |
| **SC2** | WARNING | An event references a `chapter:` slug that doesn't exist. |
| **SC3** | WARNING | A scheduled event date falls outside the semester range (`weeks[0].start` to `weeks[-1].end`). |
| **SC4** | INFO | An `assignment` event's `due:` is *after* the `unlocks_at` of any `<Solution>` in the referenced chapter. |
| **SC5** | WARNING | A chapter declares `exam_key_for: <event-id>` and its `publishes_at` is earlier than the referenced exam's end + grace period (default 30 min; configurable in pedagogy-contract). Catches exam-key-published-too-early. |

SC4 is INFO because legitimate authoring patterns exist (a
`<Solution>` may demonstrate method, not answer the specific
assignment). The audit nudges; the author decides.

## Auto-extraction from ADR 0052

The schedule data model is populated by merging three sources at
build time:

1. **`schedule.yaml` events** — primary source for lectures,
   assignments, exams, readings.
2. **Chapter `publishes_at` / `unpublishes_at`** — auto-
   generates `reveal` events scoped to the chapter.
3. **Component `<Solution>` / `<ExamKey>` / `<ScheduledReveal>`
   `unlocks_at`** — auto-generates `reveal` events scoped to
   the component.

Conflicts: if `schedule.yaml` declares a manual `reveal` event
for the same chapter/component that auto-extracts, the manual
declaration wins. The auto-extracted event is suppressed.

## Interaction with chapter visibility

When the schedule page renders an event referencing a chapter
that is currently *invisible* (status: draft, or publishes_at in
the future, or unpublishes_at in the past), the chapter-link
renders as **plain text** (not a hyperlink). The event itself
still renders.

This means: students see "Problem set 1 (flux-luminosity-
distance)" even before the chapter is published; once the
chapter is published, the chapter name becomes a clickable
link.

## Recommended page layout

A typical course schedule page:

```mdx
---
title: Schedule
---

# Course Schedule

<CourseSchedule />

## Calendar view

<ScheduleCalendar month="course" />

## Subscribe

<ScheduleICal />
```

Or for a syllabus-style "at a glance":

```mdx
---
title: Syllabus
---

# Course at a glance

<ScheduleTable />

<ScheduleICal />
```

## See also

- [ADR 0054 — Course Schedule + Calendar Page](../decisions/0054-course-schedule-calendar.md)
- [ADR 0004 — Component contract revisions](../decisions/0004-component-contract-revisions.md)
  — component contract.
- [ADR 0051 — Chapter Status + Course Versioning](../decisions/0051-chapter-status-course-versioning.md)
  — chapter `status` affects schedule rendering.
- [ADR 0052 — Scheduled Publication & Visibility Windows](../decisions/0052-scheduled-publication-visibility.md)
  — bidirectional auto-extraction source.
- [ADR 0053 — Conformance Failure Modes](../decisions/0053-conformance-failure-modes.md)
  — SC4 INFO and SC2/SC3/SC5 WARNINGs can be overridden via
  `audit_overrides`; SC1 ERROR cannot.
- [sophie-publish-schedule-cli.md](sophie-publish-schedule-cli.md)
  — `sophie publish-schedule list --format=ical` produces a
  subset of the same iCal feed.
