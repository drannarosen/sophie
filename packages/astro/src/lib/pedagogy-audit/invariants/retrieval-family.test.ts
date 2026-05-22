import type { PedagogyIndex } from "@sophie/core/schema";
import { describe, expect, test } from "vitest";
import { buildPedagogyIndex } from "../test-helpers.ts";
import type { FindingSink } from "../types.ts";
import { checkRetrievalFamily } from "./retrieval-family.ts";

function emptyIndex(): PedagogyIndex {
  return buildPedagogyIndex();
}

function emptySink(): FindingSink {
  return { errors: [], warnings: [], info: [] };
}

describe("SR-1 — section-validity (W1)", () => {
  // Per Wedge B-followup design doc D1: <SpacedReview section="…">
  // refs now resolve against PedagogyIndex.sections. Unknown section
  // slugs emit SR-1 ERROR.

  test("no finding when section_id matches a known SectionEntry", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      spacedReviews: [
        {
          chapter: "ch1",
          anchor: "sp-1",
          max: 3,
          section_id: "stars",
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "SR-1")).toEqual([]);
  });

  test("emits SR-1 ERROR when section_id refers to an unknown section", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      spacedReviews: [
        {
          chapter: "ch1",
          anchor: "sp-1",
          max: 3,
          section_id: "nonexistent",
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const sr = sink.errors.filter((e) => e.code === "SR-1");
    expect(sr).toHaveLength(1);
    expect(sr[0]?.message).toMatch(/nonexistent/);
    expect(sr[0]?.location?.chapter).toBe("ch1");
    expect(sr[0]?.location?.anchor).toBe("sp-1");
  });
});

describe("PRA-1 — Unit-aware (W1)", () => {
  // Per Wedge B-followup design doc D1: when the index carries Units,
  // PRA-1 traverses UnitEntry.prereqs[] and checks for SkillReview
  // coverage in the same Section OR any prior Section (by Section.order).

  test("no finding when UnitEntry prereq is covered by SkillReview in the SAME Section", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 1 }],
      units: [
        {
          id: "u1",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "u1-ch",
        },
      ],
      skillReviews: [
        {
          chapter: "u1-ch",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings.filter((w) => w.code === "PRA-1")).toEqual([]);
  });

  test("no finding when SkillReview is in a PRIOR Section (by order)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [
        { type: "bridge", slug: "math", title: "Math", order: 0 },
        { type: "module", slug: "stars", title: "Stars", order: 1 },
      ],
      units: [
        {
          id: "math-u1",
          type: "skill",
          title: "Logs",
          order: 0,
          prereqs: [],
          section_id: "math",
          chapter: "math-ch",
          topic_id: "logs",
        },
        {
          id: "stars-u1",
          type: "lecture",
          title: "Spectra",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "spectra-ch",
        },
      ],
      skillReviews: [
        {
          chapter: "math-ch",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings.filter((w) => w.code === "PRA-1")).toEqual([]);
  });

  test("emits PRA-1 WARN when SkillReview is in a LATER Section (not prior)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [
        { type: "module", slug: "stars", title: "Stars", order: 0 },
        { type: "module", slug: "galaxies", title: "Galaxies", order: 1 },
      ],
      units: [
        {
          id: "stars-u1",
          type: "lecture",
          title: "Stars",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "stars-ch",
        },
      ],
      skillReviews: [
        // SkillReview is in a chapter bound to the LATER Section (galaxies)
        // — not eligible to bridge stars's prereq.
        {
          chapter: "galaxies-ch",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    // The galaxies-ch SkillReview chapter doesn't have a Unit, but we
    // also need to wire one up so the chapter-section binding exists.
    index.units = [
      ...index.units,
      {
        id: "galaxies-u1",
        type: "lecture",
        title: "Galaxies",
        order: 0,
        prereqs: [],
        section_id: "galaxies",
        chapter: "galaxies-ch",
      },
    ];
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.warnings.filter((w) => w.code === "PRA-1");
    expect(pra).toHaveLength(1);
    expect(pra[0]?.location?.chapter).toBe("stars-ch");
  });

  test("emits PRA-1 WARN when no SkillReview covers the prereq topic anywhere", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      units: [
        {
          id: "u1",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "u1-ch",
        },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.warnings.filter((w) => w.code === "PRA-1");
    expect(pra).toHaveLength(1);
    expect(pra[0]?.message).toContain("logs");
  });

  test("no PRA-1 findings when index carries no Units (invariant is opt-in)", () => {
    // Per W1 design doc D1: PRA-1 is opt-in via authoring Units; an
    // empty units collection produces no findings (no fallback to
    // chapter-level). RetrievalPrompt + SkillReview without Units are
    // silently uninspected by PRA-1.
    const index: PedagogyIndex = {
      ...emptyIndex(),
      retrievalPrompts: [
        { chapter: "ch1", anchor: "rp-1", target_id: "topic:logs" },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.warnings.filter((w) => w.code === "PRA-1")).toEqual([]);
  });

  test("multiple prereqs on one Unit → one WARN per uncovered prereq", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      units: [
        {
          id: "u1",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs", "exponents"],
          section_id: "stars",
          chapter: "u1-ch",
        },
      ],
      skillReviews: [
        // Only one of the two prereqs is covered.
        {
          chapter: "u1-ch",
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
    expect(pra[0]?.message).toContain("exponents");
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

  test("emits SR-1 ERROR for section-scoped SpacedReview pointing at an unknown section", () => {
    // W1 graduation: section_id refs must resolve against PedagogyIndex.sections.
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "foundations", title: "F", order: 0 }],
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
    const sr = sink.errors.filter((e) => e.code === "SR-1");
    expect(sr).toHaveLength(1);
    expect(sr[0]?.message).toMatch(/m1-foundations/);
  });
});
