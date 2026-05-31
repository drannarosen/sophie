import type { AssignmentRegistry } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import {
  buildSolutionPaths,
  type SolutionArtifactLike,
  type SolutionUnitLike,
} from "./build-solution-paths.ts";

// Structural fixtures — decoupled from astro:content so this stays testable
// without the Astro runtime (mirrors artifacts-from-collection.test.ts).
// Inputs model entries from the dedicated `solutions` collection
// (ADR 0096 / C1), whose ids are `<sec>/units/<unit>/solutions`.

const solution = (id: string): SolutionArtifactLike => ({
  id,
  data: { id, title: `Solutions for ${id}` },
});

const unit = (
  id: string,
  overrides: Partial<SolutionUnitLike["data"]> = {}
): SolutionUnitLike => ({
  data: { id, status: "stable", ...overrides },
});

const reg = (unitId: string, dueDate: string): AssignmentRegistry => ({
  assignments: [
    {
      id: "hw-1",
      title: "x",
      kind: "homework",
      assignedDate: "2027-01-01",
      dueDate,
      problems: [{ unit: unitId, ids: ["p1"] }],
    },
  ],
});

const at = (d: string) => new Date(d);

describe("buildSolutionPaths", () => {
  it("revealed unit: entry CARRIES the artifact + revealed:true", () => {
    const a = solution("sec/units/u1/solutions");
    const paths = buildSolutionPaths(
      [a],
      [unit("u1")],
      reg("u1", "2027-02-20"),
      at("2027-02-20")
    );
    expect(paths).toHaveLength(1);
    expect(paths[0]?.params).toEqual({ unit: "u1" });
    expect(paths[0]?.props.revealed).toBe(true);
    expect(paths[0]?.props.artifact).toBe(a);
    expect(paths[0]?.props.resolvedDate).toBe("2027-02-20");
  });

  it("gated unit: entry has NO artifact (security property) + revealed:false", () => {
    const a = solution("sec/units/u1/solutions");
    const paths = buildSolutionPaths(
      [a],
      [unit("u1")],
      reg("u1", "2027-02-20"),
      at("2027-02-19") // before the due date → gated
    );
    expect(paths).toHaveLength(1);
    expect(paths[0]?.props.revealed).toBe(false);
    // SECURITY: the artifact must be absent so the route never render()s it.
    expect(paths[0]?.props.artifact).toBeUndefined();
    expect(paths[0]?.props.resolvedDate).toBe("2027-02-20");
  });

  it("excludes draft units entirely (no path emitted)", () => {
    const paths = buildSolutionPaths(
      [solution("sec/units/u1/solutions")],
      [unit("u1", { status: "draft" })],
      reg("u1", "2020-01-01"),
      at("2030-01-01")
    );
    expect(paths).toHaveLength(0);
  });

  it("empty-string solutionsRevealDate (falsy) derives from registry — stays fail-closed", () => {
    const a = solution("sec/units/u1/solutions");
    const paths = buildSolutionPaths(
      [a],
      [unit("u1", { solutionsRevealDate: "" })],
      reg("u1", "2027-02-20"),
      at("2027-02-19") // before the derived due date → gated
    );
    expect(paths).toHaveLength(1);
    expect(paths[0]?.props.revealed).toBe(false);
    expect(paths[0]?.props.artifact).toBeUndefined();
  });

  it("empty-string override + no registry → hidden (fail-closed, null date)", () => {
    const paths = buildSolutionPaths(
      [solution("sec/units/u1/solutions")],
      [unit("u1", { solutionsRevealDate: "" })],
      null,
      at("2030-01-01")
    );
    expect(paths[0]?.props.revealed).toBe(false);
    expect(paths[0]?.props.artifact).toBeUndefined();
    expect(paths[0]?.props.resolvedDate).toBeNull();
  });

  it("explicit override wins over derived registry date", () => {
    const a = solution("sec/units/u1/solutions");
    const paths = buildSolutionPaths(
      [a],
      [unit("u1", { solutionsRevealDate: "2027-01-15" })],
      reg("u1", "2027-02-20"),
      at("2027-01-15")
    );
    expect(paths[0]?.props.revealed).toBe(true);
    expect(paths[0]?.props.artifact).toBe(a);
    expect(paths[0]?.props.resolvedDate).toBe("2027-01-15");
  });

  it("processes every entry from the dedicated solutions collection (no suffix filter)", () => {
    // SECURITY (ADR 0096 / C1): solutions ride their OWN collection, so the
    // helper no longer filters by `/solutions` suffix — the glob already
    // guarantees every entry is a solution. Path-position-2 derives the unit.
    const a = solution("sec/units/u1/solutions");
    const paths = buildSolutionPaths(
      [a],
      [unit("u1")],
      reg("u1", "2027-02-20"),
      at("2027-02-20")
    );
    expect(paths).toHaveLength(1);
    expect(paths[0]?.params).toEqual({ unit: "u1" });
    expect(paths[0]?.props.artifact).toBe(a);
  });

  it("skips a solutions entry whose unit is absent from the units collection", () => {
    const paths = buildSolutionPaths(
      [solution("sec/units/ghost/solutions")],
      [unit("u1")],
      reg("ghost", "2020-01-01"),
      at("2030-01-01")
    );
    expect(paths).toHaveLength(0);
  });
});
