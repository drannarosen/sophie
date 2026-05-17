import { describe, expect, test } from "vitest";
import {
  nmToCm,
  planckLambda,
  rayleighJeansLambda,
  stefanBoltzmannFlux,
  wienApproxLambda,
  wienPeakWavelengthCm,
} from "./physics.ts";

// ──────────────────────────────────────────────────────────────
// CGS reference values (per Anna's CGS convention).
// h  = 6.62607015e-27 erg·s
// c  = 2.99792458e10  cm/s
// kB = 1.380649e-16   erg/K
// σ  = 5.670374419e-5 erg/s/cm²/K⁴
// b  = 0.2897771955e0 cm·K  (Wien displacement constant)
// ──────────────────────────────────────────────────────────────

const TSUN = 5772; // K (IAU 2015 nominal solar effective temperature)

describe("nmToCm", () => {
  test("500 nm = 5e-5 cm", () => {
    expect(nmToCm(500)).toBeCloseTo(5e-5, 12);
  });
});

describe("wienPeakWavelengthCm", () => {
  test("Sun (5772 K) peaks at 502.0 nm", () => {
    const peakCm = wienPeakWavelengthCm(TSUN);
    expect(peakCm * 1e7).toBeCloseTo(502.0, 1);
  });

  test("Sirius A (~9940 K) peaks at 291.5 nm (UV)", () => {
    const peakCm = wienPeakWavelengthCm(9940);
    expect(peakCm * 1e7).toBeCloseTo(291.5, 1);
  });

  test("Cool M dwarf (3000 K) peaks at 966 nm (near-IR)", () => {
    const peakCm = wienPeakWavelengthCm(3000);
    expect(peakCm * 1e7).toBeCloseTo(965.9, 1);
  });

  test("λ_peak * T = b (Wien displacement constant in cm·K)", () => {
    for (const T of [2500, 5772, 10000, 30000]) {
      expect(wienPeakWavelengthCm(T) * T).toBeCloseTo(0.2898, 4);
    }
  });
});

describe("stefanBoltzmannFlux", () => {
  test("Sun (5772 K) emits 6.294e10 erg/s/cm² (Stefan-Boltzmann)", () => {
    // σ T_sun^4 = (5.670374419e-5)(5772)^4 = 6.294e10 erg/s/cm²
    const F = stefanBoltzmannFlux(TSUN);
    expect(F).toBeCloseTo(6.294e10, -7); // tolerance 1e7 (i.e., ±0.16%)
  });

  test("scales as T^4", () => {
    const F1 = stefanBoltzmannFlux(5000);
    const F2 = stefanBoltzmannFlux(10000);
    // F2/F1 should be 2^4 = 16
    expect(F2 / F1).toBeCloseTo(16, 4);
  });
});

describe("planckLambda (CGS, erg/s/cm²/sr/cm)", () => {
  test("is positive for any T > 0 and λ > 0", () => {
    for (const T of [1000, 5772, 30000]) {
      for (const lambdaNm of [50, 500, 5000]) {
        expect(planckLambda(T, nmToCm(lambdaNm))).toBeGreaterThan(0);
      }
    }
  });

  test("Sun at 502 nm: B_λ ≈ 2.6e14 erg/s/cm²/sr/cm (reference value)", () => {
    // Reference: NIST Planck calculator, T=5772 K, λ=502 nm.
    const B = planckLambda(TSUN, nmToCm(502));
    // The exact value is ~2.617e14; allow 5% tolerance for the
    // approximation in the reference itself.
    expect(B).toBeGreaterThan(2.4e14);
    expect(B).toBeLessThan(2.8e14);
  });

  test("higher T at the same λ gives equal or greater intensity in the Wien-side regime", () => {
    // At λ much shorter than the peak, Wien-side: hotter object always
    // radiates more (the exp suppresses both, but the prefactor wins).
    const lambdaCm = nmToCm(200); // UV, on Wien side for solar T
    expect(planckLambda(10000, lambdaCm)).toBeGreaterThan(
      planckLambda(5000, lambdaCm)
    );
  });

  test("Wien displacement: ∂B_λ/∂λ = 0 numerically at λ_peak", () => {
    // Verify the peak is where Planck says it should be: surround
    // λ_peak with a tiny δ and confirm B(peak) > B(peak ± δ).
    const T = 6000;
    const peakCm = wienPeakWavelengthCm(T);
    const delta = peakCm * 1e-4;
    const Bpeak = planckLambda(T, peakCm);
    const Bleft = planckLambda(T, peakCm - delta);
    const Bright = planckLambda(T, peakCm + delta);
    expect(Bpeak).toBeGreaterThan(Bleft);
    expect(Bpeak).toBeGreaterThan(Bright);
  });
});

describe("rayleighJeansLambda (long-wavelength limit, B ≈ 2c k_B T / λ⁴)", () => {
  test("agrees with full Planck within 2% at λ ≫ peak", () => {
    // At T=5772 and λ = 100 μm = 1e-2 cm, λ/λ_peak ≈ 200. RJ
    // convergence to Planck is order x/2 where x = hc/(λkT); at this
    // λ that's ~1.3%. The "ultraviolet catastrophe" framing rests on
    // RJ being asymptotically correct — *only* asymptotically.
    const lambdaCm = 1e-2;
    const exact = planckLambda(TSUN, lambdaCm);
    const rj = rayleighJeansLambda(TSUN, lambdaCm);
    const relErr = Math.abs(exact - rj) / exact;
    expect(relErr).toBeLessThan(0.02);
  });

  test("diverges from full Planck by >50% in the Wien regime", () => {
    // The infamous "ultraviolet catastrophe": Rayleigh-Jeans blows up
    // toward short wavelengths.
    const lambdaCm = nmToCm(200);
    const exact = planckLambda(TSUN, lambdaCm);
    const rj = rayleighJeansLambda(TSUN, lambdaCm);
    expect(rj / exact).toBeGreaterThan(1.5);
  });
});

describe("wienApproxLambda (short-wavelength limit, B ≈ 2hc²/λ⁵ · e^(-hc/λkT))", () => {
  test("agrees with full Planck within 1% at λ ≪ peak", () => {
    // For T=5772 K, λ = 100 nm is well into the Wien tail.
    const lambdaCm = nmToCm(100);
    const exact = planckLambda(TSUN, lambdaCm);
    const w = wienApproxLambda(TSUN, lambdaCm);
    const relErr = Math.abs(exact - w) / exact;
    expect(relErr).toBeLessThan(0.01);
  });

  test("diverges from full Planck by >5% in the Rayleigh-Jeans regime", () => {
    // At long λ the Wien approx underestimates because it drops the -1.
    const lambdaCm = 1e-3; // 10 μm — long compared to solar peak.
    const exact = planckLambda(TSUN, lambdaCm);
    const w = wienApproxLambda(TSUN, lambdaCm);
    const relErr = Math.abs(exact - w) / exact;
    expect(relErr).toBeGreaterThan(0.05);
  });
});
