import { describe, expect, test } from "vitest";
import { groupHeadings } from "./group-headings";

const h = (depth: number, slug: string, text: string) => ({
  depth,
  slug,
  text,
});

describe("groupHeadings", () => {
  test("returns empty array for empty input", () => {
    expect(groupHeadings([])).toEqual([]);
  });

  test("returns empty array when no H2 exists", () => {
    expect(groupHeadings([h(1, "title", "Chapter Title")])).toEqual([]);
    expect(groupHeadings([h(3, "orphan", "Orphan H3 with no parent")])).toEqual(
      []
    );
  });

  test("returns one group per H2", () => {
    const result = groupHeadings([
      h(2, "sec-a", "Section A"),
      h(2, "sec-b", "Section B"),
    ]);
    expect(result.map((g) => g.h2.slug)).toEqual(["sec-a", "sec-b"]);
    expect(result.every((g) => g.children.length === 0)).toBe(true);
  });

  test("groups H3 under its preceding H2", () => {
    const result = groupHeadings([
      h(2, "sec-a", "Section A"),
      h(3, "sub-a-1", "Subsection A1"),
      h(3, "sub-a-2", "Subsection A2"),
      h(2, "sec-b", "Section B"),
      h(3, "sub-b-1", "Subsection B1"),
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ h2: { slug: "sec-a" } });
    expect(result[0]?.children.map((c) => c.slug)).toEqual([
      "sub-a-1",
      "sub-a-2",
    ]);
    expect(result[1]).toMatchObject({ h2: { slug: "sec-b" } });
    expect(result[1]?.children.map((c) => c.slug)).toEqual(["sub-b-1"]);
  });

  test("discards H3 that appears before any H2", () => {
    const result = groupHeadings([
      h(3, "orphan", "Orphan H3"),
      h(2, "first-h2", "First H2"),
      h(3, "child", "Child H3"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ h2: { slug: "first-h2" } });
    expect(result[0]?.children.map((c) => c.slug)).toEqual(["child"]);
  });

  test("ignores H1, H4, H5, H6", () => {
    const result = groupHeadings([
      h(1, "title", "Title (skipped)"),
      h(2, "sec-a", "Section A"),
      h(4, "deep-1", "Deep heading (skipped)"),
      h(5, "deeper", "Deeper (skipped)"),
      h(6, "deepest", "Deepest (skipped)"),
      h(3, "sub", "Subsection"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ h2: { slug: "sec-a" } });
    expect(result[0]?.children.map((c) => c.slug)).toEqual(["sub"]);
  });

  test("preserves heading text and slug verbatim", () => {
    const result = groupHeadings([
      h(
        2,
        "1-1-what-this-course-is-really-about",
        "1.1 What This Course Is Really About"
      ),
      h(
        3,
        "the-four-things-we-can-actually-measure",
        "The Four Things We Can Actually Measure"
      ),
    ]);
    expect(result[0]).toMatchObject({
      h2: { text: "1.1 What This Course Is Really About" },
    });
    expect(result[0]?.children[0]).toMatchObject({
      text: "The Four Things We Can Actually Measure",
    });
  });
});
