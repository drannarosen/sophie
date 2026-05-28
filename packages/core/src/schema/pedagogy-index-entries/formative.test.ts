import { describe, expect, it } from "vitest";
import {
  FormativeAnswerSchema,
  FormativeEntrySchema,
  FormativeKindSchema,
} from "./formative.ts";

describe("FormativeKindSchema (ADR 0073 A1)", () => {
  it("accepts each of the six formative kinds", () => {
    for (const kind of [
      "mcq",
      "multi-select",
      "fill-blank",
      "numeric-question",
      "quickcheck",
      "practice-problem",
    ]) {
      expect(FormativeKindSchema.parse(kind)).toBe(kind);
    }
  });

  it("rejects an unknown kind", () => {
    expect(() => FormativeKindSchema.parse("essay")).toThrow();
  });
});

describe("FormativeAnswerSchema (ADR 0073 A1)", () => {
  it("parses the single-choice variant", () => {
    const a = FormativeAnswerSchema.parse({
      type: "single-choice",
      correct: "the-sun",
    });
    expect(a).toEqual({ type: "single-choice", correct: "the-sun" });
  });

  it("parses the multi-choice variant", () => {
    const a = FormativeAnswerSchema.parse({
      type: "multi-choice",
      correct: ["alpha", "gamma"],
    });
    expect(a).toEqual({ type: "multi-choice", correct: ["alpha", "gamma"] });
  });

  it("rejects multi-choice with zero correct entries", () => {
    expect(() =>
      FormativeAnswerSchema.parse({ type: "multi-choice", correct: [] })
    ).toThrow();
  });

  it("parses the fill-blank variant", () => {
    const a = FormativeAnswerSchema.parse({
      type: "fill-blank",
      blanks: [{ id: "b1", correct: "42" }],
    });
    expect(a).toEqual({
      type: "fill-blank",
      blanks: [{ id: "b1", correct: "42" }],
    });
  });

  it("parses the numeric variant (with optional unit)", () => {
    const a = FormativeAnswerSchema.parse({
      type: "numeric",
      value: 1.5e33,
      tolerance: 0.05,
      toleranceKind: "relative",
      unit: "g",
    });
    expect(a).toEqual({
      type: "numeric",
      value: 1.5e33,
      tolerance: 0.05,
      toleranceKind: "relative",
      unit: "g",
    });
  });

  it("rejects numeric with a negative tolerance", () => {
    expect(() =>
      FormativeAnswerSchema.parse({
        type: "numeric",
        value: 1,
        tolerance: -0.1,
        toleranceKind: "absolute",
      })
    ).toThrow();
  });

  it("parses the solution-only variant", () => {
    expect(FormativeAnswerSchema.parse({ type: "solution-only" })).toEqual({
      type: "solution-only",
    });
  });

  it("rejects unknown keys in strict mode", () => {
    expect(() =>
      FormativeAnswerSchema.parse({
        type: "solution-only",
        extra: true,
      })
    ).toThrow();
  });
});

describe("FormativeEntrySchema (ADR 0073 A1)", () => {
  const base = {
    unit: "stellar-structure",
    anchor: "form-1",
    kind: "quickcheck" as const,
    prompt: "Why is the Sun in hydrostatic equilibrium?",
    answer: { type: "solution-only" as const },
    hasSolution: true,
    hintCount: 2,
  };

  it("parses a complete entry", () => {
    expect(FormativeEntrySchema.parse(base)).toEqual(base);
  });

  it("rejects an unknown top-level key (strict)", () => {
    expect(() =>
      FormativeEntrySchema.parse({ ...base, persistenceKey: "x" })
    ).toThrow();
  });

  it("rejects a negative hintCount", () => {
    expect(() =>
      FormativeEntrySchema.parse({ ...base, hintCount: -1 })
    ).toThrow();
  });

  it("rejects an empty anchor", () => {
    expect(() => FormativeEntrySchema.parse({ ...base, anchor: "" })).toThrow();
  });
});
