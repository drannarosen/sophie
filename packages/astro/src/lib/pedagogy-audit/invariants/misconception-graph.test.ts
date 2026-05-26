import type { MisconceptionEntry, PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import { buildPedagogyIndex } from "../test-helpers.ts";

/**
 * Tests for the misconception-graph invariants implemented in
 * `misconception-graph.ts`. Split out of `runner.test.ts` per A+
 * Phase E (ADR 0061 Rule 3).
 *
 * Invariant codes covered:
 *   MG1 (ERROR)  cycle in prerequisite_misconceptions (ADR 0044)
 *   MG2 (ERROR)  prerequisite_misconceptions ordering + dangling (ADR 0044)
 */

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

describe("MG1 — cycle in prerequisite_misconceptions (ADR 0044)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => {
    const unit = overrides.unit ?? "ch-a";
    const anchor = overrides.anchor ?? "default";
    return {
      body: "<p>x</p>",
      unit,
      anchor,
      length: "short",
      slug: `${unit}-${anchor}`,
      ...overrides,
    };
  };

  it("emits an ERROR for a two-node cycle (A → B → A)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 2,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["beta"],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
    expect(mg1[0]?.message).toMatch(/alpha|beta/);
  });

  it("emits an ERROR for a three-node cycle (A → B → C → A)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 2,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
        {
          id: "ch-c",
          type: "lecture" as const,
          title: "C",
          order: 3,
          prereqs: [],
          section_id: "core",
          chapter: "ch-c",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["gamma"],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
        mc({
          unit: "ch-c",
          anchor: "gamma",
          prerequisite_misconceptions: ["beta"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
    expect(mg1[0]?.message).toMatch(/alpha/);
  });

  it("emits an ERROR for a self-cycle (A → A)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
  });

  it("does not flag a clean DAG", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 2,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
        {
          id: "ch-c",
          type: "lecture" as const,
          title: "C",
          order: 3,
          prereqs: [],
          section_id: "core",
          chapter: "ch-c",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
        mc({
          unit: "ch-c",
          anchor: "gamma",
          prerequisite_misconceptions: ["alpha", "beta"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG1")).toEqual([]);
  });

  it("does not double-report the same cycle reached from multiple start nodes", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 2,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
        {
          id: "ch-c",
          type: "lecture" as const,
          title: "C",
          order: 3,
          prereqs: [],
          section_id: "core",
          chapter: "ch-c",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["beta"],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
        mc({
          unit: "ch-c",
          anchor: "gamma",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg1 = report.errors.filter((e) => e.code === "MG1");
    expect(mg1).toHaveLength(1);
  });
});

describe("MG2 — prerequisite_misconceptions ordering + dangling (ADR 0044)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => {
    const unit = overrides.unit ?? "ch-a";
    const anchor = overrides.anchor ?? "default";
    return {
      body: "<p>x</p>",
      unit,
      anchor,
      length: "short",
      slug: `${unit}-${anchor}`,
      ...overrides,
    };
  };

  it("emits an ERROR when a prerequisite references no known misconception (dangling)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["does-not-exist"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg2 = report.errors.filter((e) => e.code === "MG2");
    expect(mg2).toHaveLength(1);
    expect(mg2[0]?.message).toContain("does-not-exist");
    expect(mg2[0]?.message).toContain("no misconception");
  });

  it("emits an ERROR when a prerequisite lives in the same chapter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          unit: "ch-a",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg2 = report.errors.filter((e) => e.code === "MG2");
    expect(mg2).toHaveLength(1);
    expect(mg2[0]?.message).toMatch(/not introduced in an earlier chapter/i);
  });

  it("emits an ERROR when a prerequisite lives in a LATER chapter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 2,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: ["beta"],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: [],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    const mg2 = report.errors.filter((e) => e.code === "MG2");
    expect(mg2).toHaveLength(1);
  });

  it("does not flag a prerequisite that lives in an earlier chapter", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 2,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });

  it("does not flag misconceptions with no prerequisite_misconceptions field (pre-ADR-0044 shape)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
      ],
      misconceptions: [mc({ unit: "ch-a", anchor: "alpha" })],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });

  it("does not flag an empty prerequisite list (declared DAG root)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });

  it("falls back to insertion order when UnitEntry.order is absent (defensive — extractor + Zod require order)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [
        {
          id: "ch-a",
          type: "lecture" as const,
          title: "A",
          order: 0,
          prereqs: [],
          section_id: "core",
          chapter: "ch-a",
          status: "stable" as const,
        },
        {
          id: "ch-b",
          type: "lecture" as const,
          title: "B",
          order: 1,
          prereqs: [],
          section_id: "core",
          chapter: "ch-b",
          status: "stable" as const,
        },
      ],
      misconceptions: [
        mc({
          unit: "ch-a",
          anchor: "alpha",
          prerequisite_misconceptions: [],
        }),
        mc({
          unit: "ch-b",
          anchor: "beta",
          prerequisite_misconceptions: ["alpha"],
        }),
      ],
    };
    const report = runPedagogyAudit(index);
    expect(report.errors.filter((e) => e.code === "MG2")).toEqual([]);
  });
});
