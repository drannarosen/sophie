import { beforeEach, describe, expect, test } from "vitest";
import {
  mdxAside,
  mdxFigure,
  mdxInlineJsx,
  mdxKeyEquationCitation,
  mdxLearningObjectives,
  mdxObjective,
  para,
  root,
} from "./_test-helpers.ts";
import {
  indexAccumulator,
  pedagogyIndexRemarkPlugin,
  resetIndexAccumulator,
} from "./index.ts";

beforeEach(() => {
  resetIndexAccumulator();
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
      path: "/repo/src/content/sections/sec-a/units/test-chapter/reading.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const found = index.definitions.find((d) => d.term === "Cepheid variable");
    expect(found).toBeDefined();
    expect(found?.unit).toBe("test-chapter");
  });

  test("uses the default getChapterSlug which returns the parent-Unit dir name (W2/D4 — Unit id)", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const tree = root([
      mdxAside({ kind: "definition", title: "Pulsar" }, [para("body")]),
    ]);

    plugin(tree as never, {
      path: "/repo/src/content/sections/module-a/units/test-chapter/reading.mdx",
    });

    const entry = indexAccumulator
      .asPedagogyIndex()
      .definitions.find((d) => d.term === "Pulsar");
    // W2/D4 (Path A) graduation: the chapter slug is the parent UNIT
    // dir name (= Unit id), not the file basename (which is `reading`).
    // The same string indexes per-callsite entries + URL `/units/<unit-id>/reading`.
    expect(entry?.unit).toBe("test-chapter");
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
    expect(entry?.unit).toBe("custom-slug");
  });

  test("re-parsing a chapter replaces its entries (clears stale on each run)", () => {
    const plugin = pedagogyIndexRemarkPlugin();
    const fileCtx = {
      path: "/repo/src/content/sections/sec-a/units/hmr-test/reading.mdx",
    };

    plugin(
      root([
        mdxAside({ kind: "definition", title: "Initial" }, [para("v1")]),
      ]) as never,
      fileCtx
    );
    expect(
      indexAccumulator
        .asPedagogyIndex()
        .definitions.filter((d) => d.unit === "hmr-test")
    ).toHaveLength(1);

    plugin(
      root([
        mdxAside({ kind: "definition", title: "Replaced" }, [para("v2")]),
      ]) as never,
      fileCtx
    );
    const hmrEntries = indexAccumulator
      .asPedagogyIndex()
      .definitions.filter((d) => d.unit === "hmr-test");
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
      path: "/repo/src/content/sections/sec-a/units/dual-test/reading.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const def = index.definitions.find((d) => d.term === "Standard candle");
    expect(def).toBeDefined();
    expect(def?.unit).toBe("dual-test");

    const citation = index.equationCitations.find(
      (c) => c.refId === "wiens-law" && c.unit === "dual-test"
    );
    expect(citation).toBeDefined();
    expect(citation?.number).toBe(1);
    expect(citation?.anchor).toBe("wiens-law-citation-1");
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
      path: "/repo/src/content/sections/sec-a/units/fig-plugin/reading.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const inCh = index.figureUsages.filter((u) => u.unit === "fig-plugin");
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
      path: "/repo/src/content/sections/sec-a/units/objectives-plugin/reading.mdx",
    });

    const index = indexAccumulator.asPedagogyIndex();
    const objectives = index.objectives.filter(
      (o) => o.unit === "objectives-plugin"
    );
    const usages = index.inlineRefUsages.filter(
      (u) => u.unit === "objectives-plugin"
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
