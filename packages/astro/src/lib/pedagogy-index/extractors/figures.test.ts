import { beforeEach, describe, expect, test } from "vitest";
import { mdxFigure, root } from "../_test-helpers.ts";
import { extractFigures, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
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
