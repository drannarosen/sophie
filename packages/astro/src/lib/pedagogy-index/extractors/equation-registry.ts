import type { EquationEntry, EquationRegistryEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
import { formatUnitTex } from "../../math-render/format-unit-tex.ts";
import { renderMath } from "../../math-render/render-math.ts";
import { buildBiographyFromChildren } from "./biography.ts";

/**
 * Pure registry walker per ADR 0060. Combines validated frontmatter
 * (from Astro's content collection schema) with the biography extracted
 * from the registry MDX body's `Root.children`. Returns the assembled
 * `EquationEntry` — the registry-source contract on
 * `PedagogyIndex.equations[]`.
 *
 * Frontmatter shape is `EquationRegistryEntrySchema`; biography children
 * (Observable / Assumption / Units / BreaksWhen / CommonMisuse /
 * DerivationStep) are walked via the shared
 * `buildBiographyFromChildren` helper. The biography is optional —
 * registry MDX files without biography children produce entries
 * without the `biography` field.
 */
export function extractEquationRegistryDeclaration(
  tree: Root,
  frontmatter: EquationRegistryEntry
): EquationEntry {
  const biography = buildBiographyFromChildren(
    tree,
    `equation registry entry "${frontmatter.id}"`
  );
  return {
    ...frontmatter,
    ...(biography ? { biography } : {}),
    // Build-time prerendered KaTeX html (ADR 0090). The components
    // (KeyEquation/EquationRef/ResultCard) consume these strings and
    // drop their own KaTeX import; there is no runtime fallback.
    html: renderMath(frontmatter.tex, { displayMode: true }).html,
    ...(frontmatter.rearranged_forms
      ? {
          rearranged_forms: frontmatter.rearranged_forms.map((form) => ({
            ...form,
            html: renderMath(form.tex, { displayMode: true }).html,
          })),
        }
      : {}),
    ...(frontmatter.constants
      ? {
          constants: frontmatter.constants.map((c) => ({
            ...c,
            symbol_html: renderMath(c.symbol, { displayMode: false }).html,
            value_html: renderMath(c.value, { displayMode: false }).html,
            ...(c.unit
              ? {
                  unit_html: renderMath(formatUnitTex(c.unit), {
                    displayMode: false,
                  }).html,
                }
              : {}),
          })),
        }
      : {}),
  };
}
