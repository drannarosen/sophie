import { describe, expect, it } from "vitest";
import { CardEntrySchema } from "./card.ts";

describe("CardEntrySchema (ADR 0079)", () => {
  it("parses a minimal card entry (id + topic_id + label)", () => {
    const result = CardEntrySchema.parse({
      id: "product-rule",
      topic_id: "logarithms",
      label: "Product rule",
    });
    expect(result.id).toBe("product-rule");
    expect(result.topic_id).toBe("logarithms");
    expect(result.difficulty).toBeUndefined();
  });

  it("parses a card entry with difficulty", () => {
    const result = CardEntrySchema.parse({
      id: "product-rule",
      topic_id: "logarithms",
      label: "Product rule",
      difficulty: "easy",
    });
    expect(result.difficulty).toBe("easy");
  });

  it("rejects non-slug id", () => {
    expect(() =>
      CardEntrySchema.parse({
        id: "Has Spaces",
        topic_id: "logarithms",
        label: "X",
      }),
    ).toThrow();
  });

  it("rejects non-slug topic_id", () => {
    expect(() =>
      CardEntrySchema.parse({
        id: "product-rule",
        topic_id: "Has Spaces",
        label: "X",
      }),
    ).toThrow();
  });

  it("rejects empty label", () => {
    expect(() =>
      CardEntrySchema.parse({
        id: "product-rule",
        topic_id: "logarithms",
        label: "",
      }),
    ).toThrow();
  });
});
