import { describe, expect, it } from "vitest";
import { isChapterRevealed } from "./resolve-solution-reveal.ts";

const reg = (dueDate: string) => ({
  assignments: [
    {
      id: "hw-1",
      title: "x",
      kind: "homework",
      assignedDate: "2027-01-01",
      dueDate,
      problems: [{ unit: "u1", ids: ["p1"] }],
    },
  ],
});
const at = (d: string) => new Date(d);

describe("isChapterRevealed (fail-closed)", () => {
  it("hidden when no assignment references the chapter and no explicit date", () => {
    // u2 is never referenced by the registry → no concrete date → hidden.
    expect(
      isChapterRevealed("u2", null, reg("2027-02-01"), at("2030-01-01"))
    ).toBe(false);
  });
  it("hidden when dueDate is tbd", () => {
    expect(
      isChapterRevealed("u1", undefined, reg("tbd"), at("2030-01-01"))
    ).toBe(false);
  });
  it("hidden before the due date", () => {
    expect(
      isChapterRevealed("u1", undefined, reg("2027-02-20"), at("2027-02-19"))
    ).toBe(false);
  });
  it("revealed on/after the due date", () => {
    expect(
      isChapterRevealed("u1", undefined, reg("2027-02-20"), at("2027-02-20"))
    ).toBe(true);
  });
  it("uses the LATEST due date when multiple assignments touch the chapter", () => {
    const r = {
      assignments: [
        {
          id: "a",
          title: "x",
          kind: "homework",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-01",
          problems: [{ unit: "u1", ids: ["p1"] }],
        },
        {
          id: "b",
          title: "x",
          kind: "homework",
          assignedDate: "2027-01-01",
          dueDate: "2027-03-01",
          problems: [{ unit: "u1", ids: ["p2"] }],
        },
      ],
    };
    expect(isChapterRevealed("u1", undefined, r, at("2027-02-15"))).toBe(false); // before latest
    expect(isChapterRevealed("u1", undefined, r, at("2027-03-01"))).toBe(true);

    // Order-independence: the latest date must win regardless of registry
    // ordering. Listing the later due date FIRST exercises the reducer's
    // keep-accumulator arm; the result must be identical.
    const descending = { assignments: [...r.assignments].reverse() };
    expect(
      isChapterRevealed("u1", undefined, descending, at("2027-02-15"))
    ).toBe(false);
    expect(
      isChapterRevealed("u1", undefined, descending, at("2027-03-01"))
    ).toBe(true);
  });
  it("explicit override wins over derived date", () => {
    expect(
      isChapterRevealed("u1", "2027-01-15", reg("2027-02-20"), at("2027-01-15"))
    ).toBe(true);
  });
  it("explicit tbd stays hidden even if an assignment due date passed", () => {
    expect(
      isChapterRevealed("u1", "tbd", reg("2027-02-01"), at("2030-01-01"))
    ).toBe(false);
  });
  it("hidden when registry is null", () => {
    expect(isChapterRevealed("u1", undefined, null, at("2030-01-01"))).toBe(
      false
    );
  });
});

// Generalization (ADR 0096 Amendment 1): the reveal keys off `problems`
// PRESENCE, not on `kind`. An assignment with no `problems` never gates;
// one whose `problems` touch the unit gates on its dueDate.
describe("isChapterRevealed (problems-presence generalization)", () => {
  it("an assignment WITHOUT problems never gates the unit (stays hidden)", () => {
    // A project (no `problems`) carries a dueDate but no gradable problems,
    // so it contributes no reveal date for any unit — solutions stay hidden.
    const r = {
      assignments: [
        {
          id: "project-1",
          title: "Final Project",
          kind: "project",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-01",
        },
      ],
    };
    expect(isChapterRevealed("u1", undefined, r, at("2030-01-01"))).toBe(false);
  });

  it("an assignment WITH problems touching the unit gates on its dueDate", () => {
    // Mixed registry: a problemless project plus a problem-bearing homework
    // touching u1 — the reveal derives from the homework's dueDate only.
    const r = {
      assignments: [
        {
          id: "project-1",
          title: "Final Project",
          kind: "project",
          assignedDate: "2027-01-01",
          dueDate: "2027-05-01",
        },
        {
          id: "hw-1",
          title: "Homework 1",
          kind: "homework",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-20",
          problems: [{ unit: "u1", ids: ["p1"] }],
        },
      ],
    };
    expect(isChapterRevealed("u1", undefined, r, at("2027-02-19"))).toBe(false);
    expect(isChapterRevealed("u1", undefined, r, at("2027-02-20"))).toBe(true);
  });
});

// Strengthening cases (beyond the plan) — this resolver is the security core;
// a mistake leaks assignment answers early, so the fail-closed boundaries get
// exhaustive coverage.
describe("isChapterRevealed (security hardening)", () => {
  it("matches a unit referenced in a NON-FIRST problem group", () => {
    // The target unit is only in the second group; the resolver must still
    // find it (a first-group-only scan would falsely hide it).
    const r = {
      assignments: [
        {
          id: "hw-multi",
          title: "x",
          kind: "homework",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-20",
          problems: [
            { unit: "other", ids: ["q1"] },
            { unit: "u1", ids: ["q2"] },
          ],
        },
      ],
    };
    expect(isChapterRevealed("u1", undefined, r, at("2027-02-19"))).toBe(false);
    expect(isChapterRevealed("u1", undefined, r, at("2027-02-20"))).toBe(true);
  });

  it("reveals at exact second-granularity equality (boundary >=)", () => {
    // The derived ISO date parses to UTC midnight; `now` exactly at that
    // instant must reveal (>=, not >). Asserting the boundary at second
    // granularity guards against an off-by-one strict-comparison bug.
    const exact = new Date("2027-02-20T00:00:00.000Z");
    const oneSecondBefore = new Date("2027-02-19T23:59:59.000Z");
    expect(isChapterRevealed("u1", undefined, reg("2027-02-20"), exact)).toBe(
      true
    );
    expect(
      isChapterRevealed("u1", undefined, reg("2027-02-20"), oneSecondBefore)
    ).toBe(false);
  });

  it("hidden when the registry has an empty assignments array", () => {
    expect(
      isChapterRevealed("u1", undefined, { assignments: [] }, at("2030-01-01"))
    ).toBe(false);
  });

  it("no cross-unit bleed: tbd on the target unit stays hidden despite another unit's concrete date", () => {
    // hw-a references the TARGET unit but is tbd (no concrete date).
    // hw-b references a DIFFERENT unit with a concrete, long-past date.
    // The target unit must NOT inherit hw-b's date.
    const r = {
      assignments: [
        {
          id: "hw-a",
          title: "x",
          kind: "homework",
          assignedDate: "2027-01-01",
          dueDate: "tbd",
          problems: [{ unit: "u1", ids: ["p1"] }],
        },
        {
          id: "hw-b",
          title: "x",
          kind: "homework",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-01",
          problems: [{ unit: "u2", ids: ["p2"] }],
        },
      ],
    };
    expect(isChapterRevealed("u1", undefined, r, at("2030-01-01"))).toBe(false);
  });
});
