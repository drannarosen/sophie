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
      notes: "Design source (§④ + § Chrome-not-pedagogy + § Deferred). AnnouncementRegistrySchema = `{ announcements: [{ id: Slug, title, body?, severity: info|notice|urgent, publish_date: <iso-date>, expire_date?: <iso-date>, href? }] }`; refine `publish_date <= expire_date`. `AnnouncementSeverity` is a CLOSED enum (named export, mirroring `ScheduleKind`) — platform-universal banner severities mapping to the scoped `--sophie-home-*` palette, unlike the free-slug assignment `kind` (ADR 0096 Am1). Build-time gated, fail-closed: render only when `publish_date <= now <= (expire_date ?? +∞)` (string-ISO compare, single injected build `now`); the consumer's daily rebuild cron expires them. `landing.show_announcements` is the opt-in toggle. `virtual:sophie/announcements` is the 4th `T | null` always-register virtual module (R12 family), null-safe route exception. Banner: all active, stacked, severity-sorted (urgent→notice→info) then publish_date desc, non-dismissible, NON-color severity text label (WCAG 1.4.1), `<section aria-labelledby>` nested under `<main>` (R10), home banner only this arc. Chrome, not pedagogy (ADR 0058). Approved in-thread 2026-05-31 (HITL gate)."
    - kind: review
      ref: docs/plans/2026-05-31-schedule-announcements-implementation.md
      date: "2026-05-31"
      notes: "Implementation plan (PR 3, Tasks 1–8). Schema in @sophie/core (Task 1); loader + always-register virtual module in @sophie/astro (Task 2); pure injected-`now` projection `activeAnnouncements` (Task 3); `AnnouncementBanner.astro` (Task 4); integration register + `CourseHomeShell` mount + `course-landing.astro` null-safe route read gated by `landing.show_announcements && active.length > 0` (Task 5); smoke fixture + real-build verify (Task 6)."
    - kind: test
      ref: packages/core/src/schema/announcements.test.ts
      date: "2026-05-31"
      notes: "AnnouncementRegistrySchema acceptance + rejection: a valid registry parses (minimal + body/href/expire_date variants); a non-enum `severity` rejected; `publish_date > expire_date` rejected by the refine; an unknown key rejected (strict); a non-slug `id` rejected. 5 cases."
    - kind: test
      ref: packages/astro/src/components/course-home/home-announcement-projections.test.ts
      date: "2026-05-31"
      notes: "Pure `activeAnnouncements` projection (injected `now`): publish-window gate (`publish_date <= today <= (expire_date ?? +∞)`, inclusive bounds, fail-closed drop of future-published + already-expired); open-ended (no `expire_date`) stays active indefinitely; severity sort (urgent→notice→info) tie-broken by `publish_date` DESC; `publish_date`/`expire_date` dropped from the output shape; `null` registry → []. 11 cases."
    - kind: test
      ref: packages/astro/src/lib/announcements-loader.test.ts
      date: "2026-05-31"
      notes: "Loader: absent file → null; valid yaml → parsed AnnouncementRegistry; malformed YAML / schema-invalid → throws naming the path + formatted Zod issues (6 cases). Virtual module (announcements-virtual-module.test.ts, 8 cases): always-register; emits `export const announcements = …`; null payload emits `export const announcements = null`."
    - kind: test
      ref: packages/astro/src/components/course-home/home-pieces.axe.test.ts
      date: "2026-05-31"
      notes: "`AnnouncementBanner.astro` axe + state coverage: three active announcements (all severities) render the named `<section aria-labelledby>` region with the capitalized severity TEXT label, body, and RAW author `href` link, axe-clean; an empty array renders NOTHING (no labelled region, no empty chrome), axe-clean. Integration register asserted in integration.test.ts (`sophie:announcements` plugin present, always-register, alongside course-spec/assignments/schedule)."
    - kind: deployment
      ref: examples/smoke/announcements.sophie.yaml
      date: "2026-05-31"
      notes: "Smoke fixture + real-build verify (Task 6): `announcements.sophie.yaml` with five entries bracketing the build wall-clock — three ACTIVE (drop-deadline urgent w/ body+href, office-hours notice w/ expire_date, welcome info published today) and two GATED (future-survey published in the future → upper-bound drop; past-syllabus expired → lower-bound drop). A real `pnpm --filter @sophie/smoke build` populates the banner with the three active notices and drops the two gated ones at the served dist — one-time local proof the build-time gate works end to end. The active/gated split is date-relative, so no e2e asserts the populated state (the date-injected assertions live in the projection unit tests). Not yet adopted by astr201 — this ADR is accepted-design."
  notes: |
    Approved design, not yet shipped to a consumer. ADR 0099 fills the
    last of ADR 0097's three fail-closed dashboard seams — the
    announcement banner ADR 0097 decision 7 left open (the two calendar
    seams were filled by ADR 0098). `virtual:sophie/announcements` is the
    realized **fourth** `T | null` always-register virtual module
    (course-spec first, assignments second, schedule third; figures
    predates them in the always-register lineage but is non-nullable). It
    is a documentary CHROME projection (ADR 0058) — it never enters the
    pedagogy-index / Library, so R11/R13 (which scope to
    `@sophie/components`) need no allowlist entries; R14 (no raw
    `dangerouslySetInnerHTML`) applies and is honored (plain-text
    interpolation, no HTML injection). astr201 adoption (authoring
    `announcements.sophie.yaml`, flipping `landing.show_announcements` on)
    is deferred to after the PR merges.
