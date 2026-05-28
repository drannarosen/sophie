import { describe, expect, test } from "vitest";
import { mdxNamedFlow, root } from "../_test-helpers.ts";
import { extractRetrievalPrompts } from "./retrieval-prompt.ts";

describe("extractRetrievalPrompts (pure)", () => {
  test("emits one entry per <RetrievalPrompt target=...> with auto rp-N anchors", () => {
    const tree = root([
      mdxNamedFlow("RetrievalPrompt", { target: "eq:stefan-boltzmann" }),
      mdxNamedFlow("RetrievalPrompt", { target: "ki:luminosity" }),
    ]);
    const entries = extractRetrievalPrompts(
      tree as never,
      "spoiler-alerts",
      "reading"
    );
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      unit: "spoiler-alerts",
      anchor: "reading-rp-1",
      target_id: "eq:stefan-boltzmann",
    });
    expect(entries[1]).toEqual({
      unit: "spoiler-alerts",
      anchor: "reading-rp-2",
      target_id: "ki:luminosity",
    });
  });

  test("skips RetrievalPrompt with no target attribute", () => {
    const tree = root([
      mdxNamedFlow("RetrievalPrompt", {}),
      mdxNamedFlow("RetrievalPrompt", { target: "ki:x" }),
    ]);
    const entries = extractRetrievalPrompts(tree as never, "ch", "reading");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.target_id).toBe("ki:x");
    expect(entries[0]?.anchor).toBe("reading-rp-1");
  });

  test("ignores elements with other JSX names", () => {
    const tree = root([
      mdxNamedFlow("SpacedReview", { target: "ki:x" }),
      mdxNamedFlow("Predict", { id: "p1" }),
      mdxNamedFlow("RetrievalPrompt", { target: "ki:y" }),
    ]);
    const entries = extractRetrievalPrompts(tree as never, "ch", "reading");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.target_id).toBe("ki:y");
  });

  test("returns empty array when tree contains no RetrievalPrompt", () => {
    const tree = root([mdxNamedFlow("SpacedReview", { target: "ki:x" })]);
    expect(extractRetrievalPrompts(tree as never, "ch", "reading")).toEqual([]);
  });
});
