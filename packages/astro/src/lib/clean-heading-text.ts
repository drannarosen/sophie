/**
 * Clean KaTeX-SSR artifacts out of Astro `MarkdownHeading.text` values.
 *
 * Background: Astro's `MarkdownHeading.text` is extracted from the
 * rendered HTML's textContent, AFTER rehype-katex has converted any
 * `$...$` math into KaTeX HTML. KaTeX SSR emits BOTH a visible HTML
 * rendering AND a hidden MathML annotation; textContent grabs both,
 * producing patterns like:
 *
 *   Source MDX:        `## Why CO$_2$ matters`
 *   Astro extraction:  `Why CO2_22​ matters`
 *                              ^^^^ KaTeX pollution
 *
 * Decomposition of `2_22​`:
 *   `2`       — MathML `<mn>2</mn>` textContent
 *   `_2`      — MathML `<annotation>_2</annotation>` (LaTeX source)
 *   `2`       — KaTeX HTML rendering textContent
 *   `​`  — KaTeX-emitted zero-width-space spacer
 *
 * This helper reverses the pattern back to the LaTeX source (`$_2$`)
 * so callers can re-render through MathText for clean KaTeX output.
 *
 * Currently handles the common subscript-digit pattern; expand as more
 * math forms surface in headings. Long-term, the right fix is an
 * Astro/MDX config change that prevents math from running through the
 * heading-extraction pipeline; this helper is the stopgap until that
 * lands.
 */
export function cleanHeadingText(text: string): string {
  if (typeof text !== "string") return "";
  // Strip zero-width spacers KaTeX emits between math segments.
  // Alternation (not character class) — ZWJ inside `[]` triggers
  // Biome's noMisleadingCharacterClass; explicit \u escapes also
  // surface the otherwise-invisible chars in source.
  //   ​ ZWSP, ‌ ZWNJ, ‍ ZWJ, ﻿ BOM
  let cleaned = text.replace(/​|‌|‍|﻿/g, "");

  // Subscript digit pollution: `N_NN` (where the two trailing digits
  // equal the first) → `$_N$`. Drives the most common case in the
  // current pilot (CO$_2$, H$_2$O, N$_2$, O$_2$, CH$_4$, etc.).
  cleaned = cleaned.replace(/(\d)_\1\1/g, "$$_$1$$");

  return cleaned;
}
