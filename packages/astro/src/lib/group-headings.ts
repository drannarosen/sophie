import type { MarkdownHeading } from "astro";

export interface HeadingGroup {
  h2: MarkdownHeading;
  children: MarkdownHeading[];
}

/**
 * Groups H3 headings under their preceding H2. Used by `<TocSidebar>`
 * to render a two-level nested ToC. H1 is omitted (it's the chapter
 * title, never a ToC entry). H4-H6 are ignored in v1 per PR 4 design
 * doc; the cap can be raised later by extending this helper.
 *
 * Stable order: groups appear in the same order as their H2 in the
 * source; children appear in the same order as their H3 in the
 * source.
 */
export function groupHeadings(
  headings: ReadonlyArray<MarkdownHeading>
): HeadingGroup[] {
  const groups: HeadingGroup[] = [];
  for (const h of headings) {
    if (h.depth === 2) {
      groups.push({ h2: h, children: [] });
    } else if (h.depth === 3 && groups.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: length > 0 ensures last exists.
      groups[groups.length - 1]!.children.push(h);
    }
    // H1, H4-H6 (and orphan H3 before first H2) ignored.
  }
  return groups;
}
