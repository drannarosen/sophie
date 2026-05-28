import type { FormativeEntry, PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkFormative } from "./formative.ts";

/**
 * Direct invariant tests for AS-2 (no Solution, WARN) and AS-3
 * (fill-blank zero blanks, WARN) — the two AS-N invariants derived
 * from the materialized index. AS-1 / AS-4 / AS-5 are pushed by the
 * extractor (count-bearing detection); they are exercised in
 * `extractors/formative.test.ts`, not here.
 */

const emptySink = (): FindingSink => ({ errors: [], warnings: [], info: [] });

function indexWith(formatives: FormativeEntry[]): PedagogyIndex {
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
    workedExamples: [],
    formatives,
    objectives: [],
    inlineRefUsages: [],
    multiReps: [],
    interventions: [],
    retrievalPrompts: [],
    spacedReviews: [],
    skillReviews: [],
    sections: [],
    units: [],
    artifacts: [],
    topics: [],
    cards: [],
    contractValidations: [],
    extractorFindings: [],
  } as PedagogyIndex;
}

const entry = (overrides: Partial<FormativeEntry>): FormativeEntry => ({
  unit: "u",
  anchor: "form-1",
  kind: "quickcheck",
  prompt: "Why?",
  answer: { type: "solution-only" },
  hasSolution: true,
  hintCount: 0,
  ...overrides,
});

describe("checkFormative — AS-2 (no Solution, WARN)", () => {
  it("fires when a formative item has no Solution", () => {
    const sink = emptySink();
    checkFormative(indexWith([entry({ hasSolution: false })]), sink);
    const as2 = sink.warnings.filter((f) => f.code === "AS-2");
    expect(as2).toHaveLength(1);
    expect(as2[0]).toMatchObject({
      severity: "WARNING",
      location: { unit: "u", anchor: "form-1" },
    });
  });

  it("stays silent when a Solution is present", () => {
    const sink = emptySink();
    checkFormative(indexWith([entry({ hasSolution: true })]), sink);
    expect(sink.warnings.filter((f) => f.code === "AS-2")).toHaveLength(0);
  });
});

describe("checkFormative — AS-3 (fill-blank zero blanks, WARN)", () => {
  it("fires when a fill-blank has zero blanks", () => {
    const sink = emptySink();
    checkFormative(
      indexWith([
        entry({
          kind: "fill-blank",
          anchor: "form-2",
          answer: { type: "fill-blank", blanks: [] },
        }),
      ]),
      sink
    );
    const as3 = sink.warnings.filter((f) => f.code === "AS-3");
    expect(as3).toHaveLength(1);
    expect(as3[0]).toMatchObject({
      severity: "WARNING",
      location: { unit: "u", anchor: "form-2" },
    });
  });

  it("stays silent when a fill-blank has at least one blank", () => {
    const sink = emptySink();
    checkFormative(
      indexWith([
        entry({
          kind: "fill-blank",
          answer: { type: "fill-blank", blanks: [{ id: "b1", correct: "x" }] },
        }),
      ]),
      sink
    );
    expect(sink.warnings.filter((f) => f.code === "AS-3")).toHaveLength(0);
  });

  it("does not fire AS-3 for a non-fill-blank kind", () => {
    const sink = emptySink();
    checkFormative(indexWith([entry({ hasSolution: true })]), sink);
    expect(sink.warnings.filter((f) => f.code === "AS-3")).toHaveLength(0);
  });
});
