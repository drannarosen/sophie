import { describe, expect, it } from "vitest";
import { isChapterRevealed } from "./resolve-solution-reveal.ts";

const reg = (dueDate: string) => ({
  homework: [
    {
      id: "hw-1",
      title: "x",
      assignedDate: "2027-01-01",
      dueDate,
      problems: [{ unit: "u1", ids: ["p1"] }],
    },
  ],
});
const at = (d: string) => new Date(d);

describe("isChapterRevealed (fail-closed)", () => {
  it("hidden when no homework references the chapter and no explicit date", () => {
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
  it("uses the LATEST due date when multiple homeworks touch the chapter", () => {
    const r = {
      homework: [
        {
          id: "a",
          title: "x",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-01",
          problems: [{ unit: "u1", ids: ["p1"] }],
        },
        {
          id: "b",
          title: "x",
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
    const descending = { homework: [...r.homework].reverse() };
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
  it("explicit tbd stays hidden even if a homework due date passed", () => {
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

// Strengthening cases (beyond the plan) — this resolver is the security core;
// a mistake leaks homework answers early, so the fail-closed boundaries get
// exhaustive coverage.
describe("isChapterRevealed (security hardening)", () => {
  it("matches a unit referenced in a NON-FIRST problem group", () => {
    // The target unit is only in the second group; the resolver must still
    // find it (a first-group-only scan would falsely hide it).
    const r = {
      homework: [
        {
          id: "hw-multi",
          title: "x",
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

  it("hidden when the registry has an empty homework array", () => {
    expect(
      isChapterRevealed("u1", undefined, { homework: [] }, at("2030-01-01"))
    ).toBe(false);
  });

  it("no cross-unit bleed: tbd on the target unit stays hidden despite another unit's concrete date", () => {
    // hw-a references the TARGET unit but is tbd (no concrete date).
    // hw-b references a DIFFERENT unit with a concrete, long-past date.
    // The target unit must NOT inherit hw-b's date.
    const r = {
      homework: [
        {
          id: "hw-a",
          title: "x",
          assignedDate: "2027-01-01",
          dueDate: "tbd",
          problems: [{ unit: "u1", ids: ["p1"] }],
        },
        {
          id: "hw-b",
          title: "x",
          assignedDate: "2027-01-01",
          dueDate: "2027-02-01",
          problems: [{ unit: "u2", ids: ["p2"] }],
        },
      ],
    };
    expect(isChapterRevealed("u1", undefined, r, at("2030-01-01"))).toBe(false);
  });
});
