import { describe, expect, test } from "vitest";
import { mdxNamedFlow, root } from "../_test-helpers.ts";
import { extractTopicAndCards } from "./topic.ts";

describe("extractTopicAndCards (ADR 0079)", () => {
  test("emits TopicEntry from frontmatter + CardEntry[] from body", () => {
    const tree = root([
      mdxNamedFlow("SkillReview.Card", { id: "product-rule" }),
      mdxNamedFlow("SkillReview.Card", { id: "power-rule" }),
    ]);
    const result = extractTopicAndCards(tree as never, {
      id: "logarithms",
      label: "Logarithms",
      summary: "Inverse of exponentiation.",
      prereq_topic_ids: ["exponents"],
      linked_equation_ids: [],
      linked_misconception_ids: [],
      cards: [
        { id: "product-rule", label: "Product rule", difficulty: "easy" },
        { id: "power-rule", label: "Power rule", difficulty: "medium" },
      ],
    });
    expect(result.topic.id).toBe("logarithms");
    expect(result.topic.prereq_topic_ids).toEqual(["exponents"]);
    expect(result.cards).toEqual([
      {
        id: "product-rule",
        topic_id: "logarithms",
        label: "Product rule",
        difficulty: "easy",
      },
      {
        id: "power-rule",
        topic_id: "logarithms",
        label: "Power rule",
        difficulty: "medium",
      },
    ]);
    expect(result.findings).toEqual([]);
  });

  test("emits CardEntry without difficulty when frontmatter omits it", () => {
    const tree = root([mdxNamedFlow("SkillReview.Card", { id: "c1" })]);
    const result = extractTopicAndCards(tree as never, {
      id: "x",
      label: "X",
      summary: "y",
      prereq_topic_ids: [],
      linked_equation_ids: [],
      linked_misconception_ids: [],
      cards: [{ id: "c1", label: "C1" }],
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toMatchObject({
      id: "c1",
      topic_id: "x",
      label: "C1",
    });
    expect(result.cards[0]?.difficulty).toBeUndefined();
    expect(result.findings).toEqual([]);
  });

  test("emits PRA-2 finding for orphan SkillReview.Card whose id isn't declared in frontmatter", () => {
    const tree = root([
      mdxNamedFlow("SkillReview.Card", { id: "declared" }),
      mdxNamedFlow("SkillReview.Card", { id: "orphan" }),
    ]);
    const result = extractTopicAndCards(tree as never, {
      id: "t",
      label: "T",
      summary: "s",
      prereq_topic_ids: [],
      linked_equation_ids: [],
      linked_misconception_ids: [],
      cards: [{ id: "declared", label: "Declared" }],
    });
    // Orphan card is NOT materialized in `cards` — refuses to lie
    // about the registry shape.
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.id).toBe("declared");
    // Orphan IS surfaced as a PRA-2 finding so the audit phase fails
    // the build with curated remediation guidance.
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]).toMatchObject({
      severity: "ERROR",
      code: "PRA-2",
      location: { unit: "t", anchor: "orphan" },
    });
    expect(result.findings[0]?.message).toContain("orphan");
    expect(result.findings[0]?.message).toContain("body has");
  });

  test("skips SkillReview.Card with no id attribute (no finding)", () => {
    const tree = root([
      mdxNamedFlow("SkillReview.Card", {}),
      mdxNamedFlow("SkillReview.Card", { id: "c1" }),
    ]);
    const result = extractTopicAndCards(tree as never, {
      id: "t",
      label: "T",
      summary: "s",
      prereq_topic_ids: [],
      linked_equation_ids: [],
      linked_misconception_ids: [],
      cards: [{ id: "c1", label: "C1" }],
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.id).toBe("c1");
    expect(result.findings).toEqual([]);
  });

  test("ignores elements with other JSX names", () => {
    const tree = root([
      mdxNamedFlow("SkillReview.Prompt", { id: "p1" }),
      mdxNamedFlow("RetrievalPrompt", { target: "topic:x" }),
      mdxNamedFlow("SkillReview.Card", { id: "c1" }),
    ]);
    const result = extractTopicAndCards(tree as never, {
      id: "t",
      label: "T",
      summary: "s",
      prereq_topic_ids: [],
      linked_equation_ids: [],
      linked_misconception_ids: [],
      cards: [{ id: "c1", label: "C1" }],
    });
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]?.id).toBe("c1");
    expect(result.findings).toEqual([]);
  });

  test("returns empty cards[] and empty findings[] when tree has no SkillReview.Card", () => {
    const tree = root([mdxNamedFlow("RetrievalPrompt", { target: "topic:x" })]);
    const result = extractTopicAndCards(tree as never, {
      id: "t",
      label: "T",
      summary: "s",
      prereq_topic_ids: [],
      linked_equation_ids: [],
      linked_misconception_ids: [],
      cards: [],
    });
    expect(result.cards).toEqual([]);
    expect(result.findings).toEqual([]);
  });
});
