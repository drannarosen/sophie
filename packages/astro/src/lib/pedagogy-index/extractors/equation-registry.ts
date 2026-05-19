import type { EquationEntry, EquationRegistryEntry } from "@sophie/core/schema";
import type { Root } from "mdast";
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
  };
}
