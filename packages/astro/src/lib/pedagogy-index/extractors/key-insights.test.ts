import { beforeEach, describe, expect, test } from "vitest";
import { mdxAside, para, root } from "../_test-helpers.ts";
import { extractKeyInsights, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractKeyInsights (pure)", () => {
  // T21
  test("returns one KeyInsightEntry for one <Aside kind='key-insight' title='X'>", () => {
    const tree = root([
      mdxAside({ kind: "key-insight", title: "Light is a messenger" }, [
        para("Everything we know about distant objects arrives as light."),
      ]),
    ]);

    const entries = extractKeyInsights(
      tree as never,
      "spoiler-alerts",
      "reading"
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      title: "Light is a messenger",
      unit: "spoiler-alerts",
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

    const entries = extractKeyInsights(tree as never, "ch", "reading");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.anchor).toBe("reading-ki-1");
    expect(entries[0]?.title).toBeUndefined();
  });

  // T23
  test("throws on intra-chapter anchor collision (two key-insights share explicit id)", () => {
    // Two key-insights sharing an explicit `id` collide on the same anchor.
    const tree = root([
      mdxAside({ kind: "key-insight", id: "shared-anchor" }, [para("first")]),
      mdxAside({ kind: "key-insight", id: "shared-anchor" }, [para("second")]),
    ]);

    expect(() => extractKeyInsights(tree as never, "ch", "reading")).toThrow(
      /anchor collision|duplicate/i
    );
  });

  test("skips Aside blocks with non-key-insight kinds", () => {
    const tree = root([
      mdxAside({ kind: "note", title: "A note" }, [para("not a key-insight")]),
      mdxAside({ kind: "definition", title: "Term" }, [para("a definition")]),
      mdxAside({ kind: "key-insight", title: "Real insight" }, [para("body")]),
    ]);

    const entries = extractKeyInsights(tree as never, "ch", "reading");
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

    const entries = extractKeyInsights(tree as never, "ch", "reading");
    expect(entries[0]?.anchor).toBe("custom-anchor");
    expect(entries[0]?.title).toBe("Some Title");
  });

  test("auto-numbered anchors increment per-chapter (untitled+untitled → ki-1, ki-2)", () => {
    const tree = root([
      mdxAside({ kind: "key-insight" }, [para("first")]),
      mdxAside({ kind: "key-insight" }, [para("second")]),
    ]);

    const entries = extractKeyInsights(tree as never, "ch", "reading");
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.anchor)).toEqual([
      "reading-ki-1",
      "reading-ki-2",
    ]);
  });

  // W4c D4: slug is derived at extraction time.
  test("slug derives from title via slugify when title present", () => {
    const tree = root([
      mdxAside({ kind: "key-insight", title: "Light is information" }, [
        para("body"),
      ]),
    ]);

    const entries = extractKeyInsights(
      tree as never,
      "spectra-and-composition",
      "reading"
    );
    expect(entries[0]?.slug).toBe("light-is-information");
  });

  test("slug falls back to '<unit>-<anchor>' when title absent", () => {
    const tree = root([
      mdxAside({ kind: "key-insight" }, [para("untitled body")]),
    ]);

    const entries = extractKeyInsights(
      tree as never,
      "spectra-and-composition",
      "reading"
    );
    expect(entries[0]?.anchor).toBe("reading-ki-1");
    expect(entries[0]?.slug).toBe("spectra-and-composition-reading-ki-1");
  });

  // W4c Task 2.2 reviewer Minor #1: whitespace-only title trims to
  // empty, which `attrs.title?.trim() || undefined` collapses to
  // `undefined` — so the slug fallback must still fire.
  test("slug falls back to '<unit>-<anchor>' when title is whitespace-only", () => {
    const tree = root([
      mdxAside({ kind: "key-insight", title: "   " }, [para("body")]),
    ]);

    const entries = extractKeyInsights(tree as never, "x", "reading");
    expect(entries[0]?.title).toBeUndefined();
    expect(entries[0]?.slug).toBe("x-reading-ki-1");
  });
});
