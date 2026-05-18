import type {
  ChapterEntry,
  EquationCitationEntry,
  EquationEntry,
  EquationRegistryEntry,
  FigureRegistryEntry,
  FigureUsageEntry,
  InlineRefUsageEntry,
  KeyInsightEntry,
  MisconceptionEntry,
  ModuleEntry,
  ObjectiveEntry,
} from "@sophie/core/schema";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  extractDefinitions,
  extractEquationCitations,
  extractEquationRegistryDeclaration,
  extractFigures,
  extractInlineRefUsages,
  extractKeyInsights,
  extractMisconceptions,
  extractObjectives,
  indexAccumulator,
  markFirstUseGlossaryTerms,
  pedagogyIndexRemarkPlugin,
  resetIndexAccumulator,
} from "./pedagogy-index-extractor.ts";

/**
 * Top-level `beforeEach` resets the entire accumulator (all five
 * collections + the consumer-supplied figureRegistry) so every test
 * starts from a clean slate. Without this, tests share `globalThis`
 * state across describe blocks and depend on per-test
 * `indexAccumulator.clearChapter(...)` hygiene — a future test that
 * forgets re-introduces ordering coupling silently.
 *
 * `clearChapter` calls that remain in tests below are load-bearing:
 * they're part of the test's assertion (verifying `clearChapter`
 * behavior itself), not pure cleanup.
 */
beforeEach(() => {
  resetIndexAccumulator();
});

/**
 * Tests over synthetic mdast trees. We don't parse real MDX here;
 * the unified pipeline does that in integration. Each test builds
 * the minimum AST shape the extractor needs and asserts the
 * extracted entries match the canonical schema (PedagogyIndex
 * types from @sophie/core/schema).
 */

const mdxAside = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Aside",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

const para = (text: string) => ({
  type: "paragraph",
  children: [{ type: "text", value: text }],
});

const root = (children: ReadonlyArray<Record<string, unknown>>) => ({
  type: "root",
  children,
});

describe("extractDefinitions (pure)", () => {
  test("returns one DefinitionEntry for one Aside-definition", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "Standard candle" }, [
        para("An object whose intrinsic luminosity is known."),
      ]),
    ]);

    const entries = extractDefinitions(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      term: "Standard candle",
      slug: "standard-candle",
      chapter: "spoiler-alerts",
      anchor: "standard-candle",
    });
  });

  test("skips Aside blocks with non-definition kinds", () => {
    const tree = root([
      mdxAside({ kind: "note", title: "A note" }, [para("not a definition")]),
      mdxAside({ kind: "digression", title: "Sidebar" }, [para("aside")]),
      mdxAside({ kind: "key-insight" }, [para("insight")]),
      mdxAside({ kind: "definition", title: "Standard candle" }, [
        para("body"),
      ]),
    ]);

    const entries = extractDefinitions(tree as never, "spoiler-alerts");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.term).toBe("Standard candle");
  });

  test("skips JSX elements that aren't named 'Aside'", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          { type: "mdxJsxAttribute", name: "variant", value: "info" },
        ],
        children: [para("not an Aside")],
      },
      mdxAside({ kind: "definition", title: "Parallax" }, [para("body")]),
    ]);

    const entries = extractDefinitions(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.term).toBe("Parallax");
  });

  test("renders the body to an HTML string", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "Parallax" }, [
        para("Apparent shift of a star against background."),
      ]),
    ]);

    const entries = extractDefinitions(tree as never, "ch");
    expect(entries[0]?.body).toBe(
      "<p>Apparent shift of a star against background.</p>"
    );
  });

  test("renders inline emphasis + strong inside the body", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "Flux" }, [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "Light " },
            {
              type: "emphasis",
              children: [{ type: "text", value: "per unit area" }],
            },
            { type: "text", value: " per unit " },
            {
              type: "strong",
              children: [{ type: "text", value: "time" }],
            },
            { type: "text", value: "." },
          ],
        },
      ]),
    ]);

    const entries = extractDefinitions(tree as never, "ch");
    expect(entries[0]?.body).toBe(
      "<p>Light <em>per unit area</em> per unit <strong>time</strong>.</p>"
    );
  });

  test("throws when a definition aside is missing a title", () => {
    const tree = root([
      mdxAside({ kind: "definition" }, [para("missing title")]),
    ]);

    expect(() => extractDefinitions(tree as never, "ch")).toThrow(
      /missing.*title/i
    );
  });

  test("throws when a definition aside has a whitespace-only title", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "   " }, [para("body")]),
    ]);

    expect(() => extractDefinitions(tree as never, "ch")).toThrow(
      /missing.*title|empty.*title/i
    );
  });

  test("throws on intra-chapter slug collision from identical titles", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "Parallax" }, [para("first")]),
      mdxAside({ kind: "definition", title: "parallax" }, [para("second")]),
    ]);

    expect(() => extractDefinitions(tree as never, "ch")).toThrow(
      /collision|duplicate/i
    );
  });

  test("throws on intra-chapter slug collision from explicit `id` overlap", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "Foo", id: "shared" }, [para("a")]),
      mdxAside({ kind: "definition", title: "Bar", id: "shared" }, [para("b")]),
    ]);

    expect(() => extractDefinitions(tree as never, "ch")).toThrow(
      /collision|duplicate/i
    );
  });

  test("honors explicit `id` prop as the slug override", () => {
    const tree = root([
      mdxAside(
        { kind: "definition", title: "Standard candle", id: "custom-anchor" },
        [para("body")]
      ),
    ]);

    const entries = extractDefinitions(tree as never, "ch");
    expect(entries[0]?.slug).toBe("custom-anchor");
    expect(entries[0]?.anchor).toBe("custom-anchor");
    expect(entries[0]?.term).toBe("Standard candle"); // term still from title
  });
});

// Synthetic <KeyEquation refId="X" /> citation node — post-ADR-0060
// chapter walker shape.
const mdxKeyEquationCitation = (
  refId: string,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "KeyEquation",
  attributes: [{ type: "mdxJsxAttribute", name: "refId", value: refId }],
  children,
});

describe("extractEquationCitations (pure, chapter walker)", () => {
  test("returns one EquationCitationEntry for a self-closing <KeyEquation refId>", () => {
    const tree = root([mdxKeyEquationCitation("wiens-law")]);
    const citations = extractEquationCitations(tree as never, "spoiler-alerts");
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({
      chapter: "spoiler-alerts",
      refId: "wiens-law",
      anchor: "wiens-law-citation-1",
      number: 1,
    });
    expect(citations[0]?.framingHtml).toBeUndefined();
  });

  test("renders chapter framing prose children to framingHtml", () => {
    const tree = root([
      mdxKeyEquationCitation("wiens-law", [
        para("We've seen Wien's law before; here we apply it to dust."),
      ]),
    ]);
    const citations = extractEquationCitations(tree as never, "spoiler-alerts");
    expect(citations[0]?.framingHtml).toContain("We've seen Wien's law before");
  });

  test("assigns per-chapter number 1, 2, 3 in source order across three citations", () => {
    const tree = root([
      mdxKeyEquationCitation("wiens-law"),
      mdxKeyEquationCitation("stefan-boltzmann"),
      mdxKeyEquationCitation("planck-distribution"),
    ]);
    const citations = extractEquationCitations(tree as never, "ch");
    expect(citations).toHaveLength(3);
    expect(citations.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(citations.map((c) => c.refId)).toEqual([
      "wiens-law",
      "stefan-boltzmann",
      "planck-distribution",
    ]);
  });

  test("two citations of the same refId in one chapter get distinct anchors", () => {
    // Important for valid DOM ids when an author cites the same equation
    // twice in different sections of a chapter.
    const tree = root([
      mdxKeyEquationCitation("wiens-law"),
      mdxKeyEquationCitation("wiens-law"),
    ]);
    const citations = extractEquationCitations(tree as never, "ch");
    expect(citations).toHaveLength(2);
    expect(citations[0]?.anchor).toBe("wiens-law-citation-1");
    expect(citations[1]?.anchor).toBe("wiens-law-citation-2");
    expect(citations[0]?.anchor).not.toBe(citations[1]?.anchor);
  });

  test("throws when <KeyEquation> is missing refId", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "KeyEquation",
        attributes: [],
        children: [],
      },
    ]);
    expect(() => extractEquationCitations(tree as never, "ch")).toThrow(
      /refId/
    );
  });

  test("skips non-KeyEquation JSX elements", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          { type: "mdxJsxAttribute", name: "variant", value: "info" },
        ],
        children: [para("not a KeyEquation")],
      },
      mdxKeyEquationCitation("real-eq"),
    ]);
    const citations = extractEquationCitations(tree as never, "ch");
    expect(citations).toHaveLength(1);
    expect(citations[0]?.refId).toBe("real-eq");
  });
});

