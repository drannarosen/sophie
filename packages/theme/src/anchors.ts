export const anchors = {
  ink: "#0f1115",
  paper: "#fbfaf7",
} as const;

export const brand = {
  teal: { fill: "#2f8c8d", text: "#1f6f70" },
  rose: { fill: "#b07a93", text: "#8c5a73" },
  violet: { fill: "#6d7794", text: "#515a7a" },
} as const;

export const status = {
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#fb7185",
  // `info` reuses the brand teal hue so the semantic palette stays
  // coordinated. `neutral` keys off the body text color via color-mix
  // in generate-css.ts (mode-aware) — see ADR 0056 + the validation
  // status palette.
  info: "#2f8c8d",
  neutral: "#6b7280",
} as const;

export const fontStacks = {
  sans: '"Source Sans 3", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  serif:
    '"Source Serif 4", "Newsreader", ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
} as const;

export const sizes = {
  xs: "0.75rem",
  sm: "0.875rem",
  base: "1rem",
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
  sm: "0.375rem",
  md: "0.625rem",
  lg: "0.875rem",
} as const;

export const layout = {
  proseMaxWidth: "68ch",
  contentPaddingInline: "clamp(1rem, 4vw, 1.5rem)",
} as const;

export const focus = {
  width: "2px",
} as const;
