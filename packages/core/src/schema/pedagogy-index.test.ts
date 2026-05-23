import { describe, expect, test } from "vitest";
import { PedagogyIndexSchema } from "./pedagogy-index.ts";
import {
  DeepDiveEntrySchema,
  DefinitionEntrySchema,
  EquationCitationEntrySchema,
  EquationEntrySchema,
  FigureRegistryEntrySchema,
  FigureUsageEntrySchema,
  InlineRefKindSchema,
  InlineRefUsageEntrySchema,
  KeyInsightEntrySchema,
  MisconceptionEntrySchema,
  ObjectiveEntrySchema,
  OMIFlowEntrySchema,
} from "./pedagogy-index-entries/index.ts";

const validDefinition = {
  term: "Standard candle",
  slug: "standard-candle",
  body: "<p>An object whose intrinsic luminosity is known.</p>",
  unit: "spoiler-alerts",
  anchor: "standard-candle",
};

describe("DefinitionEntrySchema", () => {
  test("accepts a valid entry", () => {
    expect(DefinitionEntrySchema.safeParse(validDefinition).success).toBe(true);
  });

  test("rejects an entry missing the term", () => {
    const { term: _term, ...rest } = validDefinition;
    expect(DefinitionEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an entry with empty slug", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, slug: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty unit", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, unit: "" }).success
    ).toBe(false);
  });

  test("accepts an empty body (definitions with header-only structure)", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, body: "" }).success
    ).toBe(true);
  });
});

// ADR 0060: post-registry, the pedagogy-index EquationEntry mirrors the
// registry frontmatter shape (id/title/tex/symbols/constants?/rearranged_forms?/
// related?/tags?/version?) plus the optional extracted biography. The
// chapter-side fields (chapter, number, body, anchor, slug) live on
// EquationCitationEntry instead — one declaration per equation, N citations
// per equation across chapters.
const validEquation = {
  id: "wiens-law",
  title: "Wien's Law",
  tex: "\\lambda_{\\text{peak}} = b T^{-1}",
  symbols: ["T", "\\lambda_{peak}"],
};

