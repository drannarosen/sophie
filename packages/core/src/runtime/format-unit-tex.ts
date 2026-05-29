/**
 * Wrap a unit string for `\text{}` rendering. Author-friendly units
 * like "cm s^{-1}" mix prose ("cm", "s") and math ("^{-1}").
 * Wrapping the whole thing in `\text{}` preserves whitespace but
 * makes `^{-1}` literal; not wrapping kills whitespace ("cms-1").
 * The fix: re-enter math mode inside `\text{}` for each
 * `^{...}` / `_{...}` segment via `$...$`.
 *
 * Single-source pure string util (no katex dependency) hoisted to
 * core (ADR 0090) so BOTH the astro build-time unit prerender AND
 * the Storybook fixture-prerender decorator share one definition —
 * permanently resolving the duplicate-copy drift risk. The transform
 * is byte-stable: any change to the regex or replacement breaks the
 * VR baselines that captured the pre-ADR-0090 runtime render.
 */
export function formatUnitTex(unit: string): string {
  const mathified = unit.replace(/([_^])(\{[^}]+\}|\S)/g, "$$$1$2$$");
  return `\\text{${mathified}}`;
}
