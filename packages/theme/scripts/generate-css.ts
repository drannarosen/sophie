import {
  anchors,
  brand,
  calloutTitleBg,
  cardRules,
  cite,
  darkBrand,
  darkStatus,
  darkSurfacesMix,
  focus,
  fontStacks,
  headings,
  layout,
  leadings,
  lightSurfaces,
  radii,
  retrievalBands,
  role,
  sizes,
  spacings,
  status,
  textOnAccent,
  tier3LabelBg,
  validationTints,
  weights,
} from "../src/anchors.ts";

type Scheme = "light" | "dark";

// Surface + text + shadow declarations per scheme.
//
// Light mode: hardcoded `lightSurfaces` (visual correction — the symmetric
// derivation against `paper` produced gray-200-ish surface-1, not the pure
// white the visual-polish-target requires).
//
// Dark mode: derivation-based against the `darkBg` anchor (Tailwind gray-900
// in dark-mode-palette.md). Percentages in `darkSurfacesMix` are tuned to
// land near the gray-800/700/600 stack; `border` and `borderSubtle` invert
// the derivation (mix `paper` into transparent) so the border reads as a
// lighter highlight ring against the card body — standard dark-mode card-
// elevation language.
//
// Shadow: scheme-tinted derivation in light mode keeps cards softly lifted
// off the gray-50 page. In dark, the shadow color and page bg would sit
// within ~3% luminance of each other; the shadow has nothing to land on.
// Per dark-mode-palette.md "Card elevation in Tier 1": resolve to `none`
// in dark and let the highlight-ring border do the elevation work.
function colorBlock(scheme: Scheme): string {
  const bg = scheme === "light" ? anchors.paper : anchors.darkBg;
  const fg = scheme === "light" ? anchors.ink : anchors.paper;

  const surfaces =
    scheme === "light"
      ? [
          `--sophie-surface-1: ${lightSurfaces.surface1};`,
          `--sophie-surface-2: ${lightSurfaces.surface2};`,
          `--sophie-surface-3: ${lightSurfaces.surface3};`,
          `--sophie-border: ${lightSurfaces.border};`,
          `--sophie-border-subtle: ${lightSurfaces.borderSubtle};`,
        ]
      : [
          `--sophie-surface-1: color-mix(in oklch, ${bg} ${darkSurfacesMix.surface1}%, ${fg});`,
          `--sophie-surface-2: color-mix(in oklch, ${bg} ${darkSurfacesMix.surface2}%, ${fg});`,
          `--sophie-surface-3: color-mix(in oklch, ${bg} ${darkSurfacesMix.surface3}%, ${fg});`,
          `--sophie-border: color-mix(in oklch, ${fg} ${darkSurfacesMix.border}%, transparent);`,
          `--sophie-border-subtle: color-mix(in oklch, ${fg} ${darkSurfacesMix.borderSubtle}%, transparent);`,
        ];

  const shadow =
    scheme === "light"
      ? [
          // Scheme-tinted card shadow keeps Tier 1 lifted off the gray-50
          // page. 4% concentration matches the original visual.
          `--sophie-shadow-card: 0 1px 3px color-mix(in oklch, ${fg} 4%, transparent);`,
        ]
      : [
          // Dark mode: shadow color ≈ page bg, so shadows are visually
          // inert. Elevation comes from the border-as-highlight ring +
          // 4px-vs-3px rule width (dark-mode-palette.md § Card elevation).
          "--sophie-shadow-card: none;",
        ];

  return [
    `--sophie-bg: ${bg};`,
    ...surfaces,
    `--sophie-text: color-mix(in oklch, ${fg} 88%, ${bg});`,
    `--sophie-text-2: color-mix(in oklch, ${fg} 64%, ${bg});`,
    `--sophie-text-muted: color-mix(in oklch, ${fg} 46%, ${bg});`,
    `--sophie-text-faint: color-mix(in oklch, ${fg} 32%, ${bg});`,
    // Body link color derives from the cite accent (plum), not the
    // brand-teal accent — Sprint B chose plum as the scholarly cross-
    // reference voice. Brand-teal stays for chrome (buttons, focus
    // rings, badges); body links + GlossaryTerm + FigureRef + EquationRef
    // pick up the cite hue via this derivation.
    `--sophie-link: color-mix(in oklch, var(--sophie-cite) 70%, var(--sophie-text));`,
    // Modal backdrop. Derived from ${fg} so it stays visible against the
    // scheme-appropriate surface — ink-tinted overlay in light mode,
    // paper-tinted in dark mode.
    `--sophie-overlay-bg: color-mix(in oklch, ${fg} 50%, transparent);`,
    ...shadow,
    // Popover shadow stays scheme-tinted in both modes — popover surfaces
    // are Tier-1 chrome (FigureRef / EquationRef / GlossaryTerm cards) and need
    // *some* lift; in dark they sit on `surface-1` rather than the page,
    // so a paper-tinted shadow remains visible.
    `--sophie-shadow-popover: 0 4px 12px color-mix(in oklch, ${fg} 12%, transparent);`,
  ].join("\n    ");
}

