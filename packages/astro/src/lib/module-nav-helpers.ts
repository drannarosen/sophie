import type { SectionEntry, UnitEntry } from "@sophie/core/schema";

/**
 * `<ModuleNav>` prop shapes, duplicated here from
 * `../components/ModuleNav.astro` because Astro-component type
 * imports from .astro files aren't reliable across the Node /
 * Astro / Vite toolchain. If the ModuleNav contract changes,
 * update both places. The interfaces are structural so a drift
 * surfaces as a `tsc` error at every consumer.
 */
export interface NavModule {
  slug: string;
  title: string;
  order: number;
  description?: string;
}
export interface NavChapter {
  slug: string;
  title: string;
  module: string;
  order?: number;
}

/**
 * Build `<ModuleNav>` inputs from the raw `sections` + `units`
 * content collections. Both library room routes (W4a) and the
 * bridge-room + topic-Spec routes (W4b) construct the same
 * `{modules, chapters}` pair to populate the sidebar nav. This
 * helper localizes the synthesis so adding a new route doesn't
 * duplicate the shape — and changing NavChapter's contract only
 * requires editing one site (R+CR I5 follow-up).
 *
 * **Bridge filtering.** Per ADR 0068 Scale 1, bridge sections
 * (`type: "bridge"`) render at Course root via
 * `[bridgeSlug].astro`, NOT inside the module → chapter tree
 * that `<ModuleNav>` displays. Surfacing them as modules would
 * confuse student-facing navigation:
 *
 *  - Bridge Units (`type: "skill"`) don't have `/units/<u>/reading`
 *    URLs; `<ModuleNav>` chapter links to that pattern would 404.
 *  - The bridge has its own root URL the sidebar's module-tree
 *    framing doesn't match.
 *
 * Bridges remain discoverable via the Library hub at `/library/`,
 * cross-links from chapter MDX, and the bridge's own root URL.
 */
export function buildModuleNavInputs(
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>
): { modules: NavModule[]; chapters: NavChapter[] } {
  const bridgeSectionSlugs = new Set(
    sections.filter((s) => s.type === "bridge").map((s) => s.slug)
  );
  const modules: NavModule[] = sections
    .filter((s) => s.type !== "bridge")
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      order: s.order,
      description: s.description,
    }));
  // Drop units whose parent section is a known bridge. Units with
  // section_ids that don't match any section in the collection
  // flow through unchanged — the caller may have other reasons
  // (e.g., a test fixture) to surface a chapter without an
  // explicit section row.
  const chapters: NavChapter[] = units
    .filter((u) => !bridgeSectionSlugs.has(u.section_id))
    .map((u) => ({
      slug: u.id,
      title: u.title,
      module: u.section_id,
      order: u.order,
    }));
  return { modules, chapters };
}
