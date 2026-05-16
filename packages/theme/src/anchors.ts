export const anchors = {
  ink: "#0f1115",
  paper: "#f9fafb",
} as const;

// Hardcoded light-mode surface stack. Overrides the symmetric color-mix
// derivation in generate-css.ts so cards render as pure white on the
// gray-50 page (per visual-polish-target.md). Dark-mode keeps the
// symmetric derivation off the cool paper anchor — a dedicated
// dark-mode surface stack ships in a later sweep (audit § Section 5).
export const lightSurfaces = {
  surface1: "#ffffff",
  surface2: "#f3f4f6",
  surface3: "#e5e7eb",
  border: "#e5e7eb",
  borderSubtle: "#f3f4f6",
} as const;

// Text color used on saturated brand/status accent backgrounds.
// White reads AA-clear on all current accent fills.
export const textOnAccent = "#ffffff" as const;

export const brand = {
  teal: { fill: "#2f8c8d", text: "#1f6f70" },
  rose: { fill: "#b07a93", text: "#8c5a73" },
  violet: { fill: "#6d7794", text: "#515a7a" },
} as const;

export const status = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#fb7185",
  // True blue. Was `#2f8c8d` (a brand-teal duplicate). The visual-polish
  // target's brand-vs-status split requires info to be visually distinct
  // from brand-teal: brand reserved for durable pedagogical concepts,
  // status for ephemeral signals. `neutral` continues to key off body
  // text via color-mix in generate-css.ts.
  info: "#2563eb",
  neutral: "#6b7280",
} as const;

// Self-hosted IBM Plex family (per visual-polish-target.md). The
// `Variable` suffix on the first sans candidate matches the
// @fontsource-variable package's actual family name; the static
// `"IBM Plex Sans"` fallback covers any consumer that opts into the
// non-variable @fontsource package. Plex Serif is intentionally absent
// — the v1 visual target commits to a sans body. KaTeX math keeps its
// bundled Computer Modern fonts (separate stack, no dependency on
// --sophie-font-*).
export const fontStacks = {
  sans: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

// `base` stays at 16px for UI chrome (small labels, meta strips, button
// text). `body` is a distinct prose-reading slot at 17px per the
// visual-polish-target's MyST-restrained-academic spacing. Two slots,
// two roles — opt-in usage per component lands in step G (component
// rebuilds), not here.
export const sizes = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
  body: "1.0625rem",
  md: "1.125rem",
  lg: "1.25rem",
  xl: "1.5rem",
  "2xl": "1.875rem",
  "3xl": "2.25rem",
  "4xl": "3rem",
} as const;

export const leadings = {
  tight: "1.25",
  prose: "1.65",
} as const;

export const weights = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const spacings = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.5rem",
  6: "2rem",
  8: "3rem",
  10: "4rem",
} as const;

export const radii = {
  sm: "0.3125rem",
  md: "0.625rem",
  lg: "0.875rem",
  full: "9999px",
} as const;

export const layout = {
  proseMaxWidth: "66ch",
  contentPaddingInline: "clamp(1rem, 4vw, 1.5rem)",
} as const;

export const focus = {
  width: "2px",
} as const;
