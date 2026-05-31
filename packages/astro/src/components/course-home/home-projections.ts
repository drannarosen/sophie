import type { SectionEntry, UnitEntry } from "@sophie/core/schema";

/**
 * Pure projections from the course-spec content collections to the
 * shapes the course-home dashboard renders (ADR 0097 #2/#3). Kept as a
 * standalone `.ts` (not inlined in the `.astro` sub-pieces) so the
 * derivations are unit-testable without a Container render — the `.astro`
 * pieces stay presentational.
 *
 * "Lecture count" is deliberately the count of NON-DRAFT units in a
 * section, matching the SimpleList link-filter (`status !== "draft"`):
 * the module list links into the same surface, so a count that includes
 * units with no public landing would over-promise.
 */

/** A module-list row: one per course Section, navigation-ready. */
export interface ModuleRow {
  /** Section slug — the link target + stable key. */
  readonly slug: string;
  /** 1-based display number (`01`, `02`, …) from sort order. */
  readonly number: number;
  /** Section title. */
  readonly title: string;
  /** Optional one-line section summary. */
  readonly description?: string;
  /** Count of non-draft units (lectures) in the section. */
  readonly lectureCount: number;
}

/**
 * Count non-draft units belonging to a section. The home links into the
 * same `/units/<id>/reading/` surface SimpleList builds, so draft units
 * (no public landing) are excluded to keep the count honest.
 */
export function lectureCountForSection(
  section: SectionEntry,
  units: ReadonlyArray<UnitEntry>
): number {
  return units.filter(
    (u) => u.section_id === section.slug && u.status !== "draft"
  ).length;
}

/**
 * Project sections + units into ordered module rows. Sections are sorted
 * by their declared `order`; the 1-based `number` is the post-sort index.
 */
export function moduleRows(
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>
): ModuleRow[] {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      slug: section.slug,
      number: index + 1,
      title: section.title,
      description: section.description,
      lectureCount: lectureCountForSection(section, units),
    }));
}

/** Hero meta counts: how many modules + total lectures across the course. */
export interface CourseCounts {
  readonly moduleCount: number;
  readonly lectureCount: number;
}

/** Total module + non-draft-lecture counts for the hero meta line. */
export function courseCounts(
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>
): CourseCounts {
  return {
    moduleCount: sections.length,
    lectureCount: units.filter((u) => u.status !== "draft").length,
  };
}

/**
 * Assemble the hero eyebrow — instructor FIRST, then institution, then
 * term (ADR 0097 hero spec). Blank parts are dropped so a sparse spec
 * never renders a dangling separator.
 */
export function assembleEyebrow(
  instructor: string,
  institution: string,
  term: string
): string {
  return [instructor, institution, term]
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .join(" · ");
}

/** A footer quick-link: a labeled pointer to an info-page slug. */
export interface QuickLink {
  /** Info-page slug (the route segment + stable key). */
  readonly slug: string;
  /** Human label, Title Cased from the slug. */
  readonly label: string;
}

/**
 * Title-case a kebab info-page slug for display: `office-hours` →
 * `Office Hours`. Acronym-blind by design — the slug is the author's
 * lowercase key, and v0.2 `info_pages` carries no per-page display
 * label, so this is the honest projection until one is added.
 */
export function infoPageLabel(slug: string): string {
  return slug
    .split("-")
    .filter((word) => word.length > 0)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Project the `info_pages` record (slug → declaration) into ordered
 * footer quick-links. Order follows the record's key insertion order —
 * the author's declared sequence in `course.sophie.yaml`. Absent
 * `info_pages` (optional in the spec) → no links, no crash.
 */
export function quickLinks(
  infoPages: Readonly<Record<string, unknown>> | undefined
): QuickLink[] {
  if (!infoPages) return [];
  return Object.keys(infoPages).map((slug) => ({
    slug,
    label: infoPageLabel(slug),
  }));
}
