import fs, { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadSchedule } from "./schedule-loader.ts";

/**
 * Minimal valid schedule YAML for tests. A `term_start` plus a single
 * dated lecture entry — the smallest shape that satisfies ScheduleSchema
 * (ADR 0098).
 */
const MINIMAL_VALID_SCHEDULE = `
term_start: "2027-01-19"
entries:
  - date: "2027-01-20"
    kind: lecture
    title: "Lecture 1 — Ages and Lifetimes"
    unit: lecture-01-ages-lifetimes
`;

describe("loadSchedule", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-schedule-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("returns null when schedule.sophie.yaml is missing", () => {
    expect(loadSchedule(root)).toBeNull();
  });

  test("loads + parses a valid schedule", () => {
    fs.writeFileSync(
      path.join(root, "schedule.sophie.yaml"),
      MINIMAL_VALID_SCHEDULE
    );
    const schedule = loadSchedule(root);
    expect(schedule?.term_start).toBe("2027-01-19");
    expect(schedule?.entries[0]?.unit).toBe("lecture-01-ages-lifetimes");
  });

  test("loads a tbd term_start schedule (term not yet scheduled)", () => {
    fs.writeFileSync(
      path.join(root, "schedule.sophie.yaml"),
      `
term_start: tbd
entries:
  - date: "2027-01-20"
    kind: lecture
    title: "Lecture 1"
`
    );
    const schedule = loadSchedule(root);
    expect(schedule?.term_start).toBe("tbd");
    expect(schedule?.entries[0]?.unit).toBeUndefined();
  });

  test("throws curated error on malformed YAML", () => {
    // Unterminated flow sequence — genuinely unparseable YAML, so this
    // exercises the parseYaml() catch branch (distinct from the
    // schema-invalid path covered by the test below).
    fs.writeFileSync(path.join(root, "schedule.sophie.yaml"), "entries: [");
    expect(() => loadSchedule(root)).toThrow(/schedule\.sophie\.yaml/i);
  });

  test("throws schema-invalid error when an entry kind is not in the enum", () => {
    fs.writeFileSync(
      path.join(root, "schedule.sophie.yaml"),
      `
term_start: "2027-01-19"
entries:
  - date: "2027-01-20"
    kind: due
    title: "Homework 1 due"
`
    );
    expect(() => loadSchedule(root)).toThrow(/schedule\.sophie\.yaml/i);
  });
});
