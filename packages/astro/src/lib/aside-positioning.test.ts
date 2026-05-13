import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  type Anchor,
  type AsidePlacement,
  computeAsidePositions,
  installAsidePositioning,
  type PlacementInput,
} from "./aside-positioning";

/**
 * Pure-algorithm tests for the docking layout math. The full
 * lifecycle (resize listener, MutationObserver, view-mode
 * subscription, ResizeObserver) is exercised by
 * `examples/smoke/e2e/aside.spec.ts` — Playwright is the right
 * harness for those because they depend on real browser layout.
 *
 * Here we test the deterministic pure function
 * `computeAsidePositions(asides, toc, gap)` against synthetic
 * inputs, plus the idempotency guard on `installAsidePositioning`.
 */

const GAP = 16;

function aside(anchorTop: number, height: number): PlacementInput {
  return { anchorTop, height };
}

function tocAnchor(top: number, height: number): Anchor {
  return { top, height };
}

describe("computeAsidePositions", () => {
  test("returns empty placements for empty input", () => {
    expect(computeAsidePositions([], null, GAP)).toEqual([]);
  });

  test("single aside with no ToC anchors at its prose paragraph", () => {
    const result = computeAsidePositions([aside(200, 100)], null, GAP);
    expect(result).toEqual<AsidePlacement[]>([{ top: 200, height: 100 }]);
  });

  test("two non-overlapping asides get their own anchor positions", () => {
    const result = computeAsidePositions(
      [aside(200, 80), aside(600, 80)],
      null,
      GAP
    );
    expect(result).toEqual<AsidePlacement[]>([
      { top: 200, height: 80 },
      { top: 600, height: 80 },
    ]);
  });

  test("two overlapping asides: second cascades to previous.bottom + GAP", () => {
    const result = computeAsidePositions(
      [aside(200, 100), aside(250, 80)],
      null,
      GAP
    );
    // First anchored at 200; height 100 → bottom 300. Second would
    // anchor at 250 but that overlaps; cascades to 300 + GAP = 316.
    expect(result).toEqual<AsidePlacement[]>([
      { top: 200, height: 100 },
      { top: 316, height: 80 },
    ]);
  });

  test("three asides in a tight cluster cascade in order", () => {
    const result = computeAsidePositions(
      [aside(100, 80), aside(110, 80), aside(120, 80)],
      null,
      GAP
    );
    expect(result.map((p) => p.top)).toEqual([
      100, // anchor
      196, // 100 + 80 + GAP
      292, // 196 + 80 + GAP
    ]);
  });

  test("with ToC: first aside's top is clamped to tocBottom + GAP", () => {
    // ToC at top 50, height 300 → bottom 350. First aside would
    // anchor at 100 (above tocBottom). Clamp to 350 + GAP = 366.
    const result = computeAsidePositions(
      [aside(100, 80)],
      tocAnchor(50, 300),
      GAP
    );
    expect(result).toEqual<AsidePlacement[]>([{ top: 366, height: 80 }]);
  });

  test("with ToC: aside below ToC keeps its anchor position", () => {
    // ToC at top 50, height 100 → bottom 150. Aside anchors at 400
    // which is well below tocBottom + GAP — no clamp applied.
    const result = computeAsidePositions(
      [aside(400, 80)],
      tocAnchor(50, 100),
      GAP
    );
    expect(result).toEqual<AsidePlacement[]>([{ top: 400, height: 80 }]);
  });

  test("with ToC + cascade: combined rules apply", () => {
    // ToC bottom 200. First aside anchored at 100, clamped to 216.
    // First aside height 80 → bottom 296. Second aside anchored at
    // 250, would cascade to max(250, 296 + GAP) = 312.
    const result = computeAsidePositions(
      [aside(100, 80), aside(250, 80)],
      tocAnchor(0, 200),
      GAP
    );
    expect(result.map((p) => p.top)).toEqual([216, 312]);
  });

  test("preserves input order in output", () => {
    const result = computeAsidePositions(
      [aside(100, 80), aside(50, 80)],
      null,
      GAP
    );
    // Second input had anchor=50 (earlier in DOM); algorithm processes
    // in input order, not sorted by anchor. Output index 0 corresponds
    // to input index 0.
    expect(result[0]?.top).toBe(100);
    // Second aside anchored at 50 cascades because first occupies
    // 100..180; 50 < 180+GAP=196, so cascades to 196.
    expect(result[1]?.top).toBe(196);
  });

  test("zero-height aside still cascades correctly", () => {
    const result = computeAsidePositions(
      [aside(100, 0), aside(110, 80)],
      null,
      GAP
    );
    expect(result.map((p) => p.top)).toEqual([100, 116]);
  });
});

describe("installAsidePositioning lifecycle", () => {
  beforeEach(() => {
    (
      window as Window & { __sophieAsideDockBound?: boolean }
    ).__sophieAsideDockBound = undefined;
  });

  afterEach(() => {
    (
      window as Window & { __sophieAsideDockBound?: boolean }
    ).__sophieAsideDockBound = undefined;
  });

  test("first install sets the window guard", () => {
    const cleanup = installAsidePositioning();
    expect(
      (window as Window & { __sophieAsideDockBound?: boolean })
        .__sophieAsideDockBound
    ).toBe(true);
    cleanup();
  });

  test("second install is a no-op (idempotent via window guard)", () => {
    const addListenerSpy = vi.spyOn(window, "addEventListener");
    const first = installAsidePositioning();
    const beforeSecond = addListenerSpy.mock.calls.length;
    const second = installAsidePositioning();
    // Second call should not register new listeners on window.
    expect(addListenerSpy.mock.calls.length).toBe(beforeSecond);
    first();
    second();
    addListenerSpy.mockRestore();
  });

  test("cleanup resets the window guard so re-install works", () => {
    const cleanup = installAsidePositioning();
    cleanup();
    expect(
      (window as Window & { __sophieAsideDockBound?: boolean })
        .__sophieAsideDockBound
    ).toBe(false);
    // Re-install must work.
    const cleanup2 = installAsidePositioning();
    expect(
      (window as Window & { __sophieAsideDockBound?: boolean })
        .__sophieAsideDockBound
    ).toBe(true);
    cleanup2();
  });
});
