# Assignments + Schedule + Announcements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to
> implement this plan task-by-task (fresh subagent per task + code review between).

**Goal:** Fill the course-home dashboard's three fail-closed seams (This-Week card,
module week-ranges + Now marker, announcement banner) by (a) generalizing the
homework registry into a course-agnostic assignments registry, (b) adding a
ScheduleSchema class-calendar, and (c) adding build-time-gated Announcements.

**Architecture:** Mirror the homework triad exactly — Zod schema in `@sophie/core`,
loader + always-register `T | null` virtual module in `@sophie/astro`, pure
injected-`now` route projections feeding presentational `.astro` chrome. Deadlines
have one home (the assignments registry); the schedule pulls them by date.

**Tech Stack:** TypeScript, Zod, Astro 6, Vite virtual modules, Vitest + axe-core,
pnpm/Turborepo, Biome.

**Design:** [`2026-05-31-schedule-announcements-design.md`](2026-05-31-schedule-announcements-design.md).

---

## Conventions for every task

- **TDD**: write the failing test → run it (confirm RED) → minimal code → run
  (GREEN) → refactor → commit. One behavior per test.
- **Imports**: `@sophie/core` relative imports use `.js`; `@sophie/astro` uses `.ts`
  — BUT any **route-reachable value import must be extensionless** (`../lib/x`, not
  `../lib/x.ts`) — a real PR-1 packaging bug. `import type` may keep the extension.
- **Per-task gates** (must pass before commit): `pnpm exec biome check` (zero errors
  AND warnings — grep the full output), `pnpm turbo run typecheck`, the package's
  `vitest run --coverage` (clears ratchet floors). axe-core on every component.
- **Coverage ratchets**: `@sophie/core` 96/91/91/96 (s/b/f/l), `@sophie/astro`
  90/80/94/92. Raise floors up if measured coverage rises; never lower.
- **Commit** after each green task: `feat(...)` / `refactor(...)` conventional msg,
  ending with the Co-Authored-By trailer.

---

## Task 1 — Assignments registry: rename + generalize (atomic sweep)

This is a **hard rename with no back-compat shim** (project principle), so it must
touch every reference in one coherent change to keep the build green. It is larger
than the additive tasks that follow; the code review focuses on (a) sweep
completeness and (b) the generalization correctness.

**Files — core:**
- Rename `packages/core/src/schema/homework.ts` → `assignments.ts`
- Rename `packages/core/src/schema/homework.test.ts` → `assignments.test.ts`
- Rename `packages/core/src/schema/__fixtures__/homework-valid.yaml` →
  `assignments-valid.yaml`; `__fixtures__/invalid/homework-duplicate-claim.yaml` →
  `invalid/assignments-duplicate-claim.yaml`
- Modify `packages/core/src/schema/index.ts` (barrel exports)

**Files — astro (call sites that reference the type / virtual module / loader):**
- Rename `packages/astro/src/lib/homework-loader.ts` → `assignments-loader.ts`
  (+ its `.test.ts`)
- Rename `packages/astro/src/lib/homework-virtual-module.ts` →
  `assignments-virtual-module.ts` (+ its `.test.ts`)
- Modify `packages/astro/src/lib/resolve-solution-reveal.ts` (+ `.test.ts`)
- Modify `packages/astro/src/lib/build-solution-paths.ts` (+ `.test.ts`)
- Modify `packages/astro/src/virtual-modules.d.ts`
- Modify `packages/astro/src/integration.ts`
- Modify `packages/astro/src/routes/solutions.astro`
- Modify `packages/astro/src/routes/course-landing.astro` (import only)
- Modify `packages/astro/src/components/course-home/home-card-projections.ts`
  (+ `.test.ts`, + `home-pieces.axe.test.ts` DUE_SOON wording stays valid)

**Generalized schema** (`assignments.ts`) — the substance, not just a rename:

