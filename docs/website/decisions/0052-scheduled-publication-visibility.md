---
date: 2026-05-14T00:00:00.000Z
tags:
  - pedagogy
  - decisions
  - publication
  - scheduling
  - components
  - build-time
  - lds
validation:
  status: unvalidated
  last_validated_date: null
  evidence: []
---

# ADR 0052: Scheduled Publication & Visibility Windows

:::{admonition} ADR metadata
- **Status**: accepted
- **Deciders**: anna
:::

## Context

Course delivery requires content that **appears at specific
times** and **disappears at specific times**. Concrete patterns
from Anna's existing astronomy courses:

- A homework solution that should not be visible to students
  until after the assignment due date.
- An exam answer key that should appear only after the exam
  closes.
- A chapter that is part of the syllabus but doesn't go "live"
  until the week before it is assigned.
- A misconception-reveal that should only appear after students
  have submitted their predictions for that misconception.

The 2026-05-14 foundation review surfaced this as a missing
feature category. v1's options today are:

1. Edit-and-commit on the publication date (manual; relies on
   instructor remembering).
2. Two separate branches (gate via merge; brittle; not
   reviewable).
3. Don't reveal solutions in Sophie at all (loses pedagogical
   utility).

None of these are good. The right shape is **build-time
publication gating** with **chapter-level windows** and
**component-level reveals**, plus a small CLI surface that lets
authors verify what will be visible at any future date.

The 2026-05-14 brainstorm locked the design with one explicit
revision (cron default): initially 12 hours, revised to 1 hour,
**revised again to 6 hours** as the right balance between
latency and CI cost.

## Decision

Sophie ships **scheduled publication via build-time gating**, NOT
runtime client-side hiding. The shape:

- Chapter frontmatter declares `publishes_at` and `unpublishes_at`
  (optional, ISO-8601 timestamps).
- Three new components for component-level scheduling:
  `<Solution>`, `<ExamKey>`, `<ScheduledReveal>`.
- A CLI verb `sophie publish-state` for build-time gating and
  inspection.
- A default 6-hour cron schedule in GitHub Actions, plus
  `workflow_dispatch` manual trigger.
- Four new audit invariants in the SP (Scheduled Publication)
  family.

### Build-time gating, NOT client-side hiding

The load-bearing design choice. Two options were considered:

- **Client-side hiding**: ship the content to the browser; hide
  via JS until the timestamp. Fast latency (no rebuild); zero
  CI cost. **Defeated by Inspect Element**: a student can view
  the hidden content via DevTools the moment they're motivated
  to look.

- **Build-time gating**: the static site rebuilds; content
  outside its window is NOT in the HTML at all. Higher latency
  (depends on rebuild frequency); CI cost (rebuilds run
  regularly). **Actually private**: the unpublished content is
  not in the deployed bundle.

Build-time gating wins. Sophie's deployment model (static site
on GitHub Pages or similar) makes rebuilds cheap; the latency is
addressed by the cron + manual-trigger combo (see below).

### Chapter frontmatter: `publishes_at` and `unpublishes_at`

Optional frontmatter fields on chapter MDX files:

```yaml
---
title: Practice Problems Solutions
status: stable
publishes_at: 2026-09-15T08:00:00-07:00
unpublishes_at: 2027-01-01T00:00:00-08:00
---
```

Semantics:

- `publishes_at` (optional, ISO-8601 with timezone): chapter is
  EXCLUDED from build output until `now() ≥ publishes_at`.
- `unpublishes_at` (optional, ISO-8601 with timezone): chapter
  is EXCLUDED from build output once `now() ≥ unpublishes_at`.

Neither field defaults; absence means "no time-based gate." A
chapter with neither field is always included (subject to
`status` per ADR 0051).