---

# ADR 0099: Announcements (course-home banner)

:::{admonition} ADR metadata
- **Status**: accepted-design
- **Deciders**: anna
- **Related**: [0001](./0001-platform-not-monorepo.md), [0003](./0003-zod-as-source-of-truth.md), [0058](./0058-epistemic-component-contract.md), [0080](./0080-course-spec-format-v0-1.md) (`landing.show_announcements` toggle), [0093](./0093-build-time-html-trust-primitive.md) (R14), [0096](./0096-deploy-time-gated-content.md) (Amendment 1 — free-slug `kind` contrast), [0097](./0097-course-home-dashboard.md) (decision 7 — the seam this ADR fills), [0098](./0098-schedule-schema.md) (the sibling fast-follow filling the calendar seams)
:::

## Context

The course-home dashboard (ADR 0097) shipped three **fail-closed** seams
that degrade to nothing because no data source exists yet: the "This
Week" orientation card, the module-row **week-ranges + "Now" marker**,
and an **announcement banner**. ADR 0098 filled the two calendar seams
with `ScheduleSchema`. This ADR fills the **third and last** — the
announcement banner ADR 0097 decision 7 left open (consuming a nullable
`virtual:sophie/announcements`, rendering nothing when null). It is the
final dashboard fast-follow.

Sophie is a build-time static site with **no server, no auth, no
per-student state** (ADR 0001; ADR 0097 Context). An announcement banner
in that model is **build-time-gated chrome**: the platform can't push a
notice or track who dismissed it, but it *can* publish a notice that
becomes visible on a date and disappears on another — exactly the
calendar-aware, student-agnostic posture the dashboard is built on. The
consumer's daily rebuild cron (the same one ADR 0096's reveal gate uses)
re-evaluates the publish window each build.

## Decision

### 1. `announcements.sophie.yaml` — `{ announcements }` with a closed `severity`

A new consumer-side `announcements.sophie.yaml` at the course-repo root,
validated by `AnnouncementRegistrySchema`
([`packages/core/src/schema/announcements.ts`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/announcements.ts)):

