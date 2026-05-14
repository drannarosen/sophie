import { describe, expect, test } from "vitest";
import {
  extractDefinitions,
  extractEquations,
  indexAccumulator,
  pedagogyIndexRemarkPlugin,
} from "./pedagogy-index-extractor.ts";

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

const mdxKeyEquation = (
  attrs: Record<string, string>,
  children: ReadonlyArray<Record<string, unknown>> = []
) => ({
  type: "mdxJsxFlowElement",
  name: "KeyEquation",
  attributes: Object.entries(attrs).map(([name, value]) => ({
    type: "mdxJsxAttribute",
    name,
    value,
  })),
  children,
});

const mathBlock = (value: string) => ({ type: "math", value });

const inlineMath = (value: string) => ({ type: "inlineMath", value });

describe("extractEquations (pure)", () => {
  // T5
  test("returns one EquationEntry for one KeyEquation (number=1, slug/title/tex/body/chapter/anchor)", () => {
    const tree = root([
      mdxKeyEquation({ id: "wiens-law", title: "Wien's Law" }, [
        mathBlock("\\lambda_{\\text{peak}} = b T^{-1}"),
        para("Wien's displacement law relates peak wavelength to temperature."),
      ]),
    ]);

    const entries = extractEquations(tree as never, "ch");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      slug: "wiens-law",
      title: "Wien's Law",
      number: 1,
      tex: "\\lambda_{\\text{peak}} = b T^{-1}",
      chapter: "ch",
      anchor: "wiens-law",
    });
    // anchor === slug invariant
    expect(entries[0]?.anchor).toBe(entries[0]?.slug);
    // body contains the rendered prose
    expect(entries[0]?.body).toContain(
      "Wien's displacement law relates peak wavelength to temperature."
    );
  });

  // T6
  test("extracts `tex` from the FIRST `$$` block when the body has multiple math blocks; subsequent forms stay in `body`", () => {
    const tree = root([
      mdxKeyEquation(
        { id: "inverse-square-law", title: "Inverse-Square Law" },
        [
          mathBlock("F = \\frac{L}{4\\pi d^2}"),
          para("Equivalently:"),
          mathBlock("L = 4\\pi d^2 F"),
        ]
      ),
    ]);

    const entries = extractEquations(tree as never, "ch");

    expect(entries).toHaveLength(1);
    // tex is the FIRST math block
    expect(entries[0]?.tex).toBe("F = \\frac{L}{4\\pi d^2}");
    // body contains the rendered output for BOTH math blocks
    expect(entries[0]?.body).toContain("F = \\frac{L}{4\\pi d^2}");
    expect(entries[0]?.body).toContain("L = 4\\pi d^2 F");
  });

  // T6 supplementary — inlineMath must be ignored when picking the first tex
  test("ignores inlineMath ($x$) when picking the first tex (only $$ display math counts)", () => {
    const tree = root([
      mdxKeyEquation({ id: "stefan-boltzmann", title: "Stefan–Boltzmann" }, [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "Recall " },
            inlineMath("T"),
            { type: "text", value: " is temperature." },
          ],
        },
        mathBlock("L = 4\\pi R^2 \\sigma T^4"),
      ]),
    ]);

    const entries = extractEquations(tree as never, "ch");
    expect(entries[0]?.tex).toBe("L = 4\\pi R^2 \\sigma T^4");
  });

  // T7
  test("assigns per-chapter `number` 1, 2, 3 in source order across three KeyEquations", () => {
    const tree = root([
      mdxKeyEquation({ id: "eq-a", title: "Equation A" }, [mathBlock("a = 1")]),
      mdxKeyEquation({ id: "eq-b", title: "Equation B" }, [mathBlock("b = 2")]),
      mdxKeyEquation({ id: "eq-c", title: "Equation C" }, [mathBlock("c = 3")]),
    ]);

    const entries = extractEquations(tree as never, "ch");
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.number)).toEqual([1, 2, 3]);
    expect(entries.map((e) => e.slug)).toEqual(["eq-a", "eq-b", "eq-c"]);
  });

  // T8
  test("throws on intra-chapter slug collision (two KeyEquations with the same `id`)", () => {
    const tree = root([
      mdxKeyEquation({ id: "wiens-law", title: "Wien's Law" }, [
        mathBlock("\\lambda = b/T"),
      ]),
      mdxKeyEquation({ id: "wiens-law", title: "Wien's Law (alt)" }, [
        mathBlock("\\lambda T = b"),
      ]),
    ]);

    expect(() => extractEquations(tree as never, "ch")).toThrow(
      /collision|duplicate/i
    );
    // Error message cites the chapter + slug
    expect(() => extractEquations(tree as never, "ch")).toThrow(/ch/);
    expect(() => extractEquations(tree as never, "ch")).toThrow(/wiens-law/);
  });

  // T9
  test("throws E6 categorization error when a KeyEquation has no `$$` math block", () => {
    const tree = root([
      mdxKeyEquation({ id: "no-math", title: "No Math Here" }, [
        para("This KeyEquation has prose but no $$ block."),
      ]),
    ]);

    expect(() => extractEquations(tree as never, "ch")).toThrow(
      /no `\$\$\.\.\.\$\$` math block/
    );
  });

  // Defense-in-depth: missing id and missing title
  test("throws when a KeyEquation is missing a non-empty `id`", () => {
    const tree = root([
      mdxKeyEquation({ title: "Some Title" }, [mathBlock("x = 1")]),
    ]);
    expect(() => extractEquations(tree as never, "ch")).toThrow(
      /missing.*`id`/i
    );
  });

  test("throws when a KeyEquation is missing a non-empty `title`", () => {
    const tree = root([
      mdxKeyEquation({ id: "some-id" }, [mathBlock("x = 1")]),
    ]);
    expect(() => extractEquations(tree as never, "ch")).toThrow(
      /missing.*`title`/i
    );
  });

  // Skips non-KeyEquation JSX elements
  test("skips JSX elements that aren't named 'KeyEquation'", () => {
    const tree = root([
      {
        type: "mdxJsxFlowElement",
        name: "Callout",
        attributes: [
          { type: "mdxJsxAttribute", name: "variant", value: "info" },
        ],
        children: [para("not a KeyEquation"), mathBlock("z = 0")],
      },
      mdxKeyEquation({ id: "real-eq", title: "Real Equation" }, [
        mathBlock("y = mx + b"),
      ]),
    ]);

    const entries = extractEquations(tree as never, "ch");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.slug).toBe("real-eq");
  });
});

describe("indexAccumulator (cross-chapter)", () => {
  // Tests share module state, so each clears the chapters they touch.

  test("aggregates definitions from multiple chapters", () => {
    indexAccumulator.clearChapter("ch-a");
    indexAccumulator.clearChapter("ch-b");
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
    indexAccumulator.clearChapter("ch-a");
    indexAccumulator.clearChapter("ch-b");
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
    ).toThrow(/multiple chapters|duplicate/i);
  });

  test("clearChapter removes only that chapter's entries", () => {
    indexAccumulator.clearChapter("ch-a");
    indexAccumulator.clearChapter("ch-b");
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
    indexAccumulator.clearChapter("ch-a");
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
    indexAccumulator.clearChapter("test-chapter");
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
    indexAccumulator.clearChapter("test-chapter");
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
    indexAccumulator.clearChapter("custom-slug");
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
    indexAccumulator.clearChapter("hmr-test");
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
});
