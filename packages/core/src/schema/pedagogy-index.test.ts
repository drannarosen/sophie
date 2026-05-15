import { describe, expect, test } from "vitest";
import {
  ChapterEntrySchema,
  DefinitionEntrySchema,
  EquationEntrySchema,
  FigureRegistryEntrySchema,
  FigureUsageEntrySchema,
  InlineRefKindSchema,
  InlineRefUsageEntrySchema,
  KeyInsightEntrySchema,
  MisconceptionEntrySchema,
  ModuleEntrySchema,
  ObjectiveEntrySchema,
  PedagogyIndexSchema,
} from "./pedagogy-index.ts";

const validDefinition = {
  term: "Standard candle",
  slug: "standard-candle",
  body: "<p>An object whose intrinsic luminosity is known.</p>",
  chapter: "spoiler-alerts",
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

  test("rejects an entry with empty chapter", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, chapter: "" })
        .success
    ).toBe(false);
  });

  test("accepts an empty body (definitions with header-only structure)", () => {
    expect(
      DefinitionEntrySchema.safeParse({ ...validDefinition, body: "" }).success
    ).toBe(true);
  });
});

const validEquation = {
  slug: "wiens-law",
  title: "Wien's Law",
  number: 1,
  tex: "\\lambda_{\\text{peak}} = b T^{-1}",
  body: "<p>where b is...</p>",
  chapter: "spoiler-alerts",
  anchor: "wiens-law",
};

describe("EquationEntrySchema", () => {
  test("accepts a valid entry with all required fields", () => {
    expect(EquationEntrySchema.safeParse(validEquation).success).toBe(true);
  });

  test("rejects an entry missing number (now required)", () => {
    const { number: _number, ...rest } = validEquation;
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

  test("rejects an entry with number: 0 (extractor counter is 1-indexed)", () => {
    expect(
      EquationEntrySchema.safeParse({ ...validEquation, number: 0 }).success
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
        chapter: "spoiler-alerts",
        anchor: "color-physics",
      }).success
    ).toBe(true);
  });

  // T2
  test("accepts a valid entry without title (title optional)", () => {
    expect(
      KeyInsightEntrySchema.safeParse({
        body: "<p>Color is encoded physics.</p>",
        chapter: "spoiler-alerts",
        anchor: "color-physics",
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
    chapter: "spoiler-alerts",
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
        chapter: "atmospheric-physics",
        anchor: "twinkle",
        length: "short",
      }).success
    ).toBe(true);
  });

  test("accepts a valid long-length entry", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>Long-form misconception treatment...</p>",
        chapter: "atmospheric-physics",
        anchor: "twinkle-long",
        length: "long",
      }).success
    ).toBe(true);
  });

  test("rejects invalid length value", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        chapter: "ch",
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
        chapter: "ch",
        anchor: "misc-1",
        length: "short",
      }).success
    ).toBe(true);
  });

  test("accepts populated prerequisite_misconceptions (list of name slugs)", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        chapter: "ch",
        anchor: "redshift-as-ordinary-doppler",
        length: "short",
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
        chapter: "ch",
        anchor: "universe-with-a-center",
        length: "short",
        prerequisite_misconceptions: [],
      }).success
    ).toBe(true);
  });

  test("accepts populated related_misconceptions", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        chapter: "ch",
        anchor: "brightness-is-intrinsic",
        length: "short",
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
        chapter: "ch",
        anchor: "brightness-is-intrinsic",
        length: "short",
        concept_refs: ["flux", "stellar-luminosity", "distance-modulus"],
      }).success
    ).toBe(true);
  });

  test("accepts populated discipline_scope", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        chapter: "ch",
        anchor: "correlation-implies-causation",
        length: "short",
        discipline_scope: ["statistics", "epidemiology", "social-science"],
      }).success
    ).toBe(true);
  });

  test("rejects non-string elements in prerequisite_misconceptions", () => {
    expect(
      MisconceptionEntrySchema.safeParse({
        body: "<p>x</p>",
        chapter: "ch",
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
        chapter: "ch",
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
        chapter: "ch",
        anchor: "redshift-as-ordinary-doppler",
        length: "short",
        prerequisite_misconceptions: ["universe-with-a-center"],
        related_misconceptions: ["expansion-vs-motion-in-space"],
        concept_refs: ["redshift", "recession-velocity"],
        discipline_scope: ["astronomy"],
      }).success
    ).toBe(true);
  });
});

