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

  test("PRA-2 audit honors audit_overrides on TopicEntry — override suppresses finding (frontmatter→body direction)", () => {
    // Mirror of Task 2.3 extractor-side test on the audit side: a
    // frontmatter-declared card with no matching body block is
    // suppressed when a per-card-id override matches (W4c D5).
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({
          cards: [{ id: "ghost-card", label: "Ghost card" }],
          audit_overrides: [
            {
              invariant: "PRA-2",
              anchor: "ghost-card",
              tdr: "TDR-W4c-2.4-test",
              reason: "fixture: frontmatter card declared mid-draft",
            },
          ],
        }),
      ],
      cards: [], // body has NO matching CardEntry
    };
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toEqual([]);
  });

  test("PRA-2 audit still fires when override anchor doesn't match", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({
          cards: [{ id: "ghost-card", label: "Ghost card" }],
          audit_overrides: [
            {
              invariant: "PRA-2",
              anchor: "different-card",
              tdr: "TDR-W4c-2.4-test",
              reason: "fixture: override targets a different card id",
            },
          ],
        }),
      ],
      cards: [],
    };
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "PRA-2",
      location: { unit: "logarithms", anchor: "ghost-card" },
    });
  });

  test("PRA-2 audit does NOT honor override with omitted anchor (W4c D5: no wildcard)", () => {
    // Parallel of Task 2.3 I2 regression-guard on the audit side.
    // Per W4c D5: PRA-2 rejects Grain 1 (whole-topic wildcard); only
    // Grain 2 (per-card anchor) is honored. A Grain 1 override on
    // PRA-2 must silently fail to suppress — this test locks that
    // contract against future "let's add wildcard support" pressure.
    // PRA-1 (W4b) honors both grains; the asymmetry is intentional.
    const index: PedagogyIndex = {
      ...emptyIndex(),
      topics: [
        t({
          cards: [{ id: "ghost-card", label: "Ghost card" }],
          audit_overrides: [
            {
              invariant: "PRA-2",
              // anchor deliberately omitted — Grain 1 attempt
              tdr: "TDR-W4c-D5-test",
              reason:
                "Author attempts wildcard suppression; W4c D5 rejects this.",
            },
          ],
        }),
      ],
      cards: [],
    };
    const sink = emptySink();
    checkPRA2(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.code).toBe("PRA-2");
  });
});
