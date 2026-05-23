import type { KeyInsightEntry, PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
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
