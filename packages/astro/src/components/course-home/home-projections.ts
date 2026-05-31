import type { CourseSpec, SectionEntry, UnitEntry } from "@sophie/core/schema";

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

// ─── Descriptive-band projections (ADR 0097 #3) ─────────────────────
//
// The "Why this course is different" and "How each lecture works" bands
// are CHROME projections of the course-spec `identity` + `pedagogy`
// clusters (ADR 0097 #3 / ADR 0058 chrome-vs-pedagogy boundary), NOT new
// pedagogy primitives and NOT new schema. Every helper below DEGRADES
// gracefully: an absent optional field yields an absent piece (undefined
// lead / omitted pillar / omitted note / empty flow) so the `.astro`
// renderer can drop the affected element rather than emit an empty shell.
//
// PROJECTED vs FIXED EDITORIAL (honest accounting, surfaced per W1):
//   - `whyLead`           PROJECTED  — first sentence of identity.description.
//   - "toolkit" pillar    PROJECTED  — body is the named_tools taglines.
//   - "Observation→…" +
//     "Models…" pillars   FIXED      — editorial distillations of the OMI
//                                      pattern that no single spec field
//                                      derives; kept minimal (heading only,
//                                      no fabricated prose body).
//   - `howFlow`           PROJECTED  — required_moves keys+values verbatim.
//   - `trackNote`         PROJECTED  — multi_track_readings labels+times.

/** Narrowed views of the course-spec `pedagogy` cluster this module reads. */
type Pedagogy = CourseSpec["pedagogy"];
type RequiredMoves = Pedagogy["required_moves"];
type NamedTools = Pedagogy["named_tools"];
type MultiTrackReadings = NonNullable<Pedagogy["multi_track_readings"]>;

/**
 * Project the band lead line from `identity.description`: the first
 * sentence, so the Fraunces lead stays a single tight clause rather than
 * the full multi-sentence catalog description. Absent/blank → undefined
 * (the renderer omits the lead, ADR 0097 #7).
 */
export function whyLead(description: string | undefined): string | undefined {
  if (!description) return undefined;
  const collapsed = description.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return undefined;
  const firstSentence = collapsed.match(/^[^.!?]*[.!?]/);
  return firstSentence ? firstSentence[0].trim() : collapsed;
}

/**
 * Project the `named_tools` taglines into the "toolkit that travels"
 * pillar body — the one Why-pillar that maps cleanly to a spec field. The
 * tool ids are humanized into a lead-in list ("Dimensional analysis, the
 * ratio method, …") and the taglines are dropped (too long for the pillar
 * card; the tools' detail lives on their own pages). Empty/absent
 * named_tools → undefined (the renderer omits the whole pillar).
 */
export function toolkitPillarBody(
  namedTools: NamedTools | undefined
): string | undefined {
  if (!namedTools || namedTools.length === 0) return undefined;
  // Prose list: tool ids spelled out, lowercase (they read mid-sentence);
  // `sentenceCase` then re-capitalizes only the leading word.
  const names = namedTools.map((tool) => tool.id.split("-").join(" "));
  return `${sentenceCase(joinList(names))} — reasoning skills that outlast any single equation.`;
}

/** Capitalize the first character of a string; rest untouched. */
function sentenceCase(text: string): string {
  return text.length === 0
    ? text
    : text.charAt(0).toUpperCase() + text.slice(1);
}

/** `dimensional-analysis` → `Dimensional analysis` (sentence case, slug-blind). */
function humanizeSlug(slug: string): string {
  const words = slug.split("-").filter((word) => word.length > 0);
  const first = words[0];
  if (!first) return slug;
  return [
    first.charAt(0).toUpperCase() + first.slice(1),
    ...words.slice(1),
  ].join(" ");
}

/** Oxford-comma list join: `[a]`→`a`, `[a,b]`→`a and b`, `[a,b,c]`→`a, b, and c`. */
function joinList(items: ReadonlyArray<string>): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** One Why-pillar: a fixed-heading card whose body MAY be projected. */
export interface WhyPillar {
  /** Stable key — also the decorative glyph selector. */
  readonly key: string;
  /** Decorative glyph (aria-hidden in the renderer). */
  readonly glyph: string;
  /** Pillar heading (fixed editorial). */
  readonly heading: string;
  /**
   * Pillar body. Present for FIXED editorial pillars and the PROJECTED
   * toolkit pillar; a projected pillar with no source data is dropped from
   * the list entirely rather than rendered body-less.
   */
  readonly body: string;
}

