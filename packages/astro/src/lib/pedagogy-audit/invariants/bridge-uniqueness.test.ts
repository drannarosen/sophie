import type {
  PedagogyIndex,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkBR1 } from "./bridge-uniqueness.ts";

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
    formatives: [],
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

const bridge = (slug: string, order = 0): SectionEntry => ({
  type: "bridge",
  slug,
  title: slug,
  order,
});
const moduleSec = (slug: string, order = 0): SectionEntry => ({
  type: "module",
  slug,
  title: slug,
  order,
});
// `audit_overrides` omitted: the field is `.optional()` per Batch 8
// schema flip; fixtures with no overrides simply don't declare it.
const unit = (id: string, section_id = "math"): UnitEntry => ({
  id,
  type: "lecture",
  title: id,
  order: 0,
  prereqs: [],
  section_id,
  chapter: id,
  status: "stable",
});

describe("BR-1 — bridge slug uniqueness (ADR 0079 + 0068)", () => {
  test("no finding when bridge slug is unique across all sections + units + reserved paths", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [bridge("math-fundamentals"), moduleSec("stars", 1)],
      units: [unit("stars-intro", "stars")],
    };
    const sink = emptySink();
    checkBR1(index, sink);
    expect(sink.errors).toEqual([]);
  });

  test("ERRORs when two bridge sections share a slug", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [
        bridge("math-fundamentals", 0),
        bridge("math-fundamentals", 1),
      ],
    };
    const sink = emptySink();
    checkBR1(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("math-fundamentals");
  });

  test("ERRORs when a bridge slug collides with a regular Section slug", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [bridge("stars"), moduleSec("stars", 1)],
    };
    const sink = emptySink();
    checkBR1(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("stars");
  });

  test("ERRORs when a bridge slug collides with a Unit id", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [bridge("spectra-and-composition"), moduleSec("stars", 1)],
      units: [unit("spectra-and-composition", "stars")],
    };
    const sink = emptySink();
    checkBR1(index, sink);
    expect(sink.errors).toHaveLength(1);
    expect(sink.errors[0]?.message).toContain("spectra-and-composition");
  });

  test("ERRORs when a bridge slug collides with a reserved Library path", () => {
    for (const reserved of ["library", "sections", "units", "topics"]) {
      const index: PedagogyIndex = {
        ...emptyIndex(),
        sections: [bridge(reserved)],
      };
      const sink = emptySink();
      checkBR1(index, sink);
      expect(sink.errors).toHaveLength(1);
      expect(sink.errors[0]?.message).toContain(reserved);
    }
  });

  test("no findings when no bridge sections exist (invariant is opt-in)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [moduleSec("stars")],
    };
    const sink = emptySink();
    checkBR1(index, sink);
    expect(sink.errors).toEqual([]);
  });
});