describe("EquationEntrySchema (registry-shaped, ADR 0060)", () => {
  test("accepts the minimal valid entry (id, title, tex, symbols)", () => {
    expect(EquationEntrySchema.safeParse(validEquation).success).toBe(true);
  });

  test("rejects an entry missing id", () => {
    const { id: _id, ...rest } = validEquation;
    expect(EquationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an entry missing tex", () => {
    const { tex: _tex, ...rest } = validEquation;
    expect(EquationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an entry with empty tex", () => {
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, tex: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty title", () => {
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, title: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty symbols array (registry requires min 1)", () => {
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, symbols: [] }).success
    ).toBe(false);
  });

  test("rejects empty-string entries in symbols (NonEmptyString)", () => {
    expect(
      EquationEntrySchema.safeParse({
        ...validEquation,
        symbols: ["T", ""],
      }).success
    ).toBe(false);
  });

  test("accepts an optional constants array (ADR 0046 §R9)", () => {
    const result = EquationEntrySchema.safeParse({
      ...validEquation,
      constants: [
        {
          symbol: "b",
          value: "0.29",
          unit: "cm K",
          name: "Wien's displacement constant",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts an optional rearranged_forms array (ADR 0046 §R9)", () => {
    const result = EquationEntrySchema.safeParse({
      ...validEquation,
      rearranged_forms: [
        {
          tex: "T = b \\lambda_{peak}^{-1}",
          solves_for: "T",
          label: "Temperature from peak wavelength",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts an optional related array (ADR 0046 §R9)", () => {
    const result = EquationEntrySchema.safeParse({
      ...validEquation,
      related: [{ refId: "stefan-boltzmann", kind: "see-also" }],
    });
    expect(result.success).toBe(true);
  });

  test("rejects pre-ADR-0060 fields (unit, number, body, anchor) via .strict()", () => {
    // Load-bearing: the chapter-side data moves to EquationCitationEntry.
    // .strict() rejection guards against extractor drift during the cutover.
    expect(
      EquationEntrySchema.safeParse({
        ...validEquation,
        unit: "spoiler-alerts",
      }).success
    ).toBe(false);
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, number: 1 }).success
    ).toBe(false);
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, body: "<p>...</p>" })
        .success
    ).toBe(false);
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, anchor: "wiens-law" })
        .success
    ).toBe(false);
  });

  // EquationBiography per ADR 0046 §R8 — preserved through the registry
  // migration; storage moves from chapter-inline to registry MDX body.
  test("accepts an entry without biography (per-equation opt-in)", () => {
    expect(EquationEntrySchema.safeParse(validEquation).success).toBe(true);
  });

  test("accepts an entry WITH a full biography (Wien's law shape)", () => {
    const result = EquationEntrySchema.safeParse({
      ...validEquation,
      biography: {
        observable: {
          body: "Peak wavelength of thermal emission vs temperature.",
          epistemicRole: "observable",
        },
        assumptions: [
          {
            body: "Source is in local thermodynamic equilibrium.",
            type: "thermal-equilibrium",
            epistemicRole: "assumption",
          },
        ],
        units: [
          { symbol: "T", unit: "K" },
          { symbol: "\\lambda_{peak}", unit: "cm" },
        ],
        breaks_when: {
          body: "Non-thermal emission (synchrotron, masers, line emission).",
          epistemicRole: "approximation",
        },
        common_misuses: [
          {
            body: "Applying Wien's law to absorption-line spectra.",
            misconception: "wiens-law-absorption-spectra",
          },
        ],
        derivation_steps: [],
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects a biography with a wrongly-roled observable (extractor drift guard)", () => {
    const result = EquationEntrySchema.safeParse({
      ...validEquation,
      biography: {
        observable: { body: "x", epistemicRole: "inference" },
      },
    });
    expect(result.success).toBe(false);
  });
});

const validCitation = {
  unit: "spoiler-alerts",
  refId: "wiens-law",
  anchor: "wiens-law-citation-1",
  number: 1,
};

describe("EquationCitationEntrySchema (ADR 0060)", () => {
  test("accepts the minimal valid citation (unit, refId, anchor, number)", () => {
    expect(EquationCitationEntrySchema.safeParse(validCitation).success).toBe(
      true
    );
  });

  test("accepts a citation with optional framingHtml", () => {
    expect(
      EquationCitationEntrySchema.safeParse({
        ...validCitation,
        framingHtml: "<p>chapter-specific framing prose</p>",
      }).success
    ).toBe(true);
  });

  test("rejects a citation missing unit", () => {
    const { unit: _unit, ...rest } = validCitation;
    expect(EquationCitationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects a citation missing refId", () => {
    const { refId: _refId, ...rest } = validCitation;
    expect(EquationCitationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects a citation missing anchor", () => {
    const { anchor: _anchor, ...rest } = validCitation;
    expect(EquationCitationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects a citation missing number", () => {
    const { number: _number, ...rest } = validCitation;
    expect(EquationCitationEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects a citation with number: 0 (1-indexed per-unit sequence)", () => {
    expect(
      EquationCitationEntrySchema.safeParse({ ...validCitation, number: 0 })
        .success
    ).toBe(false);
  });

  test("rejects a citation with non-kebab-case refId (Slug)", () => {
    expect(
      EquationCitationEntrySchema.safeParse({
        ...validCitation,
        refId: "Wien's Law",
      }).success
    ).toBe(false);
  });

  test("rejects unknown keys (.strict())", () => {
    expect(
      EquationCitationEntrySchema.safeParse({
        ...validCitation,
        framing: "<p>wrong key</p>",
      }).success
    ).toBe(false);
  });
});

describe("KeyInsightEntrySchema", () => {
  // T1
  test("accepts a valid entry with title", () => {
    expect(
      KeyInsightEntrySchema.safeParse({
        title: "Color is encoded physics",
        body: "<p>Color is encoded physics.</p>",
        unit: "spoiler-alerts",
        anchor: "color-physics",
        slug: "color-is-encoded-physics",
      }).success
    ).toBe(true);
  });

  // T2
  test("accepts a valid entry without title (title optional)", () => {
    expect(
      KeyInsightEntrySchema.safeParse({
        body: "<p>Color is encoded physics.</p>",
        unit: "spoiler-alerts",
        anchor: "color-physics",
        slug: "spoiler-alerts-color-physics",
      }).success
    ).toBe(true);
  });
});

describe("FigureRegistryEntrySchema", () => {
  // T3
  test("accepts a valid registry entry (name, src, alt)", () => {
    expect(
      FigureRegistryEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        src: "/figures/ladder.png",
        alt: "Cosmic distance ladder schematic",
      }).success
    ).toBe(true);
  });

  // T4
  test("rejects a registry entry with empty src (NonEmptyString)", () => {
    expect(
      FigureRegistryEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        src: "",
        alt: "Cosmic distance ladder schematic",
      }).success
    ).toBe(false);
  });

  // PR-C4 T(N+3) — optional intrinsic dimensions (Q11).
  test("accepts a registry entry WITH width and height", () => {
    expect(
      FigureRegistryEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        src: "/figures/ladder.png",
        alt: "Cosmic distance ladder schematic",
        width: 1200,
        height: 800,
      }).success
    ).toBe(true);
  });

  test("accepts a registry entry WITHOUT width or height (optional)", () => {
    expect(
      FigureRegistryEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        src: "/figures/ladder.png",
        alt: "Cosmic distance ladder schematic",
      }).success
    ).toBe(true);
  });

  test("rejects a registry entry with negative width", () => {
    expect(
      FigureRegistryEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        src: "/figures/ladder.png",
        alt: "Cosmic distance ladder schematic",
        width: -10,
        height: 800,
      }).success
    ).toBe(false);
  });

  test("rejects a registry entry with zero width", () => {
    expect(
      FigureRegistryEntrySchema.safeParse({
        name: "cosmic-distance-ladder",
        src: "/figures/ladder.png",
        alt: "Cosmic distance ladder schematic",
        width: 0,
        height: 800,
      }).success
    ).toBe(false);
  });
});

