import { definitions } from "virtual:sophie/pedagogy-index";
import type { DefinitionEntry } from "@sophie/core/schema";

/**
 * Thin wrapper around the build-time pedagogy index that provides
 * O(1) slug → entry lookup for `<GlossaryTerm>`. Built once at
 * module load — the index size in v1 is small (a few hundred terms
 * across a textbook).
 *
 * Lives as a separate module so tests + Storybook can `vi.mock`
 * (or alias) this file instead of having to mock the
 * `virtual:sophie/pedagogy-index` ID directly. The store is the
 * boundary; the virtual module is an implementation detail.
 */

const definitionsBySlug = new Map<string, DefinitionEntry>(
  definitions.map((d) => [d.slug, d])
);

export function lookupDefinition(slug: string): DefinitionEntry | undefined {
  return definitionsBySlug.get(slug);
}
