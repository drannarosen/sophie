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

// Asymmetric heading margins per visual-polish-target.md (MyST-restrained-
// academic). Tight bottom-margins couple a heading to its following
// paragraph ("the heading owns the next paragraph"); generous top-margins
// signal section breaks. Values are em-relative so they scale with the
// heading's own font-size. Per-component opt-in via the new
// `--sophie-heading-{h1,h2,h3}-margin-{top,bottom}` tokens lands in step G
// when component chrome rebuilds consume them; PR-3 emits only the slots.
export const headings = {
  h1: { marginTop: "0", marginBottom: "0.45em" },
  h2: { marginTop: "1.75em", marginBottom: "0.4em" },
  h3: { marginTop: "1.25em", marginBottom: "0.3em" },
} as const;

// Tier 1 (card-strong) vs Tier 2 (card-light) left-rule width per the
// three-tier model. 4px Tier 1 reads as "elevated, durable, named
// concept" (paired with the drop shadow); 3px Tier 2 reads as "signal,
// ephemeral" (no shadow). Per-component opt-in lands in step G; PR-4
// emits the slots so the rebuilds can consume them by name.
export const cardRules = {
  strong: "4px",
  light: "3px",
} as const;

// Per-callout-variant title-bar background tints. Each entry names the
// accent CSS variable (the `--sophie-*` slot, without the `var(...)`
// wrapper) and the percent-tint to mix into surface-1 for the title-bar
// background. Tints are tuned per variant — `caution` rides lighter
// than `warning` (same amber accent, half the tint) so the two read as
// distinct emphasis levels of the same signal family. `summary` and
// `roadmap` use neutral because they're structural chrome, not
// pedagogically rare moments.
export const calloutTitleBg = {
  info: { accent: "status-info", tintPct: 8 },
  tip: { accent: "status-success", tintPct: 8 },
  warning: { accent: "status-warning", tintPct: 8 },
  caution: { accent: "status-warning", tintPct: 4 },
  danger: { accent: "status-danger", tintPct: 8 },
  "key-insight": { accent: "brand-teal", tintPct: 8 },
  misconception: { accent: "brand-rose", tintPct: 8 },
  definition: { accent: "brand-violet", tintPct: 8 },
  summary: { accent: "status-neutral", tintPct: 8 },
  roadmap: { accent: "status-neutral", tintPct: 8 },
} as const;
