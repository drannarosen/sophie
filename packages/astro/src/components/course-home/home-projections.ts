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

/**
 * One entry in the global dropdown nav (ADR 0097 #6). Either a real,
 * navigable link (`path` present → an `<a href>`) OR a forward-looking
 * placeholder (`path` absent → a non-interactive labeled span; never a
 * dead `href="#"` that would lie to assistive tech). `optional` toggles
 * the "Optional" badge (the future-prereqs "Math & Physics Review"
 * entry). `current` marks the active page (`aria-current="page"`).
 */
export interface NavLink {
  /** Display label. */
  readonly label: string;
  /** Author-absolute path (`/syllabus/`), pre-`withBase`. Absent → placeholder. */
  readonly path?: string;
  /** Stable key — slug for info-pages/sections, label-derived for statics. */
  readonly key: string;
  /** Trailing count badge (lecture count for "The Course" rows). */
  readonly count?: number;
  /** Renders the violet "Optional" pill (future-prereqs placeholder). */
  readonly optional?: boolean;
  /** The active page → `aria-current="page"`. */
  readonly current?: boolean;
}

/** A titled group of nav links in the dropdown panel. */
export interface NavGroup {
  /** Group heading (e.g. "Course", "The Course", "Reference & Help"). */
  readonly heading: string;
  readonly links: ReadonlyArray<NavLink>;
}

/**
 * Canonical Course/Reference labels keyed by info-page `layout`, so the
 * menu reads "Syllabus"/"Schedule"/… regardless of the author's slug, and
 * so each layout routes to the correct group. The two-bucket split mirrors
 * ADR 0097 #6's "Course" vs "Reference & Help" grouping. A layout the spec
 * adds in future but that this map omits falls through to neither group —
 * a deliberate fail-closed (a new layout must be placed intentionally).
 */
const COURSE_LAYOUT_LABELS: Readonly<Record<string, string>> = {
  SyllabusPage: "Syllabus",
  SchedulePage: "Schedule",
  InstructorPage: "Instructor",
};

const REFERENCE_LAYOUT_LABELS: Readonly<Record<string, string>> = {
  PoliciesPage: "Policies",
  AccommodationsPage: "Accommodations",
};

/** Defensive read of an info-page declaration's `layout` discriminator. */
function readLayout(declaration: unknown): string | undefined {
  if (typeof declaration !== "object" || declaration === null) return undefined;
  const layout = (declaration as { layout?: unknown }).layout;
  return typeof layout === "string" ? layout : undefined;
}

/**
 * Project info-pages whose `layout` is in `labelMap` into nav links,
 * preserving the author's `info_pages` declaration order. Each link routes
 * to its slug's injected `/<slug>/` route; the label is the layout's
 * canonical name. Slugs whose layout is outside the map are skipped (they
 * belong to the other group, or to a future group).
 */
function infoPageLinks(
  infoPages: Readonly<Record<string, unknown>> | undefined,
  labelMap: Readonly<Record<string, string>>
): NavLink[] {
  if (!infoPages) return [];
  const links: NavLink[] = [];
  for (const [slug, declaration] of Object.entries(infoPages)) {
    const layout = readLayout(declaration);
    const label = layout ? labelMap[layout] : undefined;
    if (label) links.push({ label, path: `/${slug}/`, key: slug });
  }
  return links;
}

/**
 * Assemble the three-group model for the global dropdown nav (ADR 0097
 * #6), data-driven from sections/units + `info_pages`:
 *
 *   - **Course** — Home (current) + the Syllabus/Schedule/Instructor
 *     info-pages that the spec actually declares (each absent → omitted,
 *     graceful degradation per ADR 0097 #7).
 *   - **The Course** — one link per Section (→ `/sections/<slug>/`) with
 *     its non-draft lecture count, reusing `moduleRows`.
 *   - **Reference & Help** — the "Math & Physics Review · Optional"
 *     placeholder (future prereqs/fundamentals section, ADR 0097 #6 —
 *     no route yet, so a non-interactive span), the "Practice Problems"
 *     placeholder (per-unit practice routes exist, but no course-level
 *     index route does yet — also a non-link until ADR-scoped), then the
 *     Policies/Accommodations info-pages the spec declares.
 *
 * Placeholders carry no `path`, so the renderer emits a labeled span, not
 * a dead `href="#"` — honest to assistive tech (the W1 tradeoff: a visible
 * "coming soon" affordance beats both a lying link and a silent omission
 * of a structurally-expected entry).
 */
export function navGroups(
  sections: ReadonlyArray<SectionEntry>,
  units: ReadonlyArray<UnitEntry>,
  infoPages: Readonly<Record<string, unknown>> | undefined
): NavGroup[] {
  const courseLinks: NavLink[] = [
    { label: "Home", path: "/", key: "home", current: true },
    ...infoPageLinks(infoPages, COURSE_LAYOUT_LABELS),
  ];

  const moduleLinks: NavLink[] = moduleRows(sections, units).map((row) => ({
    label: row.title,
    path: `/sections/${row.slug}/`,
    key: row.slug,
    count: row.lectureCount,
  }));

  const referenceLinks: NavLink[] = [
    {
      label: "Math & Physics Review",
      key: "math-physics-review",
      optional: true,
    },
    { label: "Practice Problems", key: "practice-problems" },
    ...infoPageLinks(infoPages, REFERENCE_LAYOUT_LABELS),
  ];

  return [
    { heading: "Course", links: courseLinks },
    { heading: "The Course", links: moduleLinks },
    { heading: "Reference & Help", links: referenceLinks },
  ];
}
