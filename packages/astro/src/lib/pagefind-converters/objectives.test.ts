import type { ObjectiveEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { toObjectiveRecord } from "./objectives.ts";

const ctx = {
  chapterTitle: "Measuring the sky",
  moduleTitle: "Foundations",
  moduleSlug: "01-foundations",
};

const fixture: ObjectiveEntry = {
  id: "thesis",
  anchor: "lo-thesis",
  chapter: "measuring-the-sky",
  verb: "State",
  body: "the course thesis in one sentence.",
};

describe("toObjectiveRecord", () => {
  test("filters.type is ['objective']", () => {
    expect(toObjectiveRecord(fixture, ctx).filters.type).toEqual(["objective"]);
  });

  test("meta.verb carries the verb separately for badge render", () => {
    expect(toObjectiveRecord(fixture, ctx).meta.verb).toBe("State");
  });

  test("meta.title concatenates verb + body", () => {
    expect(toObjectiveRecord(fixture, ctx).meta.title).toBe(
      "State the course thesis in one sentence."
    );
  });

  test("content is verb + body (for search)", () => {
    expect(toObjectiveRecord(fixture, ctx).content).toBe(
      "State the course thesis in one sentence."
    );
  });
});
