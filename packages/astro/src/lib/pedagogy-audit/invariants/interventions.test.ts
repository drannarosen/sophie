import type {
  InterventionEntry,
  MisconceptionEntry,
  PedagogyIndex,
} from "@sophie/core/schema";
import { describe, expect, it } from "vitest";
import { runPedagogyAudit } from "../index.ts";

/**
 * Tests for the Intervention-family audit invariants added in PR-δ
 * per ADR 0044 + 2026-05-17 design hardening §D7.
 *
 * Invariants covered:
 *   I2 (ERROR)    — <Intervention type="X"> with X not in intervention-index.ts
 *                   AND X !== "custom".
 *   I1 (WARNING)  — <Intervention addresses="…"> references a misconception
 *                   not declared anywhere course-wide, OR the literal "this"
 *                   survived extraction (standalone intervention authored as
 *                   `addresses="this"`).
 *   I3 (INFO)     — <Intervention type="bridging-analogy"> lacks `limits`
 *                   (Clement 1993 explicit-limits nudge).
 *   MG3 (WARNING) — Misconception declared but no <Intervention> pairs with
 *                   it course-wide.
 *   MG4 (INFO)    — Course-level depth-coverage summary (substantial vs
 *                   light vs unaddressed).
 *
 * I4 is deferred until `move-index.ts` ships per ADR 0044 §R-I4.
 */

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

const intv = (
  overrides: Partial<InterventionEntry> & {
    type: string;
    chapter: string;
    anchor: string;
  }
): InterventionEntry => ({
  type: overrides.type,
  addresses: overrides.addresses ?? ["misc-x"],
  body: overrides.body ?? "<p>body</p>",
  depth: overrides.depth ?? "light",
  chapter: overrides.chapter,
  anchor: overrides.anchor,
  ...(overrides.name ? { name: overrides.name } : {}),
  ...(overrides.limits ? { limits: overrides.limits } : {}),
});

const misc = (
  anchor: string,
  chapter = "ch/1",
  length: "short" | "long" = "short"
): MisconceptionEntry => ({
  body: "<p>misconception body</p>",
  chapter,
  anchor,
  length,
});

describe("I2 ERROR — unknown intervention type", () => {
  it("fires when type is not in intervention-index.ts AND not 'custom'", () => {
    const index = emptyIndex();
    index.interventions = [
      intv({
        type: "made-up-intervention",
        chapter: "ch/1",
        anchor: "intervention-made-up-intervention-1",
        addresses: ["misc-x"],
      }),
    ];
    index.misconceptions = [misc("misc-x")];
    const { errors } = runPedagogyAudit(index);
    // Filter-then-assert (rather than indexing `errors[0]`) so a
    // future invariant emitting earlier in the audit's declared
    // order doesn't silently shift the index this test inspects.
    const i2 = errors.filter((e) => e.code === "I2");
    expect(i2).toHaveLength(1);
    expect(i2[0]?.message).toMatch(/made-up-intervention/);
  });

  it("passes for every canonical type in intervention-index.ts", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-x")];
    index.interventions = [
      "contrasting-cases",
      "predict-then-reveal",
      "productive-cognitive-conflict",
      "bridging-analogy",
      "anchoring-intuition",
      "concrete-to-abstract-scaffold",
      "discrepant-event",
      "conceptual-exchange",
      "worked-example-contrast",
      "refutation-text",
      "spaced-retrieval-with-misconception-probe",
      "self-explanation-against-misconception",
    ].map((type, i) =>
      intv({
        type,
        chapter: "ch/1",
        anchor: `intervention-${type}-${i + 1}`,
        addresses: ["misc-x"],
        // Bridging-analogy needs limits to avoid I3 INFO noise
        ...(type === "bridging-analogy" ? { limits: "explicit limit" } : {}),
      })
    );
    const { errors } = runPedagogyAudit(index);
    expect(errors.filter((e) => e.code === "I2")).toEqual([]);
  });

  it("passes for type='custom' (no canonical-library lookup required)", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-x")];
    index.interventions = [
      intv({
        type: "custom",
        name: "scale-comparison",
        chapter: "ch/1",
        anchor: "intervention-scale-comparison-1",
        addresses: ["misc-x"],
      }),
    ];
    const { errors } = runPedagogyAudit(index);
    expect(errors.filter((e) => e.code === "I2")).toEqual([]);
  });
});