**Per-event absolute ISO-8601 timestamps; no recurrence rules
in v1.** Every `publishes_at`/`unpublishes_at`/`unlocks_at`
timestamp in Sophie is an absolute instant with explicit
timezone offset (e.g., `2026-09-15T08:00:00-07:00`,
`2026-11-04T08:00:00-08:00`). Sophie does NOT support recurrence
rules (e.g., "every Wednesday at 10am Pacific through the
semester") in v1. Two reasons:

- **DST is structurally bulletproof under absolute timestamps.**
  Each timestamp's offset is baked in (`-07:00` pre-DST,
  `-08:00` post-DST in Pacific); the build server reads each
  instant unambiguously. Recurrence-with-DST rules are exactly
  where DST bugs hide (most tooling gets the November transition
  subtly wrong).
- **Schedule structure already supports per-event authoring.** ADR
  0054's `schedule.yaml` declares events per-week with explicit
  dates; per-occurrence authoring is the natural shape.

Recurrence rules (with proper DST-aware VTIMEZONE expansion)
are deferred to backlog B10. Promotable when authoring data shows
real demand. The deferral does mean ~30 events per semester per
course in `schedule.yaml`, distributed across weekly sections;
real but bounded.

**`status: draft` overrides `publishes_at`**: a draft chapter
with a future `publishes_at` does NOT publish at that time. The
override is named in [ADR 0051](0051-chapter-status-course-versioning.md)
and enforced by SP1 (see invariants below).

### Three new components

Component-level scheduling for sub-chapter content.

#### `<Solution>`

Wraps homework/practice-problem solutions. Renders only when
`now() ≥ unlocks_at`:

```mdx
<Solution unlocks_at="2026-09-15T08:00:00-07:00">
  The correct answer is C. The flux drops by a factor of 4
  because flux scales as $1/r^2$ and the distance doubles.
</Solution>
```