describe("extractEquationRegistryDeclaration (pure, registry walker)", () => {
  const validFrontmatter: EquationRegistryEntry = {
    id: "wiens-law",
    title: "Wien's Law",
    tex: "\\lambda_{peak} = b T^{-1}",
    symbols: ["T", "\\lambda_{peak}"],
  };

  test("returns the frontmatter unchanged when body has no biography children", () => {
    const tree = root([para("Some prose without biography children.")]);
    const entry = extractEquationRegistryDeclaration(
      tree as never,
      validFrontmatter
    );
    expect(entry.id).toBe("wiens-law");
    expect(entry.title).toBe("Wien's Law");
    expect(entry.tex).toBe("\\lambda_{peak} = b T^{-1}");
    expect(entry.symbols).toEqual(["T", "\\lambda_{peak}"]);
    expect(entry.biography).toBeUndefined();
  });

  test("walks Root.children for biography (no <KeyEquation> wrapper required)", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Observable",
        attributes: [],
        children: [para("Peak wavelength of thermal emission.")],
      },
      {
        type: "mdxJsxFlowElement",
        name: "Assumption",
        attributes: [
          {
            type: "mdxJsxAttribute",
            name: "type",
            value: "thermal-equilibrium",
          },
        ],
        children: [para("LTE.")],
      },
      {
        type: "mdxJsxFlowElement",
        name: "BreaksWhen",
        attributes: [],
        children: [para("Non-thermal emission.")],
      },
    ]);
    const entry = extractEquationRegistryDeclaration(
      tree as never,
      validFrontmatter
    );
    expect(entry.biography).toBeDefined();
    expect(entry.biography?.observable?.epistemicRole).toBe("observable");
    expect(entry.biography?.assumptions).toHaveLength(1);
    expect(entry.biography?.assumptions[0]?.type).toBe("thermal-equilibrium");
    expect(entry.biography?.breaks_when?.epistemicRole).toBe("approximation");
  });

  test("composes constants/rearranged_forms/related from frontmatter through to entry", () => {
    const frontmatter: EquationRegistryEntry = {
      ...validFrontmatter,
      constants: [{ symbol: "b", value: "0.29", unit: "cm K" }],
      rearranged_forms: [
        { tex: "T = b \\lambda_{peak}^{-1}", solves_for: "T" },
      ],
      related: [{ refId: "stefan-boltzmann", kind: "see-also" }],
    };
    const tree = root([]);
    const entry = extractEquationRegistryDeclaration(
      tree as never,
      frontmatter
    );
    expect(entry.constants).toHaveLength(1);
    expect(entry.rearranged_forms).toHaveLength(1);
    expect(entry.related).toHaveLength(1);
  });
});

// Legacy extractEquations tests preserved indirectly via the new walker
// describe blocks above; full biography-edge-case coverage lives in
// `transform-equation-biography.test.ts`. Tex-extraction tests (E6
// categorization errors) belong on the registry walker but are
// deferred — the registry walker doesn't yet enforce E6-style "first
// math block is non-empty" because the tex comes from frontmatter,
// not from a body math block. ADR 0046 §R8 acknowledges this shift.

describe("indexAccumulator (cross-chapter)", () => {
  // Top-level beforeEach wipes accumulator state before each test.

  test("aggregates definitions from multiple chapters", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Parallax",
        slug: "parallax",
        body: "",
        chapter: "ch-a",
        anchor: "parallax",
      },
    ]);
    indexAccumulator.addDefinitions([
      {
        term: "Flux",
        slug: "flux",
        body: "",
        chapter: "ch-b",
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
        chapter: "ch-a",
        anchor: "standard-candle",
      },
    ]);

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Standard candle",
          slug: "standard-candle",
          body: "",
          chapter: "ch-b",
          anchor: "standard-candle",
        },
      ])
    ).toThrow(/multiple chapters/i);
  });

  test("clearChapter removes only that chapter's entries", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Alpha",
        slug: "alpha",
        body: "",
        chapter: "ch-a",
        anchor: "alpha",
      },
      {
        term: "Beta",
        slug: "beta",
        body: "",
        chapter: "ch-b",
        anchor: "beta",
      },
    ]);

    indexAccumulator.clearChapter("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    const inA = index.definitions.filter((d) => d.chapter === "ch-a");
    const inB = index.definitions.filter((d) => d.chapter === "ch-b");
    expect(inA).toHaveLength(0);
    expect(inB).toHaveLength(1);
  });

  test("re-adding a chapter's entries after clearChapter does not throw cross-chapter", () => {
    indexAccumulator.addDefinitions([
      {
        term: "Gamma",
        slug: "gamma",
        body: "",
        chapter: "ch-a",
        anchor: "gamma",
      },
    ]);
    indexAccumulator.clearChapter("ch-a");

    expect(() =>
      indexAccumulator.addDefinitions([
        {
          term: "Gamma",
          slug: "gamma",
          body: "",
          chapter: "ch-a",
          anchor: "gamma",
        },
      ])
    ).not.toThrow();
  });
});

describe("pedagogyIndexRemarkPlugin", () => {
  test("populates the accumulator for the parsed chapter", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const tree = root([
      mdxAside({ kind: "definition", title: "Cepheid variable" }, [
        para("body"),
      ]),
    ]);

    plugin(tree as never, {
      path: "/repo/src/content/chapters/test-chapter.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const found = index.definitions.find((d) => d.term === "Cepheid variable");
    expect(found).toBeDefined();
    expect(found?.chapter).toBe("test-chapter");
  });

  test("uses the default getChapterSlug which returns the basename (matching Astro 6's glob-loader id default)", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const tree = root([
      mdxAside({ kind: "definition", title: "Pulsar" }, [para("body")]),
    ]);

    plugin(tree as never, {
      path: "/repo/src/content/chapters/module-a/test-chapter.mdx",
    });

    const entry = indexAccumulator
      .asPedagogyIndex()
      .definitions.find((d) => d.term === "Pulsar");
    // Astro 6 default route uses basename → /chapters/test-chapter.
    // The extractor's chapter slug must match for back-link hrefs.
    expect(entry?.chapter).toBe("test-chapter");
  });

  test("honors a custom getChapterSlug", () => {
    const plugin = pedagogyIndexRemarkPlugin({
      getChapterSlug: () => "custom-slug",
    });
    const tree = root([
      mdxAside({ kind: "definition", title: "Quasar" }, [para("body")]),
    ]);

    plugin(tree as never, { path: "/any/path.mdx" });

    const entry = indexAccumulator
      .asPedagogyIndex()
      .definitions.find((d) => d.term === "Quasar");
    expect(entry?.chapter).toBe("custom-slug");
  });

  test("re-parsing a chapter replaces its entries (clears stale on each run)", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const fileCtx = { path: "/repo/src/content/chapters/hmr-test.mdx" };

    plugin(
      root([
        mdxAside({ kind: "definition", title: "Initial" }, [para("v1")]),
      ]) as never,
      fileCtx
    );
    expect(
      indexAccumulator
        .asPedagogyIndex()
        .definitions.filter((d) => d.chapter === "hmr-test")
    ).toHaveLength(1);

    plugin(
      root([
        mdxAside({ kind: "definition", title: "Replaced" }, [para("v2")]),
      ]) as never,
      fileCtx
    );
    const hmrEntries = indexAccumulator
      .asPedagogyIndex()
      .definitions.filter((d) => d.chapter === "hmr-test");
    expect(hmrEntries).toHaveLength(1);
    expect(hmrEntries[0]?.term).toBe("Replaced");
  });

  test("skips files when getChapterSlug returns undefined (no .mdx extension)", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const tree = root([
      mdxAside({ kind: "definition", title: "Skipme" }, [para("body")]),
    ]);

    // No .mdx extension; default getChapterSlug returns undefined.
    plugin(tree as never, { path: "/repo/some-other-place/file.md" });

    expect(
      indexAccumulator
        .asPedagogyIndex()
        .definitions.find((d) => d.term === "Skipme")
    ).toBeUndefined();
  });

  // T13 (post-ADR-0060) — chapter parse populates definitions +
  // equationCitations; the registry slot stays untouched on a chapter
  // pass. Registry declarations come from the registry-path branch.
  test("chapter parse populates definitions AND equationCitations", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const tree = root([
      mdxAside({ kind: "definition", title: "Standard candle" }, [
        para("An object whose intrinsic luminosity is known."),
      ]),
      mdxKeyEquationCitation("wiens-law"),
    ]);

    plugin(tree as never, {
      path: "/repo/src/content/chapters/dual-test.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const def = index.definitions.find((d) => d.term === "Standard candle");
    expect(def).toBeDefined();
    expect(def?.chapter).toBe("dual-test");

    const citation = index.equationCitations.find(
      (c) => c.refId === "wiens-law" && c.chapter === "dual-test"
    );
    expect(citation).toBeDefined();
    expect(citation?.number).toBe(1);
    expect(citation?.anchor).toBe("wiens-law-citation-1");
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

  test("clearChapter does NOT touch the registry equations slot", () => {
    // Post-ADR-0060: equations are registry-global; chapter clears only
    // touch chapter-keyed collections + equationCitations.
    indexAccumulator.addEquations([makeEq({ id: "wiens-law" })]);
    indexAccumulator.clearChapter("any-chapter");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equations).toHaveLength(1);
  });
});

