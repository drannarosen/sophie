import { describe, expect, test } from "vitest";
import { mdxNamedFlow, root } from "../_test-helpers.ts";
import { extractSpacedReviews } from "./spaced-review.ts";

describe("extractSpacedReviews (pure)", () => {
  test("emits one entry per <SpacedReview target=...> with auto sp-N anchors", () => {
    const tree = root([
      mdxNamedFlow("SpacedReview", { target: "topic:logs", max: 3 }),
      mdxNamedFlow("SpacedReview", { target: "topic:exponents", max: 5 }),
    ]);
    const entries = extractSpacedReviews(tree as never, "spoiler-alerts");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      chapter: "spoiler-alerts",
      anchor: "sp-1",
      target_id: "topic:logs",
      max: 3,
    });
    expect(entries[1]).toEqual({
      chapter: "spoiler-alerts",
      anchor: "sp-2",
      target_id: "topic:exponents",
      max: 5,
    });
  });

  test("emits one entry per <SpacedReview section=...> with section_id field", () => {
    const tree = root([
      mdxNamedFlow("SpacedReview", { section: "m1-foundations", max: 5 }),
    ]);
    const entries = extractSpacedReviews(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      chapter: "ch",
      anchor: "sp-1",
      section_id: "m1-foundations",
      max: 5,
    });
  });

  test("defaults max to 3 when the attribute is absent", () => {
    const tree = root([mdxNamedFlow("SpacedReview", { target: "topic:logs" })]);
    const entries = extractSpacedReviews(tree as never, "ch");
    expect(entries[0]?.max).toBe(3);
  });

  test("skips when both target and section are present (Zod refine violation)", () => {
    const tree = root([
      mdxNamedFlow("SpacedReview", {
        target: "topic:logs",
        section: "m1-foundations",
        max: 3,
      }),
    ]);
    expect(extractSpacedReviews(tree as never, "ch")).toEqual([]);
  });

  test("skips when neither target nor section is present", () => {
    const tree = root([mdxNamedFlow("SpacedReview", { max: 3 })]);
    expect(extractSpacedReviews(tree as never, "ch")).toEqual([]);
  });

  test("accepts max as a string-valued attr (max='5')", () => {
    const tree = root([
      mdxNamedFlow("SpacedReview", { target: "topic:logs", max: "5" } as never),
    ]);
    const entries = extractSpacedReviews(tree as never, "ch");
    expect(entries[0]?.max).toBe(5);
  });
});