```ts
const AnnouncementSchema = z.object({
  id: Slug,
  title: NonEmptyString,
  body: NonEmptyString.optional(),
  severity: AnnouncementSeverity,       // closed: info | notice | urgent
  publish_date: z.iso.date(),           // concrete ISO — no tbd
  expire_date: z.iso.date().optional(), // absent = never expires
  href: NonEmptyString.optional(),
}).strict().refine(
  (a) => a.expire_date === undefined || a.publish_date <= a.expire_date,
  { message: "publish_date must be on or before expire_date", path: ["publish_date"] },
);

export const AnnouncementRegistrySchema = z.object({
  announcements: z.array(AnnouncementSchema),
}).strict();
```

`publish_date` is a **concrete** ISO date (no `tbd`): an announcement
with no start is meaningless. `expire_date` is **optional** — absent
means "never expires" (an open-ended notice). The refine enforces
`publish_date <= expire_date`; because both are `z.iso.date()`
(zero-padded `YYYY-MM-DD`), ISO strings compare lexicographically the
same as chronologically, so the refine is a plain string `<=` with no
`Date` construction. Strict-by-default mirrors ADR 0080 §5 and the
sibling `ScheduleSchema` (ADR 0098 decision 1).

`AnnouncementSeverity = z.enum(["info", "notice", "urgent"])` is a
**named export** — a **CLOSED** platform enum, mirroring `ScheduleKind`
(ADR 0098 decision 2) and deliberately the opposite of assignment `kind`
(a free consumer-owned `Slug`, ADR 0096 Amendment 1). The distinction is
intentional: assignment kinds are course-pedagogy vocabulary (growth-
memo, lab, project — a closed enum would force a platform PR per course),
whereas these three are **platform-universal banner severities** that map
to the scoped `--sophie-home-*` palette (decision 5). Every course shares
them; a closed enum gives typo protection at parse time at no per-course
cost.

### 2. Build-time gating, fail-closed (injected `now`)

An announcement renders only when its publish window contains the build
wall-clock: `publish_date <= now <= (expire_date ?? +∞)`. This is the
ADR 0096 reveal posture applied to chrome — the consumer's **daily
rebuild cron** re-evaluates the window each build, so a notice appears on
its `publish_date` and disappears after its `expire_date` with no manual
edit. The gate is **fail-closed**: a future-published or already-expired
notice is dropped (never shown ambiguously).

The gating goes through one pure function `activeAnnouncements`
([`home-announcement-projections.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components/course-home/home-announcement-projections.ts))
with a **single injected build `now`** — no `new Date()` inside, no
virtual-module import. The dispatcher owns the impure edges (reads the
virtual module + the one wall-clock, feeds props down). Date filters use
**string-ISO comparison** against a `YYYY-MM-DD` slice of `now`
(`now.toISOString().slice(0, 10)` — the same UTC date basis
`home-schedule-projections.ts` uses), the same idiom as `dueSoon` /
`resolveRevealDate` / the schedule projections.

### 3. `landing.show_announcements` is the opt-in toggle

The banner is gated by `landing.show_announcements` — a `z.boolean()
.optional()` field **already in the landing schema**
([`course-spec-v02-landing.ts`](https://github.com/drannarosen/sophie/blob/main/packages/core/src/schema/course-spec-v02-landing.ts),
ADR 0080). `undefined`/`false` → **no banner even with live
announcements**; a course must opt in. No new course-spec field ships
with this ADR — the toggle was anticipated by the landing schema and is
realized here. The dispatcher computes the banner items only when
`isDashboard && courseSpec.landing?.show_announcements`.

### 4. `virtual:sophie/announcements` — the realized fourth `T | null` module

The registry is exposed as `virtual:sophie/announcements` exporting
`AnnouncementRegistry | null`, via the **always-register** pattern: the
loader
([`announcements-loader.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/lib/announcements-loader.ts))
returns `null` when the file is absent (and throws on a present-but-
invalid file, naming the path + formatted Zod issues); the virtual-module
factory
([`announcements-virtual-module.ts`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/lib/announcements-virtual-module.ts))
registers the module unconditionally, exporting the literal `null` when
absent so importers never fail to resolve. This is the **realized fourth
instance** of the `T | null` always-register pattern (course-spec first,
assignments second, schedule third; figures predates them in the
always-register lineage but is non-nullable) — the slot ADR 0097
decision 7 and the AGENTS.md R12 prose both predicted, and the **R12
family**.