describe("indexAccumulator equationCitations (per-chapter)", () => {
  const makeCitation = (
    overrides: Partial<EquationCitationEntry> = {}
  ): EquationCitationEntry => ({
    chapter: "ch-a",
    refId: "wiens-law",
    anchor: "wiens-law-citation-1",
    number: 1,
    ...overrides,
  });

  test("addEquationCitations appends citations from any chapter", () => {
    indexAccumulator.addEquationCitations([
      makeCitation({ chapter: "ch-a", refId: "wiens-law" }),
    ]);
    indexAccumulator.addEquationCitations([
      makeCitation({ chapter: "ch-b", refId: "stefan-boltzmann", number: 1 }),
    ]);
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equationCitations).toHaveLength(2);
  });

  test("clearChapterCitations removes only that chapter's citations", () => {
    indexAccumulator.addEquationCitations([
      makeCitation({ chapter: "ch-a", refId: "alpha" }),
      makeCitation({
        chapter: "ch-a",
        refId: "beta",
        number: 2,
        anchor: "beta-citation-2",
      }),
    ]);
    indexAccumulator.addEquationCitations([
      makeCitation({
        chapter: "ch-b",
        refId: "gamma",
        anchor: "gamma-citation-1",
      }),
    ]);

    indexAccumulator.clearChapterCitations("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(index.equationCitations).toHaveLength(1);
    expect(index.equationCitations[0]?.chapter).toBe("ch-b");
  });

  test("clearChapter also clears that chapter's citations", () => {
    indexAccumulator.addEquationCitations([
      makeCitation({ chapter: "ch-a", refId: "alpha" }),
      makeCitation({
        chapter: "ch-b",
        refId: "beta",
        anchor: "beta-citation-1",
      }),
    ]);
    indexAccumulator.clearChapter("ch-a");
    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.equationCitations.filter((c) => c.chapter === "ch-a")
    ).toHaveLength(0);
    expect(
      index.equationCitations.filter((c) => c.chapter === "ch-b")
    ).toHaveLength(1);
  });
});

describe("extractKeyInsights (pure)", () => {
  // T21
  test("returns one KeyInsightEntry for one <Aside kind='key-insight' title='X'>", () => {
    const tree = root([
      mdxAside({ kind: "key-insight", title: "Light is a messenger" }, [
        para("Everything we know about distant objects arrives as light."),
      ]),
    ]);

    const entries = extractKeyInsights(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Light is a messenger",
      chapter: "spoiler-alerts",
      anchor: "light-is-a-messenger",
    });
    expect(entries[0]?.body).toContain(
      "Everything we know about distant objects arrives as light."
    );
  });

  // T22
  test("untitled key-insight gets auto-anchor 'ki-1'", () => {
    const tree = root([
      mdxAside({ kind: "key-insight" }, [para("An untitled insight body.")]),
    ]);

    const entries = extractKeyInsights(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.anchor).toBe("ki-1");
    expect(entries[0]?.title).toBeUndefined();
  });

  // T23
  test("throws on intra-chapter anchor collision (two key-insights share explicit id)", () => {
    // Two key-insights sharing an explicit `id` collide on the same anchor.
    const tree = root([
      mdxAside({ kind: "key-insight", id: "shared-anchor" }, [para("first")]),
      mdxAside({ kind: "key-insight", id: "shared-anchor" }, [para("second")]),
    ]);

    expect(() => extractKeyInsights(tree as never, "ch")).toThrow(
      /anchor collision|duplicate/i
    );
  });

  test("skips Aside blocks with non-key-insight kinds", () => {
    const tree = root([
      mdxAside({ kind: "note", title: "A note" }, [para("not a key-insight")]),
      mdxAside({ kind: "definition", title: "Term" }, [para("a definition")]),
      mdxAside({ kind: "key-insight", title: "Real insight" }, [para("body")]),
    ]);

    const entries = extractKeyInsights(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe("Real insight");
  });

  test("explicit `id` overrides slug(title) for the anchor", () => {
    const tree = root([
      mdxAside(
        { kind: "key-insight", title: "Some Title", id: "custom-anchor" },
        [para("body")]
      ),
    ]);

    const entries = extractKeyInsights(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("custom-anchor");
    expect(entries[0]?.title).toBe("Some Title");
  });

  test("auto-numbered anchors increment per-chapter (untitled+untitled → ki-1, ki-2)", () => {
    const tree = root([
      mdxAside({ kind: "key-insight" }, [para("first")]),
      mdxAside({ kind: "key-insight" }, [para("second")]),
    ]);

    const entries = extractKeyInsights(tree as never, "ch");
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.anchor)).toEqual(["ki-1", "ki-2"]);
  });
});

