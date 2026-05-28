import type { CardEntry, TopicEntry } from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator topics + cards (registry-sourced per ADR 0079)", () => {
  const topic = (overrides: Partial<TopicEntry> = {}): TopicEntry => ({
    id: "logarithms",
    label: "Logarithms",
    summary: "Inverse of exponentiation.",
    prereq_topic_ids: [],
    linked_equation_ids: [],
    linked_misconception_ids: [],
    cards: [],
    ...overrides,
  });
  const card = (overrides: Partial<CardEntry> = {}): CardEntry => ({
    id: "product-rule",
    topic_id: "logarithms",
    label: "Product rule",
    ...overrides,
  });

  test("addTopic stores entry keyed by id; surfaced via asPedagogyIndex", () => {
    indexAccumulator.addTopic(topic({ id: "logarithms" }));
    indexAccumulator.addTopic(topic({ id: "exponents", label: "Exponents" }));
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.topics).toHaveLength(2);
    expect(index.topics.map((t) => t.id).sort()).toEqual([
      "exponents",
      "logarithms",
    ]);
  });

  test("re-adding a topic with same id overwrites (last-write-wins)", () => {
    indexAccumulator.addTopic(topic({ label: "Old" }));
    indexAccumulator.addTopic(topic({ label: "New" }));
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.topics).toHaveLength(1);
    expect(index.topics[0]?.label).toBe("New");
  });

  test("addCards stores entries keyed by topic_id#id", () => {
    indexAccumulator.addCards([
      card({ id: "product-rule" }),
      card({ id: "power-rule", label: "Power rule" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.cards).toHaveLength(2);
    expect(index.cards.map((c) => c.id).sort()).toEqual([
      "power-rule",
      "product-rule",
    ]);
  });

  test("cards from different topics with same card id do not collide", () => {
    indexAccumulator.addCards([
      card({ id: "intro", topic_id: "logarithms", label: "Log intro" }),
      card({ id: "intro", topic_id: "exponents", label: "Exp intro" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.cards).toHaveLength(2);
  });

  test("clearTopic drops a topic and its cards", () => {
    indexAccumulator.addTopic(topic({ id: "logarithms" }));
    indexAccumulator.addTopic(topic({ id: "exponents", label: "Exponents" }));
    indexAccumulator.addCards([
      card({ topic_id: "logarithms", id: "product-rule" }),
      card({ topic_id: "exponents", id: "power-laws", label: "Power laws" }),
    ]);
    indexAccumulator.clearTopic("logarithms");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.topics.map((t) => t.id)).toEqual(["exponents"]);
    expect(index.cards.map((c) => c.id)).toEqual(["power-laws"]);
  });

  test("clearUnitArtifact does NOT touch topics or cards (registry-sourced)", () => {
    indexAccumulator.addTopic(topic());
    indexAccumulator.addCards([card()]);
    indexAccumulator.clearUnitArtifact("any-unit", "reading");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.topics).toHaveLength(1);
    expect(index.cards).toHaveLength(1);
  });
});
