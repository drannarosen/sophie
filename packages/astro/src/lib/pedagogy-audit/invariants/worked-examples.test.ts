import type { PedagogyIndex, WorkedExampleEntry } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkWorkedExamples } from "./worked-examples.ts";

/**
 * Direct invariant tests. We build the minimum PedagogyIndex shape
 * `checkWorkedExamples` reads (`workedExamples` only) and assert
 * sink contents. The runner integration tests cover the
 * orchestration path; these tests pin down WE-1 + WE-2 semantics.
 */

const emptySink = (): FindingSink => ({ errors: [], warnings: [], info: [] });

function indexWith(workedExamples: WorkedExampleEntry[]): PedagogyIndex {
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
    workedExamples,
    formatives: [],
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

const we = (
  overrides: Partial<WorkedExampleEntry["slots"]> & {
    anchor?: string;
    unit?: string;
  } = {}
): WorkedExampleEntry => ({
  unit: overrides.unit ?? "ch",
  anchor: overrides.anchor ?? "we-1",
  number: 1,
  slots: {
    problem: overrides.problem ?? true,
    steps: overrides.steps ?? 0,
    dimChecks: overrides.dimChecks ?? 0,
    result: overrides.result ?? true,
  },
});

describe("checkWorkedExamples — WE-1 (units-at-every-step)", () => {
  it("emits a WARNING when steps ≥ 1 AND dimChecks === 0", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([we({ steps: 3, dimChecks: 0 })]), sink);
    const we1 = sink.warnings.filter((f) => f.code === "WE-1");
    expect(we1).toHaveLength(1);
    expect(we1[0]?.message).toMatch(/QB6/);
  });

  it("does NOT emit WE-1 when steps === 0 (conceptual examples are exempt)", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([we({ steps: 0, dimChecks: 0 })]), sink);
    expect(sink.warnings.filter((f) => f.code === "WE-1")).toEqual([]);
  });

  it("does NOT emit WE-1 when at least one DimCheck is present", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([we({ steps: 5, dimChecks: 1 })]), sink);
    expect(sink.warnings.filter((f) => f.code === "WE-1")).toEqual([]);
  });
});

describe("checkWorkedExamples — WE-2 (Problem + Result completeness)", () => {
  it("emits an ERROR when Problem is missing", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([we({ problem: false })]), sink);
    const we2 = sink.errors.filter((f) => f.code === "WE-2");
    expect(we2).toHaveLength(1);
    expect(we2[0]?.message).toMatch(/Problem/);
  });

  it("emits an ERROR when Result is missing", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([we({ result: false })]), sink);
    const we2 = sink.errors.filter((f) => f.code === "WE-2");
    expect(we2).toHaveLength(1);
    expect(we2[0]?.message).toMatch(/Result/);
  });

  it("emits TWO errors when both Problem and Result are missing", () => {
    const sink = emptySink();
    checkWorkedExamples(
      indexWith([we({ problem: false, result: false })]),
      sink
    );
    expect(sink.errors.filter((f) => f.code === "WE-2")).toHaveLength(2);
  });

  it("does NOT emit WE-2 when both Problem and Result are present", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([we()]), sink);
    expect(sink.errors.filter((f) => f.code === "WE-2")).toEqual([]);
  });
});

describe("checkWorkedExamples — no findings on empty index", () => {
  it("emits nothing when there are zero WorkedExamples", () => {
    const sink = emptySink();
    checkWorkedExamples(indexWith([]), sink);
    expect(sink.errors).toEqual([]);
    expect(sink.warnings).toEqual([]);
    expect(sink.info).toEqual([]);
  });
});