// Brand + status per scheme. Light uses the values designed against pure
// white cards (`brand`/`status`); dark uses the lifted-luminance values
// designed against gray-800 cards (`darkBrand`/`darkStatus`). Per dark-
// mode-palette.md "Brand and status luminance".
function brandStatusBlock(scheme: Scheme): string {
  const b = scheme === "light" ? brand : darkBrand;
  const s = scheme === "light" ? status : darkStatus;
  return [
    `--sophie-brand-teal: ${b.teal.fill};`,
    `--sophie-brand-teal-text: ${b.teal.text};`,
    `--sophie-brand-rose: ${b.rose.fill};`,
    `--sophie-brand-rose-text: ${b.rose.text};`,
    `--sophie-brand-violet: ${b.violet.fill};`,
    `--sophie-brand-violet-text: ${b.violet.text};`,
    `--sophie-status-success: ${s.success};`,
    `--sophie-status-warning: ${s.warning};`,
    `--sophie-status-danger: ${s.danger};`,
    `--sophie-status-info: ${s.info};`,
    `--sophie-status-neutral: ${s.neutral};`,
  ].join("\n    ");
}

// Epistemic-role color slots per scheme. Iterates the `role` map in
// anchors.ts so new entries (model / inference / approximation) appear
// in :root and [data-theme="dark"] without changes to this generator.
function roleBlock(scheme: Scheme): string {
  return Object.entries(role)
    .map(([name, variants]) => `--sophie-role-${name}: ${variants[scheme]};`)
    .join("\n    ");
}

// Retrieval-family left-band slots per scheme (Wedge B1). Iterates the
// `retrievalBands` map so new entries — if a future wedge adds a fourth
// retrieval-family component — appear automatically in both schemes.
// Emits e.g. `--sophie-retrieval-band` / `--sophie-spaced-band` /
// `--sophie-skill-band`; the CSS Modules in <RetrievalCard> consume
// the slot by name (set as `--card-band-color` at component root).
function retrievalBandsBlock(scheme: Scheme): string {
  return Object.entries(retrievalBands)
    .map(([name, variants]) => `--sophie-${name}-band: ${variants[scheme]};`)
    .join("\n    ");
}

// Cross-reference / citation accent — plum, scheme-aware. Reserved
// exclusively for scholarly cross-references (Fig. 1.2, Eq. 3, §3.2,
// <GlossaryTerm> hover targets, citation chips). Never used for body,
// chrome, or epistemic roles. Sprint B addition.
function citeBlock(scheme: Scheme): string {
  return [
    `--sophie-cite: ${cite[scheme]};`,
    `--sophie-cite-hover: color-mix(in oklch, var(--sophie-cite) 80%, var(--sophie-text));`,
  ].join("\n    ");
}

