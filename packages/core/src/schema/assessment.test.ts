import { describe, expect, it } from "vitest";
import {
  AssessmentItemSchema,
  AssessmentItemTypeSchema,
  AssessmentSchema,
  AssessmentTypeSchema,
} from "./assessment.js";

describe("AssessmentTypeSchema", () => {
  it("accepts each variant", () => {
    for (const t of ["assignment", "practice", "diagnostic", "exam"]) {
      expect(() => AssessmentTypeSchema.parse(t)).not.toThrow();
    }
  });
  it("rejects unknown types", () => {
    expect(() => AssessmentTypeSchema.parse("quiz")).toThrow();
  });
});

describe("AssessmentItemTypeSchema", () => {
  it("accepts each item-type variant", () => {
    for (const t of [
      "multiple-choice",
      "multiple-select",
      "numerical",
      "short-text",
      "code",
      "plotly-chart",
      "concept-map",
      "equation-derivation",
    ]) {
      expect(() => AssessmentItemTypeSchema.parse(t)).not.toThrow();
    }
  });
});

describe("AssessmentItemSchema", () => {
  it("accepts a multiple-choice item", () => {
    expect(() =>
      AssessmentItemSchema.parse({
        id: "q1",
        type: "multiple-choice",
        prompt: "log10(1000) = ?",
        options: ["1", "2", "3", "10"],
        answer: "3",
      })
    ).not.toThrow();
  });
  it("accepts a numerical item with tolerance", () => {
    expect(() =>
      AssessmentItemSchema.parse({
        id: "q2",
        type: "numerical",
        prompt: "What is sin(π/2)?",
        answer: 1.0,
        tolerance: 0.001,
      })
    ).not.toThrow();
  });
  it("accepts a code item with test_cases", () => {
    expect(() =>
      AssessmentItemSchema.parse({
        id: "q3",
        type: "code",
        prompt: "Implement compute_l_from_r_t",
        language: "python",
        test_cases: ["assert compute_l_from_r_t(1, 5778) == 3.828e33"],
      })
    ).not.toThrow();
  });
  it("accepts a multiple-select item", () => {
    expect(() =>
      AssessmentItemSchema.parse({
        id: "q4",
        type: "multiple-select",
        prompt: "Which are stars?",
        options: ["Sun", "Moon", "Sirius"],
        answer: ["Sun", "Sirius"],
      })
    ).not.toThrow();
  });
  it("rejects unknown item type", () => {
    expect(() =>
      AssessmentItemSchema.parse({ id: "x", type: "essay", prompt: "..." })
    ).toThrow();
  });
});

describe("AssessmentSchema", () => {
  const baseAssessment = {
    id: "hw1",
    type: "assignment",
    title: "HW1: Stellar Magnitudes",
    prompt: "Compute the apparent magnitude...",
    stakes: "low",
    items: [
      {
        id: "q1",
        type: "numerical",
        prompt: "What is m1 - m2?",
        answer: 2.5,
        tolerance: 0.1,
      },
    ],
    feedback: { timing: "asynchronous" },
  };

  it("accepts a minimal assignment", () => {
    expect(() => AssessmentSchema.parse(baseAssessment)).not.toThrow();
  });

  it("accepts a practice with inline feedback", () => {
    expect(() =>
      AssessmentSchema.parse({
        ...baseAssessment,
        type: "practice",
        stakes: "formative",
        feedback: { timing: "inline" },
      })
    ).not.toThrow();
  });

  it("accepts an exam with time_limit + scope", () => {
    expect(() =>
      AssessmentSchema.parse({
        ...baseAssessment,
        type: "exam",
        stakes: "high",
        schedule: { time_limit_minutes: 50 },
        scope: { sections: ["m1", "m2"] },
      })
    ).not.toThrow();
  });

  it("accepts a diagnostic with required: completion", () => {
    expect(() =>
      AssessmentSchema.parse({
        ...baseAssessment,
        type: "diagnostic",
        stakes: "formative",
        required: "completion",
      })
    ).not.toThrow();
  });

  it("accepts a rubric_id reference", () => {
    expect(() =>
      AssessmentSchema.parse({
        ...baseAssessment,
        rubric_id: "project-rubric",
      })
    ).not.toThrow();
  });

  it("rejects unknown stakes", () => {
    expect(() =>
      AssessmentSchema.parse({ ...baseAssessment, stakes: "mystery" })
    ).toThrow();
  });

  it("defaults references to an empty object", () => {
    const parsed = AssessmentSchema.parse(baseAssessment);
    expect(parsed.references).toEqual({});
  });
});
