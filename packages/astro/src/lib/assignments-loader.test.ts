import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadAssignments } from "./assignments-loader.ts";

/**
 * Minimal valid assignments registry YAML for tests. A single assignment with
 * id/title/kind/assignedDate/dueDate/problems — the smallest gating shape that
 * satisfies AssignmentRegistrySchema (ADR 0096).
 */
const MINIMAL_VALID_ASSIGNMENTS = `
assignments:
  - id: hw-3
    title: Homework 3 — Gravity
    kind: homework
    assignedDate: "2027-02-06"
    dueDate: "2027-02-20"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04", "grav-pr-09"]
      - unit: lecture-01-ages-lifetimes
        ids: ["ages-pr-03"]
`;

describe("loadAssignments", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-assignments-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("returns null when assignments.sophie.yaml is missing", () => {
    expect(loadAssignments(root)).toBeNull();
  });

  test("loads + parses a valid registry", () => {
    fs.writeFileSync(
      path.join(root, "assignments.sophie.yaml"),
      MINIMAL_VALID_ASSIGNMENTS
    );
    const registry = loadAssignments(root);
    expect(registry?.assignments[0]?.id).toBe("hw-3");
    expect(registry?.assignments[0]?.problems?.[0]?.unit).toBe(
      "lecture-03-gravity-and-orbits"
    );
  });

  test("loads a problemless assignment (a project has no problems)", () => {
    fs.writeFileSync(
      path.join(root, "assignments.sophie.yaml"),
      `
assignments:
  - id: project-1
    title: Final Project
    kind: project
    assignedDate: "2027-03-06"
    dueDate: "2027-05-08"
`
    );
    const registry = loadAssignments(root);
    expect(registry?.assignments[0]?.id).toBe("project-1");
    expect(registry?.assignments[0]?.problems).toBeUndefined();
  });

  test("throws curated error on malformed YAML", () => {
    // Unterminated flow sequence — genuinely unparseable YAML, so this
    // exercises the parseYaml() catch branch (distinct from the
    // schema-invalid path covered by the tests below).
    fs.writeFileSync(
      path.join(root, "assignments.sophie.yaml"),
      "assignments: ["
    );
    expect(() => loadAssignments(root)).toThrow(/assignments\.sophie\.yaml/i);
  });

  test("throws schema-invalid error when a problem is claimed by two assignments", () => {
    fs.writeFileSync(
      path.join(root, "assignments.sophie.yaml"),
      `
assignments:
  - id: hw-3
    title: Homework 3
    kind: homework
    assignedDate: "2027-02-06"
    dueDate: "2027-02-20"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04"]
  - id: hw-4
    title: Homework 4
    kind: homework
    assignedDate: "2027-02-20"
    dueDate: "2027-03-06"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04"]
`
    );
    expect(() => loadAssignments(root)).toThrow(/assignments\.sophie\.yaml/i);
  });

  test("throws schema-invalid error when assignedDate is after dueDate", () => {
    fs.writeFileSync(
      path.join(root, "assignments.sophie.yaml"),
      `
assignments:
  - id: hw-3
    title: Homework 3
    kind: homework
    assignedDate: "2027-03-01"
    dueDate: "2027-02-20"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04"]
`
    );
    expect(() => loadAssignments(root)).toThrow(/assignments\.sophie\.yaml/i);
  });
});