/**
 * Assemble the three Why-pillars (ADR 0097 #3). Two are fixed editorial
 * distillations of the OMI pattern (Observation→Inference, Models you
 * pressure-test); the middle "toolkit" pillar's body is PROJECTED from
 * `named_tools` and the pillar is omitted when no tools are declared. The
 * pillar order matches the prototype (observe · toolkit · models) when the
 * toolkit pillar is present.
 */
export function whyPillars(namedTools: NamedTools | undefined): WhyPillar[] {
  const toolkitBody = toolkitPillarBody(namedTools);
  const pillars: WhyPillar[] = [
    {
      key: "observation",
      glyph: "◐",
      heading: "Observation → Inference",
      body: "The sky gives you light; you extract the physics — a mass from an orbit, a temperature from a color.",
    },
  ];
  if (toolkitBody) {
    pillars.push({
      key: "toolkit",
      glyph: "∑",
      heading: "A toolkit that travels",
      body: toolkitBody,
    });
  }
  pillars.push({
    key: "models",
    glyph: "◇",
    heading: "Models you pressure-test",
    body: "Build a simplified model, then ask what it assumes and where it breaks — and what you can still trust when it does.",
  });
  return pillars;
}

/** Everything the Why band needs; a `null` band degrades to nothing. */
export interface WhyBandData {
  /** Projected lead clause; absent → no lead line. */
  readonly lead?: string;
  /** One or more pillars (always ≥2 fixed + optional projected toolkit). */
  readonly pillars: ReadonlyArray<WhyPillar>;
}

/**
 * Project the whole Why band from the `identity` + `pedagogy` clusters.
 * The band always renders (its pillars are fixed editorial); only the lead
 * and the toolkit pillar degrade. Returned as a single object so the
 * `.astro` piece stays presentational.
 */
export function whyBand(
  description: string | undefined,
  namedTools: NamedTools | undefined
): WhyBandData {
  return { lead: whyLead(description), pillars: whyPillars(namedTools) };
}

/** One step in the OMI flow: a label + its one-line caption. */
export interface FlowStep {
  /** Stable key — the original `required_moves` key. */
  readonly key: string;
  /** Humanized step label (`assumption-audit` → `Assumption audit`). */
  readonly label: string;
  /** The move's one-line description, verbatim from the spec. */
  readonly caption: string;
}

/**
 * Project `pedagogy.required_moves` (a `Record<slug, description>`) into
 * ordered flow steps. The REAL move keys + descriptions are used verbatim —
 * no hardcoded Observable/Model/Inference labels — so a course that renames
 * or reorders its moves renders its own. Record insertion order (the
 * author's YAML sequence) is preserved. Empty/absent → `[]` (the renderer
 * omits the whole How band, ADR 0097 #7).
 */
export function howFlow(requiredMoves: RequiredMoves | undefined): FlowStep[] {
  if (!requiredMoves) return [];
  return Object.entries(requiredMoves).map(([key, caption]) => ({
    key,
    label: humanizeSlug(key),
    caption,
  }));
}

/** The Track A / Track B note, projected from multi_track_readings. */
export interface TrackNote {
  /** Per-track label + duration, e.g. `{ label: "Track A", time: "20-min" }`. */
  readonly tracks: ReadonlyArray<{
    readonly label: string;
    readonly time: string;
  }>;
}

/**
 * Project the two-depth reading note from `multi_track_readings`. Degrades
 * on every absence path (ADR 0097 #7): absent cluster, `enabled: false`, or
 * an empty `tracks` array all yield `undefined` (the renderer omits the
 * note). The `deeper` flag isn't surfaced in the note copy — the labels +
 * times already communicate the A/B choice — but it's read off the same
 * tracks the loader validated.
 */
export function trackNote(
  multiTrack: MultiTrackReadings | undefined
): TrackNote | undefined {
  if (!multiTrack?.enabled || multiTrack.tracks.length === 0) {
    return undefined;
  }
  return {
    tracks: multiTrack.tracks.map((track) => ({
      label: track.label,
      time: track.target_time,
    })),
  };
}

/** Everything the How band needs; an empty `flow` degrades to nothing. */
export interface HowBandData {
  /** Ordered OMI flow steps; empty → the band is omitted. */
  readonly flow: ReadonlyArray<FlowStep>;
  /** Optional two-depth track note; absent → no note line. */
  readonly note?: TrackNote;
}

/**
 * Project the whole How band from the `pedagogy` cluster. When
 * `required_moves` is empty/absent the `flow` is empty and the `.astro`
 * piece renders nothing at all (no empty band).
 */
export function howBand(
  requiredMoves: RequiredMoves | undefined,
  multiTrack: MultiTrackReadings | undefined
): HowBandData {
  return { flow: howFlow(requiredMoves), note: trackNote(multiTrack) };
}
