import type {
  AssignmentRegistry,
  Schedule,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { scheduleRows, thisWeek, weekOf } from "./home-schedule-projections.ts";

// ─── Fixtures ────────────────────────────────────────────────────────────
//
// `term_start: "2027-01-18"` is a Monday → Week 1. The week math is
// Monday-aligned (see `weekOf`), so the chosen entry dates land on:
//   2027-01-20 (Wed) → week 1 · 2027-01-27 (Wed) → week 2 · 2027-02-03 (Wed)
//   → week 3. A `now` of 2027-01-27 sits inside [01-20, 02-03]; a `now` of
//   2027-02-15 is past the span.

/** A minimal `SectionEntry` — only the fields the projection reads. */
function section(slug: string, order = 0): SectionEntry {
  return { slug, title: `Section ${slug}`, type: "module", order };
}

/** A minimal non-draft `UnitEntry` — `id` + `section_id` are what matter. */
function unit(id: string, sectionId: string): UnitEntry {
  return {
    id,
    type: "lecture",
    title: `Unit ${id}`,
    section_id: sectionId,
    chapter: `${id}-reading`,
    order: 0,
    prereqs: [],
    status: "stable",
  };
}

/** A schedule entry; `unit` is optional (fail-closed when absent/unresolvable). */
function entry(
  date: string,
  unitId?: string,
  kind: Schedule["entries"][number]["kind"] = "lecture",
  title = `Event ${date}`
): Schedule["entries"][number] {
  return unitId === undefined
    ? { date, kind, title }
    : { date, kind, title, unit: unitId };
}

/** An assignments registry from a flat list of `{ id, dueDate }` pairs. */
function assignmentRegistry(
  ...rows: ReadonlyArray<{ id: string; dueDate: string; title?: string }>
): AssignmentRegistry {
  return {
    assignments: rows.map((r) => ({
      id: r.id,
      title: r.title ?? `Homework ${r.id}`,
      kind: "homework",
      assignedDate: "2027-01-01",
      dueDate: r.dueDate,
      problems: [{ unit: "u1", ids: ["p1"] }],
    })),
  };
}

describe("weekOf", () => {
  test("the day after a Monday term_start is still Week 1", () => {
    // term_start 2027-01-19 (Tue) → its Monday is 2027-01-18; 2027-01-20
    // (Wed) shares that Monday-of-week, so both land in Week 1.
    expect(weekOf("2027-01-20", "2027-01-19")).toBe(1);
  });

  test("the following calendar week is Week 2", () => {
    expect(weekOf("2027-01-27", "2027-01-19")).toBe(2);
  });

  test("a date in the same Mon–Sun week as term_start is Week 1", () => {
    // 2027-01-18 (Mon) … 2027-01-24 (Sun) is term_start's week.
    expect(weekOf("2027-01-24", "2027-01-18")).toBe(1);
  });

  test("a date in the calendar week BEFORE term_start is Week 0", () => {
    // 2027-01-12 (Tue) is one Monday-week before the 2027-01-18 anchor.
    expect(weekOf("2027-01-12", "2027-01-18")).toBe(0);
  });
});

describe("scheduleRows", () => {
  const sections = [section("s1", 0)];
  const units = [unit("u1", "s1"), unit("u2", "s1")];

  test("null schedule → no rows", () => {
    expect(
      scheduleRows(null, sections, units, new Date("2027-01-27T00:00:00Z"))
    ).toEqual([]);
  });

  test("lecture entries spanning weeks 1–3 → weekStart 1, weekEnd 3", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-01-20", "u1"), entry("2027-02-03", "u2")],
    };
    const rows = scheduleRows(
      schedule,
      sections,
      units,
      new Date("2027-01-27T00:00:00Z")
    );
    expect(rows).toEqual([
      { slug: "s1", weekStart: 1, weekEnd: 3, isNow: true, isPast: false },
    ]);
  });

  test('term_start "tbd" → week fields omitted, isNow/isPast still derive from dates', () => {
    const schedule: Schedule = {
      term_start: "tbd",
      entries: [entry("2027-01-20", "u1"), entry("2027-02-03", "u2")],
    };
    const rows = scheduleRows(
      schedule,
      sections,
      units,
      new Date("2027-01-27T00:00:00Z")
    );
    expect(rows).toEqual([{ slug: "s1", isNow: true, isPast: false }]);
    expect(rows[0]).not.toHaveProperty("weekStart");
    expect(rows[0]).not.toHaveProperty("weekEnd");
  });

  test("now after the last entry → isPast true, isNow false", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-01-20", "u1"), entry("2027-02-03", "u2")],
    };
    const rows = scheduleRows(
      schedule,
      sections,
      units,
      new Date("2027-02-15T00:00:00Z")
    );
    expect(rows[0]).toMatchObject({ isNow: false, isPast: true });
  });

  test("an entry whose unit resolves to no unit/section is ignored (fail-closed)", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [
        entry("2027-01-20", "u1"), // resolves → s1
        entry("2027-02-10", "ghost"), // no such unit → contributes nothing
        entry("2027-02-12"), // no `unit` at all → contributes nothing
      ],
    };
    const rows = scheduleRows(
      schedule,
      sections,
      units,
      new Date("2027-01-20T00:00:00Z")
    );
    // The span is [01-20, 01-20] (only the resolvable u1 entry); the
    // ghost/undated-unit entries do NOT extend it to 02-12.
    expect(rows).toEqual([
      { slug: "s1", weekStart: 1, weekEnd: 1, isNow: true, isPast: false },
    ]);
  });

  test("a section with no resolvable entries is omitted (graceful degradation)", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-01-20", "u1")], // only s1 has any entry
    };
    const rows = scheduleRows(
      schedule,
      [section("s1", 0), section("s2", 1)],
      units,
      new Date("2027-01-20T00:00:00Z")
    );
    // s2 has zero resolvable entries → no row (the renderer degrades to
    // lecture-count-only when no row exists for a slug, Task 9).
    expect(rows.map((r) => r.slug)).toEqual(["s1"]);
  });
});

