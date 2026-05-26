import { describe, expect, test } from "vitest";
import { CourseInfoFragmentSchema } from "./course-info-fragment.js";

describe("CourseInfoFragmentSchema", () => {
  test("accepts minimal frontmatter (title only)", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "Instructor — Anna Rosen",
    });
    expect(result.success).toBe(true);
  });

  test("accepts full frontmatter", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "Course policies",
      description: "Late-work, attendance, academic integrity.",
      last_revised: "2026-05-26",
      ai_contribution: {
        visibility: "public",
        models: ["claude-opus-4-7"],
        review_depth: "manual",
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing title", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      description: "no title",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty title", () => {
    const result = CourseInfoFragmentSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  test("rejects malformed last_revised (not ISO date)", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "x",
      last_revised: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  test("rejects unknown top-level keys (.strict)", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "x",
      mystery_field: "boom",
    });
    expect(result.success).toBe(false);
  });

  test("rejects unknown ai_contribution.visibility", () => {
    const result = CourseInfoFragmentSchema.safeParse({
      title: "x",
      ai_contribution: { visibility: "secret" },
    });
    expect(result.success).toBe(false);
  });
});
