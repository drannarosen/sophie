import { beforeEach, describe, expect, test } from "vitest";
import { mdxCallout, mdxFlowEl, para, root } from "../_test-helpers.ts";
import { extractOMIFlows, resetIndexAccumulator } from "../index.ts";

beforeEach(() => {
  resetIndexAccumulator();
});

type SlotKey = "observable" | "model" | "inference";

/**
 * Helper: build an <OMIFlow> mdast node with three slot children.
 * Each slot is an <OMIFlow.Observable> / <OMIFlow.Model> /
 * <OMIFlow.Inference> mdxJsxFlowElement.
 */
function omiFlow(
  attrs: Record<string, string>,
  slots: {
    observable?: {
      attrs?: Record<string, string>;
      children?: ReadonlyArray<Record<string, unknown>>;
    };
    model?: {
      attrs?: Record<string, string>;
      children?: ReadonlyArray<Record<string, unknown>>;
    };
    inference?: {
      attrs?: Record<string, string>;
      children?: ReadonlyArray<Record<string, unknown>>;
    };
    /** Pass `["model", "observable", "inference"]` to test source-order tolerance. */
    order?: ReadonlyArray<SlotKey>;
  } = {}
) {
  const slotChildren: Record<string, unknown>[] = [];
  const order: ReadonlyArray<SlotKey> =
    slots.order ?? (["observable", "model", "inference"] as const);
  for (const k of order) {
    const slot = slots[k] ?? {};
    slotChildren.push(
      mdxFlowEl(
        `OMIFlow.${k.charAt(0).toUpperCase()}${k.slice(1)}`,
        slot.attrs ?? {},
        {},
        slot.children ?? [para(`${k} body`)]
      )
    );
  }
  return mdxFlowEl("OMIFlow", attrs, {}, slotChildren);
}

describe("extractOMIFlows (pure)", () => {
  test("returns empty for chapters with no <OMIFlow> callsites", () => {
    const tree = root([
      mdxCallout({ variant: "info" }, [para("not an omiflow")]),
    ]);
    expect(extractOMIFlows(tree as never, "ch")).toEqual([]);
  });

  test("emits one entry per <OMIFlow> callsite with all 3 slots populated", () => {
    const tree = root([
      omiFlow(
        { id: "stellar-temp", concept: "stellar-temperature" },
        {
          observable: { attrs: { title: "HR diagram" } },
          model: { attrs: { title: "Hydrostatic equilibrium" } },
          inference: { attrs: { title: "Mass-lifetime" } },
        }
      ),
    ]);
    const entries = extractOMIFlows(tree as never, "spoiler-alerts");
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      chapter: "spoiler-alerts",
      anchor: "stellar-temp",
      concept: "stellar-temperature",
      observable: { title: "HR diagram" },
      model: { title: "Hydrostatic equilibrium" },
      inference: { title: "Mass-lifetime" },
    });
    expect(entries[0]?.observable.body).toContain("observable body");
  });

  test("anchor precedence — explicit id wins over concept", () => {
    const tree = root([
      omiFlow({ id: "explicit-id", concept: "stellar-temperature" }),
    ]);
    expect(extractOMIFlows(tree as never, "ch")[0]?.anchor).toBe("explicit-id");
  });

  test("anchor precedence — slug(concept) when no id", () => {
    const tree = root([omiFlow({ concept: "stellar Temperature" })]);
    expect(extractOMIFlows(tree as never, "ch")[0]?.anchor).toBe(
      "omi-stellar-temperature"
    );
  });

  test("anchor fallback — omi-{counter} when neither id nor concept", () => {
    const tree = root([omiFlow({}), omiFlow({})]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries[0]?.anchor).toBe("omi-1");
    expect(entries[1]?.anchor).toBe("omi-2");
  });

  test("throws on intra-chapter anchor collisions (OF anchor invariant)", () => {
    const tree = root([omiFlow({ id: "dup" }), omiFlow({ id: "dup" })]);
    expect(() => extractOMIFlows(tree as never, "ch")).toThrow(
      /anchor.*collision/i
    );
  });

  test("throws when any of the 3 slots is missing (strict-3 invariant)", () => {
    const tree = root([
      omiFlow({ id: "x" }, { order: ["observable", "model"] }), // missing inference
    ]);
    expect(() => extractOMIFlows(tree as never, "ch")).toThrow(
      /OMIFlow.*missing.*inference/i
    );
  });

  test("throws when a slot appears more than once (exactly-one invariant)", () => {
    const tree = root([
      mdxFlowEl("OMIFlow", { id: "x" }, {}, [
        mdxFlowEl("OMIFlow.Observable", {}, {}, [para("a")]),
        mdxFlowEl("OMIFlow.Observable", {}, {}, [para("b")]),
        mdxFlowEl("OMIFlow.Model", {}, {}, [para("m")]),
        mdxFlowEl("OMIFlow.Inference", {}, {}, [para("i")]),
      ]),
    ]);
    expect(() => extractOMIFlows(tree as never, "ch")).toThrow(
      /OMIFlow.*observable.*more than once/i
    );
  });

  test("accepts slots in non-canonical source order (renderer enforces order)", () => {
    const tree = root([
      omiFlow({ id: "x" }, { order: ["model", "observable", "inference"] }),
    ]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries).toHaveLength(1);
    // Body still extracted correctly per slot kind, regardless of source order.
    expect(entries[0]?.observable.body).toContain("observable");
    expect(entries[0]?.model.body).toContain("model");
    expect(entries[0]?.inference.body).toContain("inference");
  });

  test("emits an OF-1 finding when slots are out of canonical source order", () => {
    const tree = root([
      omiFlow(
        { id: "out-of-order" },
        { order: ["inference", "observable", "model"] }
      ),
    ]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries).toHaveLength(1);
    // The extractor stashes the source order on the entry for the OF-1
    // invariant to consume. (Per design doc #4 + the OF-1 invariant
    // contract — see PR-A Task 15.)
    expect(entries[0]?.sourceOrder).toEqual([
      "inference",
      "observable",
      "model",
    ]);
  });

  test("emits canonical sourceOrder field when slots are in O→M→I source order", () => {
    const tree = root([omiFlow({ id: "x" })]);
    const entries = extractOMIFlows(tree as never, "ch");
    expect(entries[0]?.sourceOrder).toEqual([
      "observable",
      "model",
      "inference",
    ]);
  });
});