**Null-safe route exception (R12 nuance).** The dashboard dispatcher
([`course-landing.astro`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/routes/course-landing.astro))
reads `announcements` but does **not** narrow it with an
`if (!announcements) throw`. It passes the registry **whole** into the
null-guarding `activeAnnouncements` projection, which returns `[]` on a
`null` input — so the banner degrades to nothing (ADR 0097 decision 7)
with no property access at the route boundary. This is a **documented
exception** to R12's narrow-with-throw rule, not a regression, and the
**same homework-precedent pattern** ADR 0098 decision 3 established for
`schedule` + `assignments`: R12's throw exists to narrow before *direct
property access*, which never happens here. `virtual:sophie/course-spec`
stays the only narrowed-with-throw module; `announcements` is **not**
added to the throw grep-gate. See the AGENTS.md R12 scope clarification.

### 5. Banner: stacked, severity-sorted, non-dismissible chrome

[`AnnouncementBanner.astro`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components/course-home/AnnouncementBanner.astro)
renders **all active announcements, stacked**, in the order
`activeAnnouncements` produces — **sorted by severity** (urgent →
notice → info) then `publish_date` **descending** (newest first within a
severity). It is mounted at the top of the dashboard `<main>` in
[`CourseHomeShell.astro`](https://github.com/drannarosen/sophie/blob/main/packages/astro/src/components/course-home/CourseHomeShell.astro).

- **Non-dismissible.** Pure build-time chrome with **no client JS** —
  dismissal would need per-student state Sophie has no backend for (ADR
  0001), and the publish/expire window already bounds how long a notice
  nags. This fits the **no-accounts LDS model** (ADR 0097 Context). The
  banner is static markup; the order received is rendered as-is.
- **Severity → scoped `--sophie-home-*` palette.** `info` → teal,
  `notice` → violet, `urgent` → rose (the Deep Field palette set by
  `CourseHomeShell`), via a per-item `data-severity` accent custom
  property.
- **Non-color severity label (WCAG 1.4.1).** Each item carries a
  capitalized severity **word** ("Urgent" / "Notice" / "Info") as a text
  pill — color is supplementary, never the sole signal.
- **Named landmark under `<main>` (R10).** The banner is a
  `<section aria-labelledby>` (a visually-hidden "Course announcements"
  heading names the region) — never a nested `<main>` collision, never a
  nameless `<section>`. An empty array renders **nothing** (no labelled
  region, no empty chrome — fail-closed, ADR 0097 decision 7).
- **Home banner only, this arc.** The banner mounts on the course home.
  A **site-wide banner slot** is deferred (decision below) — the seam is
  not foreclosed.

### 6. Chrome, not pedagogy (ADR 0058)

The banner is a **course-info chrome projection** (the ADR 0058
boundary): it lives in `@sophie/astro`, is documentary, and **never
enters the pedagogy-index / Library**. R11 (axe-render) and R13
(epistemic-role) scope to `@sophie/components`, so no allowlist entries
are needed. R14 (no raw `dangerouslySetInnerHTML`) **applies and is
honored**: every field (`title`, `body`, `href`) is interpolated as
**plain text** through Astro's auto-escaping JSX — there is no raw HTML
injection site. (The author `href` is rendered raw as a URL, not via
`withBase`, because `withBase` would corrupt an external `https://…`
link — but it is an attribute value, not injected HTML.)

## Consequences

- **Positive.** The dashboard's last fail-closed seam (ADR 0097 decision
  7) goes live; a course can publish time-boxed notices declaratively,
  and they expire on their own via the daily rebuild cron — no manual
  cleanup, no stale banner.
- **Fail-closed throughout.** Absent registry → null → `[]` → no banner.
  `show_announcements` off → no banner. Out-of-window notice → dropped.
  Empty active set → no labelled region. No branch renders ambiguous or
  empty banner chrome.