describe("indexAccumulator key-insights (cross-chapter)", () => {
  const ki = (overrides: Partial<KeyInsightEntry> = {}): KeyInsightEntry => ({
    title: "Default",
    body: "",
    chapter: "ch-a",
    anchor: "default-anchor",
    ...overrides,
  });

  test("addKeyInsights populates keyInsights collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addKeyInsights([
      ki({ title: "Alpha", chapter: "ki-ch-a", anchor: "alpha" }),
      ki({ title: "Beta", chapter: "ki-ch-b", anchor: "beta" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const titles = index.keyInsights
      .filter((k) => k.chapter === "ki-ch-a" || k.chapter === "ki-ch-b")
      .map((k) => k.title)
      .sort();
    expect(titles).toEqual(["Alpha", "Beta"]);
  });

  test("clearChapter removes key-insights for the target chapter; other chapters survive", () => {
    indexAccumulator.addKeyInsights([
      ki({ title: "Insight A", chapter: "ki-clear-a", anchor: "insight-a" }),
      ki({ title: "Insight B", chapter: "ki-clear-b", anchor: "insight-b" }),
    ]);

    indexAccumulator.clearChapter("ki-clear-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.keyInsights.filter((k) => k.chapter === "ki-clear-a")
    ).toHaveLength(0);
    expect(
      index.keyInsights.find((k) => k.chapter === "ki-clear-b")?.title
    ).toBe("Insight B");
  });

  test("two chapters can share an auto-anchor (e.g. 'ki-1') without collision", () => {
    indexAccumulator.addKeyInsights([
      ki({ chapter: "ki-share-a", anchor: "ki-1" }),
    ]);
    indexAccumulator.addKeyInsights([
      ki({ chapter: "ki-share-b", anchor: "ki-1" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.keyInsights.filter((k) => k.anchor === "ki-1");
    const chapters = shared.map((k) => k.chapter).sort();
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
const mdxFigure = (
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

describe("extractFigures (pure)", () => {
  // T24
  test("one <Figure name='X' /> produces one usage entry with number=1, canonical=false, no captionOverride", () => {
    const tree = root([mdxFigure({ name: "decoder-ring" })]);

    const entries = extractFigures(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: "decoder-ring",
      chapter: "spoiler-alerts",
      anchor: "fig-decoder-ring-1",
      number: 1,
      canonical: false,
    });
    expect(entries[0]?.captionOverride).toBeUndefined();
  });

  // T25
  test("three <Figure name='...'> get number 1, 2, 3 in source order", () => {
    const tree = root([
      mdxFigure({ name: "alpha" }),
      mdxFigure({ name: "beta" }),
      mdxFigure({ name: "gamma" }),
    ]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.number)).toEqual([1, 2, 3]);
    expect(entries.map((e) => e.name)).toEqual(["alpha", "beta", "gamma"]);
    expect(entries.map((e) => e.anchor)).toEqual([
      "fig-alpha-1",
      "fig-beta-2",
      "fig-gamma-3",
    ]);
  });

  // T26
  test("<Figure name='X' canonical /> (boolean-presence prop) produces canonical=true", () => {
    // Boolean-presence JSX prop: AST value is `null` (no `=` follows).
    const tree = root([mdxFigure({ name: "decoder-ring", canonical: null })]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.canonical).toBe(true);
  });

  test("<Figure name='X' canonical={true} /> (explicit-true) also produces canonical=true", () => {
    // Some MDX serializations represent `canonical={true}` with
    // `value: true` directly. Accept that shape too.
    const tree = root([mdxFigure({ name: "x", canonical: true })]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries[0]?.canonical).toBe(true);
  });

  // T27
  test("<Figure src='...' /> (inline mode, no name) is NOT extracted", () => {
    const tree = root([
      mdxFigure({ src: "/img/hero.png" }),
      mdxFigure({ src: "/img/illustration.png" }),
      mdxFigure({ name: "real-figure" }),
    ]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe("real-figure");
    expect(entries[0]?.number).toBe(1); // counter not incremented by skipped inline figures
  });

  // Extra: explicit caption override
  test("<Figure name='X' caption='custom' /> produces captionOverride='custom'", () => {
    const tree = root([
      mdxFigure({ name: "x", caption: "An overriding caption." }),
    ]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries[0]?.captionOverride).toBe("An overriding caption.");
  });

  test("whitespace-only caption collapses to undefined captionOverride", () => {
    const tree = root([mdxFigure({ name: "x", caption: "   " })]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries[0]?.captionOverride).toBeUndefined();
  });

  test("whitespace-only `name` is treated as inline-mode and skipped", () => {
    const tree = root([
      mdxFigure({ name: "   " }),
      mdxFigure({ name: "real" }),
    ]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe("real");
  });

  test("skips JSX elements that aren't named 'Figure'", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          { type: "mdxJsxAttribute", name: "variant", value: "info" },
        ],
        children: [],
      },
      mdxFigure({ name: "real" }),
    ]);

    const entries = extractFigures(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.name).toBe("real");
  });
});

describe("indexAccumulator figures (cross-chapter)", () => {
  const fu = (overrides: Partial<FigureUsageEntry> = {}): FigureUsageEntry => ({
    name: "decoder-ring",
    chapter: "ch-a",
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
        chapter: "fig-a",
        anchor: "fig-decoder-ring-1",
        canonical: true,
      }),
    ]);

    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "decoder-ring",
          chapter: "fig-b",
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
          chapter: "fig-b",
          anchor: "fig-decoder-ring-1",
          canonical: true,
        }),
      ])
    ).toThrow(/fig-a/);
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "decoder-ring",
          chapter: "fig-b",
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
          chapter: "fig-batch-a",
          anchor: "fig-spectrum-1",
          canonical: true,
        }),
        fu({
          name: "spectrum",
          chapter: "fig-batch-b",
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
        chapter: "fig-ok-a",
        anchor: "fig-hr-diagram-1",
        canonical: true,
      }),
    ]);
    expect(() =>
      indexAccumulator.addFigureUsages([
        fu({
          name: "hr-diagram",
          chapter: "fig-ok-b",
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
        chapter: "fig-pre-a",
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
          chapter: "fig-pre-b",
          anchor: "fig-fresh-fig-1",
          canonical: false,
        }),
        fu({
          name: "x",
          chapter: "fig-pre-b",
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
        chapter: "ch-fig-dupe",
        anchor: "fig-hr-diagram-1",
        canonical: false,
      }),
      fu({
        name: "hr-diagram",
        chapter: "ch-fig-dupe",
        anchor: "fig-hr-diagram-2",
        number: 2,
        canonical: false,
      }),
    ]);
    const usages = indexAccumulator
      .asPedagogyIndex()
      .figureUsages.filter(
        (u) => u.chapter === "ch-fig-dupe" && u.name === "hr-diagram"
      );
    expect(usages).toHaveLength(2);
    expect(usages.map((u) => u.anchor).sort()).toEqual([
      "fig-hr-diagram-1",
      "fig-hr-diagram-2",
    ]);
  });

  // T32
  test("clearChapter removes figureUsages for that chapter; other chapters survive", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "fig-a",
        chapter: "fig-clr-a",
        anchor: "fig-fig-a-1",
        canonical: false,
      }),
      fu({
        name: "fig-b",
        chapter: "fig-clr-b",
        anchor: "fig-fig-b-1",
        canonical: false,
      }),
    ]);

    indexAccumulator.clearChapter("fig-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.figureUsages.filter((u) => u.chapter === "fig-clr-a")
    ).toHaveLength(0);
    expect(
      index.figureUsages.find((u) => u.chapter === "fig-clr-b")?.name
    ).toBe("fig-b");
  });

  test("asPedagogyIndex returns populated figureUsages (was empty `[]` in earlier PRs)", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "fig-1",
        chapter: "fig-ap-a",
        anchor: "fig-fig-1-1",
        canonical: false,
      }),
      fu({
        name: "fig-2",
        chapter: "fig-ap-a",
        anchor: "fig-fig-2-2",
        number: 2,
        canonical: false,
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inChApA = index.figureUsages.filter((u) => u.chapter === "fig-ap-a");
    expect(inChApA).toHaveLength(2);
    expect(inChApA.map((u) => u.name).sort()).toEqual(["fig-1", "fig-2"]);
  });

  test("asPedagogyIndex leaves figureRegistry as [] (extractor never populates it; SSR merge does)", () => {
    indexAccumulator.addFigureUsages([
      fu({
        name: "anything",
        chapter: "fig-reg-a",
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

  test("clearChapter does NOT touch figureRegistry (consumer-global, not per-chapter)", () => {
    const entry: FigureRegistryEntry = {
      name: "clr-fr-x",
      src: "/x.png",
      alt: "X",
    };
    indexAccumulator.setFigureRegistry([entry]);

    indexAccumulator.clearChapter("some-chapter");
    expect(indexAccumulator.asPedagogyIndex().figureRegistry).toEqual([entry]);
  });
});

/**
 * Misconception-test fixture. Misconceptions are extracted from BOTH
 * `<Aside kind="misconception">` (length="short") via the existing
 * `mdxAside` factory above, and `<Callout variant="misconception">`
 * (length="long") via `mdxCallout` below.
 */
const mdxCallout = (
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
const mdxFlowEl = (
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

describe("extractMisconceptions (pure)", () => {
  // T28
  test("<Aside kind='misconception'> produces entry with length='short'", () => {
    const tree = root([
      mdxAside({ kind: "misconception", title: "Heavier falls faster" }, [
        para("Galileo's experiment showed otherwise."),
      ]),
    ]);

    const entries = extractMisconceptions(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      chapter: "spoiler-alerts",
      anchor: "heavier-falls-faster",
      length: "short",
      label: "Heavier falls faster",
    });
    expect(entries[0]?.body).toContain(
      "Galileo's experiment showed otherwise."
    );
  });

  // T29
  test("<Callout variant='misconception'> produces entry with length='long'", () => {
    const tree = root([
      mdxCallout({ variant: "misconception", title: "Seasons from distance" }, [
        para(
          "Earth's tilt — not its distance from the Sun — drives the seasons."
        ),
      ]),
    ]);

    const entries = extractMisconceptions(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      chapter: "spoiler-alerts",
      anchor: "seasons-from-distance",
      length: "long",
      label: "Seasons from distance",
    });
    expect(entries[0]?.body).toContain("Earth's tilt");
  });

  // T30
  test("BOTH source primitives in the same chapter — each gets its own entry, no collision", () => {
    const tree = root([
      mdxAside({ kind: "misconception", title: "Short one" }, [
        para("short body"),
      ]),
      mdxCallout({ variant: "misconception", title: "Long one" }, [
        para("long body"),
      ]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      anchor: "short-one",
      length: "short",
    });
    expect(entries[1]).toMatchObject({
      anchor: "long-one",
      length: "long",
    });
  });

  test("untitled misconception gets auto-anchor 'misc-1'", () => {
    const tree = root([
      mdxAside({ kind: "misconception" }, [para("anonymous misconception")]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.anchor).toBe("misc-1");
    expect(entries[0]?.label).toBeUndefined();
    expect(entries[0]?.length).toBe("short");
  });

  test("counter increments across BOTH source primitives in source order", () => {
    const tree = root([
      mdxAside({ kind: "misconception" }, [para("first")]),
      mdxCallout({ variant: "misconception" }, [para("second")]),
      mdxAside({ kind: "misconception" }, [para("third")]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.anchor)).toEqual([
      "misc-1",
      "misc-2",
      "misc-3",
    ]);
    expect(entries.map((e) => e.length)).toEqual(["short", "long", "short"]);
  });

  test("explicit `id` overrides slug(title) for the anchor", () => {
    const tree = root([
      mdxCallout(
        { variant: "misconception", title: "Some title", id: "custom-id" },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("custom-id");
    expect(entries[0]?.label).toBe("Some title");
  });

  test("Intervention PR-δ — `name` becomes the anchor when no explicit `id` is supplied (precedence: id > name > slug(title) > misc-counter)", () => {
    // ADR 0044's misconception-graph identifier convention puts
    // `name` ABOVE slug(title) in the anchor-derivation chain so the
    // Intervention extractor's `addresses="this"` resolution (which
    // rewrites to the enclosing Aside's `name` attr) lands on the
    // matching MisconceptionEntry.anchor at audit time. Without this
    // promotion, the audit's I1 invariant would WARN on every
    // intervention nested in a `name=`-bearing Aside.
    const tree = root([
      mdxAside(
        {
          kind: "misconception",
          name: "universe-with-a-center",
          title: "A title that should be IGNORED for anchor derivation",
        },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("universe-with-a-center");
    // Label still resolves from title (label and anchor are separate concerns).
    expect(entries[0]?.label).toMatch(/A title that should be IGNORED/);
  });

  test("Intervention PR-δ — explicit `id` still wins over `name` (precedence order preserved)", () => {
    const tree = root([
      mdxAside(
        {
          kind: "misconception",
          id: "explicit-id-wins",
          name: "would-be-name-anchor",
          title: "Some title",
        },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("explicit-id-wins");
  });

  test("Intervention PR-δ — `name` falls through to slug(title) when `name` is absent (back-compat)", () => {
    const tree = root([
      mdxAside({ kind: "misconception", title: "Brighter equals closer" }, [
        para("body"),
      ]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("brighter-equals-closer");
  });

  test("M1 — throws on intra-chapter anchor collision (two Asides with same explicit id)", () => {
    const tree = root([
      mdxAside({ kind: "misconception", id: "shared" }, [para("first")]),
      mdxAside({ kind: "misconception", id: "shared" }, [para("second")]),
    ]);

    expect(() => extractMisconceptions(tree as never, "ch")).toThrow(
      /M1 invariant|anchor collision/i
    );
  });

  test("M1 — throws on intra-chapter anchor collision across Aside + Callout sharing an id", () => {
    const tree = root([
      mdxAside({ kind: "misconception", id: "shared" }, [para("short body")]),
      mdxCallout({ variant: "misconception", id: "shared" }, [
        para("long body"),
      ]),
    ]);

    expect(() => extractMisconceptions(tree as never, "ch")).toThrow(
      /M1 invariant|anchor collision/i
    );
  });

  test("M3 — empty body emits a console.warn (non-production)", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const tree = root([
        mdxAside({ kind: "misconception", title: "Empty one" }, []),
      ]);
      const entries = extractMisconceptions(tree as never, "ch");
      expect(entries).toHaveLength(1);
      expect(spy).toHaveBeenCalled();
      const msg = spy.mock.calls.map((c) => String(c[0])).join("\n");
      expect(msg).toMatch(/M3 warning|empty body/i);
    } finally {
      spy.mockRestore();
    }
  });

  test("skips Aside blocks with non-misconception kinds and Callouts with non-misconception variants", () => {
    const tree = root([
      mdxAside({ kind: "note", title: "A note" }, [para("not it")]),
      mdxAside({ kind: "key-insight", title: "Insight" }, [para("not it")]),
      mdxCallout({ variant: "caution", title: "Caution" }, [para("not it")]),
      mdxCallout({ variant: "info" }, [para("not it")]),
      mdxAside({ kind: "misconception", title: "Real" }, [para("real body")]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Real");
  });
});

describe("extractMisconceptions — ADR 0044 graph fields", () => {
  test("Aside with all four graph fields populated → entry carries them", () => {
    const tree = root([
      mdxFlowEl(
        "Aside",
        { kind: "misconception", title: "Redshift as ordinary Doppler" },
        {
          prerequisite_misconceptions:
            '["universe-with-a-center", "expansion-vs-motion-in-space"]',
          related_misconceptions: '["big-bang-as-explosion-in-space"]',
          concept_refs: '["redshift", "recession-velocity"]',
          discipline_scope: '["astronomy"]',
        },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      anchor: "redshift-as-ordinary-doppler",
      length: "short",
      prerequisite_misconceptions: [
        "universe-with-a-center",
        "expansion-vs-motion-in-space",
      ],
      related_misconceptions: ["big-bang-as-explosion-in-space"],
      concept_refs: ["redshift", "recession-velocity"],
      discipline_scope: ["astronomy"],
    });
  });

  test("Callout with graph fields → long-form entry carries them too", () => {
    const tree = root([
      mdxFlowEl(
        "Callout",
        { variant: "misconception", title: "Brightness is intrinsic" },
        {
          related_misconceptions:
            '["flux-and-luminosity-interchangeable", "all-stars-equally-bright"]',
          concept_refs: '["flux", "stellar-luminosity", "distance-modulus"]',
        },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      anchor: "brightness-is-intrinsic",
      length: "long",
      related_misconceptions: [
        "flux-and-luminosity-interchangeable",
        "all-stars-equally-bright",
      ],
      concept_refs: ["flux", "stellar-luminosity", "distance-modulus"],
    });
    // Unpopulated fields stay undefined (omitted from the entry).
    expect(entries[0]?.prerequisite_misconceptions).toBeUndefined();
    expect(entries[0]?.discipline_scope).toBeUndefined();
  });

  test("misconception with NO graph fields → fields are undefined (pre-ADR-0044 shape preserved)", () => {
    const tree = root([
      mdxAside({ kind: "misconception", title: "Plain misconception" }, [
        para("no graph relationships declared"),
      ]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.prerequisite_misconceptions).toBeUndefined();
    expect(entries[0]?.related_misconceptions).toBeUndefined();
    expect(entries[0]?.concept_refs).toBeUndefined();
    expect(entries[0]?.discipline_scope).toBeUndefined();
  });

  test("empty prerequisite_misconceptions list (`[]`) is preserved — declares a DAG root", () => {
    const tree = root([
      mdxFlowEl(
        "Aside",
        { kind: "misconception", title: "Universe with a center" },
        { prerequisite_misconceptions: "[]" },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries[0]?.prerequisite_misconceptions).toEqual([]);
  });

  test("single-quoted JS string literals inside the expression are normalized to JSON", () => {
    const tree = root([
      mdxFlowEl(
        "Aside",
        { kind: "misconception", title: "Single-quoted" },
        { concept_refs: "['redshift', 'flux']" },
        [para("body")]
      ),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    expect(entries[0]?.concept_refs).toEqual(["redshift", "flux"]);
  });

  test("extracted entries pass MisconceptionEntrySchema validation", async () => {
    const { MisconceptionEntrySchema } = await import("@sophie/core/schema");
    const tree = root([
      mdxFlowEl(
        "Aside",
        { kind: "misconception", title: "Schema-validated" },
        {
          prerequisite_misconceptions: '["root"]',
          related_misconceptions: '["sibling"]',
          concept_refs: '["c1"]',
          discipline_scope: '["astronomy"]',
        },
        [para("body")]
      ),
      mdxAside({ kind: "misconception", title: "Plain" }, [para("body")]),
    ]);

    const entries = extractMisconceptions(tree as never, "ch");
    for (const e of entries) {
      expect(MisconceptionEntrySchema.safeParse(e).success).toBe(true);
    }
  });
});

describe("indexAccumulator misconceptions (cross-chapter)", () => {
  const mc = (
    overrides: Partial<MisconceptionEntry> = {}
  ): MisconceptionEntry => ({
    body: "",
    chapter: "mc-ch-a",
    anchor: "default-anchor",
    length: "short",
    ...overrides,
  });

  test("addMisconceptions populates misconceptions collection accessible via asPedagogyIndex", () => {
    indexAccumulator.addMisconceptions([
      mc({
        chapter: "mc-pop-a",
        anchor: "alpha",
        label: "Alpha",
        length: "short",
      }),
      mc({
        chapter: "mc-pop-b",
        anchor: "beta",
        label: "Beta",
        length: "long",
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const labels = index.misconceptions
      .filter((m) => m.chapter === "mc-pop-a" || m.chapter === "mc-pop-b")
      .map((m) => m.label)
      .sort();
    expect(labels).toEqual(["Alpha", "Beta"]);
  });

  test("M2 — throws on cross-chapter explicit-id anchor collision", () => {
    indexAccumulator.addMisconceptions([
      mc({ chapter: "mc-m2-a", anchor: "shared-explicit-id" }),
    ]);

    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ chapter: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/M2 invariant/);
    // Error names BOTH chapter slugs.
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ chapter: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/mc-m2-a/);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ chapter: "mc-m2-b", anchor: "shared-explicit-id" }),
      ])
    ).toThrow(/mc-m2-b/);
  });

  test("M2 — explicit id starting with 'misc-' still triggers cross-chapter collision", () => {
    // Regression for tightened predicate: `startsWith("misc-")` would
    // silently let an author-supplied `id="misc-orbital"` bypass M2.
    // The tightened `/^misc-\d+$/` matches only the literal auto-anchor
    // shape, so explicit ids like `misc-orbital` still validate.
    indexAccumulator.addMisconceptions([
      mc({ chapter: "mc-misc-a", anchor: "misc-orbital" }),
    ]);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ chapter: "mc-misc-b", anchor: "misc-orbital" }),
      ])
    ).toThrow(/M2 invariant/);
  });

  test("M2 — auto-anchors ('misc-N') do NOT trigger cross-chapter collision", () => {
    indexAccumulator.addMisconceptions([
      mc({ chapter: "mc-auto-a", anchor: "misc-1" }),
    ]);
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ chapter: "mc-auto-b", anchor: "misc-1" }),
      ])
    ).not.toThrow();

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.misconceptions.filter((m) => m.anchor === "misc-1");
    const chapters = shared.map((m) => m.chapter).sort();
    expect(chapters).toContain("mc-auto-a");
    expect(chapters).toContain("mc-auto-b");
  });

  test("addMisconceptions validates the whole batch BEFORE mutating", () => {
    // Seed.
    indexAccumulator.addMisconceptions([
      mc({ chapter: "mc-pre-a", anchor: "seeded-id" }),
    ]);

    // Batch: entry 1 is a fresh non-colliding misconception; entry 2 collides.
    expect(() =>
      indexAccumulator.addMisconceptions([
        mc({ chapter: "mc-pre-b", anchor: "fresh-id" }),
        mc({ chapter: "mc-pre-b", anchor: "seeded-id" }),
      ])
    ).toThrow(/M2 invariant/);

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.misconceptions.find(
        (m) => m.chapter === "mc-pre-b" && m.anchor === "fresh-id"
      )
    ).toBeUndefined();
  });

  test("clearChapter removes misconceptions for the target chapter; other chapters survive", () => {
    indexAccumulator.addMisconceptions([
      mc({ chapter: "mc-clr-a", anchor: "mc-a-1", label: "A" }),
      mc({ chapter: "mc-clr-b", anchor: "mc-b-1", label: "B" }),
    ]);

    indexAccumulator.clearChapter("mc-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.misconceptions.filter((m) => m.chapter === "mc-clr-a")
    ).toHaveLength(0);
    expect(
      index.misconceptions.find((m) => m.chapter === "mc-clr-b")?.label
    ).toBe("B");
  });

  test("asPedagogyIndex returns populated misconceptions (was empty `[]` before Task 7)", () => {
    indexAccumulator.addMisconceptions([
      mc({
        chapter: "mc-ap-a",
        anchor: "ap-1",
        label: "AP One",
        length: "short",
      }),
      mc({
        chapter: "mc-ap-a",
        anchor: "ap-2",
        label: "AP Two",
        length: "long",
      }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.misconceptions.filter((m) => m.chapter === "mc-ap-a");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((m) => m.label).sort()).toEqual(["AP One", "AP Two"]);
  });
});

describe("pedagogyIndexRemarkPlugin (figures)", () => {
  test("populates figureUsages for the parsed chapter", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    // Use figure names unique to this test to avoid collision with
    // leftover canonical entries from F3 tests above (shared module
    // state across describe blocks).
    const tree = root([
      mdxFigure({ name: "plugin-fig-canonical", canonical: null }),
      mdxFigure({ name: "plugin-fig-plain" }),
    ]);

    plugin(tree as never, {
      path: "/repo/src/content/chapters/fig-plugin.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.figureUsages.filter((u) => u.chapter === "fig-plugin");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((u) => u.name).sort()).toEqual([
      "plugin-fig-canonical",
      "plugin-fig-plain",
    ]);
    expect(inCh.find((u) => u.name === "plugin-fig-canonical")?.canonical).toBe(
      true
    );
    expect(inCh.find((u) => u.name === "plugin-fig-plain")?.canonical).toBe(
      false
    );
  });
});

/**
 * PR-C4 Task 2 — Objective + LearningObjectives source-component
 * fixtures. `<LearningObjectives>` wraps `<Objective>` flow elements;
 * the extractor walks the inner `<Objective>`s and emits one
 * ObjectiveEntry per match.
 */
const mdxLearningObjectives = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "LearningObjectives",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

const mdxObjective = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "Objective",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

describe("extractObjectives (pure)", () => {
  test("returns one ObjectiveEntry per <Objective> nested in <LearningObjectives>", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch1-objectives" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [
          para("Distinguish parallax distance from standard-candle distance."),
        ]),
        mdxObjective({ id: "lo-2", verb: "Understand" }, [
          para("The mathematical structure of Wien's displacement law."),
        ]),
      ]),
    ]);

    const entries = extractObjectives(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: "lo-1",
      verb: "Recognize",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-1",
    });
    expect(entries[0]?.body).toContain("Distinguish parallax distance");
    expect(entries[1]).toMatchObject({
      id: "lo-2",
      verb: "Understand",
      chapter: "spoiler-alerts",
      anchor: "lo-lo-2",
    });
  });

  test("throws when an <Objective> is missing a non-empty `id`", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ verb: "Recognize" }, [para("body")]),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /missing.*`id`|missing.*id/i
    );
  });

  test("throws when an <Objective> is missing a non-empty `verb`", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1" }, [para("body")]),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /missing.*`verb`|missing.*verb/i
    );
  });

  test("throws when an <Objective> has an empty (whitespace-only) body", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, []),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /empty.*body|missing.*body/i
    );
  });

  test("O1 — throws on duplicate objective id within a chapter", () => {
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [para("first")]),
        mdxObjective({ id: "lo-1", verb: "Understand" }, [para("second")]),
      ]),
    ]);

    expect(() => extractObjectives(tree as never, "ch")).toThrow(
      /O1 invariant|duplicate|collision/i
    );
  });

  test("ignores <Objective> elements outside a <LearningObjectives> parent", () => {
    const tree = root([
      mdxObjective({ id: "lo-orphan", verb: "Recognize" }, [
        para("orphan objective"),
      ]),
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [para("real")]),
      ]),
    ]);

    const entries = extractObjectives(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe("lo-1");
  });
});

