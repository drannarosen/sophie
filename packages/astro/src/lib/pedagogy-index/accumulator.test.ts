import type {
  ArtifactEntry,
  DeepDiveEntry,
  EquationCitationEntry,
  EquationEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  InlineRefUsageEntry,
  KeyInsightEntry,
  MisconceptionEntry,
  ObjectiveEntry,
  OMIFlowEntry,
  SectionEntry,
  UnitEntry,
} from "@sophie/core/schema";
import { beforeEach, describe, expect, test } from "vitest";
import { indexAccumulator, resetIndexAccumulator } from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("indexAccumulator (cross-chapter)", () => {
  // Top-level beforeEach wipes accumulator state before each test.

  test("aggregates definitions from multiple chapters", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Parallax",
        slug: "parallax",
        body: "",
        unit: "ch-a",
        anchor: "parallax",
      },
    ]);
    indexAccumulator.addDefinitions([
      {
        term: "Flux",
        slug: "flux",
        body: "",
        unit: "ch-b",
        anchor: "flux",
      },
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.definitions).toHaveLength(2);
    const terms = index.definitions.map((d) => d.term).sort();
    expect(terms).toEqual(["Flux", "Parallax"]);
  });

  test("throws on cross-chapter slug duplication", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Standard candle",
        slug: "standard-candle",
        body: "",
        unit: "ch-a",
        anchor: "standard-candle",
      },
    ]);

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Standard candle",
          slug: "standard-candle",
          body: "",
          unit: "ch-b",
          anchor: "standard-candle",
        },
      ])
    ).toThrow(/multiple chapters/i);
  });

  test("clearUnit removes only that chapter's entries", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Alpha",
        slug: "alpha",
        body: "",
        unit: "ch-a",
        anchor: "alpha",
      },
      {
        term: "Beta",
        slug: "beta",
        body: "",
        unit: "ch-b",
        anchor: "beta",
      },
    ]);

    indexAccumulator.clearUnit("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    const inA = index.definitions.filter((d) => d.unit === "ch-a");
    const inB = index.definitions.filter((d) => d.unit === "ch-b");
    expect(inA).toHaveLength(0);
    expect(inB).toHaveLength(1);
  });

  test("re-adding a chapter's entries after clearUnit does not throw cross-chapter", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Gamma",
        slug: "gamma",
        body: "",
        unit: "ch-a",
        anchor: "gamma",
      },
    ]);
    indexAccumulator.clearUnit("ch-a");

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Gamma",
          slug: "gamma",
          body: "",
          unit: "ch-a",
          anchor: "gamma",
        },
      ])
    ).not.toThrow();
  });
});
describe("indexAccumulator equations (registry-sourced per ADR 0060)", () => {
  const makeEq = (overrides: Partial<EquationEntry> = {}): EquationEntry => ({
    id: "default-id",
    title: "Default Title",
    tex: "x = 1",
    symbols: ["x"],
    ...overrides,
  });

  test("addEquations stores entries keyed by id (registry-sourced; last-write-wins)", () => {
    indexAccumulator.addEquations([makeEq({ id: "alpha", title: "Alpha" })]);
    indexAccumulator.addEquations([makeEq({ id: "beta", title: "Beta" })]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(2);
    const ids = index.equations.map((e) => e.id).sort();
    expect(ids).toEqual(["alpha", "beta"]);
  });

  test("re-adding an entry with the same id overwrites (last-write-wins)", () => {
    indexAccumulator.addEquations([
      makeEq({ id: "wiens-law", title: "First" }),
    ]);
    indexAccumulator.addEquations([
      makeEq({ id: "wiens-law", title: "Second" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(1);
    expect(index.equations[0]?.title).toBe("Second");
  });

  test("clearEquations() wipes the registry slot wholesale", () => {
    indexAccumulator.addEquations([makeEq({ id: "a" }), makeEq({ id: "b" })]);
    indexAccumulator.clearEquations();
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toEqual([]);
  });

  test("clearUnit does NOT touch the registry equations slot", () => {
    // Post-ADR-0060: equations are registry-global; chapter clears only
    // touch chapter-keyed collections + equationCitations.
    indexAccumulator.addEquations([makeEq({ id: "wiens-law" })]);
    indexAccumulator.clearUnit("any-chapter");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(1);
  });
});
describe("indexAccumulator equationCitations (per-chapter)", () => {
  const makeCitation = (
    overrides: Partial<EquationCitationEntry> = {}
  ): EquationCitationEntry => ({
    unit: "ch-a",
    refId: "wiens-law",
    anchor: "wiens-law-citation-1",
    number: 1,
    ...overrides,
  });

  test("addEquationCitations appends citations from any chapter", () => {
    indexAccumulator.addEquationCitations([
      makeCitation({ unit: "ch-a", refId: "wiens-law" }),
    ]);
    indexAccumulator.addEquationCitations([
      makeCitation({ unit: "ch-b", refId: "stefan-boltzmann", number: 1 }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equationCitations).toHaveLength(2);
  });

  test("clearUnitCitations removes only that chapter's citations", () => {
    indexAccumulator.addEquationCitations([
      makeCitation({ unit: "ch-a", refId: "alpha" }),
      makeCitation({
        unit: "ch-a",
        refId: "beta",
        number: 2,
        anchor: "beta-citation-2",
      }),
    ]);
    indexAccumulator.addEquationCitations([
      makeCitation({
        unit: "ch-b",
        refId: "gamma",
        anchor: "gamma-citation-1",
      }),
    ]);

    indexAccumulator.clearUnitCitations("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equationCitations).toHaveLength(1);
    expect(index.equationCitations[0]?.unit).toBe("ch-b");
  });

  test("clearUnit also clears that chapter's citations", () => {
    indexAccumulator.addEquationCitations([
      makeCitation({ unit: "ch-a", refId: "alpha" }),
      makeCitation({
        unit: "ch-b",
        refId: "beta",
        anchor: "beta-citation-1",
      }),
    ]);
    indexAccumulator.clearUnit("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.equationCitations.filter((c) => c.unit === "ch-a")
    ).toHaveLength(0);
    expect(
      index.equationCitations.filter((c) => c.unit === "ch-b")
    ).toHaveLength(1);
  });
});
describe("indexAccumulator key-insights (cross-chapter)", () => {
  const ki = (overrides: Partial<KeyInsightEntry> = {}): KeyInsightEntry => ({
    title: "Default",
    body: "",
    unit: "ch-a",
    anchor: "default-anchor",
    ...overrides,
  });

  test("addKeyInsights populates keyInsights collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addKeyInsights([
      ki({ title: "Alpha", unit: "ki-ch-a", anchor: "alpha" }),
      ki({ title: "Beta", unit: "ki-ch-b", anchor: "beta" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const titles = index.keyInsights
      .filter((k) => k.unit === "ki-ch-a" || k.unit === "ki-ch-b")
      .map((k) => k.title)
      .sort();
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  test("clearUnit removes key-insights for the target chapter; other chapters survive", () => {
    indexAccumulator.addKeyInsights([
      ki({ title: "Insight A", unit: "ki-clear-a", anchor: "insight-a" }),
      ki({ title: "Insight B", unit: "ki-clear-b", anchor: "insight-b" }),
    ]);

    indexAccumulator.clearUnit("ki-clear-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.keyInsights.filter((k) => k.unit === "ki-clear-a")
    ).toHaveLength(0);
    expect(index.keyInsights.find((k) => k.unit === "ki-clear-b")?.title).toBe(
      "Insight B"
    );
  });

  test("two chapters can share an auto-anchor (e.g. 'ki-1') without collision", () => {
    indexAccumulator.addKeyInsights([
      ki({ unit: "ki-share-a", anchor: "ki-1" }),
    ]);
    indexAccumulator.addKeyInsights([
      ki({ unit: "ki-share-b", anchor: "ki-1" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.keyInsights.filter((k) => k.anchor === "ki-1");
    const chapters = shared.map((k) => k.unit).sort();
    expect(chapters).toContain("ki-share-a");
    expect(chapters).toContain("ki-share-b");
  });
});

/**
 * Figure-test fixture. Supports both string-valued and boolean-presence
 * (value === null) attributes. The `canonical` JSX prop on `<Figure>`
 * is a boolean-presence prop — the mdast `mdxJsxAttribute` carries
 * `value: null` when authored as `<Figure name="X" canonical />`. We
 * model both shapes here so tests can exercise the canonical-detection
 * branch authentically.
 */
const _mdxFigure = (
  attrs: Record<string, string | null | true>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Figure",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});
describe("indexAccumulator figures (cross-chapter)", () => {
  const fu = (overrides: Partial<FigureUsageEntry> = {}): FigureUsageEntry => ({
    name: "decoder-ring",
    unit: "ch-a",
    anchor: "fig-decoder-ring-1",
    number: 1,
    canonical: false,
    ...overrides,
  });

  // T31
  test("addFigureUsages throws on F3 (multiple canonical for same name across chapters)", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "decoder-ring",
        unit: "fig-a",
        anchor: "fig-decoder-ring-1",
        canonical: true,
      }),
    ]);

    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "decoder-ring",
          unit: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/F3 invariant/);
    // Error message names BOTH chapter slugs.
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "decoder-ring",
          unit: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/fig-a/);
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "decoder-ring",
          unit: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/fig-b/);
  });

  test("addFigureUsages detects multiple canonical within a SINGLE batch", () => {
    // Both entries in the same call, both canonical, different chapters.
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "spectrum",
          unit: "fig-batch-a",
          anchor: "fig-spectrum-1",
          canonical: true,
        }),
        fu({
          name: "spectrum",
          unit: "fig-batch-b",
          anchor: "fig-spectrum-1",
          canonical: true,
        }),
      ])
    ).toThrow(/F3 invariant/);
  });

  test("addFigureUsages allows multi-chapter usages when only ONE is canonical", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "hr-diagram",
        unit: "fig-ok-a",
        anchor: "fig-hr-diagram-1",
        canonical: true,
      }),
    ]);
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "hr-diagram",
          unit: "fig-ok-b",
          anchor: "fig-hr-diagram-1",
          canonical: false,
        }),
      ])
    ).not.toThrow();

    const index = indexAccumulator.asPedagogyIndex();
    const usages = index.figureUsages.filter((u) => u.name === "hr-diagram");
    expect(usages).toHaveLength(2);
    expect(usages.filter((u) => u.canonical)).toHaveLength(1);
  });

  test("addFigureUsages validates the whole batch BEFORE mutating (canonical-collision in entry 2 leaves entry 1 unwritten)", () => {
    // Seed: chapter "fig-pre-a" has a canonical usage of "x".
    indexAccumulator.addFigureUsages([
      fu({
        name: "x",
        unit: "fig-pre-a",
        anchor: "fig-x-1",
        canonical: true,
      }),
    ]);

    // Batch: entry 1 is a fresh non-colliding usage; entry 2 collides
    // canonically. The whole batch must throw with entry 1 unwritten.
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "fresh-fig",
          unit: "fig-pre-b",
          anchor: "fig-fresh-fig-1",
          canonical: false,
        }),
        fu({
          name: "x",
          unit: "fig-pre-b",
          anchor: "fig-x-1",
          canonical: true,
        }),
      ])
    ).toThrow(/F3 invariant/);

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.figureUsages.find((u) => u.name === "fresh-fig")
    ).toBeUndefined();
  });

  test('two <Figure name="X"> in one chapter produce two distinct usages (no clobber)', () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "hr-diagram",
        unit: "ch-fig-dupe",
        anchor: "fig-hr-diagram-1",
        canonical: false,
      }),
      fu({
        name: "hr-diagram",
        unit: "ch-fig-dupe",
        anchor: "fig-hr-diagram-2",
        number: 2,
        canonical: false,
      }),
    ]);
    const usages = indexAccumulator
      .asPedagogyIndex()
      .figureUsages.filter(
        (u) => u.unit === "ch-fig-dupe" && u.name === "hr-diagram"
      );
    expect(usages).toHaveLength(2);
    expect(usages.map((u) => u.anchor).sort()).toEqual([
      "fig-hr-diagram-1",
      "fig-hr-diagram-2",
    ]);
  });

  // T32
  test("clearUnit removes figureUsages for that chapter; other chapters survive", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "fig-a",
        unit: "fig-clr-a",
        anchor: "fig-fig-a-1",
        canonical: false,
      }),
      fu({
        name: "fig-b",
        unit: "fig-clr-b",
        anchor: "fig-fig-b-1",
        canonical: false,
      }),
    ]);

    indexAccumulator.clearUnit("fig-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.figureUsages.filter((u) => u.unit === "fig-clr-a")
    ).toHaveLength(0);
    expect(index.figureUsages.find((u) => u.unit === "fig-clr-b")?.name).toBe(
      "fig-b"
    );
  });

  test("asPedagogyIndex returns populated figureUsages (was empty `[]` in earlier PRs)", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "fig-1",
        unit: "fig-ap-a",
        anchor: "fig-fig-1-1",
        canonical: false,
      }),
      fu({
        name: "fig-2",
        unit: "fig-ap-a",
        anchor: "fig-fig-2-2",
        number: 2,
        canonical: false,
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inChApA = index.figureUsages.filter((u) => u.unit === "fig-ap-a");
    expect(inChApA).toHaveLength(2);
    expect(inChApA.map((u) => u.name).sort()).toEqual(["fig-1", "fig-2"]);
  });

  test("asPedagogyIndex leaves figureRegistry as [] (extractor never populates it; SSR merge does)", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "anything",
        unit: "fig-reg-a",
        anchor: "fig-anything-1",
        canonical: false,
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.figureRegistry).toEqual([]);
  });
});
describe("indexAccumulator setFigureRegistry / figureRegistry", () => {
  // PR-C3 two-tier model: registry comes from consumer frontmatter
  // (set globally via `setFigureRegistry`), usages come from per-chapter
  // `<Figure>` walks. These tests lock in the registry-side semantics
  // so future refactors of the accumulator can't silently break them.

  test("setFigureRegistry overwrites prior entries (last-write-wins)", () => {
    const entryA: FigureRegistryEntry = {
      name: "set-fr-a",
      src: "/a.png",
      alt: "A",
    };
    const entryB: FigureRegistryEntry = {
      name: "set-fr-b",
      src: "/b.png",
      alt: "B",
    };
    const entryC: FigureRegistryEntry = {
      name: "set-fr-c",
      src: "/c.png",
      alt: "C",
    };

    indexAccumulator.setFigureRegistry([entryA, entryB]);
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([
      entryA,
      entryB,
    ]);

    indexAccumulator.setFigureRegistry([entryC]);
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([entryC]);
  });

  test("clearUnit does NOT touch figureRegistry (consumer-global, not per-chapter)", () => {
    const entry: FigureRegistryEntry = {
      name: "clr-fr-x",
      src: "/x.png",
      alt: "X",
    };
    indexAccumulator.setFigureRegistry([entry]);

    indexAccumulator.clearUnit("some-chapter");
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([entry]);
  });
});