describe("FigureUsageEntrySchema", () => {
  const validUsage = {
    name: "cosmic-distance-ladder",
    unit: "spoiler-alerts",
    anchor: "fig-cosmic-distance-ladder-1",
    number: 1,
    canonical: false,
  };

  // T5
  test("accepts a valid usage entry", () => {
    expect(FigureUsageEntrySchema.safeParse(validUsage).success).toBe(true);
  });

  // T6
  test("rejects a usage entry with number: 0 (positive() required)", () => {
    expect(
      FigureUsageEntrySchema.safeParse({ ...validUsage, number: 0 }).success
    ).toBe(false);
  });
});

describe("MisconceptionEntrySchema", () => {
  // T7
  test("accepts a valid short-length entry", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>Stars don't twinkle in space.</p>",
        unit: "atmospheric-physics",
        anchor: "twinkle",
        length: "short",
        slug: "atmospheric-physics-twinkle",
      }).success
    ).toBe(true);
  });

  test("accepts a valid long-length entry", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>Long-form misconception treatment...</p>",
        unit: "atmospheric-physics",
        anchor: "twinkle-long",
        length: "long",
        slug: "atmospheric-physics-twinkle-long",
      }).success
    ).toBe(true);
  });

  test("rejects invalid length value", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "a",
        length: "medium",
      }).success
    ).toBe(false);
  });

  // ADR 0044 — misconception graph fields. All four are optional;
  // unpopulated entries (the pre-ADR shape) must continue to validate.
  test("accepts an entry without any graph fields (backward-compat)", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "misc-1",
        length: "short",
        slug: "ch-misc-1",
      }).success
    ).toBe(true);
  });

  test("accepts populated prerequisite_misconceptions (list of name slugs)", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "redshift-as-ordinary-doppler",
        length: "short",
        slug: "ch-redshift-as-ordinary-doppler",
        prerequisite_misconceptions: [
          "universe-with-a-center",
          "expansion-vs-motion-in-space",
        ],
      }).success
    ).toBe(true);
  });

  test("accepts an empty prerequisite_misconceptions list (root in the DAG)", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "universe-with-a-center",
        length: "short",
        slug: "ch-universe-with-a-center",
        prerequisite_misconceptions: [],
      }).success
    ).toBe(true);
  });

  test("accepts populated related_misconceptions", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "brightness-is-intrinsic",
        length: "short",
        slug: "ch-brightness-is-intrinsic",
        related_misconceptions: [
          "flux-and-luminosity-interchangeable",
          "all-stars-equally-bright",
        ],
      }).success
    ).toBe(true);
  });

  test("accepts populated concept_refs", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "brightness-is-intrinsic",
        length: "short",
        slug: "ch-brightness-is-intrinsic",
        concept_refs: ["flux", "stellar-luminosity", "distance-modulus"],
      }).success
    ).toBe(true);
  });

  test("accepts populated discipline_scope", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "correlation-implies-causation",
        length: "short",
        slug: "ch-correlation-implies-causation",
        discipline_scope: ["statistics", "epidemiology", "social-science"],
      }).success
    ).toBe(true);
  });

  test("rejects non-string elements in prerequisite_misconceptions", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "a",
        length: "short",
        prerequisite_misconceptions: [42],
      }).success
    ).toBe(false);
  });

  test("rejects empty-string slugs inside the graph-field arrays", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "a",
        length: "short",
        related_misconceptions: [""],
      }).success
    ).toBe(false);
  });

  test("accepts ALL four graph fields populated together", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        unit: "ch",
        anchor: "redshift-as-ordinary-doppler",
        length: "short",
        slug: "ch-redshift-as-ordinary-doppler",
        prerequisite_misconceptions: ["universe-with-a-center"],
        related_misconceptions: ["expansion-vs-motion-in-space"],
        concept_refs: ["redshift", "recession-velocity"],
        discipline_scope: ["astronomy"],
      }).success
    ).toBe(true);
  });
});