describe("ChapterEntrySchema", () => {
  const validChapter = {
    slug: "hydrostatic-equilibrium",
    title: "Hydrostatic Equilibrium",
    module: "stellar-structure",
    order: 2,
    description: "Pressure balance in a self-gravitating fluid.",
  };

  // PR-C4 T(N)
  test("accepts a valid entry", () => {
    expect(ChapterEntrySchema.safeParse(validChapter).success).toBe(true);
  });

  test("accepts a valid entry without optional order/description", () => {
    expect(
      ChapterEntrySchema.safeParse({
        slug: validChapter.slug,
        title: validChapter.title,
        module: validChapter.module,
      }).success
    ).toBe(true);
  });

  test("rejects an entry with empty slug", () => {
    expect(
      ChapterEntrySchema.safeParse({ ...validChapter, slug: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with empty title", () => {
    expect(
      ChapterEntrySchema.safeParse({ ...validChapter, title: "" }).success
    ).toBe(false);
  });

  test("rejects an entry with non-integer order", () => {
    expect(
      ChapterEntrySchema.safeParse({ ...validChapter, order: 1.5 }).success
    ).toBe(false);
  });

  test("rejects an entry with negative order", () => {
    expect(
      ChapterEntrySchema.safeParse({ ...validChapter, order: -1 }).success
    ).toBe(false);
  });
});

describe("ModuleEntrySchema", () => {
  const validModule = {
    slug: "stellar-structure",
    title: "Stellar Structure",
    order: 1,
    description: "How stars hold themselves together.",
  };

  // PR-C4 T(N+1)
  test("accepts a valid entry", () => {
    expect(ModuleEntrySchema.safeParse(validModule).success).toBe(true);
  });

  test("rejects an entry missing order (required — modules are ordered)", () => {
    const { order: _order, ...rest } = validModule;
    expect(ModuleEntrySchema.safeParse(rest).success).toBe(false);
  });

  test("rejects an entry with negative order", () => {
    expect(
      ModuleEntrySchema.safeParse({ ...validModule, order: -1 }).success
    ).toBe(false);
  });

  test("rejects an entry with empty title", () => {
    expect(
      ModuleEntrySchema.safeParse({ ...validModule, title: "" }).success
    ).toBe(false);
  });
});

describe("ObjectiveEntrySchema", () => {
  const validObjective = {
    id: "lo-1",
    verb: "Recognize",
    body: "<p>Distinguish parallax distance from standard-candle distance.</p>",
    chapter: "spoiler-alerts",
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
    chapter: "spoiler-alerts",
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

  test("rejects an entry with empty chapter", () => {
    expect(
      InlineRefUsageEntrySchema.safeParse({ ...validUsage, chapter: "" })
        .success
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
    chapters: [],
    modules: [],
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

  // PR-C4 T(N+4) — three new collections required.
  test("rejects an index missing the new chapters collection", () => {
    const { chapters: _chapters, ...withoutChapters } = emptyIndex;
    expect(PedagogyIndexSchema.safeParse(withoutChapters).success).toBe(false);
  });

  test("rejects an index missing the new modules collection", () => {
    const { modules: _modules, ...withoutModules } = emptyIndex;
    expect(PedagogyIndexSchema.safeParse(withoutModules).success).toBe(false);
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

  test("accepts populated inlineRefUsages", () => {
    expect(
      PedagogyIndexSchema.safeParse({
        ...emptyIndex,
        inlineRefUsages: [
          {
            kind: "glossary-term",
            refKey: "Parallax",
            chapter: "ch-a",
          },
          {
            kind: "chapter-ref",
            refKey: "hydrostatic-equilibrium",
            chapter: "ch-b",
          },
        ],
      }).success
    ).toBe(true);
  });
});
