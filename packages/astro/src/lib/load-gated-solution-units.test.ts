import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { loadUnitIdsWithGatedSolutions } from "./load-gated-solution-units.ts";

/**
 * Existence-only loader (ADR 0096): given a consumer root, return the set
 * of unit ids whose `solutions.mdx` exists on disk — reading filenames
 * only, never the solution body.
 */
describe("loadUnitIdsWithGatedSolutions", () => {
  let root: string;

  function writeSolution(sec: string, unit: string, body = "GATED-BODY") {
    const dir = path.join(root, "src/content/sections", sec, "units", unit);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "solutions.mdx"), body, "utf8");
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "sophie-gated-sol-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("returns an empty set when the sections dir is absent", () => {
    expect(loadUnitIdsWithGatedSolutions(root).size).toBe(0);
  });

  test("derives the unit id from the path segment after units/", () => {
    writeSolution("foundations", "measuring-the-sky");
    writeSolution("stars", "stellar-evolution");
    expect(loadUnitIdsWithGatedSolutions(root)).toEqual(
      new Set(["measuring-the-sky", "stellar-evolution"])
    );
  });

  test("ignores non-solution mdx files (e.g. practice.mdx)", () => {
    const dir = path.join(
      root,
      "src/content/sections/stars/units/stellar-evolution"
    );
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, "practice.mdx"), "not a solution", "utf8");
    expect(loadUnitIdsWithGatedSolutions(root).size).toBe(0);
  });

  test("reads filenames only — never the solution body", () => {
    // The withheld body must never surface in the returned signal; only
    // the unit id (path-derived) does. (ADR 0096 security property.)
    writeSolution("stars", "stellar-evolution", "SECRET WORKED ANSWER");
    const result = loadUnitIdsWithGatedSolutions(root);
    expect([...result]).toEqual(["stellar-evolution"]);
    expect([...result].join("")).not.toContain("SECRET");
  });
});
