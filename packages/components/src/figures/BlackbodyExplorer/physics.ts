// CGS physical constants (Anna's global units convention).
// Sourced from NIST CODATA 2018.

const H_CGS = 6.62607015e-27; //   erg·s          Planck constant
const C_CGS = 2.99792458e10; //    cm/s           Speed of light
const KB_CGS = 1.380649e-16; //    erg/K          Boltzmann constant
const SIGMA_CGS = 5.670374419e-5; // erg/s/cm²/K⁴  Stefan-Boltzmann constant
const WIEN_B_CGS = 0.2897771955; // cm·K          Wien displacement constant

/** 1 nm = 1e-7 cm. */
export function nmToCm(nm: number): number {
  return nm * 1e-7;
}

/** Wien displacement: λ_peak = b / T (CGS; result in cm). */
export function wienPeakWavelengthCm(T_K: number): number {
  return WIEN_B_CGS / T_K;
}

/**
 * Total radiant flux from a blackbody surface (Stefan-Boltzmann):
 * F = σ T⁴ (CGS; result in erg/s/cm²).
 */
export function stefanBoltzmannFlux(T_K: number): number {
  return SIGMA_CGS * T_K * T_K * T_K * T_K;
}

/**
 * Spectral radiance per wavelength (Planck function):
 *
 *   B_λ(T) = (2 h c² / λ⁵) · 1 / (e^(hc/λkT) − 1)
 *
 * CGS units throughout: λ in cm, T in K, result in erg/s/cm²/sr/cm.
 *
 * For numerical safety in the deep Wien tail (large exponent), the
 * subtraction `e^x − 1` is replaced by `e^x` (the −1 is negligible);
 * for very small exponent (deep Rayleigh-Jeans), the Math.expm1
 * branch keeps accuracy.
 */
export function planckLambda(T_K: number, lambdaCm: number): number {
  const x = (H_CGS * C_CGS) / (lambdaCm * KB_CGS * T_K);
  const prefactor = (2 * H_CGS * C_CGS * C_CGS) / lambdaCm ** 5;
  // expm1(x) = e^x − 1 with full precision near x ≈ 0;
  // for very large x, expm1 saturates at +∞ which is fine.
  return prefactor / Math.expm1(x);
}

/**
 * Long-wavelength (low-frequency) limit of the Planck law:
 *
 *   B_λ ≈ 2 c k_B T / λ⁴
 *
 * Diverges toward short wavelength — the "ultraviolet catastrophe"
 * that motivated quantum theory.
 */
export function rayleighJeansLambda(T_K: number, lambdaCm: number): number {
  return (2 * C_CGS * KB_CGS * T_K) / lambdaCm ** 4;
}

/**
 * Short-wavelength (high-frequency) limit of the Planck law:
 *
 *   B_λ ≈ (2 h c² / λ⁵) · e^(−hc/λkT)
 *
 * Drops the −1 from the Bose-Einstein denominator. Accurate for
 * λ ≪ λ_peak; under-predicts for λ ≫ λ_peak.
 */
export function wienApproxLambda(T_K: number, lambdaCm: number): number {
  const x = (H_CGS * C_CGS) / (lambdaCm * KB_CGS * T_K);
  const prefactor = (2 * H_CGS * C_CGS * C_CGS) / lambdaCm ** 5;
  return prefactor * Math.exp(-x);
}
