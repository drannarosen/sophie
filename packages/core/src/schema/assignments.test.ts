import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { AssignmentRegistrySchema } from "./assignments.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

interface TestAssignment {
  id: string;
  title: string;
  kind: string;
  assignedDate: string;
  dueDate: string;
  problems?: { unit: string; ids: string[] }[];
}

// Builder keeps the input fully-typed under noUncheckedIndexedAccess so the
// mutation-by-override pattern below avoids index access into arrays.
const assignment = (over: Partial<TestAssignment> = {}): TestAssignment => ({
  id: "hw-3",
  title: "Homework 3 — Gravity",
  kind: "homework",
  assignedDate: "2027-02-06",
  dueDate: "2027-02-20",
  problems: [
    {
      unit: "lecture-03-gravity-and-orbits",
      ids: ["grav-pr-04", "grav-pr-09"],
    },
    { unit: "lecture-01-ages-lifetimes", ids: ["ages-pr-03"] },
  ],
  ...over,
});

const registry = (...assignments: TestAssignment[]) => ({ assignments });

describe("AssignmentRegistrySchema", () => {
  it("accepts a valid registry", () => {
    expect(() =>
      AssignmentRegistrySchema.parse(registry(assignment()))
    ).not.toThrow();
  });

  it("accepts dueDate: tbd", () => {
    expect(() =>
      AssignmentRegistrySchema.parse(registry(assignment({ dueDate: "tbd" })))
    ).not.toThrow();
  });

  it("rejects assignedDate after dueDate", () => {
    expect(() =>
      AssignmentRegistrySchema.parse(
        registry(assignment({ assignedDate: "2027-03-01" }))
      )
    ).toThrow(/assignedDate.*dueDate/i);
  });

  it("rejects a problem claimed by two assignments", () => {
    const spec = registry(
      assignment(),
      assignment({
        id: "hw-4",
        problems: [
          { unit: "lecture-03-gravity-and-orbits", ids: ["grav-pr-04"] },
        ],
      })
    );
    expect(() => AssignmentRegistrySchema.parse(spec)).toThrow(
      /claimed by at most one/i
    );
  });

  it("rejects an empty ids array", () => {
    const spec = registry(
      assignment({
        problems: [{ unit: "lecture-03-gravity-and-orbits", ids: [] }],
      })
    );
    expect(() => AssignmentRegistrySchema.parse(spec)).toThrow();
  });

  it("accepts the valid YAML fixture", () => {
    expect(() =>
      AssignmentRegistrySchema.parse(loadFixture("assignments-valid.yaml"))
    ).not.toThrow();
  });

  it("rejects the duplicate-claim YAML fixture", () => {
    expect(() =>
      AssignmentRegistrySchema.parse(
        loadFixture("invalid/assignments-duplicate-claim.yaml")
      )
    ).toThrow(/claimed by at most one/i);
  });

  // ── Generalization cases (ADR 0096 Amendment 1) ──────────────────────────

  it("accepts a free, consumer-owned slug for `kind`", () => {
    // `kind` is an open Slug, not a closed enum — courses own their
    // vocabulary (growth-memo, grade-memo, lab, …) without a platform PR.
    expect(() =>
      AssignmentRegistrySchema.parse(
        registry(assignment({ kind: "growth-memo" }))
      )
    ).not.toThrow();
  });

  it("rejects a non-slug `kind` (e.g. with a space)", () => {
    // Humanizing for display means the stored value must be a clean slug;
    // `"Home Work"` is not kebab-case so it must fail at parse.
    expect(() =>
      AssignmentRegistrySchema.parse(
        registry(assignment({ kind: "Home Work" }))
      )
    ).toThrow();
  });

  it("accepts an assignment WITHOUT `problems` (e.g. a project)", () => {
    // `problems` is optional; an assignment that ships no gradable problems
    // (a project, a memo) is valid and never gates a solution reveal.
    expect(() =>
      AssignmentRegistrySchema.parse(
        registry(
          assignment({
            id: "project-1",
            kind: "project",
            problems: undefined,
          })
        )
      )
    ).not.toThrow();
  });

  it("duplicate-claim refine is optional-aware (skips problemless entries)", () => {
    // An entry with no `problems` contributes nothing to the uniqueness
    // scan, so a problemless assignment alongside a problem-bearing one is
    // valid (the refine must not crash on the absent `problems`).
    const spec = registry(
      assignment({ id: "project-1", kind: "project", problems: undefined }),
      assignment()
    );
    expect(() => AssignmentRegistrySchema.parse(spec)).not.toThrow();
  });
});
