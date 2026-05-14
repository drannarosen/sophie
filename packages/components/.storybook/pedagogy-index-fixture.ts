/**
 * Storybook fixture for the `virtual:sophie/pedagogy-index` module.
 * The production module is produced at build time by the
 * @sophie/astro Vite plugin (ADR 0038) and resolves to live
 * accumulator state. Storybook runs in isolation (no astro
 * pipeline, no chapter MDX), so we provide a small fixture so
 * `<GlossaryTerm>` stories can render against a realistic index
 * shape.
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

export const equations: ReadonlyArray<unknown> = [];
export const keyInsights: ReadonlyArray<unknown> = [];
export const figures: ReadonlyArray<unknown> = [];
export const misconceptions: ReadonlyArray<unknown> = [];
