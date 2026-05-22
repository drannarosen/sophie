import { describe, expect, it } from "vitest";
import {
  RubricCriterionSchema,
  RubricScaleLevelSchema,
  RubricSchema,
} from "./rubric.js";

const sampleCriterion = {
  id: "physical-reasoning",
  label: "Physical reasoning",
  weight: 30,
  scale: [
    {
      points: 30,
      label: "Excellent",
      descriptor: "Identifies all relevant assumptions.",
    },
    {
      points: 24,
      label: "Proficient",
      descriptor: "Identifies most assumptions.",
    },
    {
      points: 18,
      label: "Developing",
      descriptor: "Identifies some assumptions.",
    },
    {
      points: 10,
      label: "Beginning",
      descriptor: "Limited identification.",
    },
  ],
};

describe("RubricScaleLevelSchema", () => {
  it("accepts a valid level", () => {
    expect(() =>
      RubricScaleLevelSchema.parse(sampleCriterion.scale[0])
    ).not.toThrow();
  });
  it("rejects negative points", () => {
    expect(() =>
      RubricScaleLevelSchema.parse({
        points: -1,
        label: "X",
        descriptor: "X",
      })
    ).toThrow();
  });
});

describe("RubricCriterionSchema", () => {
  it("accepts a valid criterion", () => {
    expect(() => RubricCriterionSchema.parse(sampleCriterion)).not.toThrow();
  });
  it("rejects empty scale", () => {
    expect(() =>
      RubricCriterionSchema.parse({ ...sampleCriterion, scale: [] })
    ).toThrow();
  });
  it("defaults lo_references to empty array", () => {
    const parsed = RubricCriterionSchema.parse(sampleCriterion);
    expect(parsed.lo_references).toEqual([]);
  });
});

describe("RubricSchema", () => {
  it("accepts a criterion-based rubric", () => {
    expect(() =>
      RubricSchema.parse({
        id: "project-rubric",
        type: "criterion-based",
        total_points: 100,
        criteria: [sampleCriterion],
      })
    ).not.toThrow();
  });

  it("accepts a holistic rubric", () => {
    expect(() =>
      RubricSchema.parse({
        id: "essay-rubric",
        type: "holistic",
        total_points: 100,
        scale: [
          { points: 100, label: "Mastery", descriptor: "..." },
          { points: 80, label: "Proficient", descriptor: "..." },
          { points: 60, label: "Developing", descriptor: "..." },
        ],
      })
    ).not.toThrow();
  });

  it("rejects criterion-based without criteria", () => {
    expect(() =>
      RubricSchema.parse({
        id: "x",
        type: "criterion-based",
        total_points: 100,
      })
    ).toThrow();
  });

  it("rejects holistic without scale", () => {
    expect(() =>
      RubricSchema.parse({
        id: "x",
        type: "holistic",
        total_points: 100,
      })
    ).toThrow();
  });

  it("rejects unknown rubric type", () => {
    expect(() =>
      RubricSchema.parse({
        id: "x",
        type: "checklist",
        total_points: 100,
      })
    ).toThrow();
  });
});
