---
date: 2026-05-31T00:00:00.000Z
tags:
  - schema
  - astro
  - course-website
  - course-home
status: accepted-design
validation:
  status: in-progress
  last_validated_date: "2026-05-31"
  evidence:
    - kind: review
      ref: docs/plans/2026-05-31-schedule-announcements-design.md
      date: "2026-05-31"
      notes: "Design source (§③). ScheduleSchema = `{ term_start: DateOrTbd, entries: [{ date: <iso-date>, kind: lecture|activity|exam|holiday|break, title, unit? }] }`. `kind` is a CLOSED enum (platform-universal calendar primitives) — unlike assignment kinds, which are free slugs (ADR 0096 Am1). No `due` kind: deadlines live in the assignments registry (ADR 0096) and the schedule pulls them by date. `virtual:sophie/schedule` is the realized 3rd `T | null` always-register virtual module (R12 family). Pure route projections: section week-ranges (Monday-aligned from term_start), Now/past row state, rolling next-7-day This-Week card. Chrome, not pedagogy (ADR 0058). Approved in-thread 2026-05-31 (HITL gate)."
    - kind: review
      ref: docs/plans/2026-05-31-schedule-announcements-implementation.md
      date: "2026-05-31"
      notes: "Implementation plan (Tasks 2/4/5/8/9/10). Schema in @sophie/core (Task 2); loader + always-register virtual module in @sophie/astro (Task 4); pure injected-`now`/`termStart` projections `weekOf`/`scheduleRows`/`thisWeek` (Task 5); course-landing dispatcher wiring (Task 8, null-safe — NOT R12-narrowed, the documented homework-precedent exception); ModuleList week-range + Now/past row state (Task 9); OrientationCards This-Week card (Task 10)."
    - kind: test
      ref: packages/core/src/schema/schedule.test.ts
      date: "2026-05-31"
      notes: "ScheduleSchema acceptance + rejection: a valid schedule parses; an entry with `kind: 'due'` rejected (not in the closed enum); an entry with `date: 'tbd'` rejected (entry dates must be concrete ISO); `term_start: 'tbd'` accepted; an entry with a non-slug `unit` rejected. 8 cases."
    - kind: test
      ref: packages/astro/src/components/course-home/home-schedule-projections.test.ts
      date: "2026-05-31"
      notes: "Pure projection tests (injected `now`/`termStart`): `weekOf` Monday-alignment; `scheduleRows` week-range + isNow/isPast derivation, `term_start: 'tbd'` omits week fields, fail-closed unresolvable-unit drop; `thisWeek` rolling-7-day window pulling assignment dueDates by date, date-sorted, null-schedule → []. 16 cases."
    - kind: test
      ref: packages/astro/src/lib/schedule-loader.test.ts
      date: "2026-05-31"
      notes: "Loader: absent file → null; valid yaml → parsed Schedule; malformed/invalid → throws naming the path + formatted Zod issues. Virtual module (schedule-virtual-module.test.ts, 8 cases): always-register; emits `export const schedule = …`; null payload emits `export const schedule = null`."
    - kind: deployment
      ref: examples/smoke/schedule.sophie.yaml
      date: "2026-05-31"
      notes: "Smoke fixture + real-build verify (Task 11): `schedule.sophie.yaml` with `term_start` + lecture/activity/exam/break entries spanning the smoke sections. `pnpm --filter @sophie/smoke build` green; served dist shows the This-Week card, module week-ranges + Now marker, and Due-Soon kind badges rendering; `gated-solutions-security.spec.ts` re-run confirms the ADR 0096 gate survives. Not yet adopted by astr201 — this ADR is accepted-design."
  notes: |
    Approved design, not yet shipped to a consumer. ScheduleSchema is
    the deferred date source ADR 0096 + ADR 0080 Amendment 2 both
    predicted: it supersedes hand-entered registry dates for class
    events while the assignments registry stays the single home for
    deadlines (the schedule pulls them by date, never duplicates them).
    `virtual:sophie/schedule` is the realized **third** `T | null`
    always-register virtual module (course-spec first, assignments
    second; figures predates them in the always-register lineage but is
    non-nullable). It is a documentary CHROME projection (ADR 0058) —
    it never enters the pedagogy-index / Library, so R11/R13 (which
    scope to `@sophie/components`) need no allowlist entries. astr201
    adoption (authoring `schedule.sophie.yaml`, flipping
    `landing.layout` to `dashboard`) is deferred to after the PR merges.
---

# ADR 0098: Schedule schema (class calendar)

:::{admonition} ADR metadata
- **Status**: accepted-design
- **Deciders**: anna
- **Related**: [0001](./0001-platform-not-monorepo.md), [0003](./0003-zod-as-source-of-truth.md), [0058](./0058-epistemic-component-contract.md), [0080](./0080-course-spec-format-v0-1.md) (Amendment 2 predicted this), [0096](./0096-deploy-time-gated-content.md) (Amendment 1 — deadline source), [0097](./0097-course-home-dashboard.md) (the consumer of these projections)
:::

## Context

