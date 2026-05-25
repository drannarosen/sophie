import { describe, expect, test } from "vitest";
import {
  blackbodyToSrgb,
  nmToCm,
  planckLambda,
  spectralClassification,
  wienPeakWavelengthCm,
} from "./blackbody.ts";

// ──────────────────────────────────────────────────────────────
// Shared blackbody physics utils — CGS units throughout (Anna's
// global units convention; AGENTS.md). Module lives at the
// package-shared `_physics/` location so future callers like
// `SpectralLineExplorer` and `HRDiagramExplorer` consume the same
// math without per-component duplication. Per-function correctness
// tests already exist in the originating sibling test files; this
// suite asserts the *contract surface at the shared location* —
// the names + units + cross-function sanity points two future
// callers will rely on.
// ──────────────────────────────────────────────────────────────

const TSUN = 5772; // K (IAU 2015 nominal solar effective temperature)

describe("shared _physics/blackbody surface", () => {
  test("nmToCm: 500 nm = 5e-5 cm (length-unit bridge)", () => {
    expect(nmToCm(500)).toBeCloseTo(5e-5, 12);
  });

  test("wienPeakWavelengthCm: Sun (5772 K) peaks at ~502 nm (CGS, result in cm)", () => {
    const peakCm = wienPeakWavelengthCm(TSUN);
    expect(peakCm * 1e7).toBeCloseTo(502.0, 1);
  });

  test("planckLambda: Sun at 502 nm gives B_λ ≈ 2.6e14 erg/s/cm²/sr/cm (CGS)", () => {
    const B = planckLambda(TSUN, nmToCm(502));
    expect(B).toBeGreaterThan(2.4e14);
    expect(B).toBeLessThan(2.8e14);
  });

  test("blackbodyToSrgb: 5772 K returns RGB swatch with R=255 and warm balance", () => {
    const { r, g, b } = blackbodyToSrgb(TSUN);
    expect(r).toBe(255);
    expect(r).toBeGreaterThanOrEqual(g);
    expect(g).toBeGreaterThanOrEqual(b);
  });

  test("spectralClassification: Sun (5772 K) is a G2-type star", () => {
    expect(spectralClassification(TSUN)).toBe("G2");
  });
});
