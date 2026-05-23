import type {
  OMIFlowEntry,
  PedagogyIndex,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { buildPedagogyIndex } from "../test-helpers.ts";
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
  return buildPedagogyIndex();
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

describe("OF-2 — framing:'OMI' Unit requires ≥1 <OMIFlow> (ERROR)", () => {
  // W2/D2 graduation: fixtures construct UnitEntry (was ChapterEntry).
  // u.id == chapter slug (W2/D4 1:1 convention).
  const unit = (overrides: Partial<UnitEntry> = {}): UnitEntry => ({
    id: "ch",
    type: "lecture",
    title: "Title",
    order: 0,
    prereqs: [],
    section_id: "mod",
    chapter: "ch",
    status: "stable",
    ...overrides,
  });

  test("emits no finding when an OMI-framed Unit has at least one OMIFlow", () => {
    const index = {
      ...emptyIndex(),
      units: [unit({ id: "covered", chapter: "covered", framing: "OMI" })],
      omiFlows: [{ ...baseEntry, chapter: "covered" }],
    };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.errors).toEqual([]);
  });

  test("emits one ERROR per OMI-framed Unit with zero OMIFlows", () => {
    const index = {
      ...emptyIndex(),
      units: [unit({ id: "missing", chapter: "missing", framing: "OMI" })],
      omiFlows: [],
      retrievalPrompts: [],
      spacedReviews: [],
      skillReviews: [],
    };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]).toMatchObject({
      severity: "ERROR",
      code: "OF-2",
      location: { chapter: "missing" },
    });
    expect(sink.errors[0]?.message).toMatch(/framing.*OMI/);
    expect(sink.errors[0]?.message).toMatch(/zero/i);
  });

  test("emits no finding for non-OMI-framed Units regardless of OMIFlow presence", () => {
    const index = {
      ...emptyIndex(),
      units: [unit({ id: "ch-a", chapter: "ch-a" /* framing omitted */ })],
      omiFlows: [],
      retrievalPrompts: [],
      spacedReviews: [],
      skillReviews: [],
    };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.errors).toEqual([]);
  });

  test("multiple OMI-framed Units: each missing OMIFlow gets its own ERROR", () => {
    const index = {
      ...emptyIndex(),
      units: [
        unit({ id: "missing-a", chapter: "missing-a", framing: "OMI" }),
        unit({ id: "covered", chapter: "covered", framing: "OMI" }),
        unit({ id: "missing-b", chapter: "missing-b", framing: "OMI" }),
      ],
      omiFlows: [{ ...baseEntry, chapter: "covered" }],
    };
    const sink = emptySink();
    checkOMIFlow(index, sink);
    expect(sink.errors).toHaveLength(2);
    const offenders = sink.errors.map((e) => e.location?.chapter).sort();
    expect(offenders).toEqual(["missing-a", "missing-b"]);
  });
});
