/**
 * Wrap a unit string for `\text{}` rendering. Author-friendly units
 * like "cm s^{-1}" mix prose ("cm", "s") and math ("^{-1}").
 * Wrapping the whole thing in `\text{}` preserves whitespace but
 * makes `^{-1}` literal; not wrapping kills whitespace ("cms-1").
 * The fix: re-enter math mode inside `\text{}` for each
 * `^{...}` / `_{...}` segment via `$...$`.
 *
 * Copied verbatim from `KeyEquation.tsx` (ADR 0090 A2) so the
 * build-time unit prerender produces byte-identical KaTeX output to
 * the pre-ADR-0090 runtime render. A3 removes the component's copy.
 */
export function formatUnitTex(unit: string): string {
  const mathified = unit.replace(/([_^])(\{[^}]+\}|\S)/g, "$$$1$2$$");
  return `\\text{${mathified}}`;
}