describe("thisWeek", () => {
  // `now` = 2027-02-15; window is [2027-02-15, 2027-02-22].
  const NOW = new Date("2027-02-15T12:00:00Z");

  test("null schedule AND null assignments → []", () => {
    expect(thisWeek(null, null, NOW)).toEqual([]);
  });

  test("event 2 days out + assignment due 4 days out → both, date-sorted", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-02-17", "u1", "lecture", "Lecture 9")],
    };
    const assignments = assignmentRegistry({
      id: "hw3",
      dueDate: "2027-02-19",
      title: "Homework 3",
    });
    expect(thisWeek(schedule, assignments, NOW)).toEqual([
      { date: "2027-02-17", label: "Lecture 9", kind: "lecture" },
      { date: "2027-02-19", label: "Homework 3", kind: "due" },
    ]);
  });

  test("an event 10 days out is excluded from the 7-day window", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-02-25", "u1", "lecture", "Far Lecture")],
    };
    expect(thisWeek(schedule, null, NOW)).toEqual([]);
  });

  test('an assignment with dueDate "tbd" is excluded', () => {
    const assignments = assignmentRegistry({ id: "hwX", dueDate: "tbd" });
    expect(thisWeek(null, assignments, NOW)).toEqual([]);
  });

  test("an event exactly 7 days out is included (inclusive upper bound)", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-02-22", "u1", "exam", "Midterm")],
    };
    expect(thisWeek(schedule, null, NOW)).toEqual([
      { date: "2027-02-22", label: "Midterm", kind: "exam" },
    ]);
  });

  test("an event today is included (inclusive lower bound)", () => {
    const schedule: Schedule = {
      term_start: "2027-01-18",
      entries: [entry("2027-02-15", "u1", "activity", "Lab Today")],
    };
    expect(thisWeek(schedule, null, NOW)).toEqual([
      { date: "2027-02-15", label: "Lab Today", kind: "activity" },
    ]);
  });
});
