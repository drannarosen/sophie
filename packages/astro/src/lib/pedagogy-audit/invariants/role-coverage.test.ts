import type {
  MisconceptionEntry,
  OMIFlowEntry,
  PedagogyIndex,
  UnitEntry,
  WorkedExampleEntry,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * RC1 / RC2 — epistemic-role coverage (ADR 0058 R-audit-consumes-role).
 * The audit joins chapter-keyed index collections to the declared role
 * registry, so these tests pin the collection → role attribution.
 */

const unit = (id: string): UnitEntry => ({
  id,
  type: "lecture",
  title: id,
  order: 1,
  prereqs: [],
  section_id: "core",
  chapter: id,
  status: "stable",
});

const slot = { title: "", body: "" };
const omiFlow = (unitId: string): OMIFlowEntry => ({
  unit: unitId,
  anchor: "omi-1",
  observable: slot,
  model: slot,
  inference: slot,
  sourceOrder: ["observable", "model", "inference"],
});

const workedExample = (unitId: string): WorkedExampleEntry => ({
  unit: unitId,
  anchor: "we-1",
  number: 1,
  slots: { problem: true, steps: 2, dimChecks: 0, result: true },
});

const misconception = (unitId: string): MisconceptionEntry => ({
  body: "a common confusion",
  unit: unitId,
  anchor: "misc-1",
  length: "short",
  slug: `${unitId}-misc`,
});

function rc1For(
  report: { info: { code: string; message: string }[] },
  u: string
) {
  return report.info.find(
    (f) => f.code === "RC1" && f.message.includes(`"${u}"`)
  );
}

describe("RC1 — per-chapter epistemic-role coverage", () => {
  it("attributes observable/model/inference (omiFlows) + numerical (workedExamples) to a chapter", () => {
    const index: PedagogyIndex = buildPedagogyIndex({
      units: [unit("ch-a")],
      omiFlows: [omiFlow("ch-a")],
      workedExamples: [workedExample("ch-a")],
    });
    const report = runPedagogyAudit(index);
    const rc1 = rc1For(report, "ch-a");
    expect(rc1).toBeDefined();
    // 4 of 5 attributable roles present; misconception absent.
    expect(rc1?.message).toContain("4/5");
    expect(rc1?.message).toContain("observable, model, inference, numerical");
    expect(rc1?.message).toContain("absent: misconception");
  });

  it("attributes misconception (misconceptions collection) to a chapter", () => {
    const index: PedagogyIndex = buildPedagogyIndex({
      units: [unit("ch-b")],
      misconceptions: [misconception("ch-b")],
    });
    const report = runPedagogyAudit(index);
    const rc1 = rc1For(report, "ch-b");
    expect(rc1?.message).toContain("1/5");
    expect(rc1?.message).toContain("[misconception]");
  });

  it("reports a chapter that evidences zero attributable roles", () => {
    const index: PedagogyIndex = buildPedagogyIndex({ units: [unit("ch-c")] });
    const report = runPedagogyAudit(index);
    const rc1 = rc1For(report, "ch-c");
    expect(rc1?.message).toContain("0/5");
    expect(rc1?.message).toContain("[none]");
  });

  it("emits one RC1 finding per known chapter", () => {
    const index: PedagogyIndex = buildPedagogyIndex({
      units: [unit("ch-a"), unit("ch-b")],
    });
    const report = runPedagogyAudit(index);
    expect(report.info.filter((f) => f.code === "RC1")).toHaveLength(2);
  });
});

describe("RC2 — scope limit (no silent caps)", () => {
  it("emits exactly one RC2 finding naming the 5 attributable roles + the gaps", () => {
    const index: PedagogyIndex = buildPedagogyIndex({ units: [unit("ch-a")] });
    const report = runPedagogyAudit(index);
    const rc2 = report.info.filter((f) => f.code === "RC2");
    expect(rc2).toHaveLength(1);
    expect(rc2[0]?.message).toContain("5 of 8");
    expect(rc2[0]?.message).toContain("uncertainty");
    expect(rc2[0]?.message).toContain("assumption + approximation");
  });
});
