export const anchors = {
  // Warm near-black body-ink (Tailwind Stone 900). Shifted from the
  // earlier cool `#0f1115` so light-mode prose reads "ink on paper"
  // rather than "text on screen." Sprint B palette warmth pass.
  ink: "#1c1917",
  // Neutral light-gray page substrate (Tailwind Neutral 50, tweaked
  // half a step cooler). Sprint K revision — Anna's design call: the
  // previous warm `#fafaf7` (Stone 50) read as cream/beige and clashed
  // with the cool teal accent; this neutral off-white reads as "fresh
  // paper" without the academic-book warmth. Pairs with the (still
  // slightly warm) Stone surface-1/2/3 stack — the body bg dominates
  // the visual temperature, so the subtle stone surfaces no longer
  // tip the page toward beige.
  paper: "#f7f7f8",
  // Dark-mode page substrate. Warm-dark Stone 900 (replaces the
  // earlier cool `#111827`) so dark mode reads as charcoal-with-
  // parchment rather than navy. Surfaces above derive from it via
  // color-mix percentages tuned to land at Stone 800/700/600.
  darkBg: "#1c1917",
} as const;

// Hardcoded light-mode surface stack. Overrides the symmetric color-mix
// derivation in generate-css.ts so cards render as pure white on the
// stone-50 page — the derivation off `paper` produced over-tinted
// surface-1. Stone palette throughout for warmth.
export const lightSurfaces = {
  surface1: "#ffffff",
  surface2: "#f5f5f4",
  surface3: "#e7e5e4",
  border: "#e7e5e4",
  borderSubtle: "#f5f5f4",
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

// Epistemic-role color slots for interactive figures (Tier-1+ category).
// Sprint B revision — aligned to the brand teal/violet/rose palette so
// role coloring becomes Sophie's visual signature (something MyST has
// no equivalent of, per design review 2026-05-20):
//
//   observable -> brand-teal hue   (primary brand = "what we see")
//   model      -> brand-violet hue (theory/abstraction)
//   inference  -> brand-rose hue   (the conclusion the chain lands on)
//   approximation -> warm stone    (neutral, "less precise")
//
// Each entry pairs a light-mode and dark-mode oklch value. Light values
// hit ~45-55% L for prose-color use; dark values hit ~75-85% L for
// legibility against surface-1 (Stone 800). Chroma kept moderate (0.10-
// 0.14) so the roles read as named colors, not as decorative gradients.
export const role = {
  observable: { light: "oklch(50% 0.085 195)", dark: "oklch(80% 0.085 195)" },
  model: { light: "oklch(50% 0.10 295)", dark: "oklch(80% 0.10 295)" },
  inference: { light: "oklch(55% 0.13 0)", dark: "oklch(80% 0.13 0)" },
  approximation: { light: "oklch(60% 0.025 60)", dark: "oklch(80% 0.025 60)" },
} as const;

// Reserved cross-reference / citation accent — plum. Used ONLY for
// scholarly references: figure numbers (Fig. 1.2), equation numbers
// (Eq. 3), section refs (§3.2), <GlossaryTerm> hover targets, citation
// chips. Never used for body, chrome, or epistemic roles. Plum sits at
// the chromatic midpoint between brand-rose (hue ~10) and brand-violet
// (hue ~295) — hue 325 places it inside the brand family while staying
// visually distinct from both rose-inference and violet-model.
//
// Why plum and not orange: avoids collision with MyST's brand and with
// Anthropic/Claude brand; carries the visited-link / academic-ink
// tradition; warm enough to feel "book," cool enough to feel "academic."
export const cite = {
  light: "oklch(45% 0.16 325)",
  dark: "oklch(75% 0.16 325)",
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

// Self-hosted typeface family. Body + UI chrome use IBM Plex Sans
// (the `Variable` suffix matches the @fontsource-variable package's
// family name; the static `"IBM Plex Sans"` fallback covers consumers
// that opt into the non-variable @fontsource package). Display serif
// for h1/h2 + occasional emphasis uses Fraunces — a beautiful variable
// font with optical-size and SOFT axes that gives Sophie's headings
// a distinct editorial voice without committing the body to serif.
// KaTeX math keeps its bundled Computer Modern fonts (separate stack,
// no dependency on --sophie-font-*).
export const fontStacks = {
  sans: '"IBM Plex Sans Variable", "IBM Plex Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif:
    '"Fraunces Variable", "Fraunces", "Source Serif 4 Variable", "Source Serif Pro", "Iowan Old Style", Charter, ui-serif, Georgia, "Times New Roman", serif',
  mono: '"IBM Plex Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

// `base` stays at 16px for UI chrome (small labels, meta strips, button
// text). `body` is a distinct prose-reading slot at 17px per the
// visual-polish-target's MyST-restrained-academic spacing. Two slots,
// two roles — opt-in usage per component lands in step G (component
// rebuilds), not here.
export const sizes = {
  pill: "0.6875rem",
  xs: "0.75rem",
  // `tiny` and `small` are semantic aliases (xs / sm) used by the
  // marginalia voice: docked asides, callout titles, breadcrumbs,
  // status chips, ChapterTitle subtitle. They lived as bare
  // `var(--sophie-text-{tiny,small})` references in component CSS
  // without ever being emitted — declarations silently dropped,
  // those slots inherited body-prose size. 2026-05-21 fix: emit
  // them so the original code intent renders.
  tiny: "0.75rem",
  sm: "0.875rem",
  small: "0.875rem",
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
  half: "0.125rem",
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

// Tier-3 biography-child label-bar tints (PR-B P1-2; Phase B audit §2.8).
// Each EquationBiography child (<Observable>, <Assumption>, <BreaksWhen>,
// <CommonMisuse>) renders as a Tier-3 card with a subtle label-bar tint
// on top. The chrome itself is structurally shared via
// `packages/components/src/components/_shared/Tier3Card.module.css`;
// this map defines the per-variant accent + mix percentage so the
// generator emits one `--sophie-tier3-<variant>-label-bg` CSS var per
// variant — each biography component rebinds `--sophie-tier3-label-bg`
// at its root to point at its variant's slot.
//
// Shape mirrors `calloutTitleBg` but with a single `tintPct` (not split
// light/dark). The pre-DRY-refactor stylesheets used a single percentage
// across both schemes; preserving that here keeps PR-B a pure DRY
// refactor with zero visual change. If dark-mode tint legibility ever
// reads off, split into `{tintPctLight, tintPctDark}` per the
// calloutTitleBg precedent (+4 on dark) in a follow-on visual-polish PR.
//
// Mix base is `surface-2` (not `surface-1` like callouts) — Tier-3
// cards sit on the muted secondary surface, never on the page bg.
//
// Observable + Assumption both bind to brand-violet because they share
// the epistemic-role family with KeyEquation's Tier-1 chrome (which
// also uses brand-violet); BreaksWhen + CommonMisuse bind to
// status-warning + status-danger to signal validity-limit + misuse
// without promoting to a full warning/danger callout.
export const tier3LabelBg = {
  observable: { accent: "brand-violet", tintPct: 6 },
  assumption: { accent: "brand-violet", tintPct: 6 },
  "breaks-when": { accent: "status-warning", tintPct: 8 },
  "common-misuse": { accent: "status-danger", tintPct: 8 },
  // DerivationStep per ADR 0046 §R9 / ADR 0060: shares Observable +
  // Assumption's brand-violet at 6% because the derivation IS part of
  // the model-construction family epistemically (role: "model").
  "derivation-step": { accent: "brand-violet", tintPct: 6 },
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