// ADR 0058 §R-deep-dive — <Callout variant="deep-dive"> entries are
// tracked; <Callout variant="the-more-you-know"> is intentionally not.
describe("DeepDiveEntrySchema", () => {
  test("accepts the minimal valid shape", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        unit: "spoiler-alerts",
        anchor: "distance-ladder",
        title: "How the Distance Ladder Works",
        body: "<p>Parallax then Cepheids.</p>",
      }).success
    ).toBe(true);
  });

  test("accepts an entry with an empty title (untitled deep-dives are legal)", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        unit: "ch",
        anchor: "dd-1",
        title: "",
        body: "<p>x</p>",
      }).success
    ).toBe(true);
  });

  test("accepts an entry with an empty body (extractor warns; schema doesn't reject)", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        unit: "ch",
        anchor: "dd-1",
        title: "Title",
        body: "",
      }).success
    ).toBe(true);
  });

  test("rejects an entry missing the unit field", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        anchor: "dd-1",
        title: "x",
        body: "<p>x</p>",
      }).success
    ).toBe(false);
  });

  test("rejects an entry missing the anchor field", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        unit: "ch",
        title: "x",
        body: "<p>x</p>",
      }).success
    ).toBe(false);
  });

  test("rejects an empty unit slug (Slug refinement)", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        unit: "",
        anchor: "dd-1",
        title: "x",
        body: "<p>x</p>",
      }).success
    ).toBe(false);
  });

  test("rejects an empty anchor (NonEmptyString-style)", () => {
    expect(
      DeepDiveEntrySchema.safeParse({
        unit: "ch",
        anchor: "",
        title: "x",
        body: "<p>x</p>",
      }).success
    ).toBe(false);
  });
});