describe("I1 WARNING — unknown addresses or 'this' outside misconception", () => {
  it("fires when addresses references an unknown misconception slug", () => {
    const index = emptyIndex();
    index.interventions = [
      intv({
        type: "refutation-text",
        chapter: "ch/1",
        anchor: "intervention-refutation-text-1",
        addresses: ["nonexistent-misconception"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    const i1 = warnings.filter((w) => w.code === "I1");
    expect(i1).toHaveLength(1);
    expect(i1[0]?.message).toMatch(/nonexistent-misconception/);
  });

  it("fires when the literal 'this' survived extraction (standalone intervention)", () => {
    const index = emptyIndex();
    index.interventions = [
      intv({
        type: "refutation-text",
        chapter: "ch/1",
        anchor: "intervention-refutation-text-1",
        addresses: ["this"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    const i1 = warnings.filter((w) => w.code === "I1");
    expect(i1).toHaveLength(1);
    expect(i1[0]?.message).toMatch(/this.*survived extraction/i);
  });

  it("passes when addresses resolves to a declared misconception (matched against anchor)", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("universe-with-a-center")];
    index.interventions = [
      intv({
        type: "contrasting-cases",
        chapter: "ch/1",
        anchor: "intervention-contrasting-cases-1",
        addresses: ["universe-with-a-center"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    expect(warnings.filter((w) => w.code === "I1")).toEqual([]);
  });

  it("matches misconceptions COURSE-WIDE (not chapter-scoped)", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-a", "ch/other")];
    index.interventions = [
      intv({
        type: "contrasting-cases",
        chapter: "ch/1",
        anchor: "intervention-contrasting-cases-1",
        addresses: ["misc-a"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    expect(warnings.filter((w) => w.code === "I1")).toEqual([]);
  });

  it("fires one warning PER unresolved target in a multi-target addresses array", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-known")];
    index.interventions = [
      intv({
        type: "refutation-text",
        chapter: "ch/1",
        anchor: "intervention-refutation-text-1",
        addresses: ["misc-known", "misc-unknown-a", "misc-unknown-b"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    const i1 = warnings.filter((w) => w.code === "I1");
    expect(i1).toHaveLength(2);
  });
});

describe("I3 INFO — bridging-analogy missing limits (Clement 1993 nudge)", () => {
  it("fires when bridging-analogy is missing `limits`", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-x")];
    index.interventions = [
      intv({
        type: "bridging-analogy",
        chapter: "ch/1",
        anchor: "intervention-bridging-analogy-1",
        addresses: ["misc-x"],
      }),
    ];
    const { info } = runPedagogyAudit(index);
    expect(info.filter((i) => i.code === "I3")).toHaveLength(1);
  });

  it("does NOT fire when bridging-analogy has `limits`", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-x")];
    index.interventions = [
      intv({
        type: "bridging-analogy",
        chapter: "ch/1",
        anchor: "intervention-bridging-analogy-1",
        addresses: ["misc-x"],
        limits: "Bread has an outside; the universe doesn't.",
      }),
    ];
    const { info } = runPedagogyAudit(index);
    expect(info.filter((i) => i.code === "I3")).toEqual([]);
  });

  it("does NOT fire for non-bridging-analogy types missing limits", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("misc-x")];
    index.interventions = [
      intv({
        type: "contrasting-cases",
        chapter: "ch/1",
        anchor: "intervention-contrasting-cases-1",
        addresses: ["misc-x"],
      }),
    ];
    const { info } = runPedagogyAudit(index);
    expect(info.filter((i) => i.code === "I3")).toEqual([]);
  });
});

describe("MG3 WARNING — orphan misconception (no <Intervention> pairs)", () => {
  it("fires when a declared misconception has no addressing intervention", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("unaddressed")];
    const { warnings } = runPedagogyAudit(index);
    const mg3 = warnings.filter((w) => w.code === "MG3");
    expect(mg3).toHaveLength(1);
    expect(mg3[0]?.message).toMatch(/unaddressed/);
  });

  it("does NOT fire when at least one intervention addresses the misconception", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("addressed")];
    index.interventions = [
      intv({
        type: "refutation-text",
        chapter: "ch/1",
        anchor: "intervention-refutation-text-1",
        addresses: ["addressed"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    expect(warnings.filter((w) => w.code === "MG3")).toEqual([]);
  });

  it("matches addressed misconceptions across the COURSE (not per-chapter)", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("addressed", "ch/where-declared")];
    index.interventions = [
      intv({
        type: "refutation-text",
        chapter: "ch/elsewhere",
        anchor: "intervention-refutation-text-1",
        addresses: ["addressed"],
      }),
    ];
    const { warnings } = runPedagogyAudit(index);
    expect(warnings.filter((w) => w.code === "MG3")).toEqual([]);
  });
});

describe("MG4 INFO — course-level depth-coverage summary", () => {
  it("emits a summary finding when at least one misconception exists", () => {
    const index = emptyIndex();
    index.misconceptions = [misc("m1"), misc("m2"), misc("m3"), misc("m4")];
    index.interventions = [
      // m1 → substantial
      intv({
        type: "refutation-text",
        chapter: "ch/1",
        anchor: "intervention-refutation-text-1",
        addresses: ["m1"],
        depth: "substantial",
      }),
      // m2 → light only
      intv({
        type: "contrasting-cases",
        chapter: "ch/1",
        anchor: "intervention-contrasting-cases-1",
        addresses: ["m2"],
        depth: "light",
      }),
      // m3 → both substantial AND light → counts as substantial (≥1)
      intv({
        type: "refutation-text",
        chapter: "ch/1",
        anchor: "intervention-refutation-text-2",
        addresses: ["m3"],
        depth: "substantial",
      }),
      intv({
        type: "contrasting-cases",
        chapter: "ch/1",
        anchor: "intervention-contrasting-cases-2",
        addresses: ["m3"],
        depth: "light",
      }),
      // m4 → no interventions → unaddressed
    ];
    const { info } = runPedagogyAudit(index);
    const mg4 = info.filter((f) => f.code === "MG4");
    expect(mg4).toHaveLength(1);
    expect(mg4[0]?.message).toMatch(/4 misconceptions total/);
    expect(mg4[0]?.message).toMatch(/2 have ≥1 substantial intervention/);
    expect(mg4[0]?.message).toMatch(/1 have only light interventions/);
    expect(mg4[0]?.message).toMatch(/1 have no interventions/);
  });

  it("does NOT emit MG4 when there are zero misconceptions (no signal)", () => {
    const index = emptyIndex();
    const { info } = runPedagogyAudit(index);
    expect(info.filter((f) => f.code === "MG4")).toEqual([]);
  });
});
