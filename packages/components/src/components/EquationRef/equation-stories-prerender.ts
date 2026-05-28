/**
 * Storybook-only fixture prerenderer (ADR 0090).
 *
 * Production seeds the equations store from the pedagogy index, whose
 * entries already carry build-time-prerendered KaTeX `html` (baked by
 * `@sophie/astro`'s equation-registry extractor via the shared
 * `renderMath`). Story fixtures bypass that build loader and seed the
 * store with `tex` only — so under ADR 0090's full-drop (components
 * render `entry.html ?? ""` with no runtime KaTeX fallback) a raw
 * fixture renders blank, collapsing layout and diffing the VR
 * baselines.
 *
 * This helper closes that gap: it runs a fixture entry through KaTeX
 * with the EXACT options `renderMath` uses (`throwOnError: false`,
 * `output: "html"`, `displayMode` matching the extractor's per-field
 * choice) and `formatUnitTex` from `@sophie/core` (the same single-
 * source pure util the build uses), so the populated `html` is
 * byte-identical to what the build would have produced — VR matches
 * the EXISTING baselines without regenerating any PNG.
 *
 * Stories-only: this file imports `katex` and is imported exclusively
 * by `*.stories.tsx`. The production KaTeX invariant
 * (`grep -rn katex packages/components/src | grep -v test | grep -v
 * stories`) excludes it by the `stories` substring in the filename.
 */
import { formatUnitTex } from "@sophie/core/runtime";
import type { EquationEntry } from "@sophie/core/schema";
import katex from "katex";

import type { SearchResult } from "../Search/types.ts";

function renderHtml(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    output: "html",
  });
}

/**
 * Return a copy of an equation fixture entry with every `*_html`
 * field populated, mirroring the build extractor's per-field
 * displayMode choices: primary `tex` + `rearranged_forms[].tex` are
 * display math; constant `symbol`/`value`/`unit` are inline.
 */
export function prerenderEquationFixture(entry: EquationEntry): EquationEntry {
  return {
    ...entry,
    html: renderHtml(entry.tex, true),
    ...(entry.rearranged_forms
      ? {
          rearranged_forms: entry.rearranged_forms.map((form) => ({
            ...form,
            html: renderHtml(form.tex, true),
          })),
        }
      : {}),
    ...(entry.constants
      ? {
          constants: entry.constants.map((c) => ({
            ...c,
            symbol_html: renderHtml(c.symbol, false),
            value_html: renderHtml(c.value, false),
            ...(c.unit
              ? { unit_html: renderHtml(formatUnitTex(c.unit), false) }
              : {}),
          })),
        }
      : {}),
  };
}

/** Map a list of equation fixtures through {@link prerenderEquationFixture}. */
export function prerenderEquationFixtures(
  entries: EquationEntry[]
): EquationEntry[] {
  return entries.map(prerenderEquationFixture);
}

/**
 * Search-result sibling: populate `meta.html` for an equation result
 * from `meta.tex` (display math), matching the build's search-index
 * prerender so ResultCard renders byte-identically to baseline.
 */
export function prerenderSearchResult(result: SearchResult): SearchResult {
  if (result.meta.tex === undefined) {
    return result;
  }
  return {
    ...result,
    meta: { ...result.meta, html: renderHtml(result.meta.tex, true) },
  };
}
