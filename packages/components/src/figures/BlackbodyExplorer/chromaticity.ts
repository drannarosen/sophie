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