Before unlock: renders an empty slot (or a configurable "Solution
will appear after [date]" placeholder, controlled by the
`<Solution>`'s `placeholder=` prop).

#### `<ExamKey>`

Wraps exam answer keys. Same shape as `<Solution>` but
semantically distinct (audit invariants treat `<ExamKey>`
differently — see SP3 below).

```mdx
<ExamKey unlocks_at="2026-10-21T17:00:00-07:00">
  Question 1: B. The Doppler shift of an emission line at rest
  wavelength λ₀ moving away at velocity v is Δλ/λ₀ = v/c.
</ExamKey>
```

#### `<ScheduledReveal>`

General-purpose component-level reveal. For content that doesn't
fit `<Solution>` or `<ExamKey>` semantics (e.g., a
misconception-reveal that appears after students submit their
predictions):

```mdx
<ScheduledReveal unlocks_at="2026-09-10T23:59:00-07:00">
  Most students predicted C; the correct answer is D. The
  common misconception here is `flux-vs-luminosity`.
</ScheduledReveal>
```

All three components honor the same `unlocks_at` prop. They
differ only in (a) semantic markup (for audit + a11y), (b) styling
(`<Solution>` is callout-shaped; `<ExamKey>` is more austere;
`<ScheduledReveal>` is unstyled), (c) audit invariant coverage.

### CLI: `sophie publish-state --check`

Verifies the current build's gating state against a target
timestamp:

```text
$ sophie publish-state --check
Current state (as of 2026-09-08T14:00:00-07:00):

Chapters EXCLUDED (publishes_at in future):
  - practice-problems-solutions      → 2026-09-15T08:00:00-07:00 (in 7d)
  - exam-1-answer-key                → 2026-10-21T17:00:00-07:00 (in 43d)

Chapters EXCLUDED (unpublishes_at in past):
  (none)

Chapters EXCLUDED (status: draft):
  - speculative-relativity-chapter

Chapters INCLUDED with future component reveals:
  - flux-luminosity-distance         → 1 <Solution> reveals 2026-09-15
  - apparent-magnitude               → 1 <ScheduledReveal> reveals 2026-09-12

Build is reproducible. To preview a future state:
  sophie publish-state --check --as-of=2026-09-16T00:00:00-07:00
```

The `--as-of=<timestamp>` flag previews any future state, useful
for "what will students see on the day of the exam?"

### CLI: `sophie publish-schedule list`

Lists all timestamps in the upcoming N days:

```text
$ sophie publish-schedule list --next=30d

Next 30 days (from 2026-09-08T14:00:00-07:00):

2026-09-10T23:59:00-07:00  reveal     flux-luminosity-distance:misconception-reveal (<ScheduledReveal>)
2026-09-12T08:00:00-07:00  reveal     apparent-magnitude:practice-reveal (<ScheduledReveal>)
2026-09-15T08:00:00-07:00  publish    practice-problems-solutions (chapter)
2026-09-15T08:00:00-07:00  reveal     flux-luminosity-distance:solution-q1 (<Solution>)
2026-10-21T17:00:00-07:00  publish    exam-1-answer-key (chapter)
```

Useful for course-launch sanity checks ("did I remember to set
the right date on Q1's solution?").

### GitHub Actions: default 6-hour cron + manual trigger

Recommended workflow shape for consumer course repos:

```yaml
# .github/workflows/sophie-scheduled-publish.yml
name: Sophie scheduled publish

on:
  schedule:
    - cron: "0 */6 * * *"   # every 6 hours
  workflow_dispatch: {}     # manual trigger

jobs:
  rebuild-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install --frozen-lockfile
      - run: pnpm sophie build
      - run: pnpm sophie publish-state --check
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist
      - uses: actions/deploy-pages@v4
```

The 6-hour cron means any scheduled-publish timestamp will be
honored within 6 hours of its actual time. The
`workflow_dispatch` trigger lets the instructor manually rebuild
on demand (useful: "I want the exam key to appear NOW, not in
the next cron window").

**Why 6 hours, not 1 hour, not 12 hours:**

- 1 hour means 24 builds/day, which costs CI minutes (GitHub
  Actions free tier is finite for non-Pro accounts; even for
  Pro, the cost compounds across multiple courses).
- 12 hours means worst-case 12-hour latency from
  publish-timestamp to actual visibility — not acceptable for
  "exam key unlocks at 5pm" use cases (instructor would
  manually trigger, which works but is the wrong default).
- 6 hours balances both: 4 builds/day, worst-case 6-hour
  latency, sufficient for "morning-after-due-date" and
  "afternoon-of-exam-end" patterns.

The cron interval is **configurable** per course; 6h is the
recommended default but consumer repos can adjust based on their
delivery pattern.

**Cron + iCal subscriber refresh: two-step latency.** The cron
controls how often the *deployed site* rebuilds. Students who
subscribe to the iCal feed at `/schedule.ics` (per ADR 0054) get
the *feed*'s updated content only after their calendar app
polls it — and most calendar apps poll on their own cadence
(Google Calendar's webcal/HTTPS subscription refresh is typically
hourly to several-hourly; Apple Calendar honors the
`X-PUBLISHED-TTL` hint but real-world refresh varies). End-to-end
"exam date moved → student sees update in their calendar" is
therefore `cron + calendar-app-refresh` — typically 6h to ~24h
total, not 6h. Authors who need faster propagation use
`workflow_dispatch` to trigger an immediate rebuild and tell
students to manually refresh their calendar subscription.

### Audit invariants

Four new invariants. SP (Scheduled Publication) family.

| ID | Level | Fires when |
|---|---|---|
| **SP1** | INFO | Chapter has both `status: draft` and `publishes_at`. Notes that draft status overrides timestamp; surfaces so author knows the chapter will not auto-publish on the date. |
| **SP2** | WARNING | `publishes_at` is in the past but chapter is excluded for some other reason (`status: draft`, or `unpublishes_at` also past). Catches "I set the date months ago and forgot it was already past." |
| **SP3** | ERROR | `<ExamKey>` lacks `unlocks_at` prop. Exam keys without unlock timestamps are almost certainly authoring errors — `<ExamKey>` is *specifically* for time-gated content. (`<Solution>` and `<ScheduledReveal>` allow missing `unlocks_at`, treating absence as "always visible"; `<ExamKey>` does not.) |
| **SP4** | WARNING | A reveal timestamp (chapter `publishes_at`, `unpublishes_at`, or any component `unlocks_at`) is missing a timezone. ISO-8601 without timezone is ambiguous; the audit nudges authors toward explicit timezones to avoid the "is this 8am Pacific or 8am UTC?" failure mode. |

SP3 is the only ERROR. Exam keys are high-stakes; a missing
unlock timestamp on an `<ExamKey>` is exactly the kind of
catastrophic-if-deployed error that gating with ERROR prevents.

### Interaction with audit_overrides (ADR 0053)

A consumer chapter can `audit_overrides: SP4` if the author
deliberately wants ambiguous timestamps (rare; primarily for
testing fixtures). SP3 cannot be overridden — exam-key safety
is non-negotiable.

### Interaction with chapter status (ADR 0051)

Re-stated for clarity:

- `status: draft` overrides `publishes_at`. A draft chapter
  with a future `publishes_at` does not auto-publish on that
  date.
- `status: stable | review` with `publishes_at` in the future
  is excluded until the timestamp.
- `status: stable` with `publishes_at` in the past is included.

### Interaction with `sophie diff` (ADR 0045)

Changes to `publishes_at` or `unpublishes_at` are classified as
**non-substantive × relational** (a scheduling change does not
change the pedagogical content). Changes to `unlocks_at` on a
component are **non-substantive × structural** (timing change to
existing content).

If the timestamp change *causes* a previously-visible piece of
content to disappear retroactively, the diff classifier surfaces
this with the additional flag `visibility-shrunk` — useful for
"oops, I made an exam key unpublish before the exam closed"
catches.

## Rationale

### Build-time gating over client-side hiding

The brainstorm framed this as a single decisive question. Client-
side hiding fails the "actually private" test — DevTools makes
hidden content visible. For homework solutions before due date,
exam keys before exam end, etc., the failure mode is
unacceptable: a student who knows about Inspect Element gets
content other students cannot see.

Build-time gating shifts the cost to CI (rebuilds run on a
schedule + manual trigger) but the content is genuinely absent
from the deployed bundle until its window.

### Three components, not one

`<Solution>` / `<ExamKey>` / `<ScheduledReveal>` could collapse
to one `<TimedReveal>` with a `kind=` prop. Rejected: the three
components have different audit semantics (SP3 ERRORs on
`<ExamKey>` without `unlocks_at`; the others are permissive),
different default styling (Solution callout, ExamKey austere,
ScheduledReveal unstyled), and different semantic markup for
a11y. Three named components are clearer in source than one
polymorphic component with type discrimination.

### 6-hour cron default

See Decision section. The brainstorm went through 12h → 1h →
6h as Anna refined the latency-vs-cost tradeoff. 6h is the
recommended default; consumer repos can tighten or loosen.

### Four audit invariants, ERROR on SP3 only

SP3 (ExamKey without unlocks_at) is the only invariant that
catches a *catastrophic-if-deployed* failure mode; ERROR is
justified. SP1 (draft + publishes_at) and SP2 (publishes_at in
past) are informational/cautionary; SP4 (missing timezone) is a
WARNING because the failure mode (off-by-timezone) is
recoverable post-deploy.

### `status: draft` overrides `publishes_at` (CS over SP)

Per ADR 0051 lock: a draft chapter is not ready to ship,
regardless of timestamp. Timestamp-gated drafts would create a
"draft chapter auto-publishes" failure mode if the author
forgot to flip status to stable. Override direction is
unambiguous: explicit `status: draft` always wins over implicit
"date has arrived."

### No client-time-zone awareness in v1

Build-time gating uses the **build server's clock** to evaluate
`now()`. Cron runs in UTC; the build interprets timestamps in
their declared timezone. There is no per-student-timezone
awareness — every student sees the same content at the same
moment regardless of their local timezone.

This is correct for course delivery: "the exam key unlocks at
5pm Pacific" should mean 5pm Pacific for everyone, not 5pm in
each student's local zone. If per-student-zone gating ever
becomes a real need, it would be a v2/v3 ADR (and almost
certainly require server-side rendering, which v1 does not
have).

## Consequences

**Easier:**

- Solution-reveal workflow no longer requires manual
  edit-and-commit.
- Exam keys can ship in the repo from semester start, gated by
  build-time check; reduces "did I remember to commit the
  answer key?" cognitive load.
- `sophie publish-state --check` makes "what will students see
  on day X?" a one-command answer.

**Harder:**

- Cron schedule means worst-case 6-hour latency from intended
  publish-time to actual visibility. Acceptable for most
  patterns; `workflow_dispatch` covers the exceptions.
- Authors have to remember to include timezones (SP4 catches
  the omission).
- Implementing build-time gating requires the build pipeline to
  evaluate timestamps and conditionally exclude content; the
  Astro side of this is small but real work.

**Triggers:**

- v1 of this ADR ships docs-only on 2026-05-14.
- Implementation PR:
  - Schema: extend chapter frontmatter Zod with `publishes_at`,
    `unpublishes_at`.
  - Components: `<Solution>`, `<ExamKey>`, `<ScheduledReveal>`
    in `packages/components/src/scheduled/`.
  - Build: chapter-level filter in `@sophie/astro` that
    excludes time-gated chapters; component-level slot-collapse
    pattern (per ADR 0034) for unlocked components.
  - Audit: implement SP1–SP4 in
    `packages/astro/src/lib/pedagogy-audit.ts`.
  - CLI: `sophie publish-state` + `sophie publish-schedule list`
    in `packages/cli/`.
- Workflow template:
  `.github/workflows/sophie-scheduled-publish.yml.template`
  shipped in the consumer-course scaffold.

## Alternatives considered

### Client-side hiding

*Rejected.* DevTools defeats the privacy goal. See Rationale.

### One polymorphic `<TimedReveal kind="solution|exam-key|reveal">`

*Rejected.* Three components have different audit semantics +
styling + a11y markup. Three names are clearer.

### 1-hour or 12-hour cron defaults

*Rejected.* 1h burns CI budget; 12h misses common patterns
(afternoon-of-exam-end). 6h is the balance.

### Per-student-timezone scheduling

*Deferred to v2/v3.* Requires server-side rendering; not
appropriate for v1's static-site model.

### `<Solution>` defaults `unlocks_at` to chapter `publishes_at`

*Considered, rejected.* Implicit inheritance is brittle; explicit
`unlocks_at` per component is clearer and matches what authors
actually want (a chapter publishes earlier; specific
solutions/keys within it unlock later).

### Build-cache invalidation on every minute

*Rejected.* Implies a build server polling the clock; out of
scope for static-site model. Cron + manual trigger is the
correct shape.

## References

- [ADR 0034 — Empty slot collapse pattern](./0034-empty-slot-collapse-pattern.md)
  — pattern reused for unlocked components.
- [ADR 0045 — Pedagogical Diff + Curriculum CI](./0045-pedagogical-diff-curriculum-ci.md)
  — diff classification for timestamp changes;
  `visibility-shrunk` flag.
- [ADR 0049 — `sophie refactor` CLI Family](./0049-sophie-refactor-cli.md)
  — `sophie publish-state --check` surfaces unresolved
  refactor-seeds in its report.
- [ADR 0051 — Chapter Status + Course Versioning](./0051-chapter-status-course-versioning.md)
  — `status: draft` overrides `publishes_at` per the CS/SP
  interaction rule.
- [ADR 0053 — Conformance Failure Modes](./0053-conformance-failure-modes.md)
  — `audit_overrides` can suppress SP1/SP2/SP4 per chapter;
  SP3 cannot be overridden.
- [sophie-publish-schedule-cli.md](../reference/sophie-publish-schedule-cli.md)
  — full CLI spec.
