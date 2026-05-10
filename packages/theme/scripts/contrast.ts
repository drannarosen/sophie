function parseHex(hex: string): [number, number, number] {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) throw new Error(`Expected #rrggbb, got ${hex}`);
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN))
    throw new Error(`Invalid hex digits in ${hex}`);
  return [r, g, b];
}

function srgbLinear(c: number): number {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : ((cs + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * srgbLinear(r) + 0.7152 * srgbLinear(g) + 0.0722 * srgbLinear(b)
  );
}

export function contrastRatio(fg: string, bg: string): number {
  const lf = relativeLuminance(fg);
  const lb = relativeLuminance(bg);
  const [lighter, darker] = lf > lb ? [lf, lb] : [lb, lf];
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastCheck {
  label: string;
  fg: string;
  bg: string;
  ratio: number;
  passesAA: boolean;
}

export function checkContrast(
  label: string,
  fg: string,
  bg: string
): ContrastCheck {
  const ratio = contrastRatio(fg, bg);
  return { label, fg, bg, ratio, passesAA: ratio >= 4.5 };
}
