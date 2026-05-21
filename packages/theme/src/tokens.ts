const v = (name: string) => `var(--sophie-${name})`;

export const tokens = {
  color: {
    bg: v("bg"),
    surface: {
      1: v("surface-1"),
      2: v("surface-2"),
      3: v("surface-3"),
    },
    text: {
      primary: v("text"),
      secondary: v("text-2"),
      muted: v("text-muted"),
      faint: v("text-faint"),
    },
    border: {
      default: v("border"),
      subtle: v("border-subtle"),
    },
    brand: {
      teal: { fill: v("brand-teal"), text: v("brand-teal-text") },
      rose: { fill: v("brand-rose"), text: v("brand-rose-text") },
      violet: { fill: v("brand-violet"), text: v("brand-violet-text") },
    },
    status: {
      success: v("status-success"),
      warning: v("status-warning"),
      danger: v("status-danger"),
      info: v("status-info"),
      neutral: v("status-neutral"),
    },
    role: {
      observable: v("role-observable"),
      model: v("role-model"),
      inference: v("role-inference"),
      approximation: v("role-approximation"),
    },
    validation: {
      unvalidated: {
        stripe: v("validation-unvalidated-stripe"),
        bg: v("validation-unvalidated-bg"),
      },
      inProgress: {
        stripe: v("validation-in-progress-stripe"),
        bg: v("validation-in-progress-bg"),
      },
      validated: {
        stripe: v("validation-validated-stripe"),
        bg: v("validation-validated-bg"),
      },
      reValidationNeeded: {
        stripe: v("validation-re-validation-needed-stripe"),
        bg: v("validation-re-validation-needed-bg"),
      },
    },
    link: { default: v("link"), hover: v("link-hover") },
    accent: v("accent"),
  },
  font: {
    sans: v("font-sans"),
    serif: v("font-serif"),
    mono: v("font-mono"),
  },
  size: {
    pill: v("text-pill"),
    xs: v("text-xs"),
    tiny: v("text-tiny"),
    sm: v("text-sm"),
    small: v("text-small"),
    base: v("text-base"),
    body: v("text-body"),
    md: v("text-md"),
    lg: v("text-lg"),
    xl: v("text-xl"),
    "2xl": v("text-2xl"),
    "3xl": v("text-3xl"),
    "4xl": v("text-4xl"),
  },
  leading: {
    tight: v("leading-tight"),
    prose: v("leading-prose"),
  },
  weight: {
    normal: v("weight-normal"),
    medium: v("weight-medium"),
    semibold: v("weight-semibold"),
    bold: v("weight-bold"),
  },
  space: {
    0: v("space-0"),
    half: v("space-half"),
    1: v("space-1"),
    2: v("space-2"),
    3: v("space-3"),
    4: v("space-4"),
    5: v("space-5"),
    6: v("space-6"),
    8: v("space-8"),
    10: v("space-10"),
  },
  radius: {
    sm: v("radius-sm"),
    md: v("radius-md"),
    lg: v("radius-lg"),
  },
  layout: {
    proseMaxWidth: v("prose-max-width"),
    contentPaddingInline: v("content-padding-inline"),
  },
  focus: {
    width: v("focus-width"),
    color: v("focus-color"),
  },
  shadow: {
    card: v("shadow-card"),
    popover: v("shadow-popover"),
  },
} as const;

export type Tokens = typeof tokens;
