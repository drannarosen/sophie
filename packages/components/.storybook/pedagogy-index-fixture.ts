/**
 * Storybook fixture for the `virtual:sophie/pedagogy-index` module.
 * The production module is produced at build time by the
 * @sophie/astro Vite plugin (ADR 0038) and resolves to live
 * accumulator state. Storybook runs in isolation (no astro
 * pipeline, no chapter MDX), so we provide a small fixture so
 * `<GlossaryTerm>` / `<EqRef>` stories can render against a
 * realistic index shape.
 *
 * Wired by an alias in .storybook/main.ts:
 *
 *   { find: "virtual:sophie/pedagogy-index", replacement: <this file> }
 */

export const definitions = [
  {
    term: "Standard candle",
    slug: "standard-candle",
    body: "<p>An object whose intrinsic luminosity is known independently — from pulsation period, spectral type, or explosion physics — so distance can be inferred from observed flux via the inverse-square law.</p>",
    chapter: "spoiler-alerts",
    anchor: "standard-candle",
  },
  {
    term: "Parallax",
    slug: "parallax",
    body: "<p>The apparent shift of a nearby star against more distant background as Earth orbits the Sun. The first rung of the cosmic distance ladder; Gaia measures parallaxes for over a billion stars.</p>",
    chapter: "spoiler-alerts",
    anchor: "parallax",
  },
  {
    term: "Redshift",
    slug: "redshift",
    body: "<p>The stretching of light wavelengths emitted by a source moving away from the observer. For distant galaxies, redshift is caused primarily by the expansion of space itself, not by the source's velocity through space.</p>",
    chapter: "spoiler-alerts",
    anchor: "redshift",
  },
];

export const equations = [
  {
    slug: "inverse-square-law",
    title: "The Inverse-Square Law",
    number: 1,
    tex: "F = \\frac{L}{4\\pi d^2}",
    body: "<p>Flux falls off as the inverse square of the distance to a point source — the geometric consequence of light spreading over an ever-expanding sphere.</p>",
    chapter: "spoiler-alerts",
    anchor: "inverse-square-law",
  },
  {
    slug: "wiens-law",
    title: "Wien's Law",
    number: 2,
    tex: "\\lambda_{\\text{peak}} = b \\, T^{-1}",
    body: "<p>The peak wavelength of a blackbody's emission scales inversely with temperature — hotter sources peak bluer; cooler sources peak redder.</p>",
    chapter: "spoiler-alerts",
    anchor: "wiens-law",
  },
];

export const keyInsights: ReadonlyArray<unknown> = [];
export const misconceptions: ReadonlyArray<unknown> = [];

// Figure two-tier (PR-C3 decision #3): registry = per-name asset
// metadata; usages = per-chapter appearances (number, anchor,
// canonical flag, optional caption override). The FigureRef
// stories seed both via `__setFigureRegistry` + `__setFigureUsages`.
export const figureRegistry = [
  {
    name: "cosmic-distance-ladder",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Cosmic_distance_ladder.jpg/640px-Cosmic_distance_ladder.jpg",
    alt: "Schematic of the cosmic distance ladder: parallax → standard candles → redshift.",
    caption:
      "The cosmic distance ladder — each rung calibrates the next, from parallax out to cosmological redshifts.",
    credit: "NASA / ESA / A. Feild (STScI)",
  },
  {
    name: "m51-optical-radio",
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Messier51_sRGB.jpg/640px-Messier51_sRGB.jpg",
    alt: "Side-by-side optical and radio views of the Whirlpool Galaxy (M51).",
    caption:
      "M51 in optical (left) and 21-cm radio (right) — different physics, same galaxy.",
  },
];

export const figureUsages = [
  {
    name: "cosmic-distance-ladder",
    chapter: "spoiler-alerts",
    anchor: "fig-cosmic-distance-ladder",
    number: 1,
    canonical: true,
  },
  {
    name: "m51-optical-radio",
    chapter: "spoiler-alerts",
    anchor: "fig-m51-optical-radio",
    number: 2,
    canonical: true,
    captionOverride: "Optical (HST) vs. 21-cm radio (VLA).",
  },
];

// Legacy alias retained for any importers that still expect the
// pre-PR-C3 shape (single `figures` collection). New code should
// use `figureRegistry` + `figureUsages`.
export const figures: ReadonlyArray<unknown> = figureRegistry;
