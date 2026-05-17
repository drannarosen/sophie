export const anchors = {
  ink: "#0f1115",
  paper: "#f9fafb",
  // Dark-mode page substrate. Decoupled from `ink` because `ink` is
  // semantically the light-mode body-text color — different role that
  // happens to share a near-black hex. `darkBg` is the soft-dark page
  // (Tailwind gray-900) per dark-mode-palette.md; surfaces above derive
  // from it via color-mix percentages tuned to land at gray-800/700/600.
  darkBg: "#111827",
} as const;

// Hardcoded light-mode surface stack. Overrides the symmetric color-mix
// derivation in generate-css.ts so cards render as pure white on the
// gray-50 page (per visual-polish-target.md) — the derivation off the
// `paper` anchor produced gray-200-ish surface-1, not the pure white
// the spec wanted. Hardcoding here is a visual correction, not a design
// principle: dark-mode surfaces stay derivation-based against the new
// `darkBg` anchor (per dark-mode-palette.md).
export const lightSurfaces = {
  surface1: "#ffffff",
  surface2: "#f3f4f6",
  surface3: "#e5e7eb",
  border: "#e5e7eb",
  borderSubtle: "#f3f4f6",
} as const;

// Dark-mode surface derivation percentages. Each entry mixes `darkBg`
// with `paper` in OKLCH to lift luminance step-by-step. Starting values
// chosen to land near the Tailwind gray-800/700/600 stack named in
// dark-mode-palette.md; tune per VR review (PR-2/3) if a surface reads
// off. `border` and `borderSubtle` invert the derivation (mix `paper`
// into `darkBg`) so the border reads as a lighter "highlight ring"
// against the card body — standard dark-mode card-elevation language.
export const darkSurfacesMix = {
  surface1: 87,
  surface2: 72,
  surface3: 60,
  border: 12,
  borderSubtle: 6,
} as const;

// Text color used on saturated brand/status accent backgrounds.
// White reads AA-clear on all current accent fills.
export const textOnAccent = "#ffffff" as const;

export const brand = {
  teal: { fill: "#2f8c8d", text: "#1f6f70" },
  rose: { fill: "#b07a93", text: "#8c5a73" },
  violet: { fill: "#6d7794", text: "#515a7a" },
} as const;

// Dark-mode brand palette. Lighter fills (Tailwind-300 family) for
// visibility against surface-1 = gray-800; lighter title-bar text
// (Tailwind-200 family) for legibility on the dark-tinted title bar
// (color-mix(accent 12%, gray-800)). Brand-violet stays desaturated —
// lifting L in OKLCH while holding hue+chroma keeps the slate-like
// brand identity; adding saturation would shift slate → indigo.
// Per dark-mode-palette.md "Brand and status luminance".
export const darkBrand = {
  teal: { fill: "#5eead4", text: "#99f6e4" },
  rose: { fill: "#fda4af", text: "#fecdd3" },
  violet: { fill: "#a3acc7", text: "#cbd0dc" },
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

// Dark-mode status overrides. success/warning/danger sit comfortably
// above 3:1 non-text-contrast on gray-900; info (true blue) and neutral
// (gray-500) slide below it — lifted to Tailwind blue-400 and gray-400
// for 7:1 contrast. Per dark-mode-palette.md "Status colors" table.
export const darkStatus = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#fb7185",
  info: "#60a5fa",
  neutral: "#9ca3af",
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
// wrapper) and per-mode percent-tints to mix into surface-1 for the
// title-bar background. `caution` rides lighter than `warning` (same
// amber accent, half the tint) so the two read as distinct emphasis
// levels of the same signal family. `summary` and `roadmap` use
// neutral because they're structural chrome, not pedagogically rare
// moments.
//
// `tintPctDark` lands +4 above `tintPctLight` because OKLCH mixing
// against a darker substrate (gray-800) absorbs chroma differently
// than against pure white — the symmetric percentage produces "barely
// tinted gray" in dark. Tune per VR review (PR-2/3) if any reads off.
// Per dark-mode-palette.md "Callout title-bar tints".
export const calloutTitleBg = {
  info: { accent: "status-info", tintPctLight: 8, tintPctDark: 12 },
  tip: { accent: "status-success", tintPctLight: 8, tintPctDark: 12 },
  warning: { accent: "status-warning", tintPctLight: 8, tintPctDark: 12 },
  caution: { accent: "status-warning", tintPctLight: 4, tintPctDark: 6 },
  danger: { accent: "status-danger", tintPctLight: 8, tintPctDark: 12 },
  "key-insight": { accent: "brand-teal", tintPctLight: 8, tintPctDark: 12 },
  misconception: { accent: "brand-rose", tintPctLight: 8, tintPctDark: 12 },
  definition: { accent: "brand-violet", tintPctLight: 8, tintPctDark: 12 },
  summary: { accent: "status-neutral", tintPctLight: 8, tintPctDark: 12 },
  roadmap: { accent: "status-neutral", tintPctLight: 8, tintPctDark: 12 },
} as const;

// Validation tracker tint percentages (ADR 0056). Stripes reuse the
// semantic status palette directly; backgrounds derive `tintPct%`-tinted
// surfaces via color-mix on `transparent` so admonitions read as subtle
// wash rather than saturated alert. `tintPctDark` lifts +4 to compensate
// for the lower-luminance substrate (gray-800/900) — same logic as
// `calloutTitleBg`. Per dark-mode-palette.md "Validation tracker tints".
export const validationTints = {
  unvalidated: {
    stripe: "status-neutral",
    tintPctLight: 6,
    tintPctDark: 10,
  },
  "in-progress": {
    stripe: "status-info",
    tintPctLight: 6,
    tintPctDark: 10,
  },
  validated: {
    stripe: "status-success",
    tintPctLight: 6,
    tintPctDark: 10,
  },
  "re-validation-needed": {
    stripe: "status-warning",
    tintPctLight: 6,
    tintPctDark: 10,
  },
} as const;
