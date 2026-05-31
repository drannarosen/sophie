# Schedule + Announcements + Assignments registry — Design

**Date:** 2026-05-31 · **Status:** approved (Anna, in-thread) · **Deciders:** anna

> Source design record for **ADR 0096 Amendment 1**, **ADR 0080 Amendment 3**,
> **ADR 0098** (ScheduleSchema), and **ADR 0099** (Announcements). Implementation
> plan: [`2026-05-31-schedule-announcements-implementation.md`](2026-05-31-schedule-announcements-implementation.md).

## Context

PR #243 (ADR 0097) shipped the course-home dashboard with three **fail-closed**
seams: the "This Week" orientation card, the module-row week-ranges + "Now" marker,
and an announcement banner — all degrade to nothing because no data source exists
yet. This arc fills them.

The dashboard's "This Week" card must surface *what's due*, and the homework
registry (ADR 0096) already owns deadlines. Duplicating due-dates into the schedule
would be a DRY violation, so **the schedule pulls deadlines from the registry by
date**. With that established, Anna chose to **generalize the homework registry into
an assignments registry now**, pre-launch, while the hard rename is cheap (no
back-compat per the project principle; no consumer to migrate — astr201 has no
`homework.sophie.yaml` yet).

## ① Assignments registry (ADR 0096 Amendment 1)

Generalizes the homework registry. **Hard rename**, no back-compat shim:

| Before | After |
|---|---|
| `homework.sophie.yaml` | `assignments.sophie.yaml` |
| `virtual:sophie/homework` | `virtual:sophie/assignments` |
| `HomeworkRegistry` / `Homework` | `AssignmentRegistry` / `Assignment` |
| `homework.ts` / `homework-{loader,virtual-module}.ts` | `assignments.ts` / `assignments-{loader,virtual-module}.ts` |

**Entry shape:** `{ id: Slug, title, kind: Slug, assignedDate: DateOrTbd, dueDate:
DateOrTbd, problems?: ProblemGroup[] }`.

- **`kind` is a free `Slug`**, humanized for display (`growth-memo` → "Growth
  Memo"). **No closed platform enum** — assignment kinds are course-owned (ASTR 596:
  growth-memo, grade-memo; COMP 521: others). A closed enum in `@sophie/core` would
  force a platform PR per course-specific kind.
- **`problems` is optional.** The ADR 0096 gated-solution reveal keys off its
  **presence**, not on `kind`. So the resolver generalizes by iterating
  `assignments` and filtering `a.problems?.some(g => g.unit === unit)` — it never
  learns that project/lab kinds exist. *Generalization without branching.*
- Refines preserved: `assignedDate ≤ dueDate` (tbd-tolerant); each problem claimed
  by at most one assignment (registry-level uniqueness).

**Why `problems`-presence, not `kind === "homework"`:** keying the reveal on data
shape (does this assignment carry gradable problems whose solutions unlock?) rather
than on a kind label means the gate is correct for *any* future kind that ships
problems (a lab with problem sets gates identically), and is inert for kinds that
don't (a project never gates). The reveal logic stays a one-line generalization of
the shipped ADR 0096 code.

## ② `assignment_kinds` course-spec field (ADR 0080 Amendment 3)

**Optional** `assignment_kinds: { <slug>: <label> }` map in `course.sophie.yaml`.

- **Absent** → kinds are free slugs with humanized-label fallback (zero-config).
- **Present** → supplies custom display labels **and** triggers an
  integration-level cross-refine that **rejects undeclared `kind` values** at build
  (typo protection + AI-authoring legibility per ADR 0030).

Convention, not constraint. The cross-refine runs in the integration (where both
`course.sophie.yaml` and `assignments.sophie.yaml` are visible), mirroring ADR
0096's already-deferred `unit`/`id` cross-refine — same machinery, not a new
concept. `@sophie/core` stays framework-pure (ADR 0001): it validates the map's
*shape* only; the cross-file membership check is the integration's job.

