---
date: 2026-05-14
tags: [pedagogy, decisions, schedule, calendar, ical, components, lds]
---

# ADR 0054: Course Schedule + Calendar Page

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Sophie's LDS foundation gives chapters structured content and
ADR 0052 gives them scheduled publication. What remains missing
is the **student-facing surface** that lets a learner answer:
"what is happening in this course this week?", "when is the
midterm?", "what's due tomorrow?", "can I sync this to my
calendar app?"

Today, Anna's astronomy courses ship a static syllabus page or
a Google Doc; neither is structured, neither auto-extracts
from the scheduled-publication timestamps already declared in
chapter frontmatter, and neither produces an iCalendar feed
students can subscribe to from their phone calendar.

The 2026-05-14 brainstorm locked: **ship the v1 student-facing
schedule page**, **ship iCal export at `/schedule.ics`**, and
**bidirectional auto-extraction from ADR 0052 components** into
the schedule data model. Three components — `<CourseSchedule>`,
`<ScheduleTable>`, `<ScheduleCalendar>` — plus a fourth
embed-helper `<ScheduleICal>`. Four new audit invariants in the
SC family.

## Decision

Sophie ships a **Course Schedule + Calendar surface** with four
components, a `/schedule.ics` route, bidirectional auto-
extraction from ADR 0052 timestamps, and four new SC audit
invariants.

### `schedule.yaml` — the canonical schedule source

A course-level `schedule.yaml` file declares the course's
scheduled events:

```yaml
# courses/astr201-fa26/schedule.yaml
course: astr201
semester: fa26
timezone: America/Los_Angeles

weeks:
  - week: 1
    start: 2026-09-01
    end: 2026-09-07
    topic: "Light as information"
    chapters: [flux-luminosity-distance, apparent-magnitude]
    events:
      - kind: lecture
        date: 2026-09-02T10:00:00-07:00
        title: "Course overview + flux and luminosity"
      - kind: lecture
        date: 2026-09-04T10:00:00-07:00
        title: "Apparent magnitude system"
      - kind: assignment
        due: 2026-09-07T23:59:00-07:00
        title: "Problem set 1"
        chapter: flux-luminosity-distance

  - week: 2
    start: 2026-09-08
    end: 2026-09-14
    topic: "Distance measurement"
    chapters: [luminosity-distance, inverse-square-law]
    events:
      - kind: lecture
        date: 2026-09-09T10:00:00-07:00
        title: "Inverse-square law"
      - kind: assignment
        due: 2026-09-14T23:59:00-07:00
        title: "Problem set 2"

  - week: 6
    start: 2026-10-06
    end: 2026-10-12
    topic: "Midterm exam"
    events:
      - kind: exam
        date: 2026-10-08T13:00:00-07:00
        title: "Midterm exam"
        location: "EBA-358"
        chapters: [flux-luminosity-distance, luminosity-distance, apparent-magnitude, wien-revisit]
```

### Event kinds

- `lecture` — class meeting. `date:` is required; `chapter:`
  optional.
- `assignment` — homework/practice problem set. `due:`
  required; `chapter:` optional but recommended.
- `exam` — exam date. `date:` required; `location:` optional;
  `chapters:` list optional (reading list).
- `reading` — assigned chapter reading. `due:` required;
  `chapter:` required.
- `reveal` — auto-extracted from ADR 0052 components and
  chapter frontmatter (`publishes_at`); see Bidirectional
  auto-extraction below.

### Bidirectional auto-extraction from ADR 0052

The `schedule.yaml` and ADR 0052 timestamps are kept in sync
**bidirectionally** at audit time:

**Direction 1 — From frontmatter into schedule:**

- A chapter with `publishes_at` produces an auto-generated
  `kind: reveal` event in the schedule at that date, scoped to
  the chapter. The event surfaces in the schedule page even if
  `schedule.yaml` does not enumerate it.

