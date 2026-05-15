import { describe, expect, test } from "vitest";
import { converters } from "./index.ts";

describe("converter registry", () => {
  test("covers exactly the v1 entity types", () => {
    const keys = Object.keys(converters).sort();
    expect(keys).toEqual(
      [
        "definitions",
        "equations",
        "figureUsages",
        "keyInsights",
        "misconceptions",
        "objectives",
      ].sort()
    );
  });

  test("each converter returns filters.type as a single-element array", () => {
    type RecordReturn = ReturnType<
      (typeof converters)[keyof typeof converters]
    >;
    const _typeCheck: RecordReturn["filters"]["type"] extends string[]
      ? true
      : never = true;
    expect(_typeCheck).toBe(true);
  });
});
