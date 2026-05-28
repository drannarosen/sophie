import { beforeEach, describe, expect, test } from "vitest";
import { mdxAside, mdxCallout, para, root } from "../_test-helpers.ts";
import { extractDeepDives, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

describe("extractDeepDives (pure)", () => {
  test("returns empty for chapters with no deep-dive callouts", () => {
    const tree = root([
      mdxCallout({ variant: "info", title: "Note" }, [
        para("Just a regular info callout."),
      ]),
    ]);
    expect(extractDeepDives(tree as never, "ch")).toEqual([]);
  });

  test("emits one entry per <Callout variant='deep-dive'>", () => {
    const tree = root([
      mdxCallout(
        {
          variant: "deep-dive",
          id: "distance-ladder",
          title: "How the Distance Ladder Works",
        },
        [para("Parallax → Cepheids → SN Ia.")]
      ),
    ]);

    const entries = extractDeepDives(tree as never, "spoiler-alerts");

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      unit: "spoiler-alerts",
      anchor: "distance-ladder",
      title: "How the Distance Ladder Works",
    });
    expect(entries[0]?.body).toContain("Parallax");
  });

  test("anchor precedence — explicit id wins over title", () => {
    const tree = root([
      mdxCallout(
        { variant: "deep-dive", id: "explicit", title: "Some Title" },
        [para("body")]
      ),
    ]);
    expect(extractDeepDives(tree as never, "ch")[0]?.anchor).toBe("explicit");
  });

  test("anchor precedence — slug(title) when no id", () => {
    const tree = root([
      mdxCallout({ variant: "deep-dive", title: "How It Works" }, [
        para("body"),
      ]),
    ]);
    expect(extractDeepDives(tree as never, "ch")[0]?.anchor).toBe(
      "how-it-works"
    );
  });

  test("anchor fallback — dd-{counter} when neither id nor title present", () => {
    const tree = root([
      mdxCallout({ variant: "deep-dive" }, [para("body 1")]),
      mdxCallout({ variant: "deep-dive" }, [para("body 2")]),
    ]);
    const entries = extractDeepDives(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("dd-1");
    expect(entries[1]?.anchor).toBe("dd-2");
  });

  test("throws on intra-chapter anchor collisions (D1 invariant)", () => {
    const tree = root([
      mdxCallout({ variant: "deep-dive", id: "dup" }, [para("A")]),
      mdxCallout({ variant: "deep-dive", id: "dup" }, [para("B")]),
    ]);
    expect(() => extractDeepDives(tree as never, "ch")).toThrow(
      /anchor.*collision/i
    );
  });

  test("does NOT walk <Callout variant='the-more-you-know'> (taxonomy boundary)", () => {
    const tree = root([
      mdxCallout({ variant: "the-more-you-know", title: "Hubble lore" }, [
        para("History anecdote."),
      ]),
    ]);
    expect(extractDeepDives(tree as never, "ch")).toEqual([]);
  });

  test("does NOT walk other Callout variants (info, tip, warning, etc.)", () => {
    const tree = root([
      mdxCallout({ variant: "info", title: "i" }, [para("info body")]),
      mdxCallout({ variant: "tip", title: "t" }, [para("tip body")]),
      mdxCallout({ variant: "warning", title: "w" }, [para("warning body")]),
      mdxCallout({ variant: "key-insight", title: "k" }, [para("ki body")]),
    ]);
    expect(extractDeepDives(tree as never, "ch")).toEqual([]);
  });

  test("does NOT walk <Aside> elements (deep-dive is Callout-only)", () => {
    const tree = root([
      mdxAside({ kind: "definition", title: "x" }, [para("body")]),
    ]);
    expect(extractDeepDives(tree as never, "ch")).toEqual([]);
  });

  test("preserves source-order numbering across mixed callouts", () => {
    const tree = root([
      mdxCallout({ variant: "info" }, [para("info")]),
      mdxCallout({ variant: "deep-dive" }, [para("dd one")]),
      mdxCallout({ variant: "tip" }, [para("tip")]),
      mdxCallout({ variant: "deep-dive" }, [para("dd two")]),
    ]);
    const entries = extractDeepDives(tree as never, "ch");
    expect(entries).toHaveLength(2);
    expect(entries[0]?.anchor).toBe("dd-1");
    expect(entries[1]?.anchor).toBe("dd-2");
  });

  // 2026-05-19 architecture audit C1/P2 #10 — counter increments BEFORE
  // the anchor decision, so explicit-id deep-dives still consume slots.
  // This locks in source-position numbering so a future "warn instead
  // of throw on collision" refactor can't silently re-number downstream
  // anonymous anchors.
  test("explicit-id deep-dives consume counter slots — anonymous numbering reflects source position", () => {
    const tree = root([
      mdxCallout({ variant: "deep-dive", id: "explicit-a" }, [para("a")]),
      mdxCallout({ variant: "deep-dive" }, [para("anon at position 2")]),
      mdxCallout({ variant: "deep-dive", id: "explicit-c" }, [para("c")]),
      mdxCallout({ variant: "deep-dive" }, [para("anon at position 4")]),
    ]);
    const entries = extractDeepDives(tree as never, "ch");
    expect(entries.map((e) => e.anchor)).toEqual([
      "explicit-a",
      "dd-2",
      "explicit-c",
      "dd-4",
    ]);
  });
});