- A `<Solution>`, `<ExamKey>`, or `<ScheduledReveal>` component
  with `unlocks_at` produces an auto-generated `kind: reveal`
  event scoped to the component.

**Direction 2 — From schedule into frontmatter (recommended,
not enforced):**

- An `assignment` event with `due:` is the canonical due-date
  declaration. If the chapter referenced by the assignment has
  a `<Solution>` with `unlocks_at` ≤ `due:`, SC4 fires (see
  invariants).
- An `exam` event suggests an `<ExamKey>` chapter with
  `publishes_at` matching the exam end-time + a grace period.
  Audit does NOT enforce this; it surfaces in audit verbose
  output as a soft suggestion.

The bidirectional surface means: authors who declare the
schedule once in `schedule.yaml` get auto-generated reveal
events; authors who declare the schedule once in frontmatter
get auto-included events.

### Four components

#### `<CourseSchedule>`

The canonical schedule page anchor. Renders the entire weekly
schedule in a default layout:

```mdx
---
title: Schedule
---

# Course Schedule

<CourseSchedule />
```

Renders week-by-week with topic, chapters, lectures, and
assignments. Layout follows the existing chapter-component
visual conventions (callouts, headings, link styling).

#### `<ScheduleTable>`

Tabular schedule view; useful for syllabus-style at-a-glance
layout:

```mdx
<ScheduleTable />
```

Output:

```text
Week  Date(s)        Topic                       Reading
1     Sep 1–7        Light as information        flux-luminosity-distance, apparent-magnitude
2     Sep 8–14       Distance measurement        luminosity-distance, inverse-square-law
...
6     Oct 6–12       Midterm exam                (review)
```

Both `<CourseSchedule>` and `<ScheduleTable>` render the same
underlying data; they differ in visual density.

#### `<ScheduleCalendar>`

Embeds a calendar-style monthly grid view:

```mdx
<ScheduleCalendar month="2026-09" />
```

The `month=` prop accepts `YYYY-MM` (single month),
`current` (the current calendar month), or `course` (all
months covered by the schedule, multi-month grid).

#### `<ScheduleICal>`

Helper component that emits a subscription link to the
auto-generated `.ics` feed:

```mdx
<ScheduleICal />
```

Renders:

```html
<a href="/schedule.ics" class="schedule-ical-link">
  📅 Add to your calendar (subscribe)
</a>
```

Standard pattern — students click, their OS prompts them to
add the calendar subscription.

### `/schedule.ics` route

