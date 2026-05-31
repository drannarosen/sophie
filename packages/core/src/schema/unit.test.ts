import { describe, expect, it } from "vitest";
import { UnitSchema, UnitTypeSchema } from "./unit.js";

describe("UnitTypeSchema", () => {
  it("accepts each declared variant", () => {
    for (const t of ["lecture", "project", "lab", "topic", "skill"]) {
      expect(() => UnitTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => UnitTypeSchema.parse("lab-report")).toThrow();
  });
});

describe("UnitSchema", () => {
  const minimalLecture = {
    id: "l1-why-different",
    type: "lecture",
    title: "Why ASTR 201 is Different",
    order: 1,
    status: "stable",
  };

  it("accepts a minimal lecture", () => {
    expect(() => UnitSchema.parse(minimalLecture)).not.toThrow();
  });

  it("accepts a project with prereqs + estimated_duration_weeks", () => {
    expect(() =>
      UnitSchema.parse({
        id: "p1-stellar-populations",
        type: "project",
        title: "Stellar Populations",
        order: 1,
        prereqs: ["math-logarithms", "physics-newton-2"],
        estimated_duration_weeks: 1.5,
        status: "review",
      })
    ).not.toThrow();
  });

  it("accepts a skill (bridge-only)", () => {
    expect(() =>
      UnitSchema.parse({
        id: "math-logarithms",
        type: "skill",
        title: "Logarithms",
        order: 1,
        topic_id: "math-logarithms",
        status: "stable",
      })
    ).not.toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => UnitSchema.parse({ id: "x", type: "lecture" })).toThrow();
  });

  it("rejects unknown type", () => {
    expect(() =>
      UnitSchema.parse({ ...minimalLecture, type: "mystery" })
    ).toThrow();
  });

  it("defaults prereqs to empty array when omitted", () => {
    const parsed = UnitSchema.parse(minimalLecture);
    expect(parsed.prereqs).toEqual([]);
  });

  it("rejects when status is missing (W2/D2: status is required)", () => {
    const { status: _, ...withoutStatus } = minimalLecture;
    expect(() => UnitSchema.parse(withoutStatus)).toThrow();
  });

  it("accepts each declared status value (W2/D2: ChapterStatus reuse)", () => {
    for (const status of ["draft", "review", "stable"]) {
      expect(() =>
        UnitSchema.parse({ ...minimalLecture, status })
      ).not.toThrow();
    }
  });

  it("rejects unknown status value", () => {
    expect(() =>
      UnitSchema.parse({ ...minimalLecture, status: "published" })
    ).toThrow();
  });

  it("accepts optional framing: OMI (W2/D2)", () => {
    const parsed = UnitSchema.parse({ ...minimalLecture, framing: "OMI" });
    expect(parsed.framing).toBe("OMI");
  });

  it("treats framing as omittable (W2/D2: optional)", () => {
    const parsed = UnitSchema.parse(minimalLecture);
    expect(parsed.framing).toBeUndefined();
  });

  it("rejects unknown framing value", () => {
    expect(() =>
      UnitSchema.parse({ ...minimalLecture, framing: "PMI" })
    ).toThrow();
  });

  it("accepts optional description (W2/D2)", () => {
    const parsed = UnitSchema.parse({
      ...minimalLecture,
      description: "One-paragraph Unit summary.",
    });
    expect(parsed.description).toBe("One-paragraph Unit summary.");
  });

  it("accepts a zero-padded ISO solutionsRevealDate (ADR 0096)", () => {
    const parsed = UnitSchema.parse({
      ...minimalLecture,
      solutionsRevealDate: "2027-02-20",
    });
    expect(parsed.solutionsRevealDate).toBe("2027-02-20");
  });

  it("accepts solutionsRevealDate: tbd (ADR 0096)", () => {
    const parsed = UnitSchema.parse({
      ...minimalLecture,
      solutionsRevealDate: "tbd",
    });
    expect(parsed.solutionsRevealDate).toBe("tbd");
  });

  it("treats solutionsRevealDate as omittable (optional)", () => {
    const parsed = UnitSchema.parse(minimalLecture);
    expect(parsed.solutionsRevealDate).toBeUndefined();
  });

  it.each([
    "0",
    "2027",
    "garbage",
    "2027-2-20",
    "2027/02/20",
  ])("rejects malformed solutionsRevealDate %j — schema is the real guard, not the permissive resolver (ADR 0096)", (bad) => {
    expect(() =>
      UnitSchema.parse({ ...minimalLecture, solutionsRevealDate: bad })
    ).toThrow();
  });
});