// ADR 0063 §Decision §3-7 — <OMIFlow> entry: strict-3-slot, slot-name
// binds role, optional concept binding.
describe("OMIFlowEntrySchema", () => {
  const validSlot = { title: "x", body: "<p>x</p>" };
  const validOmiFlow = {
    unit: "spoiler-alerts",
    anchor: "omi-1",
    observable: validSlot,
    model: validSlot,
    inference: validSlot,
    sourceOrder: ["observable", "model", "inference"] as const,
  };

  test("accepts the minimal valid shape (no concept binding)", () => {
    expect(OMIFlowEntrySchema.safeParse(validOmiFlow).success).toBe(true);
  });

  test("accepts an entry with concept= binding", () => {
    expect(
      OMIFlowEntrySchema.safeParse({
        ...validOmiFlow,
        concept: "stellar-temperature",
      }).success
    ).toBe(true);
  });

  test("accepts slots with empty titles (untitled slots fall back to role label)", () => {
    expect(
      OMIFlowEntrySchema.safeParse({
        ...validOmiFlow,
        observable: { title: "", body: "<p>x</p>" },
      }).success
    ).toBe(true);
  });

  test("rejects an entry missing unit", () => {
    const { unit: _unit, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing anchor", () => {
    const { anchor: _anchor, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing the observable slot", () => {
    const { observable: _observable, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing the model slot", () => {
    const { model: _model, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an entry missing the inference slot", () => {
    const { inference: _inference, ...without } = validOmiFlow;
    expect(OMIFlowEntrySchema.safeParse(without).success).toBe(false);
  });

  test("rejects an empty unit slug (Slug refinement)", () => {
    expect(
      OMIFlowEntrySchema.safeParse({ ...validOmiFlow, unit: "" }).success
    ).toBe(false);
  });

  test("rejects an empty anchor (NonEmptyString)", () => {
    expect(
      OMIFlowEntrySchema.safeParse({ ...validOmiFlow, anchor: "" }).success
    ).toBe(false);
  });
});

// W2/D3 — ChapterEntrySchema + ModuleEntrySchema deleted; their
// W1-and-prior test blocks removed with them. Reading-shape data flows
// through ArtifactEntry[type=reading] + UnitEntry; module metadata
// graduates to SectionEntry[type=module] (tested in section.test.ts).

describe("ObjectiveEntrySchema", () => {
  const validObjective = {
    id: "lo-1",
    verb: "Recognize",
    body: "<p>Distinguish parallax distance from standard-candle distance.</p>",
    unit: "spoiler-alerts",
    anchor: "lo-lo-1",
  };

  // PR-C4 T(N+2)
  test("accepts a valid entry", () => {
    expect(ObjectiveEntrySchema.safeParse(validObjective).success).toBe(true);
  });

  test("rejects an entry with empty id", () => {
    expect(
      ObjectiveEntrySchema.safeParse({ ...validObjective, id: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty verb", () => {
    expect(
      ObjectiveEntrySchema.safeParse({ ...validObjective, verb: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty body", () => {
    expect(
      ObjectiveEntrySchema.safeParse({ ...validObjective, body: "" }).success
    ).toBe(false);
  });
});

describe("InlineRefKindSchema", () => {
  test("accepts each of the four valid inline-ref kinds", () => {
    for (const kind of [
      "glossary-term",
      "eq-ref",
      "figure-ref",
      "chapter-ref",
    ]) {
      expect(InlineRefKindSchema.safeParse(kind).success).toBe(true);
    }
  });

  test("rejects an unknown kind", () => {
    expect(InlineRefKindSchema.safeParse("definition-ref").success).toBe(false);
  });
});

describe("InlineRefUsageEntrySchema", () => {
  const validUsage = {
    kind: "glossary-term" as const,
    refKey: "Standard candle",
    unit: "spoiler-alerts",
  };

  test("accepts a valid entry", () => {
    expect(InlineRefUsageEntrySchema.safeParse(validUsage).success).toBe(true);
  });

  test("accepts each of the four kinds", () => {
    for (const kind of [
      "glossary-term",
      "eq-ref",
      "figure-ref",
      "chapter-ref",
    ] as const) {
      expect(
        InlineRefUsageEntrySchema.safeParse({ ...validUsage, kind }).success
      ).toBe(true);
    }
  });

  test("rejects an entry with empty refKey", () => {
    expect(
      InlineRefUsageEntrySchema.safeParse({ ...validUsage, refKey: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty unit", () => {
    expect(
      InlineRefUsageEntrySchema.safeParse({ ...validUsage, unit: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with unknown kind", () => {
    expect(
      InlineRefUsageEntrySchema.safeParse({
        ...validUsage,
        kind: "not-a-kind",
      }).success
    ).toBe(false);
  });
});

describe("PedagogyIndexSchema", () => {
  const emptyIndex = {
    definitions: [],
    equations: [],
    keyInsights: [],
    figureRegistry: [],
    figureUsages: [],
    misconceptions: [],
    objectives: [],
    inlineRefUsages: [],
  };

  test("accepts an empty index", () => {
    expect(PedagogyIndexSchema.safeParse(emptyIndex).success).toBe(true);
  });

  test("accepts a populated definitions array", () => {
    expect(
      PedagogyIndexSchema.safeParse({
        ...emptyIndex,
        definitions: [validDefinition],
      }).success
    ).toBe(true);
  });

  test("rejects an index missing a required collection", () => {
    const { misconceptions: _misconceptions, ...withoutMisconceptions } =
      emptyIndex;
    expect(PedagogyIndexSchema.safeParse(withoutMisconceptions).success).toBe(
      false
    );
  });

  test("rejects an index missing the new objectives collection", () => {
    const { objectives: _objectives, ...withoutObjectives } = emptyIndex;
    expect(PedagogyIndexSchema.safeParse(withoutObjectives).success).toBe(
      false
    );
  });

  // PR-C4 Task 2 — inlineRefUsages required.
  test("rejects an index missing the new inlineRefUsages collection", () => {
    const { inlineRefUsages: _inlineRefUsages, ...withoutInline } = emptyIndex;
    expect(PedagogyIndexSchema.safeParse(withoutInline).success).toBe(false);
  });

  // PR-γ (MultiRep extractor) — multiReps optional with default [].
  test("multiReps defaults to [] when absent (forward-compat with pre-PR-γ indexes)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.multiReps).toEqual([]);
    }
  });

  // PR-B (P3 deep-dive tracking) — deepDives optional with default [].
  test("deepDives defaults to [] when absent (forward-compat)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deepDives).toEqual([]);
    }
  });

  test("accepts a populated deepDives array", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      deepDives: [
        {
          unit: "spoiler-alerts",
          anchor: "distance-ladder",
          title: "How the Distance Ladder Works",
          body: "<p>Parallax → Cepheids → SN Ia.</p>",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deepDives).toHaveLength(1);
      expect(result.data.deepDives[0]?.anchor).toBe("distance-ladder");
    }
  });

  // ADR 0063 (A8) — omiFlows optional with default [].
  test("omiFlows defaults to [] when absent (forward-compat)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.omiFlows).toEqual([]);
    }
  });

  test("accepts a populated omiFlows array", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      omiFlows: [
        {
          unit: "spoiler-alerts",
          anchor: "omi-stellar-temperature",
          concept: "stellar-temperature",
          observable: { title: "HR diagram", body: "<p>x</p>" },
          model: { title: "Hydrostatic equilibrium", body: "<p>x</p>" },
          inference: { title: "Mass-lifetime relation", body: "<p>x</p>" },
          sourceOrder: ["observable", "model", "inference"] as const,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.omiFlows).toHaveLength(1);
      expect(result.data.omiFlows[0]?.anchor).toBe("omi-stellar-temperature");
    }
  });

  test("accepts a populated multiReps array", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      multiReps: [
        {
          concept: "orbital-radius",
          id: "mr-orbital-radius",
          unit: "module-02-lecture-04",
          reps: [
            {
              kind: "verbal",
              body: "The distance from the central mass.",
            },
            {
              kind: "equation",
              refKey: "kepler-3rd-law",
              symbol: "r",
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts populated inlineRefUsages", () => {
    expect(
      PedagogyIndexSchema.safeParse({
        ...emptyIndex,
        inlineRefUsages: [
          {
            kind: "glossary-term",
            refKey: "Parallax",
            unit: "ch-a",
          },
          {
            kind: "chapter-ref",
            refKey: "hydrostatic-equilibrium",
            unit: "ch-b",
          },
        ],
      }).success
    ).toBe(true);
  });

  // ADR 0060 — equationCitations[] tracks chapter-side <KeyEquation refId>
  // callsites; one declaration in equations[], N citations across chapters.
  test("equationCitations defaults to [] when absent (forward-compat per ADR 0060)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.equationCitations).toEqual([]);
    }
  });

  test("accepts a populated equationCitations array", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      equationCitations: [
        {
          unit: "spoiler-alerts",
          refId: "wiens-law",
          anchor: "wiens-law-citation-1",
          number: 1,
        },
        {
          unit: "spoiler-alerts",
          refId: "stefan-boltzmann",
          anchor: "stefan-boltzmann-citation-1",
          number: 2,
          framingHtml: "<p>chapter framing prose</p>",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  // Wedge B-followup (W1) — sections + units optional with default [].
  test("sections defaults to [] when absent (forward-compat with pre-W1 indexes)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections).toEqual([]);
    }
  });

  test("units defaults to [] when absent (forward-compat with pre-W1 indexes)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.units).toEqual([]);
    }
  });

  test("accepts a populated sections array (W1)", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      sections: [
        { type: "module", slug: "intro", title: "Intro", order: 0 },
        { type: "module", slug: "stars", title: "Stars", order: 1 },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sections).toHaveLength(2);
      expect(result.data.sections[0]?.slug).toBe("intro");
    }
  });

  test("accepts a populated units array with chapter + lecture bindings (W1)", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      units: [
        {
          id: "u1",
          type: "lecture",
          title: "U1",
          order: 0,
          prereqs: [],
          section_id: "intro",
          chapter: "u1-chapter",
          status: "stable",
        },
        {
          id: "u2",
          type: "lecture",
          title: "U2",
          order: 0,
          prereqs: ["logarithms"],
          section_id: "stars",
          chapter: "u2-chapter",
          lecture: "u2-slides",
          status: "stable",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.units).toHaveLength(2);
      expect(result.data.units[1]?.lecture).toBe("u2-slides");
      expect(result.data.units[1]?.prereqs).toEqual(["logarithms"]);
    }
  });

  test("rejects a unit with an invalid type discriminator (W1)", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      units: [
        {
          id: "x",
          type: "invalid",
          title: "X",
          order: 0,
          prereqs: [],
          section_id: "intro",
          unit: "x",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  // Wedge B-followup (W2) — artifacts surfaces with default [].
  test("artifacts defaults to [] when absent (forward-compat with pre-W2 indexes)", () => {
    const result = PedagogyIndexSchema.safeParse(emptyIndex);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.artifacts).toEqual([]);
    }
  });

  test("accepts a populated artifacts array with both scope variants (W2)", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      artifacts: [
        {
          id: "spectra-and-composition",
          type: "reading",
          scope: "unit",
          title: "Spectra & Composition — reading",
          source_path:
            "src/content/sections/stars/units/spectra-and-composition/reading.mdx",
          references: {},
          section_id: "stars",
          unit_id: "spectra-and-composition",
        },
        {
          id: "stars-intro",
          type: "intro",
          scope: "section",
          title: "Stars — module intro",
          source_path: "src/content/sections/stars/intro.mdx",
          references: {},
          section_id: "stars",
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.artifacts).toHaveLength(2);
      const unitArtifact = result.data.artifacts[0];
      if (unitArtifact?.scope === "unit") {
        expect(unitArtifact.unit_id).toBe("spectra-and-composition");
      }
      const sectionArtifact = result.data.artifacts[1];
      expect(sectionArtifact?.scope).toBe("section");
    }
  });

  test("rejects a unit-scope artifact missing unit_id (W2)", () => {
    const result = PedagogyIndexSchema.safeParse({
      ...emptyIndex,
      artifacts: [
        {
          id: "x",
          type: "reading",
          scope: "unit",
          title: "X",
          source_path: "src/content/sections/s/units/u/reading.mdx",
          references: {},
          section_id: "s",
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
