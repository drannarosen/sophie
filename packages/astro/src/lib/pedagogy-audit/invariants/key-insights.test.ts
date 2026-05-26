import type {
  KeyInsightEntry,
  PedagogyIndex,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, it, test } from "vitest";
import { runPedagogyAudit } from "../index.ts";
import type { FindingSink } from "../types.ts";
import { checkKISlugUnique } from "./key-insights.ts";

function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
    equationCitations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    deepDives: [],
    omiFlows: [],
    workedExamples: [],
    objectives: [],
    inlineRefUsages: [],
    multiReps: [],
    interventions: [],
    contractValidations: [],
    extractorFindings: [],
    retrievalPrompts: [],
    spacedReviews: [],
    skillReviews: [],
    topics: [],
    cards: [],
    sections: [],
    units: [],
    artifacts: [],
  };
}
function emptySink(): FindingSink {
  return { errors: [], warnings: [], info: [] };
}

const ki = (overrides: Partial<KeyInsightEntry> = {}): KeyInsightEntry => ({
  unit: "u1",
  anchor: "ki-1",
  body: "<p/>",
  slug: "light",
  ...overrides,
});

describe("KI-slug-unique audit — KeyInsight slug uniqueness (ADR 0070 W4c D4)", () => {
  test("fires when two KeyInsights derive the same slug across units", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      keyInsights: [
        ki({ unit: "u1", anchor: "ki-1", title: "Light", slug: "light" }),
        ki({ unit: "u2", anchor: "ki-2", title: "Light", slug: "light" }),
      ],
    };
    const sink = emptySink();
    checkKISlugUnique(index, sink);
    expect(sink.errors).toContainEqual(
      expect.objectContaining({
        code: "KI-slug-unique",
        severity: "ERROR",
      })
    );
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("light");
    // The message must name every colliding callsite so the author can
    // locate them — `(unit, anchor)` tuples for both entries.
    expect(sink.errors[0]?.message).toContain("u1");
    expect(sink.errors[0]?.message).toContain("ki-1");
    expect(sink.errors[0]?.message).toContain("u2");
    expect(sink.errors[0]?.message).toContain("ki-2");
  });

  test("stays quiet when all slugs are distinct", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      keyInsights: [
        ki({ unit: "u1", anchor: "ki-1", title: "Light", slug: "light" }),
        ki({ unit: "u2", anchor: "ki-1", title: "Mass", slug: "mass" }),
      ],
    };
    const sink = emptySink();
    checkKISlugUnique(index, sink);
    expect(sink.errors).toHaveLength(0);
  });

  test("error message flags pathological-non-alnum-title cause when slug === 'term'", () => {
    // slugify("!!!") === "term" per slugify.ts:19 — two titles consisting
    // only of non-alphanumerics both derive the slug "term" and collide.
    // The author cannot connect cause to effect without an explicit hint
    // about the slugify fallback; the error message names the offending
    // titles so they understand why their slug derived to "term".
    const index: PedagogyIndex = {
      ...emptyIndex(),
      keyInsights: [
        ki({ unit: "u1", anchor: "ki-1", title: "!!!", slug: "term" }),
        ki({ unit: "u2", anchor: "ki-2", title: "???", slug: "term" }),
      ],
    };
    const sink = emptySink();
    checkKISlugUnique(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("term");
    expect(sink.errors[0]?.message).toContain('"!!!"');
    expect(sink.errors[0]?.message).toContain('"???"');
    expect(sink.errors[0]?.message).toMatch(/non-alphanumeric|pathological/i);
  });

  test("does not flag pathological-non-alnum cause when colliding titles are real text 'term'", () => {
    // slugify("Term") === "term" via the normal lowercase path (not the
    // non-alnum fallback). Two KeyInsights literally titled "Term" derive
    // the same slug via literal equality, NOT via the pathological
    // non-alphanumeric collapse. The hint must stay silent so authors are
    // not falsely told their titles contain only non-alphanumerics.
    const index: PedagogyIndex = {
      ...emptyIndex(),
      keyInsights: [
        ki({ unit: "u1", anchor: "ki-1", title: "Term", slug: "term" }),
        ki({ unit: "u2", anchor: "ki-2", title: "term", slug: "term" }),
      ],
    };
    const sink = emptySink();
    checkKISlugUnique(index, sink);
    expect(sink.errors).toHaveLength(1);
    // Hint MUST NOT appear (titles slugify to "term" via literal-equality,
    // not via non-alphanumeric collapse).
    expect(sink.errors[0]?.message).not.toMatch(/non-alphanumeric/i);
  });

  test("emits one finding per colliding slug (not per collision pair)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      keyInsights: [
        ki({ unit: "u1", anchor: "ki-1", slug: "light" }),
        ki({ unit: "u2", anchor: "ki-2", slug: "light" }),
        ki({ unit: "u3", anchor: "ki-3", slug: "light" }),
      ],
    };
    const sink = emptySink();
    checkKISlugUnique(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("u1");
    expect(sink.errors[0]?.message).toContain("u2");
    expect(sink.errors[0]?.message).toContain("u3");
  });
});

// ---------------------------------------------------------------------
// K1 — chapters with zero <KeyInsight>s (INFO). Split out of
// runner.test.ts per A+ Phase E (ADR 0061 Rule 3). The K1 audit runs
// inside `runPedagogyAudit` (orchestrator-level dispatch), so these
// tests exercise the runner end-to-end rather than calling the per-
// invariant helper directly.
// ---------------------------------------------------------------------

const unitSpoiler: UnitEntry = {
  id: "spoiler-alerts",
  type: "lecture",
  title: "Spoiler Alerts",
  order: 1,
  prereqs: [],
  section_id: "core",
  chapter: "spoiler-alerts",
  status: "stable",
};

describe("K1 — chapters with zero <KeyInsight>s (INFO)", () => {
  it("emits an INFO finding for every chapter that has no key-insights", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitSpoiler],
      keyInsights: [],
    };
    const report = runPedagogyAudit(index);
    const k1 = report.info.filter((i) => i.code === "K1");
    expect(k1).toHaveLength(1);
    expect(k1[0]).toMatchObject({ severity: "INFO", code: "K1" });
    expect(k1[0]?.message).toContain("spoiler-alerts");
  });

  it("does not flag a chapter that has at least one key-insight", () => {
    const keyInsight: KeyInsightEntry = {
      body: "<p>x</p>",
      unit: "spoiler-alerts",
      anchor: "ki-1",
      slug: "spoiler-alerts-ki-1",
    };
    const index: PedagogyIndex = {
      ...emptyIndex(),
      units: [unitSpoiler],
      keyInsights: [keyInsight],
    };
    const report = runPedagogyAudit(index);
    expect(report.info.filter((i) => i.code === "K1")).toEqual([]);
  });
});