```ts
import { z } from "zod";
import { DateOrTbd, NonEmptyString, Slug } from "./primitives.js";

const ProblemGroupSchema = z
  .object({ unit: Slug, ids: z.array(NonEmptyString).min(1) })
  .strict();

const AssignmentSchema = z
  .object({
    id: Slug,
    title: NonEmptyString,
    kind: Slug, // free, consumer-owned vocabulary (no closed enum); humanized for display
    assignedDate: DateOrTbd,
    dueDate: DateOrTbd,
    problems: z.array(ProblemGroupSchema).min(1).optional(), // presence drives the ADR 0096 reveal
  })
  .strict()
  .refine(
    (a) =>
      a.assignedDate === "tbd" ||
      a.dueDate === "tbd" ||
      new Date(a.assignedDate) <= new Date(a.dueDate),
    { message: "assignedDate must be on or before dueDate", path: ["assignedDate"] }
  );

export const AssignmentRegistrySchema = z
  .object({ assignments: z.array(AssignmentSchema) })
  .strict()
  .refine(
    (reg) => {
      const seen = new Set<string>();
      for (const a of reg.assignments)
        for (const g of a.problems ?? []) // optional-aware
          for (const id of g.ids) {
            const key = `${g.unit}/${id}`;
            if (seen.has(key)) return false;
            seen.add(key);
          }
      return true;
    },
    { message: "each problem may be claimed by at most one assignment", path: ["assignments"] }
  );

export type AssignmentRegistry = z.infer<typeof AssignmentRegistrySchema>;
export type Assignment = z.infer<typeof AssignmentSchema>;
```

**Reveal generalization** (`resolve-solution-reveal.ts`): change the type to
`AssignmentRegistry | null`, iterate `registry.assignments`, and make the
problems-filter optional-aware:

```ts
const due = registry.assignments
  .filter((a) => a.problems?.some((g) => g.unit === unit)) // optional-aware
  .map((a) => a.dueDate)
  .filter((d): d is string => d !== "tbd");
```

`build-solution-paths.ts`: type `registry: AssignmentRegistry | null` (no logic
change — it delegates to the resolver). `solutions.astro` +
`course-landing.astro`: `import { assignments } from "virtual:sophie/assignments"`,
pass `assignments` where `homework` was passed (still null-safe, no R12 throw —
keep + update the documented exception comment).

**Loader/virtual-module rename**: mechanical — `loadAssignments`,
`assignmentsVirtualModule`, `ASSIGNMENTS_VIRTUAL_ID =
"virtual:sophie/assignments"`, reads `assignments.sophie.yaml`. Update the R8 HMR
header comment + the ADR-0096 "3rd instance" wording. `virtual-modules.d.ts`:
rename the `declare module "virtual:sophie/assignments"` block, export
`assignments: AssignmentRegistry | null`.

**TDD steps:**
1. Write/rename `assignments.test.ts` with the generalization cases (RED first for
   the NEW behavior): free-slug `kind` accepted; a non-slug `kind` (`"Home Work"`)
   rejected; an entry with **no** `problems` is valid; duplicate problem-claim across
   two assignments rejected; `assignedDate > dueDate` rejected. Keep the renamed
   existing cases.
2. Run `pnpm --filter @sophie/core test -- assignments` → confirm new cases FAIL.
3. Write `assignments.ts` (above) + update the barrel; rename fixtures.
4. Run core tests → GREEN.
5. Add `resolve-solution-reveal.test.ts` case: an assignment **without** `problems`
   never gates (returns hidden); an assignment **with** `problems` touching the unit
   gates on its dueDate. RED → generalize the resolver → GREEN.
6. Sweep the remaining astro call sites (loader/v-mod rename, build-solution-paths
   type, solutions.astro, course-landing import, integration import + the
   `homeworkVirtualModule(...)`/`loadHomework(...)` lines + their comments,
   home-card-projections type). Rename `*.test.ts` files in step.
7. `pnpm turbo run typecheck` + `pnpm --filter @sophie/astro test` → GREEN.
8. Verify the rename swept clean: `grep -rln -iE 'homework|HomeworkRegistry|virtual:sophie/homework' packages/{core,astro}/src` returns **only** the
   `@sophie/components` Due/Points/GradingTable example-content hits (confirm those
   are MDX example strings, not the registry — leave them).
9. `pnpm exec biome check` clean. Commit.

---

## Task 2 — Schedule schema (`@sophie/core`, new)

**Files:** Create `packages/core/src/schema/schedule.ts` + `schedule.test.ts` +
`__fixtures__/schedule-valid.yaml` + `__fixtures__/invalid/schedule-bad-kind.yaml`.
Modify `schema/index.ts` (barrel).