// Truly mode-invariant utilities. Accent alias, link-hover alias, and
// text-on-accent (white reads AA-clear on every brand/status fill in
// both schemes).
function invariantUtilitiesBlock(): string {
  return [
    "--sophie-accent: var(--sophie-brand-teal);",
    "--sophie-link-hover: var(--sophie-accent);",
    `--sophie-text-on-accent: ${textOnAccent};`,
  ].join("\n  ");
}

function typographyBlock(): string {
  return [
    `--sophie-font-sans: ${fontStacks.sans};`,
    `--sophie-font-serif: ${fontStacks.serif};`,
    `--sophie-font-mono: ${fontStacks.mono};`,
    ...Object.entries(sizes).map(([k, v]) => `--sophie-text-${k}: ${v};`),
    `--sophie-leading-tight: ${leadings.tight};`,
    `--sophie-leading-prose: ${leadings.prose};`,
    ...Object.entries(weights).map(([k, v]) => `--sophie-weight-${k}: ${v};`),
  ].join("\n  ");
}

function spacingBlock(): string {
  return Object.entries(spacings)
    .map(([k, v]) => `--sophie-space-${k}: ${v};`)
    .join("\n  ");
}

function radiiBlock(): string {
  return Object.entries(radii)
    .map(([k, v]) => `--sophie-radius-${k}: ${v};`)
    .join("\n  ");
}

function layoutBlock(): string {
  return [
    `--sophie-prose-max-width: ${layout.proseMaxWidth};`,
    `--sophie-content-padding-inline: ${layout.contentPaddingInline};`,
  ].join("\n  ");
}

function focusBlock(): string {
  return [
    `--sophie-focus-width: ${focus.width};`,
    "--sophie-focus-color: color-mix(in oklch, var(--sophie-accent) 55%, transparent);",
  ].join("\n  ");
}

function headingsBlock(): string {
  return Object.entries(headings)
    .flatMap(([level, m]) => [
      `--sophie-heading-${level}-margin-top: ${m.marginTop};`,
      `--sophie-heading-${level}-margin-bottom: ${m.marginBottom};`,
    ])
    .join("\n  ");
}

function cardRulesBlock(): string {
  return Object.entries(cardRules)
    .map(([k, v]) => `--sophie-card-rule-${k}: ${v};`)
    .join("\n  ");
}

// Per-variant callout title-bar tints. Each derives from the variant's
// accent color and surface-1 via color-mix(in oklch, …). `tintPctDark`
// lifts +4 over `tintPctLight` so the tint reads as recognizable on the
// darker substrate — symmetric percentages would produce "barely tinted
// gray" in dark. Per dark-mode-palette.md "Callout title-bar tints".
function calloutTitleBgBlock(scheme: Scheme): string {
  return Object.entries(calloutTitleBg)
    .map(([variant, { accent, tintPctLight, tintPctDark }]) => {
      const pct = scheme === "light" ? tintPctLight : tintPctDark;
      return `--sophie-callout-${variant}-title-bg: color-mix(in oklch, var(--sophie-${accent}) ${pct}%, var(--sophie-surface-1));`;
    })
    .join("\n    ");
}

// Tier-3 biography-child label-bar tints (PR-B P1-2 / Phase B audit §2.8).
// One CSS var per variant, scheme-invariant (single `tintPct` per
// variant in `anchors.tier3LabelBg` — preserves pre-refactor behavior;
// see anchors.ts header comment for the rationale). Mix base is
// `surface-2` (not `surface-1`) because Tier-3 cards sit on the muted
// secondary surface. Each biography component rebinds
// `--sophie-tier3-label-bg` at its root to its variant slot here.
function tier3LabelBgBlock(): string {
  return Object.entries(tier3LabelBg)
    .map(
      ([variant, { accent, tintPct }]) =>
        `--sophie-tier3-${variant}-label-bg: color-mix(in oklch, var(--sophie-${accent}) ${tintPct}%, var(--sophie-surface-2));`
    )
    .join("\n  ");
}

