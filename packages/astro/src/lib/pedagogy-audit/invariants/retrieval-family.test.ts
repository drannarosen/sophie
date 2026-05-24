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
          unit: "ch1",
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
          unit: "ch1",
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
    expect(sr[0]?.location?.unit).toBe("ch1");
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
          id: "u1-ch",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "u1-ch",
          status: "stable",
        },
      ],
      skillReviews: [
        {
          unit: "u1-ch",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "PRA-1")).toEqual([]);
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
          id: "math-ch",
          type: "skill",
          title: "Logs",
          order: 0,
          prereqs: [],
          section_id: "math",
          chapter: "math-ch",
          topic_id: "logs",
          status: "stable",
        },
        {
          id: "spectra-ch",
          type: "lecture",
          title: "Spectra",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "spectra-ch",
          status: "stable",
        },
      ],
      skillReviews: [
        {
          unit: "math-ch",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "PRA-1")).toEqual([]);
  });

  test("emits PRA-1 ERROR when SkillReview is in a LATER Section (not prior)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [
        { type: "module", slug: "stars", title: "Stars", order: 0 },
        { type: "module", slug: "galaxies", title: "Galaxies", order: 1 },
      ],
      units: [
        {
          id: "stars-ch",
          type: "lecture",
          title: "Stars",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "stars-ch",
          status: "stable",
        },
      ],
      skillReviews: [
        // SkillReview is in a chapter bound to the LATER Section (galaxies)
        // — not eligible to bridge stars's prereq.
        {
          unit: "galaxies-ch",
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
        id: "galaxies-ch",
        type: "lecture",
        title: "Galaxies",
        order: 0,
        prereqs: [],
        section_id: "galaxies",
        chapter: "galaxies-ch",
        status: "stable",
      },
    ];
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.errors.filter((e) => e.code === "PRA-1");
    expect(pra).toHaveLength(1);
    expect(pra[0]?.location?.unit).toBe("stars-ch");
  });

  test("emits PRA-1 ERROR when no SkillReview covers the prereq topic anywhere (W4b graduation)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      units: [
        {
          id: "u1-ch",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs"],
          section_id: "stars",
          chapter: "u1-ch",
          status: "stable",
        },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.errors.filter((e) => e.code === "PRA-1");
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
        { unit: "ch1", anchor: "rp-1", target_id: "topic:logs" },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "PRA-1")).toEqual([]);
  });

  test("multiple prereqs on one Unit → one ERROR per uncovered prereq", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      units: [
        {
          id: "u1-ch",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs", "exponents"],
          section_id: "stars",
          chapter: "u1-ch",
          status: "stable",
        },
      ],
      skillReviews: [
        // Only one of the two prereqs is covered.
        {
          unit: "u1-ch",
          anchor: "sk-1",
          target_id: "topic:logs",
          has_explicit_content: true,
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.errors.filter((e) => e.code === "PRA-1");
    expect(pra).toHaveLength(1);
    expect(pra[0]?.message).toContain("exponents");
  });

  test("audit_overrides on the Unit suppresses PRA-1 ERROR for a specific prereq anchor (per ADR 0053)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      units: [
        {
          id: "u1-ch",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs", "exponents"],
          section_id: "stars",
          chapter: "u1-ch",
          status: "stable",
          audit_overrides: [
            {
              invariant: "PRA-1",
              anchor: "logs",
              tdr: "TDR-XX",
              reason: "Deliberate W4b test fixture for audit_overrides path.",
            },
          ],
        },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const pra = sink.errors.filter((e) => e.code === "PRA-1");
    // "logs" is suppressed by the override; "exponents" still fires.
    expect(pra).toHaveLength(1);
    expect(pra[0]?.message).toContain("exponents");
    expect(pra[0]?.message).not.toContain("logs");
  });

  test("grain-1 audit_override (no anchor) suppresses ALL PRA-1 findings on the Unit", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      sections: [{ type: "module", slug: "stars", title: "Stars", order: 0 }],
      units: [
        {
          id: "u1-ch",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: ["logs", "exponents"],
          section_id: "stars",
          chapter: "u1-ch",
          status: "stable",
          audit_overrides: [
            {
              invariant: "PRA-1",
              tdr: "TDR-YY",
              reason: "Grain-1 whole-invariant suppression for this Unit.",
            },
          ],
        },
      ],
      skillReviews: [],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    expect(sink.errors.filter((e) => e.code === "PRA-1")).toEqual([]);
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
          unit: "ch1",
          anchor: "def-luminosity",
        },
      ],
      retrievalPrompts: [
        { unit: "ch1", anchor: "rp-1", target_id: "ki:luminosity" },
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
          unit: "ch1",
          anchor: "def-lum",
        },
      ],
      keyInsights: [
        {
          body: "<p>k</p>",
          unit: "ch2",
          anchor: "ki-1",
          slug: "ch2-ki-1",
        },
      ],
    };
    const sink = emptySink();
    checkRetrievalFamily(index, sink);
    const ret = sink.info.filter((i) => i.code === "RET-1");
    expect(ret).toHaveLength(2);
    expect(ret.map((i) => i.location?.unit).sort()).toEqual(["ch1", "ch2"]);
  });

  test("emits no finding for chapters with no substantive content (metadata-only)", () => {
    const index: PedagogyIndex = {
      ...emptyIndex(),
      objectives: [
        {
          id: "verify",
          verb: "Recognize",
          body: "<p>x</p>",
          unit: "ch1",
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
          unit: "ch1",
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
          unit: "ch1",
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
          unit: "ch1",
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
          unit: "ch1",
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
