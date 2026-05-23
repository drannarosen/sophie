import { beforeEach, describe, expect, test } from "vitest";
import {
  mdxAside,
  mdxCallout,
  mdxFlowEl,
  para,
  root,
} from "../_test-helpers.ts";
import { extractMisconceptions, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
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
      unit: "spoiler-alerts",
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
      unit: "spoiler-alerts",
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