The course-home dashboard (ADR 0097) shipped three **fail-closed**
seams that degrade to nothing because no data source exists yet: the
"This Week" orientation card, the module-row **week-ranges + "Now"
marker**, and an announcement banner. Two of those three are calendar
surfaces — they need a per-term class calendar.

ADR 0080 Amendment 2 deferred a `schedule.yaml` source-of-truth
(H6) to "a follow-up sprint with its own focused design pass + ADR";
ADR 0096 (decision 1 + Rationale) repeatedly named "the deferred
`ScheduleSchema` family" as the predicted **third** `T | null`
always-register virtual module and as the future date source that would
supersede hand-entered registry dates. This ADR is that follow-up.

The governing constraint is **DRY against deadlines**. The assignments
registry (ADR 0096, generalized in Amendment 1) already owns every
assignment's `dueDate`. Duplicating due-dates into the schedule would
fork the source of truth. So the schedule carries **class events only**
(lectures, activities, exams, holidays, breaks) and the "This Week"
projection **pulls deadlines from the assignments registry by date** —
deadlines have exactly one home.

## Decision

### 1. `schedule.sophie.yaml` — `{ term_start, entries }`

A new consumer-side `schedule.sophie.yaml` at the course-repo root,
validated by `ScheduleSchema`
([`packages/core/src/schema/schedule.ts`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/schedule.ts)):

```ts
const ScheduleEntrySchema = z.object({
  date: z.iso.date(),       // concrete ISO date — no tbd
  kind: ScheduleKind,
  title: NonEmptyString,
  unit: Slug.optional(),    // shape-only; route resolution is fail-closed
}).strict();

export const ScheduleSchema = z.object({
  term_start: DateOrTbd,    // Week-1 Monday anchor; "tbd" omits week labels
  entries: z.array(ScheduleEntrySchema),
}).strict();
```

`entry.date` is a **concrete** ISO date (no `tbd`): an undated schedule
entry is meaningless. `term_start` **is** `DateOrTbd` — a term may not
be scheduled yet, and `tbd` simply omits the week-number labels
downstream (the date-derived "Now"/past state still works). Strict-by-
default mirrors ADR 0080 §5.

### 2. `kind` is a CLOSED enum (unlike assignment kinds)

`kind ∈ lecture | activity | exam | holiday | break`. This is a
**closed** platform enum — deliberately the opposite of assignment
`kind`, which ADR 0096 Amendment 1 made a free consumer-owned `Slug`.
The distinction is intentional: assignment kinds are course-pedagogy
vocabulary (growth-memo, lab, project — a closed enum would force a
platform PR per course), whereas these five are **platform-universal
calendar primitives** every course shares. `activity` = in-class
activities/worksheets/labs (meeting events, not deadlines); `holiday` =
a single no-class day; `break` = a multi-day no-class span.

**No `due` kind.** Deadlines live in the assignments registry (ADR
0096); the schedule pulls them by date (decision 4). Adding a `due`
kind would fork the deadline source-of-truth — the DRY violation this
design exists to avoid.

### 3. `virtual:sophie/schedule` — the realized third `T | null` module

The schedule is exposed as `virtual:sophie/schedule` exporting
`Schedule | null`, via the **always-register** pattern: the loader
([`schedule-loader.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/lib/schedule-loader.ts))
returns `null` when the file is absent (and throws on a present-but-
invalid file, naming the path + formatted Zod issues); the virtual-
module factory
([`schedule-virtual-module.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/lib/schedule-virtual-module.ts))
registers the module unconditionally, exporting the literal `null` when
absent so importers never fail to resolve. This is the **realized
third instance** of the `T | null` always-register pattern (course-spec
was first, assignments second; figures predates them in the
always-register lineage but is non-nullable) — the slot ADR
0096 and ADR 0080 Amendment 2 both predicted, and the **R12 family**.