describe("indexAccumulator objectives (cross-chapter)", () => {
  const objective = (
    overrides: Partial<ObjectiveEntry> = {}
  ): ObjectiveEntry => ({
    id: "lo-1",
    verb: "Recognize",
    body: "<p>body</p>",
    chapter: "obj-ch-a",
    anchor: "lo-lo-1",
    ...overrides,
  });

  test("addObjectives keyed by chapter+anchor; two chapters can each declare 'lo-1'", () => {
    indexAccumulator.addObjectives([
      objective({ id: "lo-1", chapter: "obj-share-a", anchor: "lo-lo-1" }),
    ]);
    indexAccumulator.addObjectives([
      objective({ id: "lo-1", chapter: "obj-share-b", anchor: "lo-lo-1" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const shared = index.objectives.filter((o) => o.id === "lo-1");
    const chapters = shared.map((o) => o.chapter).sort();
    expect(chapters).toContain("obj-share-a");
    expect(chapters).toContain("obj-share-b");
  });

  test("addObjectives — multiple objectives within one chapter coexist", () => {
    indexAccumulator.addObjectives([
      objective({ id: "lo-1", chapter: "obj-multi", anchor: "lo-lo-1" }),
      objective({ id: "lo-2", chapter: "obj-multi", anchor: "lo-lo-2" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.objectives.filter((o) => o.chapter === "obj-multi");
    expect(inCh).toHaveLength(2);
    expect(inCh.map((o) => o.id).sort()).toEqual(["lo-1", "lo-2"]);
  });

  test("clearChapter removes objectives for the target chapter; other chapters survive", () => {
    indexAccumulator.addObjectives([
      objective({ id: "lo-a", chapter: "obj-clr-a", anchor: "lo-lo-a" }),
    ]);
    indexAccumulator.addObjectives([
      objective({ id: "lo-b", chapter: "obj-clr-b", anchor: "lo-lo-b" }),
    ]);

    indexAccumulator.clearChapter("obj-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.objectives.filter((o) => o.chapter === "obj-clr-a")
    ).toHaveLength(0);
    expect(index.objectives.find((o) => o.chapter === "obj-clr-b")?.id).toBe(
      "lo-b"
    );
  });
});

describe("indexAccumulator setChapters / setModules", () => {
  // Mirror setFigureRegistry semantics: last-write-wins, consumer-global,
  // NOT touched by clearChapter.

  test("setChapters overwrites prior entries (last-write-wins)", () => {
    const a: ChapterEntry = {
      slug: "ch-a",
      title: "Chapter A",
      module: "mod-1",
      status: "stable",
    };
    const b: ChapterEntry = {
      slug: "ch-b",
      title: "Chapter B",
      module: "mod-1",
      status: "stable",
    };
    const c: ChapterEntry = {
      slug: "ch-c",
      title: "Chapter C",
      module: "mod-1",
      status: "stable",
    };

    indexAccumulator.setChapters([a, b]);
    expect(indexAccumulator.asPedagogyIndex().chapters).toEqual([a, b]);

    indexAccumulator.setChapters([c]);
    expect(indexAccumulator.asPedagogyIndex().chapters).toEqual([c]);
  });

  test("setModules overwrites prior entries (last-write-wins)", () => {
    const a: ModuleEntry = {
      slug: "mod-a",
      title: "Module A",
      order: 0,
    };
    const b: ModuleEntry = {
      slug: "mod-b",
      title: "Module B",
      order: 1,
    };

    indexAccumulator.setModules([a]);
    expect(indexAccumulator.asPedagogyIndex().modules).toEqual([a]);

    indexAccumulator.setModules([a, b]);
    expect(indexAccumulator.asPedagogyIndex().modules).toEqual([a, b]);
  });

  test("clearChapter does NOT touch chapters / modules (consumer-global)", () => {
    const ch: ChapterEntry = {
      slug: "ch-x",
      title: "X",
      module: "mod-1",
      status: "stable",
    };
    const mod: ModuleEntry = { slug: "mod-1", title: "Module 1", order: 0 };

    indexAccumulator.setChapters([ch]);
    indexAccumulator.setModules([mod]);
    indexAccumulator.clearChapter("ch-x");

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.chapters).toEqual([ch]);
    expect(index.modules).toEqual([mod]);
  });
});

/**
 * PR-C4 Task 2 — inline-ref usage fixtures. Inline cross-refs
 * (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`) appear
 * both as block elements (mdxJsxFlowElement) and inline within prose
 * (mdxJsxTextElement). The extractor walks BOTH node types.
 */
const mdxInlineJsx = (
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

describe("extractInlineRefUsages (pure)", () => {
  test("produces one entry per <GlossaryTerm>, <EquationRef>, <FigureRef>, <ChapterRef>", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "See " },
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          { type: "text", value: " and " },
          mdxInlineJsx("EquationRef", { refId: "wiens-law" }),
          { type: "text", value: " and " },
          mdxInlineJsx("FigureRef", { name: "hr-diagram" }),
          { type: "text", value: " and " },
          mdxInlineJsx("ChapterRef", { slug: "hydrostatic-equilibrium" }),
          { type: "text", value: "." },
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(4);
    expect(entries).toEqual(
      expect.arrayContaining([
        {
          kind: "glossary-term",
          refKey: "Parallax",
          chapter: "spoiler-alerts",
        },
        {
          kind: "eq-ref",
          refKey: "wiens-law",
          chapter: "spoiler-alerts",
        },
        {
          kind: "figure-ref",
          refKey: "hr-diagram",
          chapter: "spoiler-alerts",
        },
        {
          kind: "chapter-ref",
          refKey: "hydrostatic-equilibrium",
          chapter: "spoiler-alerts",
        },
      ])
    );
  });

  test("also captures block-level <ChapterRef> (mdxJsxFlowElement)", () => {
    const tree = root([
      mdxInlineJsx(
        "ChapterRef",
        { slug: "hydrostatic-equilibrium" },
        "mdxJsxFlowElement"
      ),
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      kind: "chapter-ref",
      refKey: "hydrostatic-equilibrium",
      chapter: "ch",
    });
  });

  test("missing/empty lookup prop is silently skipped (audit catches it separately)", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", {}), // missing name
          mdxInlineJsx("EquationRef", { refId: "" }), // empty refId
          mdxInlineJsx("FigureRef", { name: "valid" }),
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      kind: "figure-ref",
      refKey: "valid",
      chapter: "ch",
    });
  });

  test("skips JSX elements that aren't one of the four inline-ref components", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("Strong", { foo: "bar" }),
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.kind).toBe("glossary-term");
  });

  test("produces multiple entries when the same refKey appears more than once", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
        ],
      },
    ]);

    const entries = extractInlineRefUsages(tree as never, "ch");
    expect(entries).toHaveLength(3);
    expect(
      entries.every(
        (e) => e.kind === "glossary-term" && e.refKey === "Parallax"
      )
    ).toBe(true);
  });
});

