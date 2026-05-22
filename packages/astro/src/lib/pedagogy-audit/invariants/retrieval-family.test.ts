import type { PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import type { FindingSink } from "../types.ts";
import { checkRetrievalFamily } from "./retrieval-family.ts";

function emptyIndex(): PedagogyIndex {
  return {
    definitions: [],
    equations: [],
    equationCitations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    chapters: [],
    modules: [],
    objectives: [],
    inlineRefUsages: [],
    contractValidations: [],
    extractorFindings: [],
    multiReps: [],
    interventions: [],
    deepDives: [],
    omiFlows: [],
    retrievalPrompts: [],
    spacedReviews: [],
    skillReviews: [],
  };
}

function emptySink(): FindingSink {
  return { errors: [], warnings: [], info: [] };
}

describe("PRA-1 — prereq activation (WARN)", () => {
  test("emits no finding when topic refs in RetrievalPrompt are bridged by SkillReview", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      retrievalPrompts: [
        { chapter: "ch1", anchor: "rp-1", target_id: "topic:logarithms" },
      ],
      skillReviews: [
        {
          chapter: "ch1",
          anchor: "sk-1",
          target_id: "topic:logarithms",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings).toEqual([]);
  });

  test("emits one WARN per uncovered topic prereq", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      retrievalPrompts: [
        { chapter: "ch1", anchor: "rp-1", target_id: "topic:logarithms" },
        { chapter: "ch1", anchor: "rp-2", target_id: "topic:exponents" },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings).toHaveLength(2);
    expect(sink.warnings.map((w) => w.code)).toEqual(["PRA-1", "PRA-1"]);
  });

  test("ignores non-topic prefixes (eq:, ki:, etc.)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      retrievalPrompts: [
        { chapter: "ch1", anchor: "rp-1", target_id: "eq:stefan-boltzmann" },
        { chapter: "ch1", anchor: "rp-2", target_id: "ki:luminosity" },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    // Neither WARN nor ERROR — only `topic:` refs are eligible for PRA-1.
    expect(sink.warnings.filter((w) => w.code === "PRA-1")).toEqual([]);
  });

  test("scopes coverage check per-chapter (SkillReview in ch2 doesn't cover ch1)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      retrievalPrompts: [
        { chapter: "ch1", anchor: "rp-1", target_id: "topic:logs" },
      ],
      skillReviews: [
        {
          chapter: "ch2",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.warnings.filter((w) => w.code === "PRA-1");
    expect(pra).toHaveLength(1);
    expect(pra[0]?.location?.chapter).toBe("ch1");
  });
});

describe("RET-1 — retrieval coverage (INFO)", () => {
  test("emits no finding for chapters with content + at least one retrieval surface", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [
        {
          term: "Luminosity",
          slug: "luminosity",
          body: "<p>energy / time</p>",
          chapter: "ch1",
          anchor: "def-luminosity",
        },
      ],
      retrievalPrompts: [
        { chapter: "ch1", anchor: "rp-1", target_id: "ki:luminosity" },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.info.filter((i) => i.code === "RET-1")).toEqual([]);
  });

  test("emits one INFO per chapter with substantive content but zero retrieval surfaces", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      definitions: [
        {
          term: "Lum",
          slug: "lum",
          body: "<p>x</p>",
          chapter: "ch1",
          anchor: "def-lum",
        },
      ],
      keyInsights: [
        {
          body: "<p>k</p>",
          chapter: "ch2",
          anchor: "ki-1",
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const ret = sink.info.filter((i) => i.code === "RET-1");
    expect(ret).toHaveLength(2);
    expect(ret.map((i) => i.location?.chapter).sort()).toEqual(["ch1", "ch2"]);
  });

  test("emits no finding for chapters with no substantive content (metadata-only)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      objectives: [
        {
          id: "verify",
          verb: "Recognize",
          body: "<p>x</p>",
          chapter: "ch1",
          anchor: "lo-verify",
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.info.filter((i) => i.code === "RET-1")).toEqual([]);
  });
});

describe("SR-1 — SpacedReview ref validity (ERROR)", () => {
  test("accepts SpacedReview with known prefix-typed target", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      spacedReviews: [
        {
          chapter: "ch1",
          anchor: "sp-1",
          target_id: "topic:logarithms",
          max: 3,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "SR-1")).toEqual([]);
  });

  test("emits ERROR for malformed prefix-typed target (no colon)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      spacedReviews: [
        {
          chapter: "ch1",
          anchor: "sp-1",
          target_id: "logarithms",
          max: 3,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const sr = sink.errors.filter((e) => e.code === "SR-1");
    expect(sr).toHaveLength(1);
    expect(sr[0]?.message).toMatch(/malformed/i);
  });

  test("emits ERROR for unknown prefix", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      spacedReviews: [
        {
          chapter: "ch1",
          anchor: "sp-1",
          target_id: "mystery:x",
          max: 3,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const sr = sink.errors.filter((e) => e.code === "SR-1");
    expect(sr).toHaveLength(1);
    expect(sr[0]?.message).toMatch(/unknown prefix/i);
  });

  test("no SR-1 finding for section-scoped SpacedReview (deferred to follow-up)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      spacedReviews: [
        {
          chapter: "ch1",
          anchor: "sp-1",
          section_id: "m1-foundations",
          max: 5,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "SR-1")).toEqual([]);
  });
});