**Null-safe route exception (R12 nuance).** The dashboard dispatcher
([`course-landing.astro`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/routes/course-landing.astro))
reads `schedule` (and `assignments`) but does **not** narrow them with
an `if (!schedule) throw`. It passes them **whole** into the
null-guarding `scheduleRows` / `thisWeek` projections, which each
return `[]` on a `null` input — so the calendar surfaces degrade to
nothing (ADR 0097 #7) with no property access at the route boundary.
This is a **documented exception** to R12's narrow-with-throw rule, not
a regression: R12's throw exists to narrow before *direct property
access*, which never happens here. `virtual:sophie/course-spec` stays
the only narrowed-with-throw module; `schedule` + `assignments` are the
homework-precedent null-safe-projection exception. See the AGENTS.md
R12 scope clarification.

### 4. Pure route projections (chrome, not pedagogy)

All schedule-derived rendering goes through pure functions in
[`home-schedule-projections.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components/course-home/home-schedule-projections.ts)
with a **single injected build wall-clock** `now` (and `termStart`) —
no `new Date()` inside, no virtual-module import. The dispatcher owns
the impure edges (reads the virtual modules + the one wall-clock, feeds
props down). ISO `YYYY-MM-DD` strings sort lexicographically ==
chronologically, so date filters use string comparison (the same idiom
as `dueSoon` / `resolveRevealDate`); the two exceptions are the UTC
week math and the `now + 7d` window edge.

- **Section week-ranges ("Weeks N–M").** Week N = Monday-aligned
  calendar weeks since `term_start`. A section's range = min..max week
  of the schedule entries whose `unit` resolves (via the `unitId →
  section_id` map from the content collections) to a unit in that
  section. **Fail-closed unit resolution**: an entry with an absent or
  unresolvable `unit` contributes nothing — it can't silently land in
  the wrong section's range; a section with no resolvable entries gets
  no row (the renderer degrades to lecture-count-only). `term_start:
  "tbd"` omits the week numbers; date state still derives.
- **"Now"/past row state.** Today vs the section's date span:
  `isNow` = today within [min, max]; `isPast` = today after max.
- **"This Week" card.** The **rolling next-7-days** window `[today,
  today + 7d]`: schedule entries in range (label = title, kind = the
  schedule kind) **plus** assignment `dueDate`s in range pulled by date
  from the assignments registry (label = title, kind = `"due"`). Sorted
  ascending by date. Empty window → `[]` → card dropped (fail-closed,
  ADR 0097 #7).

These are **course-info chrome projections** (the ADR 0058 boundary):
they live in `@sophie/astro`, are documentary, and never enter the
pedagogy-index / Library. R11 (axe-render) and R13 (epistemic-role)
scope to `@sophie/components`, so no allowlist entries are needed; R14
(no raw `dangerouslySetInnerHTML`) applies and is honored (no raw HTML
injection).

## Consequences

- **Positive.** The dashboard's two calendar seams (module week-ranges
  + "Now" marker, This-Week card) go live; deadlines surface in
  This-Week without being re-authored anywhere — they stay in the
  assignments registry, pulled by date.
- **Forward-shaped date source.** ScheduleSchema is the date source ADR
  0096 + ADR 0080 Amendment 2 deferred; class-event dates now have a
  declarative home, while deadlines keep their single home.
- **Fail-closed throughout.** Absent schedule → null → empty
  projections → dropped cards. Unresolvable `unit` → contributes
  nothing. `term_start: tbd` → no week labels, date state intact. No
  branch renders ambiguous or wrong calendar chrome.
- **Discovery-test ratchet.** `home-schedule-projections.ts` is value-
  imported by `ModuleList.astro` / `OrientationCards.astro`, so the
  `discover-astro-entries` expected-set + count bumped to 30 (Task 5).
- **astr201 adoption deferred.** Authoring `schedule.sophie.yaml` +
  flipping `landing.layout` to `dashboard` lands after this PR merges
  (the design doc's Deferred list).

## Alternatives rejected

- **A `due` kind in the schedule.** Forks the deadline source-of-truth
  — deadlines would live in both the assignments registry and the
  schedule. Rejected for DRY; the schedule pulls deadlines by date
  instead (decision 4).
- **Free-slug schedule `kind` (matching assignment kinds).** These five
  calendar primitives are platform-universal, not course-pedagogy
  vocabulary; a closed enum gives typo protection at parse time with no
  per-course PR cost. Rejected — the free-slug rationale (ADR 0096
  Am1) does not apply here.
- **Reference-integrity (`unit` resolves) enforced in `@sophie/core`.**
  The content collections are only visible at `astro:config:setup`, and
  `@sophie/core` is framework-pure (ADR 0001). Rejected: `unit` is
  shape-only in core; resolution is deferred to the fail-closed route
  projection.
- **Narrow-with-throw at the dispatcher (strict R12).** Would force the
  whole dashboard to render-nothing when the schedule is absent, rather
  than just the calendar cards. Rejected: the null-safe-projection
  exception (decision 3) degrades each card independently, which is the
  ADR 0097 #7 contract.

## References

- [ADR 0001 — Repo shape: standalone platform, separate consumer repos](./0001-platform-not-monorepo.md)
  — framework-purity that keeps `unit` resolution out of `@sophie/core`.
- [ADR 0003 — Zod as schema source of truth](./0003-zod-as-source-of-truth.md)
  — the `ScheduleSchema` contract.
- [ADR 0058 — Epistemic component contract](./0058-epistemic-component-contract.md)
  — the chrome-vs-pedagogy boundary the schedule projections sit on.
- [ADR 0080 — Course-spec format v0.1](./0080-course-spec-format-v0-1.md)
  — Amendment 2 (H6) deferred the `schedule.yaml` source-of-truth this ADR delivers.
- [ADR 0096 — Deploy-time gated content + assignments registry](./0096-deploy-time-gated-content.md)
  — the deadline source the This-Week card pulls by date (Amendment 1's generalized registry).
- [ADR 0097 — Course-home dashboard layout](./0097-course-home-dashboard.md)
  — the consumer of these projections; this ADR fills its calendar seams.
- `docs/plans/2026-05-31-schedule-announcements-design.md` — design source (§③).
- `docs/plans/2026-05-31-schedule-announcements-implementation.md` — implementation plan.
