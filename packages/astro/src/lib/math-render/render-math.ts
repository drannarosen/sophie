import katex from "katex";
import { SHARED_KATEX_OPTIONS } from "./katex-options.ts";

export interface RenderedMath {
  /**
   * KaTeX HTML markup (`output: "html"`). Byte-identical to the
   * pre-ADR-0090 component call sites for the same (latex,
   * displayMode), so visual-regression snapshots don't diff.
   */
  html: string;
  /**
   * The `<math>…</math>` element extracted from KaTeX's MathML
   * output. PR-B feeds this to a MathML→speech engine; PR-A only
   * guarantees it contains a `<math` element.
   */
  mathml: string;
}

/**
 * Module-level memo cache (R8). `renderMath` is a pure function of
 * (latex, displayMode) — KaTeX rendering is deterministic for fixed
 * options — so a per-key cache is safe. The cache lives for the
 * process/build lifetime (one-shot Node build process renders N
 * static pages with a stable set of equations); in dev mode the
 * module reloads on HMR, which drops the cache and re-renders. There
 * is no companion Vite plugin or hook to invalidate — this is a pure
 * helper, not a transform that observes file changes.
 */
const cache = new Map<string, RenderedMath>();

/**
 * The single shared build-time math renderer (ADR 0090). Components
 * stop owning KaTeX; build-time consumers bake `{ html, mathml }`
 * into their data and render the HTML as a plain string.
 *
 * Synchronous: `katex.renderToString` is synchronous. PR-B adds an
 * async `speech` field via the speech-rule-engine.
 */
export function renderMath(
  latex: string,
  opts?: { displayMode?: boolean }
): RenderedMath {
  const displayMode = opts?.displayMode ?? false;
  const key = `${displayMode ? "d" : "i"}:${latex}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const html = katex.renderToString(latex, {
    ...SHARED_KATEX_OPTIONS,
    displayMode,
    output: "html",
  });
  const mathmlMarkup = katex.renderToString(latex, {
    ...SHARED_KATEX_OPTIONS,
    displayMode,
    output: "mathml",
  });
  const mathMatch = mathmlMarkup.match(/<math[\s\S]*<\/math>/);
  const mathml = mathMatch ? mathMatch[0] : "";

  const rendered: RenderedMath = { html, mathml };
  cache.set(key, rendered);
  return rendered;
}