/**
 * Misconception-test fixture. Misconceptions are extracted from BOTH
 * `<Aside kind="misconception">` (length="short") via the existing
 * `mdxAside` factory above, and `<Callout variant="misconception">`
 * (length="long") via `mdxCallout` below.
 */
const _mdxCallout = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Callout",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

/**
 * Build the mdast shape for a JSX expression-valued attribute (the
 * `={[...]}` form authors use for ADR-0044 misconception-graph
 * fields). The unified pipeline normally emits this with `data.estree`
 * populated; the extractor only reads the raw `value` string so we
 * synthesize the minimum shape here.
 */
const mdxExprAttr = (name: string, exprSource: string) => ({
  type: "mdxJsxAttribute" as const,
  name,
  value: { type: "mdxJsxAttributeValueExpression" as const, value: exprSource },
});

/**
 * Build an Aside / Callout flow element with a MIX of plain-string
 * attrs and JSX expression-valued attrs. Used for ADR-0044
 * misconception-graph-fields tests.
 */
const _mdxFlowEl = (
  name: string,
  stringAttrs: Record<string, string>,
  exprAttrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name,
  attributes: [
    ...Object.entries(stringAttrs).map(([k, v]) => ({
      type: "mdxJsxAttribute",
      name: k,
      value: v,
    })),
    ...Object.entries(exprAttrs).map(([k, v]) => mdxExprAttr(k, v)),
  ],
  children,
});
describe("indexAccumulator misconceptions (cross-chapter)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => ({
    body: "",
    unit: "mc-ch-a",
    anchor: "default-anchor",
    length: "short",
    ...overrides,
  });

  test("addMisconceptions populates misconceptions collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addMisconceptions([
      mc({
        unit: "mc-pop-a",
        anchor: "alpha",
        label: "Alpha",
        length: "short",
      }),
      mc({
        unit: "mc-pop-b",
        anchor: "beta",
        label: "Beta",
        length: "long",
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const labels = index.misconceptions
      .filter((m) => m.unit === "mc-pop-a" || m.unit === "mc-pop-b")
      .map((m) => m.label)
      .sort();
    expect(labels).toEqual(["Alpha", "Beta"]);
  });

  test("M2 — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-m2-a", anchor: "shared-explicit-id" }),
    ]);

    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/M2 invariant/);
    // Error names BOTH chapter slugs.
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/mc-m2-a/);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/mc-m2-b/);
  });

  test("M2 — explicit id starting with 'misc-' still triggers cross-chapter collision", () => {
    // Regression for tightened predicate: `startsWith("misc-")` would
    // silently let an author-supplied `id="misc-orbital"` bypass M2.
    // The tightened `/^misc-\d+$/` matches only the literal auto-anchor
    // shape, so explicit ids like `misc-orbital` still validate.
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-misc-a", anchor: "misc-orbital" }),
    ]);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-misc-b", anchor: "misc-orbital" }),
      ])
    ).toThrow(/M2 invariant/);
  });

  test("M2 — auto-anchors ('misc-N') do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-auto-a", anchor: "misc-1" }),
    ]);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-auto-b", anchor: "misc-1" }),
      ])
    ).not.toThrow();

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.misconceptions.filter((m) => m.anchor === "misc-1");
    const chapters = shared.map((m) => m.unit).sort();
    expect(chapters).toContain("mc-auto-a");
    expect(chapters).toContain("mc-auto-b");
  });

  test("addMisconceptions validates the whole batch BEFORE mutating", () => {
    // Seed.
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-pre-a", anchor: "seeded-id" }),
    ]);

    // Batch: entry 1 is a fresh non-colliding misconception; entry 2 collides.
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ unit: "mc-pre-b", anchor: "fresh-id" }),
        mc({ unit: "mc-pre-b", anchor: "seeded-id" }),
      ])
    ).toThrow(/M2 invariant/);

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.misconceptions.find(
        (m) => m.unit === "mc-pre-b" && m.anchor === "fresh-id"
      )
    ).toBeUndefined();
  });

  test("clearUnit removes misconceptions for the target chapter; other chapters survive", () => {
    indexAccumulator.addMisconceptions([
      mc({ unit: "mc-clr-a", anchor: "mc-a-1", label: "A" }),
      mc({ unit: "mc-clr-b", anchor: "mc-b-1", label: "B" }),
    ]);

    indexAccumulator.clearUnit("mc-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.misconceptions.filter((m) => m.unit === "mc-clr-a")
    ).toHaveLength(0);
    expect(index.misconceptions.find((m) => m.unit === "mc-clr-b")?.label).toBe(
      "B"
    );
  });

  test("asPedagogyIndex returns populated misconceptions (was empty `[]` before Task 7)", () => {
    indexAccumulator.addMisconceptions([
      mc({
        unit: "mc-ap-a",
        anchor: "ap-1",
        label: "AP One",
        length: "short",
      }),
      mc({
        unit: "mc-ap-a",
        anchor: "ap-2",
        label: "AP Two",
        length: "long",
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.misconceptions.filter((m) => m.unit === "mc-ap-a");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((m) => m.label).sort()).toEqual(["AP One", "AP Two"]);
  });
});
describe("indexAccumulator objectives (cross-chapter)", () => {
  const objective = (
    overrides: Partial<ObjectiveEntry> = {}
  ): ObjectiveEntry => ({
    id: "lo-1",
    verb: "Recognize",
    body: "<p>body</p>",
    unit: "obj-ch-a",
    anchor: "lo-lo-1",
    ...overrides,
  });

  test("addObjectives keyed by chapter+anchor; two chapters can each declare 'lo-1'", () => {
    indexAccumulator.addObjectives([
      objective({ id: "lo-1", unit: "obj-share-a", anchor: "lo-lo-1" }),
    ]);
    indexAccumulator.addObjectives([
      objective({ id: "lo-1", unit: "obj-share-b", anchor: "lo-lo-1" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.objectives.filter((o) => o.id === "lo-1");
    const chapters = shared.map((o) => o.unit).sort();
    expect(chapters).toContain("obj-share-a");
    expect(chapters).toContain("obj-share-b");
  });

  test("addObjectives — multiple objectives within one chapter coexist", () => {
    indexAccumulator.addObjectives([
      objective({ id: "lo-1", unit: "obj-multi", anchor: "lo-lo-1" }),
      objective({ id: "lo-2", unit: "obj-multi", anchor: "lo-lo-2" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.objectives.filter((o) => o.unit === "obj-multi");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((o) => o.id).sort()).toEqual(["lo-1", "lo-2"]);
  });

  test("clearUnit removes objectives for the target chapter; other chapters survive", () => {
    indexAccumulator.addObjectives([
      objective({ id: "lo-a", unit: "obj-clr-a", anchor: "lo-lo-a" }),
    ]);
    indexAccumulator.addObjectives([
      objective({ id: "lo-b", unit: "obj-clr-b", anchor: "lo-lo-b" }),
    ]);

    indexAccumulator.clearUnit("obj-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.objectives.filter((o) => o.unit === "obj-clr-a")).toHaveLength(
      0
    );
    expect(index.objectives.find((o) => o.unit === "obj-clr-b")?.id).toBe(
      "lo-b"
    );
  });
});
// W2/D3 — `setChapters` / `setModules` describe block deleted alongside
// ChapterEntrySchema + ModuleEntrySchema. The W1 `setSections` /
// `setUnits` + W2 `setArtifacts` blocks below replace it.

describe("indexAccumulator setSections / setUnits (W1)", () => {
  // Per Wedge B-followup design doc D1 + D7. Mirror setChapters /
  // setModules semantics: last-write-wins, consumer-global, NOT touched
  // by clearUnit.

  test("setSections overwrites prior entries (last-write-wins)", () => {
    const intro: SectionEntry = {
      type: "module",
      slug: "intro",
      title: "Introduction",
      order: 0,
    };
    const stars: SectionEntry = {
      type: "module",
      slug: "stars",
      title: "Stars",
      order: 1,
    };
    const bridge: SectionEntry = {
      type: "bridge",
      slug: "math",
      title: "Math Prereqs",
      order: 0,
    };

    indexAccumulator.setSections([intro, stars]);
    expect(indexAccumulator.asPedagogyIndex().sections).toEqual([intro, stars]);

    indexAccumulator.setSections([bridge]);
    expect(indexAccumulator.asPedagogyIndex().sections).toEqual([bridge]);
  });

  test("setUnits overwrites prior entries (last-write-wins)", () => {
    const u1: UnitEntry = {
      id: "u1-chapter",
      type: "lecture",
      title: "U1",
      order: 0,
      prereqs: [],
      section_id: "intro",
      chapter: "u1-chapter",
      status: "stable",
    };
    const u2: UnitEntry = {
      id: "u2-chapter",
      type: "lecture",
      title: "U2",
      order: 1,
      prereqs: ["logarithms"],
      section_id: "stars",
      chapter: "u2-chapter",
      lecture: "u2-slides",
      status: "stable",
    };

    indexAccumulator.setUnits([u1]);
    expect(indexAccumulator.asPedagogyIndex().units).toEqual([u1]);

    indexAccumulator.setUnits([u1, u2]);
    expect(indexAccumulator.asPedagogyIndex().units).toEqual([u1, u2]);
  });

  test("clearUnit does NOT touch sections / units (consumer-global)", () => {
    const intro: SectionEntry = {
      type: "module",
      slug: "intro",
      title: "Introduction",
      order: 0,
    };
    const u1: UnitEntry = {
      id: "ch-x",
      type: "lecture",
      title: "U1",
      order: 0,
      prereqs: [],
      section_id: "intro",
      chapter: "ch-x",
      status: "stable",
    };

    indexAccumulator.setSections([intro]);
    indexAccumulator.setUnits([u1]);
    indexAccumulator.clearUnit("ch-x");

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toEqual([intro]);
    expect(index.units).toEqual([u1]);
  });

  test("resetIndexAccumulator clears sections + units", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "intro", title: "Intro", order: 0 },
    ]);
    indexAccumulator.setUnits([
      {
        id: "u1",
        type: "lecture",
        title: "U1",
        order: 0,
        prereqs: [],
        section_id: "intro",
        chapter: "u1",
        status: "stable",
      },
    ]);
    resetIndexAccumulator();
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toEqual([]);
    expect(index.units).toEqual([]);
  });
});

describe("indexAccumulator setArtifacts (W2)", () => {
  // Per Wedge B-followup W2 design doc D1 (Path A). Mirrors setSections /
  // setUnits semantics: last-write-wins, consumer-global, NOT touched by
  // clearUnit. ArtifactEntry is a discriminated union over scope.

  const unitReading: ArtifactEntry = {
    id: "spectra-and-composition",
    type: "reading",
    scope: "unit",
    title: "Spectra & Composition — reading",
    source_path:
      "src/content/sections/stars/units/spectra-and-composition/reading.mdx",
    references: {},
    section_id: "stars",
    unit_id: "spectra-and-composition",
  };

  const sectionIntro: ArtifactEntry = {
    id: "stars-intro",
    type: "intro",
    scope: "section",
    title: "Stars — module intro",
    source_path: "src/content/sections/stars/intro.mdx",
    references: {},
    section_id: "stars",
  };

  test("setArtifacts overwrites prior entries (last-write-wins)", () => {
    indexAccumulator.setArtifacts([unitReading]);
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([unitReading]);

    indexAccumulator.setArtifacts([unitReading, sectionIntro]);
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([
      unitReading,
      sectionIntro,
    ]);

    indexAccumulator.setArtifacts([sectionIntro]);
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([
      sectionIntro,
    ]);
  });

  test("clearUnit does NOT touch artifacts (consumer-global)", () => {
    indexAccumulator.setArtifacts([unitReading]);
    indexAccumulator.clearUnit("spectra-and-composition");
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([unitReading]);
  });

  test("resetIndexAccumulator clears artifacts", () => {
    indexAccumulator.setArtifacts([unitReading, sectionIntro]);
    resetIndexAccumulator();
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([]);
  });

  test("asPedagogyIndex returns [] when setArtifacts never called", () => {
    expect(indexAccumulator.asPedagogyIndex().artifacts).toEqual([]);
  });
});

/**
 * PR-C4 Task 2 — inline-ref usage fixtures. Inline cross-refs
 * (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`) appear
 * both as block elements (mdxJsxFlowElement) and inline within prose
 * (mdxJsxTextElement). The extractor walks BOTH node types.
 */
const _mdxInlineJsx = (
  name: string,
  attrs: Record<string, string>,
  type: "mdxJsxFlowElement" | "mdxJsxTextElement" = "mdxJsxTextElement"
) => ({
  type,
  name,
  attributes: Object.entries(attrs).map(([n, value]) => ({
    type: "mdxJsxAttribute",
    name: n,
    value,
  })),
  children: [],
});
describe("indexAccumulator inlineRefUsages (cross-chapter)", () => {
  const usage = (
    overrides: Partial<InlineRefUsageEntry> = {}
  ): InlineRefUsageEntry => ({
    kind: "glossary-term",
    refKey: "Parallax",
    unit: "iru-ch-a",
    ...overrides,
  });

  test("addInlineRefUsages appends entries; same (kind, refKey) duplicates coexist", () => {
    indexAccumulator.addInlineRefUsages([
      usage({ unit: "iru-multi" }),
      usage({ unit: "iru-multi" }),
      usage({ kind: "eq-ref", refKey: "wiens-law", unit: "iru-multi" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.inlineRefUsages.filter((u) => u.unit === "iru-multi");
    expect(inCh).toHaveLength(3);
    const glossary = inCh.filter((u) => u.kind === "glossary-term");
    expect(glossary).toHaveLength(2);
  });

  test("clearUnit removes inlineRefUsages for that chapter; others survive", () => {
    indexAccumulator.addInlineRefUsages([
      usage({ unit: "iru-clr-a", refKey: "term-a" }),
      usage({ unit: "iru-clr-b", refKey: "term-b" }),
    ]);

    indexAccumulator.clearUnit("iru-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.inlineRefUsages.filter((u) => u.unit === "iru-clr-a")
    ).toHaveLength(0);
    expect(
      index.inlineRefUsages.find((u) => u.unit === "iru-clr-b")?.refKey
    ).toBe("term-b");
  });
});
describe("asPedagogyIndex (W2/D3 collections)", () => {
  test("returns sections + units + objectives + inlineRefUsages populated", () => {
    indexAccumulator.setSections([
      { type: "module", slug: "mod-1", title: "Module 1", order: 0 },
    ]);
    indexAccumulator.setUnits([
      {
        id: "ch-x",
        type: "lecture",
        title: "X",
        order: 0,
        prereqs: [],
        section_id: "mod-1",
        chapter: "ch-x",
        status: "stable",
      },
    ]);
    indexAccumulator.addObjectives([
      {
        id: "lo-1",
        verb: "Recognize",
        body: "<p>body</p>",
        unit: "ch-x",
        anchor: "lo-lo-1",
      },
    ]);
    indexAccumulator.addInlineRefUsages([
      { kind: "chapter-ref", refKey: "ch-x", unit: "ch-y" },
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.sections).toHaveLength(1);
    expect(index.units).toHaveLength(1);
    expect(index.objectives).toHaveLength(1);
    expect(index.inlineRefUsages).toHaveLength(1);
  });
});

describe("indexAccumulator deepDives (cross-chapter)", () => {
  const dd = (overrides: Partial<DeepDiveEntry> = {}): DeepDiveEntry => ({
    unit: "dd-ch-a",
    anchor: "default-anchor",
    title: "Default Title",
    body: "<p>body</p>",
    ...overrides,
  });

  test("addDeepDives populates deepDives collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addDeepDives([
      dd({ unit: "dd-pop-a", anchor: "alpha", title: "Alpha" }),
      dd({ unit: "dd-pop-b", anchor: "beta", title: "Beta" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const titles = index.deepDives
      .filter((d) => d.unit === "dd-pop-a" || d.unit === "dd-pop-b")
      .map((d) => d.title)
      .sort();
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  test("D2 — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addDeepDives([
      dd({ unit: "dd-d2-a", anchor: "shared-explicit-id" }),
    ]);

    expect(() =>
      indexAccumulator.addDeepDives([
        dd({ unit: "dd-d2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/D2 invariant/);
    expect(() =>
      indexAccumulator.addDeepDives([
        dd({ unit: "dd-d2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/dd-d2-a/);
    expect(() =>
      indexAccumulator.addDeepDives([
        dd({ unit: "dd-d2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/dd-d2-b/);
  });

  test("D2 — auto-anchors ('dd-N') do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addDeepDives([dd({ unit: "dd-auto-a", anchor: "dd-1" })]);
    expect(() =>
      indexAccumulator.addDeepDives([dd({ unit: "dd-auto-b", anchor: "dd-1" })])
    ).not.toThrow();
    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.deepDives.filter(
        (d) => d.unit === "dd-auto-a" || d.unit === "dd-auto-b"
      )
    ).toHaveLength(2);
  });

  test("D2 — explicit id 'dd-orbital' (non-numeric) DOES trigger cross-chapter collision", () => {
    indexAccumulator.addDeepDives([
      dd({ unit: "dd-explicit-a", anchor: "dd-orbital" }),
    ]);
    expect(() =>
      indexAccumulator.addDeepDives([
        dd({ unit: "dd-explicit-b", anchor: "dd-orbital" }),
      ])
    ).toThrow(/D2 invariant/);
  });

  test("clearUnit drops deep-dive entries for the chapter", () => {
    indexAccumulator.addDeepDives([
      dd({ unit: "dd-clear-a", anchor: "a-entry" }),
      dd({ unit: "dd-clear-b", anchor: "b-entry" }),
    ]);
    indexAccumulator.clearUnit("dd-clear-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.deepDives.filter((d) => d.unit === "dd-clear-a")).toHaveLength(
      0
    );
    expect(index.deepDives.filter((d) => d.unit === "dd-clear-b")).toHaveLength(
      1
    );
  });
});

describe("indexAccumulator omiFlows (cross-chapter)", () => {
  const slot = { title: "x", body: "<p>x</p>" };
  const omi = (overrides: Partial<OMIFlowEntry> = {}): OMIFlowEntry => ({
    unit: "omi-ch-a",
    anchor: "default-anchor",
    observable: slot,
    model: slot,
    inference: slot,
    sourceOrder: ["observable", "model", "inference"],
    ...overrides,
  });

  test("addOMIFlows populates collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addOMIFlows([
      omi({ unit: "omi-pop-a", anchor: "alpha" }),
      omi({ unit: "omi-pop-b", anchor: "beta" }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    const anchors = index.omiFlows
      .filter((e) => e.unit === "omi-pop-a" || e.unit === "omi-pop-b")
      .map((e) => e.anchor)
      .sort();
    expect(anchors).toEqual(["alpha", "beta"]);
  });

  test("OF — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addOMIFlows([omi({ unit: "ch-a", anchor: "shared" })]);
    expect(() =>
      indexAccumulator.addOMIFlows([omi({ unit: "ch-b", anchor: "shared" })])
    ).toThrow(/cross-chapter.*OMIFlow/i);
  });

  test("OF — auto-anchors (omi-N) do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addOMIFlows([omi({ unit: "auto-a", anchor: "omi-1" })]);
    expect(() =>
      indexAccumulator.addOMIFlows([omi({ unit: "auto-b", anchor: "omi-1" })])
    ).not.toThrow();
  });

  test("clearUnit drops OMIFlow entries for the chapter", () => {
    indexAccumulator.addOMIFlows([
      omi({ unit: "clr-a", anchor: "a-entry" }),
      omi({ unit: "clr-b", anchor: "b-entry" }),
    ]);
    indexAccumulator.clearUnit("clr-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.omiFlows.filter((e) => e.unit === "clr-a")).toHaveLength(0);
    expect(index.omiFlows.filter((e) => e.unit === "clr-b")).toHaveLength(1);
  });
});
