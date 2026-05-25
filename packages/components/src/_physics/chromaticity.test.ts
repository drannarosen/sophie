import { describe, expect, test } from "vitest";
import { blackbodyToSrgb } from "./blackbody.ts";

describe("blackbodyToSrgb", () => {
  test("returns RGB components in [0, 255]", () => {
    for (const T of [1000, 2000, 3000, 5772, 10000, 30000, 50000]) {
      const { r, g, b } = blackbodyToSrgb(T);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(255);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(255);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(255);
    }
  });

  test("cool stars (T < 3000 K) are red-dominated, low blue", () => {
    const { r, g, b } = blackbodyToSrgb(2500);
    expect(r).toBeGreaterThan(g);
    expect(g).toBeGreaterThan(b);
    expect(r).toBe(255);
  });

  test("Sun-like (T = 5772 K) is roughly balanced, slightly warm (R ≥ G ≥ B)", () => {
    const { r, g, b } = blackbodyToSrgb(5772);
    expect(r).toBe(255);
    expect(g).toBeGreaterThanOrEqual(200);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeGreaterThanOrEqual(200);
    expect(b).toBeLessThanOrEqual(255);
    // Sun is "warm white": R≥G≥B is the standard ordering.
    expect(r).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThanOrEqual(b);
  });

  test("hot stars (T > 20000 K) are blue-dominated", () => {
    const { r, b } = blackbodyToSrgb(30000);
    expect(b).toBeGreaterThan(r);
    expect(b).toBe(255);
  });

  test("monotonic in T: blue channel non-decreasing as T rises through the blue regime", () => {
    const blueValues = [10000, 15000, 20000, 30000].map(
      (T) => blackbodyToSrgb(T).b
    );
    for (let i = 1; i < blueValues.length; i++) {
      expect(blueValues[i]).toBeGreaterThanOrEqual(blueValues[i - 1] as number);
    }
  });

  test("clamps below 1000 K gracefully (returns deep red, not NaN)", () => {
    const { r, g, b } = blackbodyToSrgb(500);
    expect(Number.isFinite(r)).toBe(true);
    expect(Number.isFinite(g)).toBe(true);
    expect(Number.isFinite(b)).toBe(true);
    expect(r).toBeGreaterThanOrEqual(g);
  });
});
