import {
  anchors,
  brand,
  focus,
  fontStacks,
  layout,
  leadings,
  lightSurfaces,
  radii,
  sizes,
  spacings,
  status,
  textOnAccent,
  weights,
} from "../src/anchors.ts";

interface ColorMode {
  bg: string;
  fg: string;
  scheme: "light" | "dark";
}

const light: ColorMode = {
  bg: anchors.paper,
  fg: anchors.ink,
  scheme: "light",
};
const dark: ColorMode = {
  bg: anchors.ink,
  fg: anchors.paper,
  scheme: "dark",
};

function colorBlock(mode: ColorMode): string {
  const { bg, fg, scheme } = mode;
  // Light mode uses the hardcoded cool-neutral surface stack (gray-50
  // page, pure-white cards, gray-200 borders) per visual-polish-target.md.
  // Dark mode keeps the symmetric color-mix derivation against the cool
  // paper anchor; a dedicated dark-mode tuning sweep ships later (audit
  // § Section 5).
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
          `--sophie-surface-1: color-mix(in oklch, ${bg} 92%, ${fg});`,
          `--sophie-surface-2: color-mix(in oklch, ${bg} 86%, ${fg});`,
          `--sophie-surface-3: color-mix(in oklch, ${bg} 80%, ${fg});`,
          `--sophie-border: color-mix(in oklch, ${fg} 8%, transparent);`,
          `--sophie-border-subtle: color-mix(in oklch, ${fg} 5%, transparent);`,
        ];
  return [
    `--sophie-bg: ${bg};`,
    ...surfaces,
    `--sophie-text: color-mix(in oklch, ${fg} 88%, ${bg});`,
    `--sophie-text-2: color-mix(in oklch, ${fg} 64%, ${bg});`,
    `--sophie-text-muted: color-mix(in oklch, ${fg} 46%, ${bg});`,
    `--sophie-text-faint: color-mix(in oklch, ${fg} 32%, ${bg});`,
    `--sophie-link: color-mix(in oklch, var(--sophie-accent) 70%, var(--sophie-text));`,
    // Modal backdrop. Derived from ${fg} so it stays visible against the
    // scheme-appropriate surface — ink-tinted overlay in light mode,
    // paper-tinted in dark mode. 50% concentration gives a clear
    // "behind-modal" darkening without going opaque.
    `--sophie-overlay-bg: color-mix(in oklch, ${fg} 50%, transparent);`,
    // Scheme-aware card shadow. Derived from ${fg} (=ink in light mode,
    // paper in dark mode) so the shadow color adapts to scheme instead
    // of being invisible in dark mode like a hardcoded #0f1115 would be.
    // 4% concentration matches the original visual in light mode.
    `--sophie-shadow-card: 0 1px 3px color-mix(in oklch, ${fg} 4%, transparent);`,
    // Same pattern for popover surfaces (FigureRef / EqRef / GlossaryTerm).
    // 12% concentration matches the original `rgb(0 0 0 / 0.12)` in light
    // mode and stays visible against dark surface-1.
    `--sophie-shadow-popover: 0 4px 12px color-mix(in oklch, ${fg} 12%, transparent);`,
  ].join("\n    ");
}

function modeInvariantBlock(): string {
  return [
    `--sophie-brand-teal: ${brand.teal.fill};`,
    `--sophie-brand-teal-text: ${brand.teal.text};`,
    `--sophie-brand-rose: ${brand.rose.fill};`,
    `--sophie-brand-rose-text: ${brand.rose.text};`,
    `--sophie-brand-violet: ${brand.violet.fill};`,
    `--sophie-brand-violet-text: ${brand.violet.text};`,
    `--sophie-status-success: ${status.success};`,
    `--sophie-status-warning: ${status.warning};`,
    `--sophie-status-danger: ${status.danger};`,
    `--sophie-status-info: ${status.info};`,
    `--sophie-status-neutral: ${status.neutral};`,
    "--sophie-accent: var(--sophie-brand-teal);",
    "--sophie-link-hover: var(--sophie-accent);",
    // Text color used on saturated brand/status accent backgrounds
    // (e.g., active chips, primary buttons). Mode-invariant white reads
    // AA-clear on all current accent fills (brand-teal/rose/violet,
    // status-info/warning/danger). A scheme-aware variant can ship if
    // we add a light-on-dark accent (e.g., pastel buttons in dark mode).
    `--sophie-text-on-accent: ${textOnAccent};`,
    // Validation tracker palette (ADR 0056). Stripes reuse the
    // semantic status palette directly; backgrounds derive 6%-tint
    // surfaces via color-mix so admonitions read as subtle wash
    // rather than saturated alert.
    "--sophie-validation-unvalidated-stripe: var(--sophie-status-neutral);",
    "--sophie-validation-unvalidated-bg: color-mix(in oklch, var(--sophie-status-neutral) 6%, transparent);",
    "--sophie-validation-in-progress-stripe: var(--sophie-status-info);",
    "--sophie-validation-in-progress-bg: color-mix(in oklch, var(--sophie-status-info) 6%, transparent);",
    "--sophie-validation-validated-stripe: var(--sophie-status-success);",
    "--sophie-validation-validated-bg: color-mix(in oklch, var(--sophie-status-success) 6%, transparent);",
    "--sophie-validation-re-validation-needed-stripe: var(--sophie-status-warning);",
    "--sophie-validation-re-validation-needed-bg: color-mix(in oklch, var(--sophie-status-warning) 6%, transparent);",
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

export function generateCSS(): string {
  return `/* Generated by @sophie/theme. Do not edit by hand. */

:root {
  color-scheme: light dark;

  /* Color — light */
  ${colorBlock(light)}

  /* Brand + status (mode-invariant) */
  ${modeInvariantBlock()}

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
}

[data-theme="dark"] {
  /* Color — dark (explicit override) */
    ${colorBlock(dark)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* Color — dark (system preference) */
    ${colorBlock(dark)}
  }
}

@media print {
  :root,
  html[data-theme="dark"] {
    /* Color — light (forced for print regardless of active theme) */
    ${colorBlock(light)}
    color-scheme: light;
  }
}
`;
}