**Schema:**

```ts
import { z } from "zod";
import { DateOrTbd, NonEmptyString, Slug } from "./primitives.js";

export const ScheduleKind = z.enum(["lecture", "activity", "exam", "holiday", "break"]);

const ScheduleEntrySchema = z
  .object({
    date: z.iso.date(), // concrete ISO date — an undated entry is meaningless (no tbd here)
    kind: ScheduleKind,
    title: NonEmptyString,
    unit: Slug.optional(), // shape-only; route resolution is fail-closed
  })
  .strict();

export const ScheduleSchema = z
  .object({
    term_start: DateOrTbd, // Week-1 Monday; "tbd" → week-number labels omitted downstream
    entries: z.array(ScheduleEntrySchema),
  })
  .strict();

export type Schedule = z.infer<typeof ScheduleSchema>;
export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;
```

**TDD:** RED tests — valid schedule parses; an entry with `kind: "due"` rejected
(not in the enum); an entry with `date: "tbd"` rejected; `term_start: "tbd"`
accepted; an entry with a non-slug `unit` rejected. → write schema + barrel → GREEN
→ biome → commit.

---

## Task 3 — `assignment_kinds` course-spec field (ADR 0080 Am3, `@sophie/core`)

**Files:** Modify `packages/core/src/schema/course-spec.ts` (add the optional
field to the top-level object) + `course-spec.test.ts`. Add `assignment_kinds` to
the canonical fixture `__fixtures__/course-spec-astr-201.yaml` (a small block, e.g.
`{ homework: "Homework", project: "Project" }`).

**Field:**

```ts
// Optional consumer-declared assignment-kind vocabulary (ADR 0080 Am3): slug → label.
// Present → custom labels + integration rejects undeclared kinds; absent → free
// slugs with humanized fallback. @sophie/core validates shape only; the cross-file
// membership check lives in the integration (both files visible there).
assignment_kinds: z.record(Slug, NonEmptyString).optional(),
```

**TDD:** RED — spec with a valid `assignment_kinds` map parses; absent map parses;
a map with a non-slug key rejected. → add field → GREEN → biome → commit.

---

## Task 4 — Schedule loader + virtual module (`@sophie/astro`, new)

**Files:** Create `packages/astro/src/lib/schedule-loader.ts` (+ `.test.ts`) and
`packages/astro/src/lib/schedule-virtual-module.ts` (+ `.test.ts`). Modify
`packages/astro/src/virtual-modules.d.ts` (add the `virtual:sophie/schedule` block,
export `schedule: Schedule | null`).

**Mirror** `assignments-loader.ts` / `assignments-virtual-module.ts` exactly,
substituting `Schedule`/`schedule.sophie.yaml`/`virtual:sophie/schedule`/
`scheduleVirtualModule`/`loadSchedule`. Keep the R8 no-HMR header comment (cite ADR
0098). Loader: file-absent → `null`, malformed/invalid → throw with the path +
formatted Zod issues. Virtual module: `JSON.stringify`, always-register, exports
`null` when absent.

**TDD:** loader — absent file → `null`; valid yaml → parsed object; invalid → throws
naming the path. v-module — `resolveId`/`load` emit `export const schedule = …`;
`null` payload emits `export const schedule = null`. → mirror → GREEN → biome →
commit.

---

## Task 5 — Schedule projections (`@sophie/astro`, new pure module)

**Files:** Create `packages/astro/src/components/course-home/home-schedule-projections.ts`
(+ `.test.ts`). **Bump** `packages/astro/src/build/discover-astro-entries.test.ts`:
add `components/course-home/home-schedule-projections` to `EXPECTED_DISCOVERED` and
bump the `toHaveLength(29)` count to 30 (this `.ts` is value-imported by
`ModuleList.astro` + `OrientationCards.astro`). *(If any other new `.astro`-imported
`.ts` lands, bump again.)*

**Pure functions** (all `now`/`termStart` injected — no `new Date()` inside):

