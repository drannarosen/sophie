import type { CardEntry, PedagogyIndex, TopicEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkPRA2 } from "./topic-consistency.ts";

function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
    equationCitations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    deepDives: [],
    omiFlows: [],
    objectives: [],
    inlineRefUsages: [],
    multiReps: [],
    interventions: [],
    contractValidations: [],
    extractorFindings: [],
    retrievalPrompts: [],
    spacedReviews: [],
    skillReviews: [],
    topics: [],
    cards: [],
    sections: [],
    units: [],
    artifacts: [],
  };
}
function emptySink(): FindingSink {
  return { errors: [], warnings: [], info: [] };
}

const t = (overrides: Partial<TopicEntry> = {}): TopicEntry => ({
  id: "logarithms",
  label: "Logarithms",
  summary: "x",
  prereq_topic_ids: [],
  linked_equation_ids: [],
  linked_misconception_ids: [],
  cards: [],
  ...overrides,
});
const c = (overrides: Partial<CardEntry> = {}): CardEntry => ({
  id: "product-rule",
  topic_id: "logarithms",
  label: "Product rule",
  ...overrides,
});

describe("PRA-2 audit — frontmatter → body card coverage (ADR 0079)", () => {
  // The body → frontmatter direction (orphan body card) is caught
  // earlier by the topic extractor, which emits a PRA-2 finding into
  // PedagogyIndex.extractorFindings (covered by `topic.test.ts`).
  // This audit pass covers the inverse: frontmatter declares a card
  // with no matching body block. The extractor cannot see that drift
  // because there's no body node to visit against the frontmatter
  // entry.

  test("no finding when frontmatter cards match body SkillReview.Card blocks", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [t({ cards: [{ id: "product-rule", label: "Product rule" }] })],
      cards: [c()],
    };
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toEqual([]);
  });

  test("ERRORs when frontmatter declares a card with no matching body block", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({
          cards: [
            { id: "product-rule", label: "Product rule" },
            { id: "power-rule", label: "Power rule" },
          ],
        }),
      ],
      cards: [c({ id: "product-rule" })], // body has product-rule but NOT power-rule
    };
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("power-rule");
    expect(sink.errors[0]?.message).toContain("frontmatter declares");
    expect(sink.errors[0]?.code).toBe("PRA-2");
    expect(sink.errors[0]?.severity).toBe("ERROR");
  });

  test("ERRORs separately for each undeclared-in-body card", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({
          cards: [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
          ],
        }),
      ],
      cards: [c({ id: "a" })], // only `a` materialized
    };
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toHaveLength(2);
    const msgs = sink.errors.map((e) => e.message).join(" ");
    expect(msgs).toContain("b");
    expect(msgs).toContain("c");
  });

  test("no findings when index has no topics", () => {
    const index = emptyIndex();
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toEqual([]);
  });
});
