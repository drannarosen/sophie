import type { HomeworkRegistry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  HOMEWORK_VIRTUAL_ID,
  homeworkVirtualModule,
} from "./homework-virtual-module.ts";

/**
 * Unit coverage for `homeworkVirtualModule()` — the Vite plugin that
 * exposes the consumer's parsed `homework.sophie.yaml` as the
 * `virtual:sophie/homework` module. Mirrors course-spec-virtual-module
 * test shape per ADR 0096 precedent (always-register, `T | null`).
 */

const RESOLVED_ID = `\0${HOMEWORK_VIRTUAL_ID}`;

const FIXTURE_REGISTRY = {
  homework: [
    {
      id: "hw-1",
      title: "Problem Set 1",
      assignedDate: "2027-01-15",
      dueDate: "2027-02-01",
      problems: [{ unit: "u1", ids: ["p1", "p2"] }],
    },
  ],
} as unknown as HomeworkRegistry;

describe("homeworkVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = homeworkVirtualModule(FIXTURE_REGISTRY);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(HOMEWORK_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = homeworkVirtualModule(FIXTURE_REGISTRY);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
    expect(resolveId("virtual:sophie/figures")).toBeUndefined();
    expect(resolveId("virtual:sophie/course-spec")).toBeUndefined();
  });
});

describe("homeworkVirtualModule — load", () => {
  test("emits a JS module exporting `homework` for the resolved id", () => {
    const plugin = homeworkVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const homework");
    expect(code).toContain("hw-1");
    expect(code).toContain("2027-02-01");
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = homeworkVirtualModule(FIXTURE_REGISTRY);
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("\0virtual:sophie/figures")).toBeUndefined();
    expect(load("react")).toBeUndefined();
  });
});

describe("homeworkVirtualModule — plugin shape", () => {
  test("names the plugin so Vite can dedupe + report", () => {
    const plugin = homeworkVirtualModule(FIXTURE_REGISTRY);
    expect(plugin.name).toBe("sophie:homework");
  });

  test("does not expose handleHotUpdate (no HMR by design — R8)", () => {
    const plugin = homeworkVirtualModule(FIXTURE_REGISTRY);
    expect("handleHotUpdate" in plugin).toBe(false);
  });
});

describe("homeworkVirtualModule — null-registry (always-register)", () => {
  test("emits `homework = null` when no registry is loaded (consumer hasn't authored homework.sophie.yaml yet)", () => {
    const plugin = homeworkVirtualModule(null);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const homework = null");
  });

  test("still resolves the virtual id when registry is null (import always succeeds)", () => {
    const plugin = homeworkVirtualModule(null);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(HOMEWORK_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });
});
