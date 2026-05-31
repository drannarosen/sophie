import type { AssignmentRegistry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  ASSIGNMENTS_VIRTUAL_ID,
  assignmentsVirtualModule,
} from "./assignments-virtual-module.ts";

/**
 * Unit coverage for `assignmentsVirtualModule()` — the Vite plugin that
 * exposes the consumer's parsed `assignments.sophie.yaml` as the
 * `virtual:sophie/assignments` module. Mirrors course-spec-virtual-module
 * test shape per ADR 0096 precedent (always-register, `T | null`).
 */

const RESOLVED_ID = `\0${ASSIGNMENTS_VIRTUAL_ID}`;

const FIXTURE_REGISTRY = {
  assignments: [
    {
      id: "hw-1",
      title: "Problem Set 1",
      kind: "homework",
      assignedDate: "2027-01-15",
      dueDate: "2027-02-01",
      problems: [{ unit: "u1", ids: ["p1", "p2"] }],
    },
  ],
} as unknown as AssignmentRegistry;

describe("assignmentsVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = assignmentsVirtualModule(FIXTURE_REGISTRY);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(ASSIGNMENTS_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = assignmentsVirtualModule(FIXTURE_REGISTRY);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
    expect(resolveId("virtual:sophie/figures")).toBeUndefined();
    expect(resolveId("virtual:sophie/course-spec")).toBeUndefined();
  });
});

describe("assignmentsVirtualModule — load", () => {
  test("emits a JS module exporting `assignments` for the resolved id", () => {
    const plugin = assignmentsVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const assignments");
    expect(code).toContain("hw-1");
    expect(code).toContain("2027-02-01");
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = assignmentsVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("\0virtual:sophie/figures")).toBeUndefined();
    expect(load("react")).toBeUndefined();
  });
});

describe("assignmentsVirtualModule — plugin shape", () => {
  test("names the plugin so Vite can dedupe + report", () => {
    const plugin = assignmentsVirtualModule(FIXTURE_REGISTRY);
    expect(plugin.name).toBe("sophie:assignments");
  });

  test("does not expose handleHotUpdate (no HMR by design — R8)", () => {
    const plugin = assignmentsVirtualModule(FIXTURE_REGISTRY);
    expect("handleHotUpdate" in plugin).toBe(false);
  });
});

describe("assignmentsVirtualModule — null-registry (always-register)", () => {
  test("emits `assignments = null` when no registry is loaded (consumer hasn't authored assignments.sophie.yaml yet)", () => {
    const plugin = assignmentsVirtualModule(null);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const assignments = null");
  });

  test("still resolves the virtual id when registry is null (import always succeeds)", () => {
    const plugin = assignmentsVirtualModule(null);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(ASSIGNMENTS_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });
});