- **No new course-spec field.** `landing.show_announcements` was already
  in the landing schema (ADR 0080); this ADR realizes its consumer. The
  only new schema is the standalone `AnnouncementRegistrySchema`.
- **Completes the always-register quartet.** `announcements` is the
  fourth `T | null` always-register virtual module, closing the slot the
  R12 prose predicted; the throw grep-gate stays course-spec-specific
  (null-safe exception, decision 4).
- **astr201 adoption deferred.** Authoring `announcements.sophie.yaml` +
  flipping `landing.show_announcements` on lands after this PR merges
  (the design doc's Deferred list).

## Deferred (not this arc)

Both are future/additive — the seam is **not foreclosed**:

- **Site-wide banner slot.** This arc mounts the banner on the course
  home only. Surfacing announcements on reading/section pages is a future
  layout decision; nothing in the schema or projection prevents it.
- **Banner dismissal.** Non-dismissible is correct for the current
  no-accounts model (decision 5). If Sophie ever gains per-student
  client-side state (e.g. `localStorage`-scoped, still no backend),
  dismissal becomes an additive enhancement — the build-time gate and
  the schema are unaffected.

## Alternatives rejected

- **A `due` / deadline announcement kind.** Deadlines live in the
  assignments registry (ADR 0096) and surface via the schedule's This-
  Week card (ADR 0098); an announcement is a free-text notice, not a
  dated assignment. Rejected — would fork two source-of-truths.
- **Free-slug `severity` (matching assignment `kind`).** These three
  severities are platform-universal and map to a fixed palette; a closed
  enum gives typo protection with no per-course PR cost. Rejected — the
  free-slug rationale (ADR 0096 Am1) applies to course-pedagogy
  vocabulary, not banner severities.
- **Client-side dismissal now.** Needs per-student state Sophie has no
  backend for (ADR 0001); the publish/expire window already bounds
  nagging. Rejected for the no-accounts LDS model — deferred as additive.
- **Narrow-with-throw at the dispatcher (strict R12).** Would force the
  whole dashboard to render-nothing when the registry is absent, rather
  than just the banner. Rejected: the null-safe-projection exception
  (decision 4) degrades the banner independently, the ADR 0097 decision 7
  contract and the ADR 0098 homework-precedent pattern.

## References

- [ADR 0001 — Repo shape: standalone platform, separate consumer repos](./0001-platform-not-monorepo.md)
  — the no-server/no-auth model that makes the banner build-time chrome.
- [ADR 0003 — Zod as schema source of truth](./0003-zod-as-source-of-truth.md)
  — the `AnnouncementRegistrySchema` contract.
- [ADR 0058 — Epistemic component contract](./0058-epistemic-component-contract.md)
  — the chrome-vs-pedagogy boundary the banner sits on.
- [ADR 0080 — Course-spec format v0.1](./0080-course-spec-format-v0-1.md)
  — the `landing.show_announcements` toggle this ADR realizes.
- [ADR 0093 — Build-time HTML trust primitive](./0093-build-time-html-trust-primitive.md)
  — R14; the banner needs no raw injection (plain-text interpolation).
- [ADR 0096 — Deploy-time gated content + assignments registry](./0096-deploy-time-gated-content.md)
  — the daily rebuild cron the publish/expire gate reuses; the free-slug `kind` contrast.
- [ADR 0097 — Course-home dashboard layout](./0097-course-home-dashboard.md)
  — decision 7 left the announcement banner seam open; this ADR fills it.
- [ADR 0098 — Schedule schema](./0098-schedule-schema.md)
  — the sibling fast-follow that filled the two calendar seams; the homework-precedent R12 null-safe pattern.
- `docs/plans/2026-05-31-schedule-announcements-design.md` — design source (§④).
- `docs/plans/2026-05-31-schedule-announcements-implementation.md` — implementation plan (PR 3).
