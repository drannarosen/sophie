import { describe, expect, it } from "vitest";
import { learningObjectivesContract } from "./LearningObjectives.contract.ts";

const audit = learningObjectivesContract.audit;
if (audit === undefined) {
  throw new Error("learningObjectivesContract.audit must be defined");
}

describe("learningObjectivesContract.audit", () => {
  it("returns no findings for objectives with unique ids", () => {
    const findings = audit({
      course: "test",
      chapter: "test",
      id: "lo",
      objectives: [
        { id: "thesis", verb: "State", body: "the thesis" },
        { id: "scale", verb: "Apply", body: "the inverse-square law" },
      ],
    });
    expect(findings).toEqual([]);
  });

  it("returns an error finding when two objectives share an id", () => {
    const findings = audit({
      course: "test",
      chapter: "test",
      id: "lo",
      objectives: [
        { id: "thesis", verb: "State", body: "the thesis" },
        { id: "thesis", verb: "Recall", body: "the same id by mistake" },
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toMatch(/duplicate.*id.*thesis/i);
  });

  it("reports every duplicated id, not just the first", () => {
    const findings = audit({
      course: "test",
      chapter: "test",
      id: "lo",
      objectives: [
        { id: "a", verb: "x", body: "1" },
        { id: "a", verb: "x", body: "2" },
        { id: "b", verb: "y", body: "3" },
        { id: "b", verb: "y", body: "4" },
      ],
    });
    // Two distinct duplicate-id groups → two findings.
    expect(findings).toHaveLength(2);
    expect(findings.map((f) => f.message).join("\n")).toMatch(/\ba\b/);
    expect(findings.map((f) => f.message).join("\n")).toMatch(/\bb\b/);
  });
});
