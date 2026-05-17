import { describe, expect, test } from "vitest";
import { spectralClassification } from "./classification.ts";

describe("spectralClassification", () => {
  test("Sun (5772 K) classifies as G2", () => {
    expect(spectralClassification(5772)).toMatch(/^G\d$/);
    expect(spectralClassification(5772)).toBe("G2");
  });

  test("M dwarf (3000 K) is M-class", () => {
    expect(spectralClassification(3000)).toMatch(/^M\d$/);
  });

  test("K star (4500 K) is K-class", () => {
    expect(spectralClassification(4500)).toMatch(/^K\d$/);
  });

  test("F star (6500 K) is F-class", () => {
    expect(spectralClassification(6500)).toMatch(/^F\d$/);
  });

  test("A star (Sirius A, 9940 K) is A-class", () => {
    expect(spectralClassification(9940)).toMatch(/^A\d$/);
  });

  test("B star (15000 K) is B-class", () => {
    expect(spectralClassification(15000)).toMatch(/^B\d$/);
  });

  test("O star (40000 K) is O-class", () => {
    expect(spectralClassification(40000)).toMatch(/^O\d$/);
  });

  test("subclass: hotter G is lower digit (G0 > G9 in temperature)", () => {
    // G0 should be ~6000 K, G9 should be ~5200 K.
    const hot = spectralClassification(5900);
    const cool = spectralClassification(5300);
    expect(hot).toMatch(/^G[01]$/);
    expect(cool).toMatch(/^G[89]$/);
  });

  test("below M-cool boundary: classified as 'L' brown-dwarf shorthand (or graceful fallback)", () => {
    expect(spectralClassification(1500)).toMatch(/^[LM]\d$/);
  });

  test("above O-hot boundary: classified as O0 or hottest O subclass", () => {
    const label = spectralClassification(60000);
    expect(label).toMatch(/^O\d$/);
  });
});
