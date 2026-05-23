import type { CardEntry, PedagogyIndex, TopicEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
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
function emptySink() {
  return { errors: [], warnings: [], infos: [] } as {
    errors: unknown[];
    warnings: unknown[];
    infos: unknown[];
  };
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

describe("PRA-2 — topic frontmatter ↔ body card consistency (ADR 0079)", () => {
  test("no finding when frontmatter cards match body SkillReview.Card blocks", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({ cards: [{ id: "product-rule", label: "Product rule" }] }),
      ],
      cards: [c()],
    };
    const sink = emptySink();
    // biome-ignore lint/suspicious/noExplicitAny: test sink shape
    checkPRA2(index, sink as any);
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
    // biome-ignore lint/suspicious/noExplicitAny: test sink shape
    checkPRA2(index, sink as any);
    expect(sink.errors).toHaveLength(1);
    expect((sink.errors[0] as { message: string }).message).toContain(
      "power-rule",
    );
    expect((sink.errors[0] as { message: string }).message).toContain(
      "frontmatter declares",
    );
  });

  test("ERRORs when body has SkillReview.Card not declared in frontmatter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({ cards: [{ id: "product-rule", label: "Product rule" }] }),
      ],
      cards: [
        c({ id: "product-rule" }),
        c({ id: "orphan-card", label: "Orphan" }),
      ],
    };
    const sink = emptySink();
    // biome-ignore lint/suspicious/noExplicitAny: test sink shape
    checkPRA2(index, sink as any);
    expect(sink.errors).toHaveLength(1);
    expect((sink.errors[0] as { message: string }).message).toContain(
      "orphan-card",
    );
    expect((sink.errors[0] as { message: string }).message).toContain(
      "body has",
    );
  });

  test("emits two findings for both directions of mismatch", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({
          cards: [{ id: "declared-not-in-body", label: "X" }],
        }),
      ],
      cards: [c({ id: "in-body-not-declared", label: "Y" })],
    };
    const sink = emptySink();
    // biome-ignore lint/suspicious/noExplicitAny: test sink shape
    checkPRA2(index, sink as any);
    expect(sink.errors).toHaveLength(2);
  });

  test("no findings when index has no topics", () => {
    const index = emptyIndex();
    const sink = emptySink();
    // biome-ignore lint/suspicious/noExplicitAny: test sink shape
    checkPRA2(index, sink as any);
    expect(sink.errors).toEqual([]);
  });
});
