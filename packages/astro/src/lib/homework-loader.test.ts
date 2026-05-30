import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadHomework } from "./homework-loader.js";

/**
 * Minimal valid homework registry YAML for tests. A single homework with
 * id/title/assignedDate/dueDate/problems — the smallest shape that
 * satisfies HomeworkRegistrySchema (ADR 0096).
 */
const MINIMAL_VALID_HOMEWORK = `
homework:
  - id: hw-3
    title: Homework 3 — Gravity
    assignedDate: "2027-02-06"
    dueDate: "2027-02-20"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04", "grav-pr-09"]
      - unit: lecture-01-ages-lifetimes
        ids: ["ages-pr-03"]
`;

describe("loadHomework", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-homework-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("returns null when homework.sophie.yaml is missing", () => {
    expect(loadHomework(root)).toBeNull();
  });

  test("loads + parses a valid registry", () => {
    fs.writeFileSync(
      path.join(root, "homework.sophie.yaml"),
      MINIMAL_VALID_HOMEWORK
    );
    const registry = loadHomework(root);
    expect(registry?.homework[0]?.id).toBe("hw-3");
    expect(registry?.homework[0]?.problems[0]?.unit).toBe(
      "lecture-03-gravity-and-orbits"
    );
  });

  test("throws curated error on malformed YAML", () => {
    fs.writeFileSync(
      path.join(root, "homework.sophie.yaml"),
      "homework:\n  - this is not\n    a valid registry"
    );
    expect(() => loadHomework(root)).toThrow();
  });

  test("throws schema-invalid error when a problem is claimed by two homeworks", () => {
    fs.writeFileSync(
      path.join(root, "homework.sophie.yaml"),
      `
homework:
  - id: hw-3
    title: Homework 3
    assignedDate: "2027-02-06"
    dueDate: "2027-02-20"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04"]
  - id: hw-4
    title: Homework 4
    assignedDate: "2027-02-20"
    dueDate: "2027-03-06"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04"]
`
    );
    expect(() => loadHomework(root)).toThrow(/homework\.sophie\.yaml/i);
  });

  test("throws schema-invalid error when assignedDate is after dueDate", () => {
    fs.writeFileSync(
      path.join(root, "homework.sophie.yaml"),
      `
homework:
  - id: hw-3
    title: Homework 3
    assignedDate: "2027-03-01"
    dueDate: "2027-02-20"
    problems:
      - unit: lecture-03-gravity-and-orbits
        ids: ["grav-pr-04"]
`
    );
    expect(() => loadHomework(root)).toThrow(/homework\.sophie\.yaml/i);
  });
});
