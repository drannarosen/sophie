// Shared blackbody physics utilities, package-scoped at the
// `_physics/` location so multiple figure components consume the
// same math without per-component duplication. First consumer:
// `figures/BlackbodyExplorer`. Roadmap consumers: `SpectralLineExplorer`,
// `HRDiagramExplorer` (audit doc 2026-05-25-sophie-sota-audit.md
// Phase D).
//
// CGS physical constants (Anna's global units convention per
// AGENTS.md). Sourced from NIST CODATA 2018.

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

// ──────────────────────────────────────────────────────────────
// Chromaticity — temperature → sRGB swatch
// ──────────────────────────────────────────────────────────────

/**
 * Approximate sRGB color for an ideal blackbody at temperature T.
 *
 * Uses Tanner Helland's published polynomial fit (calibrated against
 * Mitchell Charity's reference blackbody chromaticity table); not a
 * full CIE XYZ → sRGB pipeline. Accuracy is well within "visually
 * correct" for pedagogical use over the stellar range 1000–50000 K.
 *
 * Used only for the chromaticity-preview swatch on the blackbody
 * spectrum figure (epistemic role: `observable` — what eyes would
 * actually see). NOT used for any scientific computation.
 */
function clamp(x: number, lo: number, hi: number): number {
  return Math.min(Math.max(x, lo), hi);
}

export interface SrgbColor {
  r: number; // 0-255
  g: number;
  b: number;
}

export function blackbodyToSrgb(T_K: number): SrgbColor {
  const temp = Math.max(T_K, 500) / 100;

  let r: number;
  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592;
  }

  let g: number;
  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    g = 288.1221695283 * (temp - 60) ** -0.0755148492;
  }

  let b: number;
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  return {
    r: Math.round(clamp(r, 0, 255)),
    g: Math.round(clamp(g, 0, 255)),
    b: Math.round(clamp(b, 0, 255)),
  };
}

// ──────────────────────────────────────────────────────────────
// MK spectral classification — temperature → spectral type
// ──────────────────────────────────────────────────────────────

/**
 * MK spectral classification from effective temperature (CGS K).
 *
 * Uses standard textbook temperature ranges for main-sequence stars.
 * Subclass digits 0–9 go from hot (0) to cool (9) within each class.
 *
 * Epistemic role on the figure: `inference` — the classification is
 * inferred from the underlying observable (the spectrum peak).
 */
interface ClassBand {
  letter: string;
  tMin: number; // K — coolest within this class
  tMax: number; // K — hottest within this class
}

// Order matters only for documentation; lookup is band-by-band.
const BANDS: readonly ClassBand[] = [
  { letter: "L", tMin: 1300, tMax: 2300 }, // brown-dwarf overlap
  { letter: "M", tMin: 2300, tMax: 3700 },
  { letter: "K", tMin: 3700, tMax: 5200 },
  { letter: "G", tMin: 5200, tMax: 6000 },
  { letter: "F", tMin: 6000, tMax: 7500 },
  { letter: "A", tMin: 7500, tMax: 10000 },
  { letter: "B", tMin: 10000, tMax: 30000 },
  { letter: "O", tMin: 30000, tMax: 50000 },
];

export function spectralClassification(T_K: number): string {
  // Find the band that contains T (T_K may be exactly on a boundary;
  // by convention, the cooler band wins so the Sun (5772 K) — which
  // is the canonical G2V — stays in G even as the boundaries shift.
  let band: ClassBand | undefined;
  for (const candidate of BANDS) {
    if (T_K >= candidate.tMin && T_K < candidate.tMax) {
      band = candidate;
      break;
    }
  }

  if (!band) {
    // Below L-cool or above O-hot: clamp to nearest band.
    band = T_K < (BANDS[0]?.tMin ?? 0) ? BANDS[0] : BANDS[BANDS.length - 1];
  }

  if (!band) return "?"; // unreachable; satisfies TS

  // Subclass: 0 = top of band (hottest), 9 = bottom (coolest).
  const tSpan = band.tMax - band.tMin;
  const fromTop = band.tMax - T_K;
  const subclassRaw = Math.floor((fromTop / tSpan) * 10);
  const subclass = Math.min(Math.max(subclassRaw, 0), 9);
  return `${band.letter}${subclass}`;
}
