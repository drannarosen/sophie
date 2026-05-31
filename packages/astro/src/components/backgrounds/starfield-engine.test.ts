import { describe, expect, test } from "vitest";
import {
  generateStars,
  MAGNITUDE_CLASSES,
  SPECTRAL_COLORS,
  STAR_AREA_DIVISOR,
} from "./starfield-engine.ts";

/**
 * Distribution-logic tests for the vendored starfield engine. The render
 * loop (`initStarfield`) is browser-only (canvas + rAF) and is covered at
 * the smoke e2e layer (Task 7); here we pin the pure, deterministic
 * `generateStars` core with an injected seeded RNG.
 */

/**
 * Tiny deterministic mulberry32 PRNG → `[0, 1)`. Seeded so a fixed seed
 * yields a fixed field; lets us assert determinism + distribution shape
 * without `Math.random` flake.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("generateStars", () => {
  test("count scales with area (≈ W*H / divisor)", () => {
    const small = generateStars(800, 600, { rng: mulberry32(1) });
    const large = generateStars(1600, 1200, { rng: mulberry32(1) });
    expect(small.length).toBe(Math.round((800 * 600) / STAR_AREA_DIVISOR));
    expect(large.length).toBe(Math.round((1600 * 1200) / STAR_AREA_DIVISOR));
    // 4× the area → ~4× the stars.
    expect(large.length).toBeCloseTo(small.length * 4, -1);
  });

  test("honors an injected area divisor", () => {
    const dense = generateStars(1000, 1000, {
      rng: mulberry32(2),
      areaDivisor: 1000,
    });
    expect(dense.length).toBe(1000);
  });

  test("deterministic for a fixed seed", () => {
    const a = generateStars(1200, 800, { rng: mulberry32(42) });
    const b = generateStars(1200, 800, { rng: mulberry32(42) });
    expect(a).toEqual(b);
  });

  test("different seeds produce different fields", () => {
    const a = generateStars(1200, 800, { rng: mulberry32(1) });
    const b = generateStars(1200, 800, { rng: mulberry32(2) });
    expect(a).not.toEqual(b);
  });

  test("every star is within bounds, colored from the spectral table", () => {
    const stars = generateStars(1024, 768, { rng: mulberry32(7) });
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThan(1024);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThan(768);
      expect(SPECTRAL_COLORS).toContain(s.color);
      expect([0, 1]).toContain(s.tw);
    }
  });

  test("every star's size falls inside some magnitude class's [min,max]", () => {
    const stars = generateStars(1600, 1000, { rng: mulberry32(11) });
    const lo = Math.min(...MAGNITUDE_CLASSES.map((m) => m.min));
    const hi = Math.max(...MAGNITUDE_CLASSES.map((m) => m.max));
    for (const s of stars) {
      expect(s.size).toBeGreaterThanOrEqual(lo);
      expect(s.size).toBeLessThanOrEqual(hi);
    }
  });

  test("power-law shape: faint stars dominate, bright stars are rare", () => {
    // The faintest three classes carry ~0.85 of the weight; the brightest
    // (size ≥ 1.3, twinkle classes 0–1) are a small minority. Assert the
    // gross power-law shape holds with a big sample.
    const stars = generateStars(4000, 3000, { rng: mulberry32(99) });
    const bright = stars.filter((s) => s.size >= 1.3).length / stars.length;
    const faint = stars.filter((s) => s.size < 0.6).length / stars.length;
    expect(bright).toBeLessThan(0.1);
    expect(faint).toBeGreaterThan(0.4);
  });

  test("twinkle flag correlates with the brighter classes", () => {
    // Only the three brightest classes have tw=1 (sizes ≥ 0.9). No star
    // below 0.9 should ever twinkle; the twinkling fraction is small.
    const stars = generateStars(3000, 2000, { rng: mulberry32(5) });
    for (const s of stars) {
      if (s.tw === 1) expect(s.size).toBeGreaterThanOrEqual(0.9);
    }
    const twinkleFrac = stars.filter((s) => s.tw === 1).length / stars.length;
    expect(twinkleFrac).toBeLessThan(0.25);
  });

  test("magnitude-class fractions roughly hold (chi-shape, not exact)", () => {
    // With a uniform draw weighted by MAG[].f, the realized size
    // distribution should track the table. Bucket by class and check the
    // largest class (f=0.40, size 0.4–0.6) is the modal band.
    const stars = generateStars(5000, 4000, { rng: mulberry32(123) });
    const inBand = (s: { size: number }, min: number, max: number) =>
      s.size >= min && s.size < max;
    const band04to06 =
      stars.filter((s) => inBand(s, 0.4, 0.6)).length / stars.length;
    // Table weight for that band is 0.40; allow generous tolerance.
    expect(band04to06).toBeGreaterThan(0.28);
    expect(band04to06).toBeLessThan(0.52);
  });
});
