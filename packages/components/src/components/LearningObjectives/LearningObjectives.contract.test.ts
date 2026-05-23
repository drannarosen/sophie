import { describe, expect, it } from "vitest";
import { learningObjectivesContract } from "./LearningObjectives.contract.ts";

describe("learningObjectivesContract", () => {
  it("exports a no-op audit (cross-chapter checks live in runPedagogyAudit)", () => {
    expect(learningObjectivesContract.audit).toBeDefined();
    const findings = learningObjectivesContract.audit?.({
      course: "test",
      unit: "test",
      id: "lo",
      objectives: [],
    });
    expect(findings).toEqual([]);
  });

  it("serializes to { type, props, state }", () => {
    const props = {
      course: "test",
      unit: "test",
      id: "lo",
      objectives: [{ id: "o1", verb: "State", body: "the thesis." }],
    };
    const state = { thesis: true };
    expect(learningObjectivesContract.serialize(props, state)).toEqual({
      type: "learning-objectives",
      props,
      state,
    });
  });

  it("is contained in chapter scope and forbids no children", () => {
    expect(learningObjectivesContract.containedIn).toEqual(["chapter"]);
    expect(learningObjectivesContract.forbidsContaining).toEqual([]);
  });
});
