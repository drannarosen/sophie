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
 */
export function buildModuleNavInputs(
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>
): { modules: NavModule[]; chapters: NavChapter[] } {
  const modules: NavModule[] = sections.map((s) => ({
    slug: s.slug,
    title: s.title,
    order: s.order,
    description: s.description,
  }));
  const chapters: NavChapter[] = units.map((u) => ({
    slug: u.id,
    title: u.title,
    module: u.section_id,
    order: u.order,
  }));
  return { modules, chapters };
}