```ts
import type { AssignmentRegistry, Schedule, SectionEntry, UnitEntry } from "@sophie/core/schema";

const MS_PER_DAY = 86_400_000;
const WEEK_DAYS = 7;

/** Monday (UTC) of the calendar week containing `iso` (YYYY-MM-DD). */
function mondayOf(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return d.getTime() - dow * MS_PER_DAY;
}

/** 1-based term week of `iso` relative to `termStart` (a YYYY-MM-DD Monday anchor). */
export function weekOf(iso: string, termStart: string): number {
  const diff = mondayOf(iso) - mondayOf(termStart);
  return Math.floor(diff / (WEEK_DAYS * MS_PER_DAY)) + 1;
}

export interface ScheduleRow {
  readonly slug: string;
  readonly weekStart?: number; // omitted when term_start is "tbd" or no dated entries
  readonly weekEnd?: number;
  readonly isNow: boolean;     // today within the section's date span
  readonly isPast: boolean;    // section's last dated entry is before today
}

/**
 * Per-section calendar status from the schedule. A section's span = min..max
 * date among entries whose `unit` resolves to a unit in that section (fail-closed:
 * unresolvable units contribute nothing). Week labels derive from `term_start`
 * unless it is "tbd". `now` injected.
 */
export function scheduleRows(
  schedule: Schedule | null,
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>,
  now: Date,
): ScheduleRow[] { /* … see test for exact contract … */ }

export interface ThisWeekItem {
  readonly date: string;
  readonly label: string;     // title (class event) or assignment title
  readonly kind: string;      // schedule kind, or "due"
}

/**
 * Rolling next-7-days window [todayISO, +7d]: schedule class events in range +
 * assignment dueDates in range (pulled by date from the registry). Sorted by date.
 * Empty → []. `now` injected.
 */
export function thisWeek(
  schedule: Schedule | null,
  assignments: AssignmentRegistry | null,
  now: Date,
): ThisWeekItem[] { /* … */ }
```

**TDD (drive the contract with tests first):**
- `weekOf`: `weekOf("2027-01-20","2027-01-19")` = 1; `weekOf("2027-01-27",…)` = 2;
  a date in the same Mon–Sun week as term_start = 1.
- `scheduleRows`: section with lecture entries in weeks 1–3 → `weekStart:1,
  weekEnd:3`; `term_start:"tbd"` → week fields omitted, `isNow`/`isPast` still
  derive from dates; a `now` inside the span → `isNow:true`; `now` after the last
  entry → `isPast:true`; an entry whose `unit` resolves to no section → ignored
  (fail-closed).
- `thisWeek`: an event 2 days out + an assignment due 4 days out → both returned,
  date-sorted; an event 10 days out → excluded; `null` schedule → `[]`.

→ implement → GREEN → bump discover-entries count → typecheck → biome → commit.

---

## Task 6 — Due-Soon: surface the assignment `kind` label

**Files:** Modify `home-card-projections.ts` (+ `.test.ts`) and the Due-Soon render
in `OrientationCards.astro` (+ `home-pieces.axe.test.ts`).

Add `kind` + `kindLabel` to `DueSoonItem`. `kindLabel` = the `assignment_kinds`
custom label when provided, else `humanizeSlug(kind)`. Thread an optional
`kindLabels?: Record<string,string>` param into `dueSoon(...)` (default `{}`). Reuse
the existing `humanizeSlug` from `home-projections.ts` (export it, or copy the
3-line helper — prefer export to stay DRY). Render the label as a small badge on the
due row; keep axe-clean.

**TDD:** RED — a due item with `kind:"growth-memo"` and no labels → `kindLabel:
"Growth Memo"`; with `kindLabels:{ "growth-memo":"Growth Memo (P/F)" }` →
that label. Render test asserts the badge text + axe-clean. → implement → GREEN →
commit.

---

## Task 7 — Integration wiring: schedule + assignment_kinds cross-refine

**Files:** Modify `packages/astro/src/integration.ts` (+ its test). Note: the
`homework`→`assignments` load/register lines were already renamed in Task 1; this
task adds the **schedule** load+register and the **cross-refine**.

- After `const assignments = loadAssignments(consumerRoot);` add `const schedule =
  loadSchedule(consumerRoot);` and push `scheduleVirtualModule(schedule) as never`
  into `vite.plugins` (with an ADR-0098 comment mirroring the assignments block).
