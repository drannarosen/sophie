import { beforeEach, describe, expect, test } from "vitest";
import {
  mdxLearningObjectives,
  mdxObjective,
  para,
  root,
} from "../_test-helpers.ts";
import { extractObjectives, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractObjectives (pure)", () => {
  test("returns one ObjectiveEntry per <Objective> nested in <LearningObjectives>", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch1-objectives" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [
          para("Distinguish parallax distance from standard-candle distance."),
        ]),
        mdxObjective({ id: "lo-2", verb: "Understand" }, [
          para("The mathematical structure of Wien's displacement law."),
        ]),
      ]),
    ]);

    const entries = extractObjectives(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: "lo-1",
      verb: "Recognize",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    });
    expect(entries[0]?.body).toContain("Distinguish parallax distance");
    expect(entries[1]).toMatchObject({
      id: "lo-2",
      verb: "Understand",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-2",
    });
  });

  test("throws when an <Objective> is missing a non-empty `id`", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ verb: "Recognize" }, [para("body")]),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /missing.*`id`|missing.*id/i
    );
  });

  test("throws when an <Objective> is missing a non-empty `verb`", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1" }, [para("body")]),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /missing.*`verb`|missing.*verb/i
    );
  });

  test("throws when an <Objective> has an empty (whitespace-only) body", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, []),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /empty.*body|missing.*body/i
    );
  });

  test("O1 — throws on duplicate objective id within a chapter", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [para("first")]),
        mdxObjective({ id: "lo-1", verb: "Understand" }, [para("second")]),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /O1 invariant|duplicate|collision/i
    );
  });

  test("ignores <Objective> elements outside a <LearningObjectives> parent", () => {
    const tree = root([
      mdxObjective({ id: "lo-orphan", verb: "Recognize" }, [
        para("orphan objective"),
      ]),
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [para("real")]),
      ]),
    ]);

    const entries = extractObjectives(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("lo-1");
  });
});
