import type { KatexOptions } from "katex";

/**
 * The single shared KaTeX configuration for all build-time math
 * rendering (ADR 0090). Consolidates the options scattered across
 * the component/astro call sites:
 *   - components/KeyEquation/KeyEquation.tsx (3 sites, output:"html")
 *   - components/EquationRef/EquationRef.tsx (output:"html")
 *   - astro/components/EquationSpecContent.astro (output:"html")
 *   - components/Search/ResultCard.tsx (no output → KaTeX default
 *     "htmlAndMathml")
 *   - runtime/render-text-with-math.ts (2 sites, no output → default;
 *     this is the runtime tail and is NOT migrated in PR-A)
 *
 * Those sites diverged on `output` (three pass "html", the rest used
 * KaTeX's "htmlAndMathml" default). `renderMath` normalizes the HTML
 * pass to `output:"html"` — byte-identical for the three explicit
 * sites, and a visually-identical change for ResultCard (the dropped
 * `.katex-mathml` block is CSS-hidden); the MathML moves to the
 * separate `.mathml` field. `throwOnError: false` is the only
 * genuinely-invariant shared field — bad LaTeX
 * renders a recoverable error node rather than crashing the build.
 * `displayMode` is per-call (display vs. inline). `output` is fixed
 * per render pass: the HTML pass uses `"html"` to guarantee the
 * byte-for-byte output the visual-regression snapshots baseline on
 * (ADR 0090 sub-decision B); the MathML pass uses `"mathml"` to
 * obtain the `<math>` element that PR-B feeds to the speech engine.
 */
export const SHARED_KATEX_OPTIONS: Pick<KatexOptions, "throwOnError"> = {
  throwOnError: false,
};
