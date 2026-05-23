import { describe, expect, test } from "vitest";
import { mdxNamedFlow, root } from "../_test-helpers.ts";
import { extractSkillReviews } from "./skill-review.ts";

describe("extractSkillReviews (pure)", () => {
  test("emits has_explicit_content=true when both Prompt + Answer children are present", () => {
    const tree = root([
      mdxNamedFlow("SkillReview", { target: "topic:logs" }, [
        mdxNamedFlow("SkillReview.Prompt", {}),
        mdxNamedFlow("SkillReview.Answer", {}),
      ]),
    ]);
    const entries = extractSkillReviews(tree as never, "spoiler-alerts");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      unit: "spoiler-alerts",
      anchor: "sk-1",
      target_id: "topic:logs",
      has_explicit_content: true,
    });
  });

  test("emits has_explicit_content=false for self-closing form (placeholder path)", () => {
    const tree = root([
      mdxNamedFlow("SkillReview", { target: "topic:exponents" }),
    ]);
    const entries = extractSkillReviews(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.has_explicit_content).toBe(false);
  });

  test("emits has_explicit_content=false when only one slot is present", () => {
    const tree = root([
      mdxNamedFlow("SkillReview", { target: "topic:x" }, [
        mdxNamedFlow("SkillReview.Prompt", {}),
      ]),
      mdxNamedFlow("SkillReview", { target: "topic:y" }, [
        mdxNamedFlow("SkillReview.Answer", {}),
      ]),
    ]);
    const entries = extractSkillReviews(tree as never, "ch");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.has_explicit_content).toBe(false);
    expect(entries[1]?.has_explicit_content).toBe(false);
  });

  test("ignores SkillReview.ReviewMore when deciding explicit content", () => {
    const tree = root([
      mdxNamedFlow("SkillReview", { target: "topic:x" }, [
        mdxNamedFlow("SkillReview.ReviewMore", {}),
      ]),
    ]);
    const entries = extractSkillReviews(tree as never, "ch");
    expect(entries[0]?.has_explicit_content).toBe(false);
  });

  test("auto-anchors sk-N counter advances across multiple callsites", () => {
    const tree = root([
      mdxNamedFlow("SkillReview", { target: "topic:a" }),
      mdxNamedFlow("SkillReview", { target: "topic:b" }),
      mdxNamedFlow("SkillReview", { target: "topic:c" }),
    ]);
    const entries = extractSkillReviews(tree as never, "ch");
    expect(entries.map((e) => e.anchor)).toEqual(["sk-1", "sk-2", "sk-3"]);
  });

  test("skips elements with no target attribute", () => {
    const tree = root([
      mdxNamedFlow("SkillReview", {}),
      mdxNamedFlow("SkillReview", { target: "topic:x" }),
    ]);
    const entries = extractSkillReviews(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.target_id).toBe("topic:x");
  });
});