- **Cross-refine** (ADR 0080 Am3): when `courseSpec?.assignment_kinds` is present and
  `assignments` is non-null, every `assignments.assignments[].kind` must be a key of
  the map; otherwise throw a curated config-setup error naming the offending `kind`
  + that it isn't in the declared `assignment_kinds`. Extract this into a small pure
  helper `assertAssignmentKindsDeclared(assignments, declared)` in a sibling
  `lib/assert-assignment-kinds.ts` (unit-testable without the integration);
  call it in `astro:config:setup`.

**TDD:** unit-test `assertAssignmentKindsDeclared` — undeclared kind throws naming
it; all-declared passes; absent map (undefined) is a no-op; null registry is a
no-op. Integration test: schedule virtual module registered. → implement → GREEN →
commit.

---

## Task 8 — `course-landing.astro`: schedule rows + This-Week wiring

**Files:** Modify `packages/astro/src/routes/course-landing.astro`.

- `import { schedule } from "virtual:sophie/schedule";` and (already, from Task 1)
  `import { assignments } from "virtual:sophie/assignments";` — both **null-safe, no
  R12 throw** (document the exception alongside the existing one).
- Using the single build `now` (already declared), compute `scheduleRows(schedule,
  sections, units, now)` and `thisWeek(schedule, assignments, now)` (dashboard branch
  only); pass `scheduleRows` → `<ModuleList>` and `thisWeek` → `<OrientationCards>`
  (thread through `<CourseHomeShell>` props).
- The Due-Soon projection now also takes the `assignment_kinds` labels:
  `dueSoon(assignments, now, courseSpec.assignment_kinds ?? {})`.

**Verification:** typecheck + the existing course-landing/integration tests green.
(Astro route files aren't unit-tested directly; the component tests in Tasks 9–10
cover the consumed shapes.) Commit.

---

## Task 9 — `ModuleList.astro`: week-range + Now/past row state

**Files:** Modify `packages/astro/src/components/course-home/ModuleList.astro`
(accept an optional `scheduleRows?: ReadonlyArray<ScheduleRow>` prop, keyed by
slug) and `home-pieces.axe.test.ts`.

Render into the existing `.sophie-home-mod__right` cell: a "Now" tag when
`row.isNow`, a `Weeks N–M` label when `weekStart`/`weekEnd` present, alongside the
existing lecture count. Add `is-now`/`is-past` row classes. When no schedule row
exists for a slug (graceful degradation), render exactly today's behavior (lecture
count only). R10: the section stays `aria-labelledby`; the "Now" tag is a
`<span>` with a visible label (not color-only).

**TDD:** axe test — rows with a `scheduleRows` map render `Weeks 1–3` + a `Now` tag
on the current section, axe-clean; absent `scheduleRows` → unchanged
lecture-count-only render, axe-clean. → implement → GREEN → commit.

---

## Task 10 — `OrientationCards.astro`: realize the This-Week card

**Files:** Modify `packages/astro/src/components/course-home/OrientationCards.astro`
+ `home-pieces.axe.test.ts`.

Replace `const hasThisWeek = false;` with `hasThisWeek = thisWeek.length > 0`
(new optional `thisWeek?: ReadonlyArray<ThisWeekItem>` prop, default `[]`). Render
the `this-week` card's default slot content from `thisWeek` (date + label + a
kind/"due" marker), keeping the existing slot override + graceful-degrade-drop when
empty. Keep the `data-card-count` math correct (it already counts `hasThisWeek`).

**TDD:** axe test — `thisWeek` with 2 items → the This-Week card renders both,
`data-card-count` reflects +1, axe-clean (both the populated and the empty→dropped
states). → implement → GREEN → commit.

---

## Task 11 — Smoke fixtures + security spec + real-build verify

**Files:** Create `examples/smoke/assignments.sophie.yaml` +
`examples/smoke/schedule.sophie.yaml`. Update
`examples/smoke/e2e/gated-solutions-security.spec.ts` +
`examples/{smoke,packed-smoke}/course.sophie.yaml` for any `homework`→`assignments`
wording. Author fixtures that exercise: an assignment **with** `problems` (gates a
unit), one **without** (a project), a schedule with `term_start` + lecture/activity/
exam/break entries with units spanning the smoke sections, and (optionally)
`assignment_kinds` in the smoke `course.sophie.yaml`.