The build pipeline emits `/schedule.ics` at the course root.
Contents are RFC 5545 iCalendar:

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Sophie//Course Schedule//EN
X-WR-CALNAME:ASTR 201 Fa26
X-WR-TIMEZONE:America/Los_Angeles
BEGIN:VEVENT
UID:lecture-2026-09-02@astr201-fa26
DTSTART;TZID=America/Los_Angeles:20260902T100000
SUMMARY:Lecture: Course overview + flux and luminosity
DESCRIPTION:Week 1 — Light as information
END:VEVENT
BEGIN:VEVENT
UID:assignment-ps-1@astr201-fa26
DTSTART;TZID=America/Los_Angeles:20260907T235900
SUMMARY:Due: Problem set 1
DESCRIPTION:Problem set on flux and luminosity. Chapter: flux-luminosity-distance.
URL:https://courses.example.edu/astr201-fa26/flux-luminosity-distance
END:VEVENT
[...]
END:VCALENDAR
```

The feed is **static** (generated at build time, not
dynamically). Updates appear on the next build; the cron
schedule from ADR 0052 (6-hour default) covers refresh
cadence for students who have subscribed.

### Four SC audit invariants

| ID | Level | Fires when |
|---|---|---|
| **SC1** | ERROR | `schedule.yaml` exists but has invalid structure (missing `course:`, `semester:`, `timezone:`, or `weeks:`). |
| **SC2** | WARNING | An `assignment` event's `chapter:` does not match any chapter in the course. Dangling chapter reference. |
| **SC3** | WARNING | A scheduled `lecture` or `assignment` falls outside the course semester (`schedule.yaml.weeks[0].start` to `schedule.yaml.weeks[-1].end`). Catches typos and dates from a previous semester. |
| **SC4** | INFO | An `assignment` event's `due:` is later than the `unlocks_at` of any `<Solution>` component in the referenced chapter. Soft warning: the solution unlocks before the assignment is due (students could just-in-time copy). |

SC4 is INFO rather than WARNING because there are legitimate
reasons for it (a `<Solution>` may be a worked example
demonstrating method, not the answer to the specific assignment
problems). The audit nudges; the author decides.

SC1 is the only ERROR — invalid `schedule.yaml` breaks the
build pipeline because downstream components consume the file.

### Interaction with chapter `status` and `publishes_at`

The schedule page renders events whose underlying entities are
visible **at the current build time**. Specifically:

- A `lecture` or `assignment` or `exam` event always renders
  (these don't depend on chapter visibility).
- A `reading` event renders normally; if the underlying chapter
  has `status: draft` or future `publishes_at`, the
  chapter-link in the schedule renders as plain text (not a
  link).
- A `reveal` event renders normally; once the underlying
  reveal-target is unlocked, the link goes live.

`status: draft` chapters do NOT auto-suppress their
`assignment`/`reading`/etc. events from the schedule —
students see "Problem set 1 (chapter flux-luminosity-distance)"
even if the chapter is currently draft, because the assignment
exists regardless of chapter readiness. The chapter-link is
plain-text until the chapter goes live.

### Interaction with ADR 0052 `publish-schedule`

`sophie publish-schedule list --format=ical` emits a subset of
the calendar (publication events only, not lectures/assignments/
exams). The full course-schedule iCal at `/schedule.ics` is
the superset.

### Course-version pinning

Schedule events do not version per-event; the schedule travels
with the course. A course tag (per ADR 0051) captures the
schedule state at tag time. Semester transitions (e.g., fa26 →
sp27) get a fresh `schedule.yaml` per course-semester directory.

## Rationale

### v1 ships the page + the iCal feed together

The brainstorm could have shipped the schedule page first and
deferred iCal to v2. Anna's lock: ship both in v1. Reasons:

- iCal subscription is a **30%-of-students-actually-use-it**
  feature based on Anna's prior experience; the marginal cost
  (an iCal emitter is ~200 lines) is small.
- Without iCal, students who use phone calendars maintain dual
  systems (Sophie schedule + their calendar) and rapidly drift.
  The page-only version exists as static content elsewhere
  already; Sophie's differentiator is the *integration* with
  the rest of the platform.

### Bidirectional auto-extraction

The two directions serve different authoring styles:

- **Schedule-first authors** declare `schedule.yaml` once; the
  component-reveal events auto-generate.
- **Frontmatter-first authors** set `publishes_at` /
  `unlocks_at` on chapters and components; the schedule auto-
  includes them.

Most courses end up using both. The auto-extraction means
neither direction has to be primary; both flows produce a
coherent schedule.

### Three view components + one ICal-link helper

`<CourseSchedule>` / `<ScheduleTable>` / `<ScheduleCalendar>`
are three views of the same data, optimized for different
contexts (chapter-style narrative, syllabus-style table, visual
calendar). Authors pick the view that fits the chapter; the
data model is shared.

`<ScheduleICal>` is a separate helper because it's a *link to a
file*, not a *view of the data*. Pairing it with the views
would conflate "show me the schedule" with "give me a subscribe
link."

### Audit invariants kept minimal

Four invariants only. The schedule is a content surface, not a
contract; over-auditing it would penalize valid course-design
patterns (e.g., assignments that span chapters; readings
without exact dates).

SC1 is the structural ERROR; SC2/SC3/SC4 are nudges. CI passes
on a course with no `schedule.yaml` at all — the file is
optional, and a course without it simply doesn't get a
schedule page.

### Static `.ics` over dynamic subscription endpoint

Sophie's static-site model favors a static `.ics` file. A
dynamic endpoint would require server-side rendering, which v1
doesn't have. The 6-hour cron from ADR 0052 means subscribed
calendars refresh every ~6 hours; for "exam date moved
yesterday," students see the update in their calendar within
6 hours of the build.

If real-time subscription becomes a need, a v2 ADR can add a
dynamic endpoint (likely Cloudflare Worker per ADR 0007's v3
sync seam pattern).

## Consequences

**Easier:**

- Students get a structured, syllabus-quality schedule page
  generated from authoring data they already declare.
- Calendar subscription is one-click; students can stop
  manually syncing dates.
- Schedule + chapter visibility stay in sync via the
  bidirectional extraction.

**Harder:**

- `schedule.yaml` is yet another file authors declare. Mitigated
  by auto-extraction (frontmatter-only courses still get a
  schedule); also mitigated by the optional-ness (no schedule
  required).
- iCal emission requires correct timezone handling — fixed
  timezones on events, IANA timezone declaration in the feed
  header. Standard RFC 5545 conformance, well-trodden by
  existing libraries.

**Triggers:**

- v1 of this ADR ships docs-only on 2026-05-14.
- Implementation PR:
  - Schema: `schedule.yaml` Zod schema in `packages/core/`.
  - Components: `<CourseSchedule>`, `<ScheduleTable>`,
    `<ScheduleCalendar>`, `<ScheduleICal>` in
    `packages/components/src/schedule/`.
  - Build: `/schedule.ics` static route in `@sophie/astro`.
  - Audit: SC1–SC4 in
    `packages/astro/src/lib/pedagogy-audit.ts`.
  - axe-core tests per ADR 0004.

## Alternatives considered

### Schedule page only; defer iCal

*Rejected.* iCal cost is small; absence creates dual-system
drift for ~30% of students.

### Dynamic iCal subscription endpoint

*Deferred to v2/v3.* Requires SSR; static feed + 6-hour refresh
covers v1 use cases.

### One polymorphic `<Schedule kind="week|table|calendar">`

*Rejected.* Three components have different layouts + props
and read more clearly as named components than as a polymorphic
type-discriminating component.

### `schedule.yaml` as auto-generated from frontmatter only (no
canonical file)

*Rejected.* The schedule needs first-class declarations for
events that aren't tied to a chapter (course-wide lectures,
exams, no-class days). A canonical file with auto-extraction
from frontmatter is the right combination.

### Per-week files instead of one schedule.yaml

*Rejected.* One file is simpler; semester-scale schedules
typically fit in <500 lines. Per-week files would multiply
include-paths without benefit.

### `<ScheduleCalendar>` as default in `<CourseSchedule>`

*Rejected.* The default page wants narrative flow with
weekly headings; the calendar grid view is better suited for
at-a-glance reference. Authors can compose: a chapter can use
both `<CourseSchedule />` and `<ScheduleCalendar month="course" />`
to show both views.

## References

- [ADR 0004 — Component contract revisions](./0004-component-contract-revisions.md)
  — component contract for the four new components; axe-core
  required.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — schedule changes classify under existing diff taxonomy.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-course-versioning.md)
  — chapter status affects schedule rendering; course tags
  capture schedule state.
- [ADR 0052 — Scheduled Publication & Visibility Windows](./0052-scheduled-publication-visibility.md)
  — bidirectional auto-extraction of `publishes_at` /
  `unlocks_at` into schedule events; 6-hour refresh cadence
  for iCal subscribers.
- [ADR 0053 — Conformance Failure Modes](./0053-conformance-failure-modes.md)
  — SC4 INFO can be overridden via `audit_overrides`; SC1
  ERROR cannot.
- [course-schedule.md](../reference/course-schedule.md) — full
  schema + component spec.
