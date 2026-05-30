import katex from "katex";
import { useMemo } from "react";
import { BuildTimeHtml } from "../../runtime/BuildTimeHtml.tsx";

export interface InlineMathProps {
  /**
   * LaTeX source. Author-controlled (component-internal call sites), not
   * end-user input — see ADR 0030 + design decision #10. Author content is
   * the trust boundary for the `<BuildTimeHtml>` injection below (ADR 0093).
   */
  children: string;
}

/**
 * Inline KaTeX wrapper for figure annotations — readout values, axis labels,
 * validity hints, Wien-peak ticks. Counterpart to MDX-pipeline-rendered
 * `$...$` math; this lets pure-React surfaces (interactive figures) emit
 * paper-quality math typography without the MDX detour.
 *
 * Per the interactive-figure-target spec, Principle 3: **KaTeX for all math
 * — never Unicode kludges.** Replaces the prior `λ_peak`, `B_λ`, `≫`, `⁻¹`
 * literal-glyph patterns inside `<BlackbodyExplorer>` with TeX-source.
 *
 * Future-extraction note (DRY-when-paid): kept local to BlackbodyExplorer
 * until A8 OMIFlow / A9 AssumptionStack / A10 UncertaintyLens lands and
 * earns the shared abstraction per ADR 0023.
 */
export function InlineMath({ children }: InlineMathProps) {
  const html = useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: false,
        throwOnError: false,
        // htmlAndMathml: the .katex-mathml block is consumed by assistive
        // technologies; the .katex-html block paints the visual glyphs.
        // Dropping the MathML half breaks math screen-reader UX. See ADR 0004.
        output: "htmlAndMathml",
      }),
    [children]
  );

  // tex is rendered by katex.renderToString from author-controlled
  // component-internal LaTeX (not user-supplied) — routed through the one
  // sanctioned injection chokepoint (ADR 0093) as `katex`. The render
  // happens client-side, but the trust property is the build-authored
  // (non-user) LaTeX input, not the timing.
  return <BuildTimeHtml html={html} trust='katex' />;
}
