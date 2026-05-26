import type { CourseSpec } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import {
  COURSE_SPEC_VIRTUAL_ID,
  courseSpecVirtualModule,
} from "./course-spec-virtual-module.ts";

/**
 * Unit coverage for `courseSpecVirtualModule()` — the Vite plugin
 * that exposes the consumer's parsed `course.sophie.yaml` as the
 * `virtual:sophie/course-spec` module. Mirrors figures-virtual-module
 * test shape per ADR 0082 precedent.
 */

const RESOLVED_ID = `\0${COURSE_SPEC_VIRTUAL_ID}`;

const FIXTURE_SPEC = {
  identity: {
    id: "test-101",
    title: "Test Course",
    code: "TEST 101",
    term: "Spring 2027",
    institution: "Test U",
    instructor: "Test Instructor",
    voice: "test",
    voice_register: "test",
    subtitle: "Test subtitle",
    description: "Test description",
  },
  objectives: [{ id: "lo-1", verb: "Test", body: "the virtual module" }],
} as unknown as CourseSpec;

describe("courseSpecVirtualModule — resolveId", () => {
  test("resolves the public virtual id to the canonical internal id", () => {
    const plugin = courseSpecVirtualModule(FIXTURE_SPEC);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(COURSE_SPEC_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = courseSpecVirtualModule(FIXTURE_SPEC);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId("react")).toBeUndefined();
    expect(resolveId("./local-file.ts")).toBeUndefined();
    expect(resolveId("virtual:sophie/figures")).toBeUndefined();
    expect(resolveId("virtual:sophie/pedagogy-index")).toBeUndefined();
  });
});

describe("courseSpecVirtualModule — load", () => {
  test("emits a JS module exporting `courseSpec` for the resolved id", () => {
    const plugin = courseSpecVirtualModule(FIXTURE_SPEC);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const courseSpec");
    expect(code).toContain("test-101");
    expect(code).toContain("lo-1");
  });

  test("returns undefined for unrelated ids", () => {
    const plugin = courseSpecVirtualModule(FIXTURE_SPEC);
    const load = plugin.load as (id: string) => string | undefined;
    expect(load("\0virtual:sophie/figures")).toBeUndefined();
    expect(load("react")).toBeUndefined();
  });
});

describe("courseSpecVirtualModule — plugin shape", () => {
  test("names the plugin so Vite can dedupe + report", () => {
    const plugin = courseSpecVirtualModule(FIXTURE_SPEC);
    expect(plugin.name).toBe("sophie:course-spec");
  });

  test("does not expose handleHotUpdate (no HMR by design — R8)", () => {
    const plugin = courseSpecVirtualModule(FIXTURE_SPEC);
    expect("handleHotUpdate" in plugin).toBe(false);
  });
});

describe("courseSpecVirtualModule — null-spec back-compat", () => {
  test("emits `courseSpec = null` when no spec is loaded (consumer hasn't authored course.sophie.yaml yet)", () => {
    const plugin = courseSpecVirtualModule(null);
    const load = plugin.load as (id: string) => string | undefined;
    const code = load(RESOLVED_ID);
    expect(code).toBeDefined();
    expect(code).toContain("export const courseSpec = null");
  });

  test("still resolves the virtual id when spec is null (import always succeeds)", () => {
    const plugin = courseSpecVirtualModule(null);
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    expect(resolveId(COURSE_SPEC_VIRTUAL_ID)).toBe(RESOLVED_ID);
  });
});
