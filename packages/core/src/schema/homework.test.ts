import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { HomeworkRegistrySchema } from "./homework.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

interface TestHomework {
  id: string;
  title: string;
  assignedDate: string;
  dueDate: string;
  problems: { unit: string; ids: string[] }[];
}

// Builder keeps the input fully-typed under noUncheckedIndexedAccess so the
// mutation-by-override pattern below avoids index access into arrays.
const hw = (over: Partial<TestHomework> = {}): TestHomework => ({
  id: "hw-3",
  title: "Homework 3 — Gravity",
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

const registry = (...homework: TestHomework[]) => ({ homework });

describe("HomeworkRegistrySchema", () => {
  it("accepts a valid registry", () => {
    expect(() => HomeworkRegistrySchema.parse(registry(hw()))).not.toThrow();
  });

  it("accepts dueDate: tbd", () => {
    expect(() =>
      HomeworkRegistrySchema.parse(registry(hw({ dueDate: "tbd" })))
    ).not.toThrow();
  });

  it("rejects assignedDate after dueDate", () => {
    expect(() =>
      HomeworkRegistrySchema.parse(registry(hw({ assignedDate: "2027-03-01" })))
    ).toThrow(/assignedDate.*dueDate/i);
  });

  it("rejects a problem claimed by two homeworks", () => {
    const spec = registry(
      hw(),
      hw({
        id: "hw-4",
        problems: [
          { unit: "lecture-03-gravity-and-orbits", ids: ["grav-pr-04"] },
        ],
      })
    );
    expect(() => HomeworkRegistrySchema.parse(spec)).toThrow(
      /claimed by at most one/i
    );
  });

  it("rejects an empty ids array", () => {
    const spec = registry(
      hw({ problems: [{ unit: "lecture-03-gravity-and-orbits", ids: [] }] })
    );
    expect(() => HomeworkRegistrySchema.parse(spec)).toThrow();
  });

  it("accepts the valid YAML fixture", () => {
    expect(() =>
      HomeworkRegistrySchema.parse(loadFixture("homework-valid.yaml"))
    ).not.toThrow();
  });

  it("rejects the duplicate-claim YAML fixture", () => {
    expect(() =>
      HomeworkRegistrySchema.parse(
        loadFixture("invalid/homework-duplicate-claim.yaml")
      )
    ).toThrow(/claimed by at most one/i);
  });
});
