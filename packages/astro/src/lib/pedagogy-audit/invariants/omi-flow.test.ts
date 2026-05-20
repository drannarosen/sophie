import type { OMIFlowEntry, PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkOMIFlow } from "./omi-flow.ts";

const slot = { title: "", body: "" };
const baseEntry: OMIFlowEntry = {
  chapter: "ch",
  anchor: "x",
  observable: slot,
  model: slot,
  inference: slot,
  sourceOrder: ["observable", "model", "inference"],
};

function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
    equationCitations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    chapters: [],
    modules: [],
    objectives: [],
    inlineRefUsages: [],
    contractValidations: [],
    extractorFindings: [],
    multiReps: [],
    interventions: [],
    deepDives: [],
    omiFlows: [],
  };
}

function emptySink(): FindingSink {
  return { errors: [], warnings: [], info: [] };
}

describe("OF-1 — OMIFlow slots out of canonical source order (WARN)", () => {
  test("emits no findings when all entries are in canonical O→M→I order", () => {
    const index = { ...emptyIndex(), omiFlows: [baseEntry] };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.warnings).toEqual([]);
    expect(sink.errors).toEqual([]);
  });

  test("emits one WARNING per out-of-order entry", () => {
    const index = {
      ...emptyIndex(),
      omiFlows: [
        {
          ...baseEntry,
          anchor: "ooo",
          sourceOrder: ["model", "observable", "inference"],
        },
      ] as OMIFlowEntry[],
    };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.warnings).toHaveLength(1);
    expect(sink.warnings[0]).toMatchObject({
      severity: "WARNING",
      code: "OF-1",
      location: { chapter: "ch", anchor: "ooo" },
    });
    expect(sink.warnings[0]?.message).toMatch(/source order/i);
    expect(sink.warnings[0]?.message).toMatch(/model.*observable.*inference/i);
  });

  test("does not WARN entries with canonical order even alongside out-of-order entries", () => {
    const index = {
      ...emptyIndex(),
      omiFlows: [
        baseEntry,
        {
          ...baseEntry,
          anchor: "ooo",
          sourceOrder: ["inference", "model", "observable"],
        },
      ] as OMIFlowEntry[],
    };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.warnings).toHaveLength(1);
    expect(sink.warnings[0]?.location?.anchor).toBe("ooo");
  });
});
