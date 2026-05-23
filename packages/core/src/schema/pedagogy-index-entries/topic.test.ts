import { describe, expect, it } from "vitest";
import { TopicCardMetadataSchema, TopicEntrySchema } from "./topic.ts";

describe("TopicEntrySchema (ADR 0079)", () => {
  it("parses a minimal topic with empty cross-refs and cards", () => {
    const result = TopicEntrySchema.parse({
      id: "logarithms",
      label: "Logarithms",
      summary: "Functions that invert exponentiation.",
    });
    expect(result.id).toBe("logarithms");
    expect(result.cards).toEqual([]);
    expect(result.prereq_topic_ids).toEqual([]);
    expect(result.linked_equation_ids).toEqual([]);
    expect(result.linked_misconception_ids).toEqual([]);
  });

  it("parses a topic with cards + cross-refs", () => {
    const result = TopicEntrySchema.parse({
      id: "logarithms",
      label: "Logarithms",
      summary: "Inverse of exponentiation.",
      prereq_topic_ids: ["exponents"],
      linked_equation_ids: ["stefan-boltzmann"],
      linked_misconception_ids: ["log-as-mult"],
      cards: [
        { id: "product-rule", label: "Product rule", difficulty: "easy" },
        { id: "power-rule", label: "Power rule", difficulty: "medium" },
      ],
    });
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]?.difficulty).toBe("easy");
    expect(result.prereq_topic_ids).toEqual(["exponents"]);
  });

  it("rejects non-slug ids in cross-ref arrays", () => {
    expect(() =>
      TopicEntrySchema.parse({
        id: "logarithms",
        label: "Logarithms",
        summary: "x",
        prereq_topic_ids: ["Has Spaces"],
      }),
    ).toThrow();
  });

  it("rejects empty label", () => {
    expect(() =>
      TopicEntrySchema.parse({
        id: "logarithms",
        label: "",
        summary: "x",
      }),
    ).toThrow();
  });
});

describe("TopicCardMetadataSchema (ADR 0079)", () => {
  it("parses minimal card metadata (no difficulty)", () => {
    const result = TopicCardMetadataSchema.parse({
      id: "product-rule",
      label: "Product rule",
    });
    expect(result.id).toBe("product-rule");
    expect(result.difficulty).toBeUndefined();
  });

  it("accepts difficulty enum values", () => {
    for (const difficulty of ["easy", "medium", "hard"] as const) {
      const result = TopicCardMetadataSchema.parse({
        id: "c1",
        label: "C1",
        difficulty,
      });
      expect(result.difficulty).toBe(difficulty);
    }
  });

  it("rejects unknown difficulty values", () => {
    expect(() =>
      TopicCardMetadataSchema.parse({
        id: "c1",
        label: "C1",
        difficulty: "expert",
      }),
    ).toThrow();
  });
});
