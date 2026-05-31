import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { ScheduleSchema } from "./schedule.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = join(__dirname, "__fixtures__");

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(join(FIXTURE_DIR, name), "utf8"));
}

interface TestEntry {
  date: string;
  kind: string;
  title: string;
  unit?: string;
}

// Builder keeps the input fully-typed under noUncheckedIndexedAccess so the
// mutation-by-override pattern below avoids index access into arrays.
const entry = (over: Partial<TestEntry> = {}): TestEntry => ({
  date: "2027-01-20",
  kind: "lecture",
  title: "Lecture 3 — Gravity and Orbits",
  unit: "lecture-03-gravity-and-orbits",
  ...over,
});

const schedule = (
  over: { term_start?: string; entries?: TestEntry[] } = {}
) => ({
  term_start: over.term_start ?? "2027-01-19",
  entries: over.entries ?? [entry()],
});

describe("ScheduleSchema", () => {
  it("accepts a valid schedule", () => {
    expect(() => ScheduleSchema.parse(schedule())).not.toThrow();
  });

  it("accepts term_start: tbd", () => {
    // A term may not be scheduled yet; `tbd` is allowed for term_start so the
    // week-number labels are simply omitted downstream.
    expect(() =>
      ScheduleSchema.parse(schedule({ term_start: "tbd" }))
    ).not.toThrow();
  });

  it("rejects an entry kind outside the closed enum", () => {
    // `kind` is a CLOSED enum here (unlike assignment kinds). "due" is not a
    // schedule kind — deadlines live in the assignments registry, pulled by
    // date.
    expect(() =>
      ScheduleSchema.parse(schedule({ entries: [entry({ kind: "due" })] }))
    ).toThrow();
  });

  it("rejects an entry date: tbd", () => {
    // `entry.date` is a concrete ISO date — an undated schedule entry is
    // meaningless, so `tbd` is not allowed (no DateOrTbd here).
    expect(() =>
      ScheduleSchema.parse(schedule({ entries: [entry({ date: "tbd" })] }))
    ).toThrow();
  });

  it("rejects an entry with a non-slug unit", () => {
    // `unit?` is shape-validated as a Slug; "Lecture 3" is not kebab-case.
    expect(() =>
      ScheduleSchema.parse(
        schedule({ entries: [entry({ unit: "Lecture 3" })] })
      )
    ).toThrow();
  });

  it("rejects an unknown extra key on an entry (.strict)", () => {
    expect(() =>
      ScheduleSchema.parse(
        schedule({
          entries: [{ ...entry(), location: "PS-140" } as TestEntry],
        })
      )
    ).toThrow();
  });

  it("accepts the valid YAML fixture", () => {
    expect(() =>
      ScheduleSchema.parse(loadFixture("schedule-valid.yaml"))
    ).not.toThrow();
  });

  it("rejects the bad-kind YAML fixture", () => {
    expect(() =>
      ScheduleSchema.parse(loadFixture("invalid/schedule-bad-kind.yaml"))
    ).toThrow();
  });
});
