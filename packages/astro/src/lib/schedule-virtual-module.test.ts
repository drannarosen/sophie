import type { Schedule } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  SCHEDULE_VIRTUAL_ID,
  scheduleVirtualModule,
} from "./schedule-virtual-module.ts";

/**
 * Unit coverage for `scheduleVirtualModule()` — the Vite plugin that
 * exposes the consumer's parsed `schedule.sophie.yaml` as the
 * `virtual:sophie/schedule` module. Mirrors assignments-virtual-module
 * test shape per ADR 0098 precedent (always-register, `T | null`).
 */

const RESOLVED_ID = `\0${SCHEDULE_VIRTUAL_ID}`;

const FIXTURE_SCHEDULE = {
  term_start: "2027-01-19",
  entries: [
    {
      date: "2027-01-20",
      kind: "lecture",
      title: "Lecture 1 — Ages and Lifetimes",
      unit: "lecture-01-ages-lifetimes",
    },
  ],
} as unknown as Schedule;

describe("scheduleVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = scheduleVirtualModule(FIXTURE_SCHEDULE);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(SCHEDULE_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = scheduleVirtualModule(FIXTURE_SCHEDULE);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
    expect(resolveId("virtual:sophie/figures")).toBeUndefined();
    expect(resolveId("virtual:sophie/assignments")).toBeUndefined();
  });
});

describe("scheduleVirtualModule — load", () => {
  test("emits a JS module exporting `schedule` for the resolved id", () => {
    const plugin = scheduleVirtualModule(FIXTURE_SCHEDULE);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const schedule");
    expect(code).toContain("lecture-01-ages-lifetimes");
    expect(code).toContain("2027-01-20");
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = scheduleVirtualModule(FIXTURE_SCHEDULE);
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("\0virtual:sophie/figures")).toBeUndefined();
    expect(load("react")).toBeUndefined();
  });
});

describe("scheduleVirtualModule — plugin shape", () => {
  test("names the plugin so Vite can dedupe + report", () => {
    const plugin = scheduleVirtualModule(FIXTURE_SCHEDULE);
    expect(plugin.name).toBe("sophie:schedule");
  });

  test("does not expose handleHotUpdate (no HMR by design — R8)", () => {
    const plugin = scheduleVirtualModule(FIXTURE_SCHEDULE);
    expect("handleHotUpdate" in plugin).toBe(false);
  });
});

describe("scheduleVirtualModule — null-schedule (always-register)", () => {
  test("emits `schedule = null` when no schedule is loaded (consumer hasn't authored schedule.sophie.yaml yet)", () => {
    const plugin = scheduleVirtualModule(null);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const schedule = null");
  });

  test("still resolves the virtual id when schedule is null (import always succeeds)", () => {
    const plugin = scheduleVirtualModule(null);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(SCHEDULE_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });
});
