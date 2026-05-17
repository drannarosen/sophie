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
