import type {
  ObjectiveEntry,
  PedagogyIndex,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * Tests for the objectives invariants implemented in `objectives.ts`.
 * Split out of `runner.test.ts` per A+ Phase E (ADR 0061 Rule 3).
 *
 * Invariant codes covered:
 *   O1 (ERROR)    duplicate objective id within a chapter (defense-in-depth)
 *   O2 (WARNING)  chapter with zero objectives
 */

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

const unitSpoiler: UnitEntry = {
  id: "spoiler-alerts",
  type: "lecture",
  title: "Spoiler Alerts",
  order: 1,
  prereqs: [],
  section_id: "core",
  chapter: "spoiler-alerts",
  status: "stable",
};

describe("O1 — duplicate objective id within a chapter (defense-in-depth)", () => {
  // The extractor already throws on O1 (see extractObjectives), so by the
  // time the audit runs against the index, no duplicates should remain.
  // The audit still parallels the check for defense-in-depth in case the
  // extractor bypass path (e.g. external accumulator population) admits
  // duplicates.
  it("emits an ERROR when two objectives share an id within the same chapter", () => {
    const a: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "first",
      unit: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const b: ObjectiveEntry = {
      id: "lo-1",
      verb: "Understand",
      body: "second",
      unit: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      objectives: [a, b],
      units: [unitSpoiler],
    };
    const report = runPedagogyAudit(index);
    const o1 = report.errors.filter((e) => e.code === "O1");
    expect(o1).toHaveLength(1);
    expect(o1[0]).toMatchObject({ severity: "ERROR", code: "O1" });
    expect(o1[0]?.message).toContain("lo-1");
  });

  it("does not flag the same id across different chapters", () => {
    const a: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "first",
      unit: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const b: ObjectiveEntry = {
      id: "lo-1",
      verb: "Understand",
      body: "second",
      unit: "measuring-the-sky",
      anchor: "lo-lo-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      objectives: [a, b],
      units: [
        unitSpoiler,
        {
          id: "measuring-the-sky",
          type: "lecture",
          title: "Measuring",
          order: 0,
          prereqs: [],
          section_id: "core",
          chapter: "measuring-the-sky",
          status: "stable",
        },
      ],
    };
    const report = runPedagogyAudit(index);
    const o1 = report.errors.filter((e) => e.code === "O1");
    expect(o1).toEqual([]);
  });
});

describe("O2 — chapter with zero objectives (WARNING)", () => {
  it("emits a WARNING for every chapter that has no objectives", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitSpoiler],
      objectives: [],
    };
    const report = runPedagogyAudit(index);
    const o2 = report.warnings.filter((w) => w.code === "O2");
    expect(o2).toHaveLength(1);
    expect(o2[0]).toMatchObject({ severity: "WARNING", code: "O2" });
    expect(o2[0]?.message).toContain("spoiler-alerts");
  });

  it("does not flag a chapter that has at least one objective", () => {
    const obj: ObjectiveEntry = {
      id: "lo-1",
      verb: "Recognize",
      body: "body",
      unit: "spoiler-alerts",
      anchor: "lo-lo-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitSpoiler],
      objectives: [obj],
    };
    const report = runPedagogyAudit(index);
    const o2 = report.warnings.filter((w) => w.code === "O2");
    expect(o2).toEqual([]);
  });
});
