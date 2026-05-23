import type { SectionEntry, UnitEntry } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { buildModuleNavInputs } from "./module-nav-helpers.ts";

const section = (
  slug: string,
  overrides: Partial<SectionEntry> = {}
): SectionEntry => ({
  type: "module",
  slug,
  title: slug,
  order: 0,
  ...overrides,
});

const unit = (id: string, sectionId: string): UnitEntry => ({
  id,
  type: "lecture",
  title: id,
  order: 0,
  prereqs: [],
  section_id: sectionId,
  chapter: id,
  status: "stable",
});

describe("buildModuleNavInputs (W4b R+CR I5 follow-up)", () => {
  test("maps sections to NavModule shape (slug + title + order + description)", () => {
    const sections = [
      section("foundations", {
        title: "Foundations",
        order: 0,
        description: "First section",
      }),
      section("stars", { title: "Stars", order: 1 }),
    ];
    const result = buildModuleNavInputs(sections, []);
    expect(result.modules).toEqual([
      {
        slug: "foundations",
        title: "Foundations",
        order: 0,
        description: "First section",
      },
      { slug: "stars", title: "Stars", order: 1, description: undefined },
    ]);
  });

  test("maps units to NavChapter shape (slug from id; module from section_id)", () => {
    const units = [unit("intro", "foundations"), unit("stellar-mass", "stars")];
    const result = buildModuleNavInputs([], units);
    expect(result.chapters).toEqual([
      { slug: "intro", title: "intro", module: "foundations", order: 0 },
      {
        slug: "stellar-mass",
        title: "stellar-mass",
        module: "stars",
        order: 0,
      },
    ]);
  });

  test("strips extra fields (chapter, status) that were previously added inline", () => {
    const result = buildModuleNavInputs([], [unit("u1", "s1")]);
    // The returned chapter shape must NOT contain `chapter` or `status`
    // — those were extras the inline duplication carried but ModuleNav
    // never read.
    expect(Object.keys(result.chapters[0] ?? {})).toEqual([
      "slug",
      "title",
      "module",
      "order",
    ]);
  });

  test("filters bridge sections out of modules (ADR 0068 Scale 1; bridges render at Course root, not in module tree)", () => {
    const sections = [
      section("math-fundamentals", {
        type: "bridge",
        title: "Math Fundamentals",
      }),
      section("foundations", {
        type: "module",
        title: "Foundations",
        order: 0,
      }),
      section("stars", { type: "module", title: "Stars", order: 1 }),
    ];
    const result = buildModuleNavInputs(sections, []);
    expect(result.modules.map((m) => m.slug)).toEqual(["foundations", "stars"]);
    // Bridge slug must not appear as a module.
    expect(
      result.modules.find((m) => m.slug === "math-fundamentals")
    ).toBeUndefined();
  });

  test("filters chapters whose section_id points at a filtered bridge section", () => {
    // logarithms-skill is a Unit[type=skill] under math-fundamentals (a
    // bridge). It must NOT appear in the chapter list — its parent
    // module is filtered out, and surfacing the chapter alone would
    // 404 on the /units/<u>/reading link.
    const sections = [
      section("math-fundamentals", { type: "bridge" }),
      section("foundations", { type: "module" }),
    ];
    const units = [
      unit("logarithms-skill", "math-fundamentals"),
      unit("intro", "foundations"),
    ];
    const result = buildModuleNavInputs(sections, units);
    expect(result.chapters.map((c) => c.slug)).toEqual(["intro"]);
    expect(
      result.chapters.find((c) => c.slug === "logarithms-skill")
    ).toBeUndefined();
  });

  test("returns empty arrays when no sections/units provided", () => {
    const result = buildModuleNavInputs([], []);
    expect(result.modules).toEqual([]);
    expect(result.chapters).toEqual([]);
  });

  test("preserves source order (no implicit sort)", () => {
    // Sorting is the responsibility of ModuleNav itself; the helper
    // is pure-mapping. Verify that out-of-order input flows through
    // unchanged.
    const sections = [section("b", { order: 5 }), section("a", { order: 1 })];
    const result = buildModuleNavInputs(sections, []);
    expect(result.modules.map((m) => m.slug)).toEqual(["b", "a"]);
  });
});