**Verify on a real build (W4):**
- `pnpm --filter @sophie/smoke build` (or the smoke package's filter) → green.
- Serve the dist (matching base — **base-path trap**: a subpath dist served at root
  404s all CSS/JS → looks unstyled) and confirm the This-Week card, module
  week-ranges + Now marker, and Due-Soon kind badges actually render. Scroll (the
  `position:fixed` background paints one viewport).
- Re-run `gated-solutions-security.spec.ts` → still proves a future-dated chapter's
  `dist/` has zero solution text (the ADR 0096 gate survives the rename).

Commit fixtures + spec updates.

---

## Task 12 — ADRs + docs + validation + AGENTS.md

**Files:**
- `docs/website/decisions/0096-deploy-time-gated-content.md` — add `## Amendment 1`
  (homework→assignments rename + generalization; `problems` optional; reveal keys
  off presence) + update the `validation:` block.
- `docs/website/decisions/0080-course-spec-format-v0-1.md` — add `## Amendment 3`
  (optional `assignment_kinds` field + integration cross-refine).
- Create `docs/website/decisions/0098-schedule-schema.md` (full ADR + `validation:`
  block, numbered-decision style like 0097).
- `docs/website/myst.yml` — add the `decisions/0098-schedule-schema.md` entry
  (0099 lands in PR 3).
- Regenerate `docs/website/status/validation.md`: `pnpm tsx
  scripts/regenerate-validation-index.mts` (build `@sophie/core` first if needed).
- `AGENTS.md` — update the **R12 grep gate** to list the now-three nullable modules
  in scope (`course-spec` narrowed-with-throw; `assignments` + `schedule` null-safe,
  documented exceptions); update the ADR table rows for 0080 + 0096; update the
  "3rd nullable module" framing in the prose + the
  `feedback_always_register_virtual_module.md` memory note (`schedule` is now the
  realized 3rd).
- Sweep `docs/website/reference/*` for "homework registry" mentions → "assignments
  registry".

**Verify:** `npx mystmd build --html` then `grep -c "⚠"` = 0. The
`validation.md`-regen integration test (I3) passes. Commit.

---

## PR 2 finish

After Task 12 green: `superpowers:finishing-a-development-branch` → push →
open the PR (ADRs 0096-Am1, 0080-Am3, 0098). Arm `gh pr merge --auto --squash`
**only after** the review passes (Anna's merge model). **Confirm with Anna before
pushing / opening / arming auto-merge.**

---

## PR 3 — Announcements (separate worktree, after PR 2 merges)

Branch from updated `main` in `.worktrees/feat-announcements/`. Mirrors the same
shape; tasks:

1. **Schema** (`@sophie/core/src/schema/announcements.ts`): `{ announcements:
   [{ id: Slug, title: NonEmptyString, body?: NonEmptyString, severity:
   z.enum(["info","notice","urgent"]), publish_date: z.iso.date(), expire_date:
   z.iso.date().optional(), href?: NonEmptyString }] }`, refine `publish_date ≤
   expire_date`. Barrel + fixtures + tests.
2. **Loader + virtual module** (`announcements-loader.ts` /
   `announcements-virtual-module.ts`, `virtual:sophie/announcements`) — mirror.
   `virtual-modules.d.ts` declaration.
3. **Active projection** (pure, injected `now`): filter `publish ≤ today ≤ (expire
   ?? ∞)` (string-ISO compare), sort by severity (urgent>notice>info) then
   `publish_date` desc. Tests.
4. **`AnnouncementBanner.astro`** — stacked banners; severity → `--sophie-home-*`
   palette; non-dismissible; `<section aria-labelledby>` (R10, nested under
   `<main>`). axe test (active + empty states).
5. **Integration + shell wiring** — load + register the v-module; mount the banner
   at the top of `<main>` in `CourseHomeShell.astro`, gated by
   `landing.show_announcements && active.length > 0`; null-safe route read.
6. **Smoke fixture** `examples/smoke/announcements.sophie.yaml` + real-build verify.
7. **ADR 0099** + `myst.yml` + `validation.md` regen + confirm AGENTS.md R12 lists
   `announcements`. MyST `grep -c "⚠"` = 0.

Finish → PR (ADR 0099) → auto-merge after review (confirm with Anna).
