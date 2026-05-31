import type { HomeworkRegistry, UnitEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { dueSoon, startReading } from "./home-card-projections.ts";

/** A homework fixture; `dueDate` is `"tbd"` or an ISO `YYYY-MM-DD`. */
function hw(
  id: string,
  dueDate: string,
  problems: HomeworkRegistry["homework"][number]["problems"] = [
    { unit: "u1", ids: ["p1"] },
  ]
): HomeworkRegistry["homework"][number] {
  return {
    id,
    title: `Homework ${id}`,
    assignedDate: "2027-01-01",
    dueDate,
    problems,
  };
}

/** Build a registry from a list of homeworks. */
function reg(...homework: HomeworkRegistry["homework"]): HomeworkRegistry {
  return { homework };
}

/** A fixed injected `now` — 2027-02-15. */
const NOW = new Date("2027-02-15T12:00:00Z");

describe("dueSoon", () => {
  test("null registry → []", () => {
    expect(dueSoon(null, NOW)).toEqual([]);
  });

  test("empty registry → []", () => {
    expect(dueSoon(reg(), NOW)).toEqual([]);
  });

  test("excludes past-due homeworks", () => {
    const items = dueSoon(reg(hw("1", "2027-01-01")), NOW);
    expect(items).toEqual([]);
  });

  test("includes a homework due exactly on `now`", () => {
    const items = dueSoon(reg(hw("1", "2027-02-15")), NOW);
    expect(items.map((i) => i.id)).toEqual(["1"]);
    expect(items[0]).toMatchObject({ due: "2027-02-15", tbd: false });
  });

  test("includes future homeworks, sorted ascending by due date", () => {
    const items = dueSoon(
      reg(hw("c", "2027-04-01"), hw("a", "2027-02-20"), hw("b", "2027-03-01")),
      NOW
    );
    expect(items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  test("caps at the small N (default 3); soonest survive", () => {
    const items = dueSoon(
      reg(
        hw("1", "2027-02-20"),
        hw("2", "2027-02-21"),
        hw("3", "2027-02-22"),
        hw("4", "2027-02-23")
      ),
      NOW
    );
    expect(items.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  test("respects an explicit cap argument", () => {
    const items = dueSoon(
      reg(hw("1", "2027-02-20"), hw("2", "2027-02-21")),
      NOW,
      1
    );
    expect(items.map((i) => i.id)).toEqual(["1"]);
  });

  test("sums problem counts across every problem group", () => {
    const items = dueSoon(
      reg(
        hw("1", "2027-02-20", [
          { unit: "u1", ids: ["p1", "p2"] },
          { unit: "u2", ids: ["p3", "p4", "p5"] },
        ])
      ),
      NOW
    );
    expect(items[0]?.problemCount).toBe(5);
  });

  test("surfaces tbd homeworks as dimmed entries AFTER concrete-dated ones", () => {
    const items = dueSoon(
      reg(hw("tbd-a", "tbd"), hw("dated", "2027-02-20")),
      NOW
    );
    expect(items.map((i) => [i.id, i.tbd])).toEqual([
      ["dated", false],
      ["tbd-a", true],
    ]);
    expect(items[1]).toMatchObject({ due: "tbd", tbd: true });
  });

  test("tbd entries count against the cap (concrete-first)", () => {
    const items = dueSoon(
      reg(
        hw("d1", "2027-02-20"),
        hw("d2", "2027-02-21"),
        hw("d3", "2027-02-22"),
        hw("tbd", "tbd")
      ),
      NOW
    );
    // Three concrete fill the cap; the tbd is dropped (it's last in order).
    expect(items.map((i) => i.id)).toEqual(["d1", "d2", "d3"]);
  });

  test("tbd-only registry → tbd entries (still upcoming, dimmed)", () => {
    const items = dueSoon(reg(hw("1", "tbd")), NOW);
    expect(items.map((i) => [i.id, i.tbd])).toEqual([["1", true]]);
  });
});

/** A unit fixture bound to a section, defaulting to non-draft `stable`. */
function unit(
  id: string,
  order: number,
  status: UnitEntry["status"] = "stable"
): UnitEntry {
  return {
    id,
    type: "lecture",
    title: `Unit ${id}`,
    order,
    prereqs: [],
    status,
    section_id: "s1",
    chapter: `${id}-reading`,
  };
}

describe("startReading", () => {
  test("empty units → undefined (card degrades sanely)", () => {
    expect(startReading([])).toBeUndefined();
  });

  test("all-draft units → undefined", () => {
    expect(startReading([unit("a", 0, "draft")])).toBeUndefined();
  });

  test("picks the first non-draft unit by order", () => {
    const link = startReading([unit("c", 2), unit("a", 0), unit("b", 1)]);
    expect(link?.label).toBe("Unit a");
  });

  test("skips leading draft units to the first non-draft by order", () => {
    const link = startReading([unit("a", 0, "draft"), unit("b", 1)]);
    expect(link?.label).toBe("Unit b");
  });

  test("href is the base-correct reading route for the unit", () => {
    const link = startReading([unit("intro", 0)]);
    expect(link?.href).toContain("/units/intro/reading");
  });

  test("does not mutate the input units array", () => {
    const units = [unit("b", 1), unit("a", 0)];
    const before = units.map((u) => u.id);
    startReading(units);
    expect(units.map((u) => u.id)).toEqual(before);
  });
});
