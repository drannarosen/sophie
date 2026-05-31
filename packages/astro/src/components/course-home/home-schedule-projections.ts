import type {
  AssignmentRegistry,
  Schedule,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";

/**
 * Pure calendar projections from the schedule (ADR 0098) + assignments
 * registry (ADR 0096) to the shapes the course-home dashboard renders
 * (ADR 0097 #4/#7): per-section week-ranges + Now/past row state, and the
 * rolling "This Week" card. A sibling `.ts` to `home-projections.ts` /
 * `home-card-projections.ts` per ADR 0061's focused-files rule — the
 * calendar-derivation cluster is its own cohesive seam (week/date math),
 * distinct from the band/nav and card-data derivations.
 *
 * Every function is pure with INJECTED inputs — `now` and `termStart` are
 * passed in, there is NO `new Date()` reading the wall-clock and NO virtual
 * module import. The dispatcher (Task 8) owns the impure edges: it reads
 * `virtual:sophie/schedule` + `virtual:sophie/assignments` + the single
 * build wall-clock and feeds the props down.
 *
 * DATE COMPARISON: ISO `YYYY-MM-DD` strings sort lexicographically ==
 * chronologically, so every date filter/compare uses STRING comparison
 * against a `YYYY-MM-DD` slice of `now` — no `Date` parsing, no timezone
 * drift (the same idiom `dueSoon`/`resolveRevealDate` use). The two
 * exceptions are the week math (`mondayOf`, which needs UTC day-of-week)
 * and the `now + 7 days` window edge — both done in UTC milliseconds.
 */

const MS_PER_DAY = 86_400_000;
const WEEK_DAYS = 7;

/**
 * Epoch-ms of the UTC Monday of the calendar week containing `iso`
 * (a `YYYY-MM-DD` date). `(getUTCDay() + 6) % 7` remaps Sun=0…Sat=6 to
 * Mon=0…Sun=6 so we subtract whole days back to that week's Monday.
 */
function mondayOf(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return d.getTime() - dow * MS_PER_DAY;
}

/**
 * 1-based term week of `iso` relative to `termStart` (a `YYYY-MM-DD`
 * anchor). Week 1 = the Monday-aligned calendar week containing
 * `termStart`; the calendar week before it is Week 0, two before is −1,
 * and so on. Caller passes a concrete `termStart` (never `"tbd"` — the
 * `"tbd"` case omits week labels entirely upstream).
 */
export function weekOf(iso: string, termStart: string): number {
  const diff = mondayOf(iso) - mondayOf(termStart);
  return Math.floor(diff / (WEEK_DAYS * MS_PER_DAY)) + 1;
}

/** A module-list row's calendar status, keyed by section slug. */
export interface ScheduleRow {
  /** Section slug — the link target + stable key (matches `ModuleRow.slug`). */
  readonly slug: string;
  /** 1-based term week of the section's first dated entry. */
  readonly weekStart?: number;
  /** 1-based term week of the section's last dated entry. */
  readonly weekEnd?: number;
  /** `true` when today falls within the section's [min, max] date span. */
  readonly isNow: boolean;
  /** `true` when the section's last dated entry is before today. */
  readonly isPast: boolean;
}

/**
 * Per-section calendar status from the schedule. A section's date span =
 * min..max `date` among schedule entries whose `unit` resolves (via the
 * `unitId → section_id` map built from `units`) to a unit in that section.
 *
 * FAIL-CLOSED unit resolution (ADR 0098): an entry whose `unit` is absent
 * or names no known unit contributes NOTHING to any span — it cannot
 * silently land in the wrong section's range. A section with no resolvable
 * entries gets NO row (omitted): the renderer degrades to its
 * lecture-count-only state when no row exists for a slug (Task 9), so an
 * empty row would only add ambiguous false `isNow`/`isPast` flags.
 *
 * `weekStart`/`weekEnd` derive from `weekOf(minDate)` / `weekOf(maxDate)`
 * but are OMITTED when `term_start` is `"tbd"` — week numbers can't be
 * computed without a Monday anchor. `isNow`/`isPast` still derive from the
 * date span regardless of `term_start`. `now` is INJECTED.
 */
export function scheduleRows(
  schedule: Schedule | null,
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>,
  now: Date
): ScheduleRow[] {
  if (!schedule) return [];

  const today = now.toISOString().slice(0, 10);
  const sectionOf = new Map(units.map((u) => [u.id, u.section_id]));

  // Accumulate min/max date per section from the resolvable entries.
  const spans = new Map<string, { min: string; max: string }>();
  for (const e of schedule.entries) {
    if (e.unit === undefined) continue; // fail-closed: no unit ref
    const sectionId = sectionOf.get(e.unit);
    if (sectionId === undefined) continue; // fail-closed: unresolvable unit
    const span = spans.get(sectionId);
    if (!span) {
      spans.set(sectionId, { min: e.date, max: e.date });
    } else {
      if (e.date < span.min) span.min = e.date;
      if (e.date > span.max) span.max = e.date;
    }
  }

  const hasTerm = schedule.term_start !== "tbd";
  const rows: ScheduleRow[] = [];
  for (const section of sections) {
    const span = spans.get(section.slug);
    if (!span) continue; // no resolvable entries → no row
    rows.push({
      slug: section.slug,
      ...(hasTerm
        ? {
            weekStart: weekOf(span.min, schedule.term_start),
            weekEnd: weekOf(span.max, schedule.term_start),
          }
        : {}),
      isNow: today >= span.min && today <= span.max,
      isPast: today > span.max,
    });
  }
  return rows;
}

/** One row in the rolling "This Week" card. */
export interface ThisWeekItem {
  /** Concrete ISO `YYYY-MM-DD` date (always concrete — `tbd` is excluded). */
  readonly date: string;
  /** Display label: the schedule event title, or the assignment title. */
  readonly label: string;
  /** The schedule `kind` (`lecture`/`activity`/…), or `"due"` for deadlines. */
  readonly kind: string;
}

/**
 * The rolling next-7-days "This Week" card (ADR 0097 #4 / ADR 0098): every
 * schedule entry whose `date` falls in `[today, today + 7d]` (label = its
 * title, kind = its schedule kind) PLUS every assignment whose concrete
 * `dueDate` falls in that window (label = its title, kind = `"due"`) —
 * deadlines are pulled BY DATE from the assignments registry, never
 * re-authored here (one home, ADR 0096). Sorted ascending by date.
 * `null` schedule AND `null` assignments → `[]` (the card is dropped,
 * fail-closed ADR 0097 #7). `now` is INJECTED.
 */
export function thisWeek(
  schedule: Schedule | null,
  assignments: AssignmentRegistry | null,
  now: Date
): ThisWeekItem[] {
  const today = now.toISOString().slice(0, 10);
  // The one place Date arithmetic is needed: the +7-day window edge. Done
  // on the injected `now`, then sliced back to a `YYYY-MM-DD` string so the
  // bound compares stay string-lexicographic like everything else.
  const horizon = new Date(now.getTime() + WEEK_DAYS * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
  const inWindow = (date: string): boolean => date >= today && date <= horizon;

  const items: ThisWeekItem[] = [];
  for (const e of schedule?.entries ?? []) {
    if (inWindow(e.date)) {
      items.push({ date: e.date, label: e.title, kind: e.kind });
    }
  }
  for (const a of assignments?.assignments ?? []) {
    if (a.dueDate !== "tbd" && inWindow(a.dueDate)) {
      items.push({ date: a.dueDate, label: a.title, kind: "due" });
    }
  }

  return items.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
}
