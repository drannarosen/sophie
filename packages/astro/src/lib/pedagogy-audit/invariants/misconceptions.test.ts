import type { MisconceptionEntry, PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkMisconceptionSlugUnique } from "./misconceptions.ts";

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

const mc = (
  overrides: Partial<MisconceptionEntry> = {}
): MisconceptionEntry => ({
  unit: "u1",
  anchor: "misc-1",
  body: "<p/>",
  length: "short",
  slug: "heavier-falls-faster",
  ...overrides,
});

describe("Misconception-slug-unique audit — Misconception slug uniqueness (W4c Batch 1b)", () => {
  test("fires when two Misconceptions derive the same slug across units", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      misconceptions: [
        mc({
          unit: "u1",
          anchor: "misc-1",
          label: "Heavier falls faster",
          slug: "heavier-falls-faster",
        }),
        mc({
          unit: "u2",
          anchor: "misc-2",
          label: "Heavier falls faster",
          slug: "heavier-falls-faster",
        }),
      ],
    };
    const sink = emptySink();
    checkMisconceptionSlugUnique(index, sink);
    expect(sink.errors).toContainEqual(
      expect.objectContaining({
        code: "Misconception-slug-unique",
        severity: "ERROR",
      })
    );
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("heavier-falls-faster");
    // Message must name every colliding callsite so the author can locate them.
    expect(sink.errors[0]?.message).toContain("u1");
    expect(sink.errors[0]?.message).toContain("misc-1");
    expect(sink.errors[0]?.message).toContain("u2");
    expect(sink.errors[0]?.message).toContain("misc-2");
  });

  test("stays quiet when all slugs are distinct", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      misconceptions: [
        mc({
          unit: "u1",
          anchor: "misc-1",
          label: "Heavier falls faster",
          slug: "heavier-falls-faster",
        }),
        mc({
          unit: "u2",
          anchor: "misc-1",
          label: "Brighter equals closer",
          slug: "brighter-equals-closer",
        }),
      ],
    };
    const sink = emptySink();
    checkMisconceptionSlugUnique(index, sink);
    expect(sink.errors).toHaveLength(0);
  });

  test("error message flags pathological-non-alnum-label cause when slug === 'term'", () => {
    // slugify("!!!") === "term" per slugify.ts:19 — two labels consisting
    // only of non-alphanumerics both derive the slug "term" and collide.
    // The author cannot connect cause to effect without an explicit hint
    // about the slugify fallback; the error message names the offending
    // labels so they understand why their slug derived to "term".
    const index: PedagogyIndex = {
      ...emptyIndex(),
      misconceptions: [
        mc({ unit: "u1", anchor: "misc-1", label: "!!!", slug: "term" }),
        mc({ unit: "u2", anchor: "misc-2", label: "???", slug: "term" }),
      ],
    };
    const sink = emptySink();
    checkMisconceptionSlugUnique(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("term");
    expect(sink.errors[0]?.message).toContain('"!!!"');
    expect(sink.errors[0]?.message).toContain('"???"');
    expect(sink.errors[0]?.message).toMatch(/non-alphanumeric|pathological/i);
  });

  test("does not flag pathological-non-alnum cause when colliding labels are real text 'term'", () => {
    // slugify("Term") === "term" via the normal lowercase path (not the
    // non-alnum fallback). Two Misconceptions literally labeled "Term"
    // derive the same slug via literal equality, NOT via the pathological
    // non-alphanumeric collapse. The hint must stay silent so authors are
    // not falsely told their labels contain only non-alphanumerics.
    const index: PedagogyIndex = {
      ...emptyIndex(),
      misconceptions: [
        mc({ unit: "u1", anchor: "misc-1", label: "Term", slug: "term" }),
        mc({ unit: "u2", anchor: "misc-2", label: "term", slug: "term" }),
      ],
    };
    const sink = emptySink();
    checkMisconceptionSlugUnique(index, sink);
    expect(sink.errors).toHaveLength(1);
    // Hint MUST NOT appear (labels slugify to "term" via literal-equality,
    // not via non-alphanumeric collapse).
    expect(sink.errors[0]?.message).not.toMatch(/non-alphanumeric/i);
  });
});
