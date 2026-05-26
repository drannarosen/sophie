import type { PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * Tests for the chapter-status invariants implemented in
 * `chapter-status.ts`. Split out of `runner.test.ts` per A+ Phase E
 * (ADR 0061 Rule 3).
 *
 * Invariant codes covered:
 *   CS2 (INFO)  draft chapters excluded from student build (ADR 0051)
 */

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

describe("CS2 — draft chapters excluded from student build (ADR 0051)", () => {
  it("emits no CS2 finding when no draft slugs are passed", () => {
    const report = runPedagogyAudit(emptyIndex());
    expect(report.info.filter((i) => i.code === "CS2")).toEqual([]);
  });

  it("emits no CS2 finding for an empty draft slug array", () => {
    const report = runPedagogyAudit(emptyIndex(), { draftUnitIds: [] });
    expect(report.info.filter((i) => i.code === "CS2")).toEqual([]);
  });

  it("emits one INFO per draft chapter slug", () => {
    const report = runPedagogyAudit(emptyIndex(), {
      draftUnitIds: ["in-progress", "scratch-chapter"],
    });
    const cs2 = report.info.filter((i) => i.code === "CS2");
    expect(cs2).toHaveLength(2);
    expect(cs2[0]).toMatchObject({ severity: "INFO", code: "CS2" });
    expect(cs2[0]?.message).toContain("in-progress");
    expect(cs2[0]?.location).toMatchObject({ unit: "in-progress" });
    expect(cs2[1]?.message).toContain("scratch-chapter");
  });

  it("CS2 message mentions student-build exclusion + ADR 0051", () => {
    const report = runPedagogyAudit(emptyIndex(), {
      draftUnitIds: ["wip"],
    });
    const cs2 = report.info.find((i) => i.code === "CS2");
    expect(cs2?.message).toMatch(/excluded from the student build/i);
    expect(cs2?.message).toContain("ADR 0051");
  });
});
