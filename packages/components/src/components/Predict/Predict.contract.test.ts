import { describe, expect, it } from "vitest";
import { predictContract } from "./Predict.contract.ts";

const audit = predictContract.audit;
if (audit === undefined) {
  throw new Error("predictContract.audit must be defined");
}

describe("predictContract.audit", () => {
  it("returns no findings for prompts with unique ids", () => {
    const findings = audit({
      course: "test",
      chapter: "test",
      id: "predict-1",
      prompts: [
        { id: "colors", label: "What do the colors mean?" },
        { id: "darks", label: "What are the dark regions?" },
      ],
    });
    expect(findings).toEqual([]);
  });

  it("returns an error finding when two prompts share an id", () => {
    const findings = audit({
      course: "test",
      chapter: "test",
      id: "predict-1",
      prompts: [
        { id: "colors", label: "What do the colors mean?" },
        { id: "colors", label: "Duplicate by mistake" },
      ],
    });
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.severity).toBe("error");
    expect(findings[0]?.message).toMatch(/duplicate.*id.*colors/i);
  });

  it("reports every duplicated prompt id, not just the first", () => {
    const findings = audit({
      course: "test",
      chapter: "test",
      id: "predict-1",
      prompts: [
        { id: "a", label: "x" },
        { id: "a", label: "y" },
        { id: "b", label: "z" },
        { id: "b", label: "w" },
      ],
    });
    expect(findings).toHaveLength(2);
  });
});