## ③ ScheduleSchema (ADR 0098)

`schedule.sophie.yaml`: `{ term_start: DateOrTbd, entries: ScheduleEntry[] }`.

- **Entry:** `{ date: <iso-date>, kind, title, unit? }`. `date` is a concrete ISO
  date (no `tbd` — an undated schedule entry is meaningless). `unit?: Slug` is
  shape-only in core; reference-integrity is deferred to the route and **fail-closed**
  (an unresolvable `unit` simply doesn't contribute to a section's range).
- **`kind` ∈ `lecture | activity | exam | holiday | break`** — a **closed** enum
  (unlike assignment kinds): these are platform-universal calendar primitives.
  `activity` = in-class activities/worksheets/labs (meeting events, not deadlines);
  `holiday` = single no-class day; `break` = multi-day no-class span. **No `due`
  kind** — deadlines live in the assignments registry, pulled by date.
- **`virtual:sophie/schedule`** — the 3rd `T | null` always-register virtual module
  (R12 family).

**Route projections** (pure, single injected build wall-clock):

- **Section week-ranges ("Weeks N–M"):** Week N = calendar weeks since `term_start`
  (Monday-aligned). A section's range = min..max week of its lecture/unit-tagged
  entries whose `unit` maps to that section (unit→section via the content
  collections, where `moduleRows` already runs). `term_start: tbd` → week-number
  labels omitted; date-derived state still works.
- **"Now"/past row state:** today vs the section's date span.
- **"This Week" card:** **rolling next-7-days** window `[today, today+7d]` — class
  events + assignment due-dates pulled from the assignments registry by date. Empty
  window → card dropped (fail-closed, ADR 0097 #7).

## ④ Announcements (ADR 0099)

`announcements.sophie.yaml`: `{ announcements: Announcement[] }`, each `{ id: Slug,
title, body?, severity: info|notice|urgent, publish_date, expire_date?, href? }`.

- **Build-time gated:** render only when `publish_date ≤ now ≤ (expire_date ?? +∞)`
  (string-ISO compare, fail-closed). The astr201 daily rebuild cron expires them.
  Refine: `publish_date ≤ expire_date`.
- **`landing.show_announcements`** (already in the landing schema) is the on/off
  toggle.
- **`virtual:sophie/announcements`** — the 4th `T | null` always-register virtual
  module (R12 family).
- **Banner:** show **all active, stacked**, sorted severity (urgent → notice →
  info) then `publish_date` desc; **non-dismissible** (pure build-time chrome, no
  client JS — the expire window bounds nagging, fits the no-accounts LDS model);
  severity → scoped `--sophie-home-*` palette (info→teal, notice→violet,
  urgent→rose); **home banner only** this arc (site-wide slot future, seam open).

## Chrome, not pedagogy

All three features are course-info projections (ADR 0058 boundary): they live in
`@sophie/astro`, are documentary CHROME, and never enter the pedagogy-index /
Library. R13 (epistemic-role) + R11 (axe-render) scope to `@sophie/components` only,
so no allowlist entries are needed; R14 (no raw `dangerouslySetInnerHTML`) does
apply — no raw HTML injection is used.

## Shipping

Two PRs (Anna-approved): **PR 2** = assignments registry + ScheduleSchema (ADRs
0096-Am1, 0080-Am3, 0098); **PR 3** = Announcements (ADR 0099). Schedule's "This
Week" pulls from the registry, so it ships with the rename; Announcements is
independent.

## Deferred (not this arc)

- **astr201 adoption** — re-pin sophie SHA, author `assignments`/`schedule`/
  `announcements.sophie.yaml`, declare `assignment_kinds`, flip `landing.layout` to
  `dashboard`, retire `prose/schedule-static.mdx`. After both PRs merge.
- Per-kind assignment styling/grouping, banner dismissal, banner site-wide slot,
  generalized non-homework reveal — all future, additive.