// Validation tracker (ADR 0056). Stripes reuse the semantic status
// palette directly; backgrounds derive `tintPct%`-tinted surfaces via
// color-mix on `transparent` so admonitions read as subtle wash rather
// than saturated alert. Same +4 lift in dark as `calloutTitleBgBlock`.
function validationTintsBlock(scheme: Scheme): string {
  return Object.entries(validationTints)
    .flatMap(([key, { stripe, tintPctLight, tintPctDark }]) => {
      const pct = scheme === "light" ? tintPctLight : tintPctDark;
      return [
        `--sophie-validation-${key}-stripe: var(--sophie-${stripe});`,
        `--sophie-validation-${key}-bg: color-mix(in oklch, var(--sophie-${stripe}) ${pct}%, transparent);`,
      ];
    })
    .join("\n    ");
}

export function generateCSS(): string {
  return `/* Generated by @sophie/theme. Do not edit by hand. */

:root {
  color-scheme: light dark;

  /* Color — light (surfaces, text, shadow) */
  ${colorBlock("light")}

  /* Brand + status — light */
  ${brandStatusBlock("light")}

  /* Callout title-bar tints — light */
  ${calloutTitleBgBlock("light")}

  /* Validation tracker tints — light */
  ${validationTintsBlock("light")}

  /* Epistemic role colors — light */
  ${roleBlock("light")}

  /* Retrieval-family left-band colors — light (Wedge B1) */
  ${retrievalBandsBlock("light")}

  /* Cross-reference / citation accent — light (plum) */
  ${citeBlock("light")}

  /* Mode-invariant utilities (accent alias, text-on-accent) */
  ${invariantUtilitiesBlock()}

  /* Typography */
  ${typographyBlock()}

  /* Spacing */
  ${spacingBlock()}

  /* Radii */
  ${radiiBlock()}

  /* Layout */
  ${layoutBlock()}

  /* Focus ring */
  ${focusBlock()}

  /* Heading rhythm — asymmetric margins per visual-polish-target */
  ${headingsBlock()}

  /* Card chrome — tier-1/tier-2 left-rule widths */
  ${cardRulesBlock()}

  /* Tier-3 biography-child label-bar tints (scheme-invariant) */
  ${tier3LabelBgBlock()}
}

[data-theme="dark"] {
  /* Color — dark (surfaces, text, shadow=none) */
  ${colorBlock("dark")}

  /* Brand + status — dark (lifted luminance per dark-mode-palette.md) */
  ${brandStatusBlock("dark")}

  /* Callout title-bar tints — dark (split tintPctDark) */
  ${calloutTitleBgBlock("dark")}

  /* Validation tracker tints — dark */
  ${validationTintsBlock("dark")}

  /* Epistemic role colors — dark */
  ${roleBlock("dark")}

  /* Retrieval-family left-band colors — dark (Wedge B1) */
  ${retrievalBandsBlock("dark")}

  /* Cross-reference / citation accent — dark (plum) */
  ${citeBlock("dark")}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* Color — dark (system preference; mirrors [data-theme="dark"]) */
    ${colorBlock("dark")}
    ${brandStatusBlock("dark")}
    ${calloutTitleBgBlock("dark")}
    ${validationTintsBlock("dark")}
    ${roleBlock("dark")}
    ${retrievalBandsBlock("dark")}
  }
}

@media print {
  :root,
  html[data-theme="dark"] {
    /* Force full light identity for print regardless of active theme.
       Includes brand/status/callout/validation overrides so a chapter
       printed from dark mode still renders the light contract. */
    ${colorBlock("light")}
    ${brandStatusBlock("light")}
    ${calloutTitleBgBlock("light")}
    ${validationTintsBlock("light")}
    ${roleBlock("light")}
    ${retrievalBandsBlock("light")}
    color-scheme: light;
  }
}
`;
}
