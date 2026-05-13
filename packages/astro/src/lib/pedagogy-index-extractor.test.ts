import { describe, expect, test } from "vitest";
import {
  extractDefinitions,
  indexAccumulator,
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