describe("indexAccumulator inlineRefUsages (cross-chapter)", () => {
  const usage = (
    overrides: Partial<InlineRefUsageEntry> = {}
  ): InlineRefUsageEntry => ({
    kind: "glossary-term",
    refKey: "Parallax",
    chapter: "iru-ch-a",
    ...overrides,
  });

  test("addInlineRefUsages appends entries; same (kind, refKey) duplicates coexist", () => {
    indexAccumulator.addInlineRefUsages([
      usage({ chapter: "iru-multi" }),
      usage({ chapter: "iru-multi" }),
      usage({ kind: "eq-ref", refKey: "wiens-law", chapter: "iru-multi" }),
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.inlineRefUsages.filter((u) => u.chapter === "iru-multi");
    expect(inCh).toHaveLength(3);
    const glossary = inCh.filter((u) => u.kind === "glossary-term");
    expect(glossary).toHaveLength(2);
  });

  test("clearChapter removes inlineRefUsages for that chapter; others survive", () => {
    indexAccumulator.addInlineRefUsages([
      usage({ chapter: "iru-clr-a", refKey: "term-a" }),
      usage({ chapter: "iru-clr-b", refKey: "term-b" }),
    ]);

    indexAccumulator.clearChapter("iru-clr-a");

    const index = indexAccumulator.asPedagogyIndex();
    expect(
      index.inlineRefUsages.filter((u) => u.chapter === "iru-clr-a")
    ).toHaveLength(0);
    expect(
      index.inlineRefUsages.find((u) => u.chapter === "iru-clr-b")?.refKey
    ).toBe("term-b");
  });
});

describe("asPedagogyIndex (PR-C4 collections)", () => {
  test("returns all four new collections populated", () => {
    indexAccumulator.setChapters([
      { slug: "ch-x", title: "X", module: "mod-1", status: "stable" },
    ]);
    indexAccumulator.setModules([
      { slug: "mod-1", title: "Module 1", order: 0 },
    ]);
    indexAccumulator.addObjectives([
      {
        id: "lo-1",
        verb: "Recognize",
        body: "<p>body</p>",
        chapter: "ch-x",
        anchor: "lo-lo-1",
      },
    ]);
    indexAccumulator.addInlineRefUsages([
      { kind: "chapter-ref", refKey: "ch-x", chapter: "ch-y" },
    ]);

    const index = indexAccumulator.asPedagogyIndex();
    expect(index.chapters).toHaveLength(1);
    expect(index.modules).toHaveLength(1);
    expect(index.objectives).toHaveLength(1);
    expect(index.inlineRefUsages).toHaveLength(1);
  });
});

describe("pedagogyIndexRemarkPlugin (objectives + inline-ref usages)", () => {
  test("populates objectives AND inlineRefUsages for the parsed chapter", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const tree = root([
      mdxLearningObjectives({ id: "ch-obj" }, [
        mdxObjective({ id: "lo-1", verb: "Recognize" }, [para("body")]),
      ]),
      {
        type: "paragraph",
        children: [
          { type: "text", value: "see " },
          mdxInlineJsx("GlossaryTerm", { name: "Parallax" }),
          { type: "text", value: " " },
          mdxInlineJsx("EquationRef", { refId: "wiens-law" }),
        ],
      },
    ]);

    plugin(tree as never, {
      path: "/repo/src/content/chapters/objectives-plugin.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const objectives = index.objectives.filter(
      (o) => o.chapter === "objectives-plugin"
    );
    const usages = index.inlineRefUsages.filter(
      (u) => u.chapter === "objectives-plugin"
    );
    expect(objectives).toHaveLength(1);
    expect(objectives[0]?.id).toBe("lo-1");
    expect(usages).toHaveLength(2);
    expect(usages.map((u) => u.kind).sort()).toEqual([
      "eq-ref",
      "glossary-term",
    ]);
  });
});

/**
 * `markFirstUseGlossaryTerms` mutates the mdast tree in place,
 * tagging the first `<GlossaryTerm name="...">` per slug per chapter
 * with `data-first-use="true"`. Tests use the same synthetic-tree
 * pattern as the rest of the file (no MDX parser; build the AST
 * directly via `mdxInlineJsx`). Two local helpers walk the result:
 * `collectGlossaryTermNodes` flattens the tree to GlossaryTerm
 * elements in document order; `getAttr` reads an attribute value by
 * name from a JSX element node.
 */

type GlossaryTermNode = {
  type: "mdxJsxFlowElement" | "mdxJsxTextElement";
  name: string;
  attributes: Array<{ type: string; name: string; value: unknown }>;
  children: ReadonlyArray<Record<string, unknown>>;
};

const collectGlossaryTermNodes = (
  tree: Record<string, unknown>
): GlossaryTermNode[] => {
  const out: GlossaryTermNode[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const n = node as {
      type?: string;
      name?: string;
      children?: ReadonlyArray<unknown>;
    };
    if (
      (n.type === "mdxJsxFlowElement" || n.type === "mdxJsxTextElement") &&
      n.name === "GlossaryTerm"
    ) {
      out.push(node as GlossaryTermNode);
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child);
    }
  };
  walk(tree);
  return out;
};

const getAttr = (node: GlossaryTermNode, name: string): string | undefined => {
  const match = node.attributes.find((a) => a.name === name);
  if (!match) return undefined;
  return typeof match.value === "string" ? match.value : undefined;
};

describe("markFirstUseGlossaryTerms", () => {
  test("marks only the first <GlossaryTerm> per slug per chapter", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "The " },
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          { type: "text", value: " of a star matters. Later we revisit " },
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          { type: "text", value: " again, and a different term: " },
          mdxInlineJsx("GlossaryTerm", { name: "Parsec" }),
          { type: "text", value: "." },
        ],
      },
    ]);

    markFirstUseGlossaryTerms(tree as never, "test-chapter");

    const terms = collectGlossaryTermNodes(tree);
    expect(terms).toHaveLength(3);
    expect(getAttr(terms[0] as GlossaryTermNode, "data-first-use")).toBe(
      "true"
    );
    expect(
      getAttr(terms[1] as GlossaryTermNode, "data-first-use")
    ).toBeUndefined();
    expect(getAttr(terms[2] as GlossaryTermNode, "data-first-use")).toBe(
      "true"
    );
  });

  test("is idempotent — second call does not duplicate markings", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          { type: "text", value: "The " },
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          { type: "text", value: "." },
        ],
      },
    ]);

    markFirstUseGlossaryTerms(tree as never, "test-chapter");
    const before = JSON.stringify(tree);
    markFirstUseGlossaryTerms(tree as never, "test-chapter");
    expect(JSON.stringify(tree)).toBe(before);
  });

  test("treats slugified names as the dedup key (case-insensitive)", () => {
    const tree = root([
      {
        type: "paragraph",
        children: [
          mdxInlineJsx("GlossaryTerm", { name: "Luminosity" }),
          mdxInlineJsx("GlossaryTerm", { name: "luminosity" }),
          mdxInlineJsx("GlossaryTerm", { name: "LUMINOSITY" }),
        ],
      },
    ]);

    markFirstUseGlossaryTerms(tree as never, "test-chapter");

    const terms = collectGlossaryTermNodes(tree);
    expect(terms).toHaveLength(3);
    expect(getAttr(terms[0] as GlossaryTermNode, "data-first-use")).toBe(
      "true"
    );
    expect(
      getAttr(terms[1] as GlossaryTermNode, "data-first-use")
    ).toBeUndefined();
    expect(
      getAttr(terms[2] as GlossaryTermNode, "data-first-use")
    ).toBeUndefined();
  });
});
