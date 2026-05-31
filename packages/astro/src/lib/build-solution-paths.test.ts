import type { HomeworkRegistry } from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import {
  buildSolutionPaths,
  type SolutionArtifactLike,
  type SolutionUnitLike,
} from "./build-solution-paths.ts";

// Structural fixtures — decoupled from astro:content so this stays testable
// without the Astro runtime (mirrors artifacts-from-collection.test.ts).

const artifact = (id: string): SolutionArtifactLike => ({
  id,
  data: { id, title: `Solutions for ${id}` },
});

const unit = (
  id: string,
  overrides: Partial<SolutionUnitLike["data"]> = {}
): SolutionUnitLike => ({
  data: { id, status: "stable", ...overrides },
});

const reg = (unitId: string, dueDate: string): HomeworkRegistry => ({
  homework: [
    {
      id: "hw-1",
      title: "x",
      assignedDate: "2027-01-01",
      dueDate,
      problems: [{ unit: unitId, ids: ["p1"] }],
    },
  ],
});

const at = (d: string) => new Date(d);

describe("buildSolutionPaths", () => {
  it("revealed unit: entry CARRIES the artifact + revealed:true", () => {
    const a = artifact("sec/units/u1/solutions");
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
    const a = artifact("sec/units/u1/solutions");
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
      [artifact("sec/units/u1/solutions")],
      [unit("u1", { status: "draft" })],
      reg("u1", "2020-01-01"),
      at("2030-01-01")
    );
    expect(paths).toHaveLength(0);
  });

  it("empty-string solutionsRevealDate (falsy) derives from registry — stays fail-closed", () => {
    const a = artifact("sec/units/u1/solutions");
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
      [artifact("sec/units/u1/solutions")],
      [unit("u1", { solutionsRevealDate: "" })],
      null,
      at("2030-01-01")
    );
    expect(paths[0]?.props.revealed).toBe(false);
    expect(paths[0]?.props.artifact).toBeUndefined();
    expect(paths[0]?.props.resolvedDate).toBeNull();
  });

  it("explicit override wins over derived registry date", () => {
    const a = artifact("sec/units/u1/solutions");
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

  it("skips artifacts that are not /solutions", () => {
    const paths = buildSolutionPaths(
      [artifact("sec/units/u1/practice")],
      [unit("u1")],
      reg("u1", "2020-01-01"),
      at("2030-01-01")
    );
    expect(paths).toHaveLength(0);
  });

  it("skips a solutions artifact whose unit is absent from the units collection", () => {
    const paths = buildSolutionPaths(
      [artifact("sec/units/ghost/solutions")],
      [unit("u1")],
      reg("ghost", "2020-01-01"),
      at("2030-01-01")
    );
    expect(paths).toHaveLength(0);
  });
});
