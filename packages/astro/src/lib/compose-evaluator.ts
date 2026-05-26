import type {
  Accessibility,
  Contact,
  CourseInfoFragment,
  CourseSpec,
  Grading,
  Objective,
  OfficeHour,
  Prereq,
} from "@sophie/core/schema";

/**
 * The seven known compose data keys per CourseSpec v0.2. Mirrors the
 * `KNOWN_COMPOSE_DATA_KEYS` set in course-spec-v02-info-pages.ts —
 * schema-validation rejects compose entries that aren't either one of
 * these OR a `prose/<slug>` regex match. The evaluator can therefore
 * trust the entry shape and only needs to runtime-check that the
 * referenced spec field is populated.
 *
 * `schedule_overview` is a derived view (computed from schedule.yaml
 * + per-unit due dates) that ships in the iCal follow-up sprint per
 * Anna's H6 decision. For v0.2 it's accepted by the schema but the
 * evaluator throws when it's actually referenced (deferred).
 */
const KNOWN_DATA_KEYS = [
  "objectives",
  "prereqs",
  "grading",
  "office_hours",
  "accessibility",
  "contact",
  "schedule_overview",
] as const;

type ComposedDataValue =
  | { key: "objectives"; value: ReadonlyArray<Objective> }
  | { key: "prereqs"; value: ReadonlyArray<Prereq> }
  | { key: "grading"; value: Grading }
  | { key: "office_hours"; value: ReadonlyArray<OfficeHour> }
  | { key: "accessibility"; value: Accessibility }
  | { key: "contact"; value: Contact };

export type ComposedDataItem = ComposedDataValue & { kind: "data" };

export interface ProseFragmentRef {
  slug: string;
  frontmatter: CourseInfoFragment;
}

export interface ComposedProseItem {
  kind: "prose";
  slug: string;
  frontmatter: CourseInfoFragment;
}

export type ComposedItem = ComposedDataItem | ComposedProseItem;

export interface EvaluateComposeArgs {
  compose: ReadonlyArray<string> | undefined;
  spec: CourseSpec;
  /** Map of "prose/<slug>" → fragment ref. Caller pre-loads from astro:content. */
  proseLookup: Readonly<Record<string, ProseFragmentRef>>;
}

/**
 * Evaluate an `info_pages.<slug>.compose` list into an ordered array
 * of structural items. Data entries carry the spec value at evaluation
 * time; prose entries carry the fragment ref + frontmatter so the
 * caller (info-page.astro) can render the MDX content alongside.
 *
 * **Invariants:**
 * - Order is preserved exactly as authored (data + prose can interleave).
 * - Unknown data keys are caught by schema validation upstream (the
 *   strict union in InfoPagesSchema); we still throw a curated error
 *   on missing spec fields (e.g. compose: ['contact'] when no
 *   contact: block in the spec).
 * - Unknown prose refs throw with the full ref in the error message
 *   so authors can locate the typo.
 *
 * Pure function — no I/O, no astro:content dep. The caller passes the
 * pre-loaded proseLookup so this stays testable in isolation.
 */
export function evaluateCompose({
  compose,
  spec,
  proseLookup,
}: EvaluateComposeArgs): ComposedItem[] {
  if (!compose) return [];

  return compose.map((entry) => {
    if (entry.startsWith("prose/")) {
      const ref = proseLookup[entry];
      if (!ref) {
        throw new Error(
          `[sophie] compose evaluator: prose ref '${entry}' not found in course-info content collection. ` +
            `Check src/content/course-info/${entry.replace("prose/", "")}.mdx exists and frontmatter is valid.`
        );
      }
      return { kind: "prose", slug: ref.slug, frontmatter: ref.frontmatter };
    }

    return resolveDataKey(entry, spec);
  });
}

function resolveDataKey(key: string, spec: CourseSpec): ComposedDataItem {
  switch (key) {
    case "objectives": {
      const value = spec.objectives;
      if (!value || value.length === 0) {
        throw new Error(
          "[sophie] compose evaluator: compose: ['objectives'] declared but spec.objectives is empty/absent. " +
            "Add objectives: [...] to course.sophie.yaml or remove the compose entry."
        );
      }
      return { kind: "data", key: "objectives", value };
    }
    case "prereqs": {
      const value = spec.prereqs;
      if (!value || value.length === 0) {
        throw new Error(
          "[sophie] compose evaluator: compose: ['prereqs'] declared but spec.prereqs is empty/absent."
        );
      }
      return { kind: "data", key: "prereqs", value };
    }
    case "grading":
      return { kind: "data", key: "grading", value: spec.grading };
    case "office_hours": {
      const value = spec.office_hours;
      if (!value || value.length === 0) {
        throw new Error(
          "[sophie] compose evaluator: compose: ['office_hours'] declared but spec.office_hours is empty/absent."
        );
      }
      return { kind: "data", key: "office_hours", value };
    }
    case "contact": {
      const value = spec.contact;
      if (!value) {
        throw new Error(
          "[sophie] compose evaluator: compose: ['contact'] declared but spec.contact is absent."
        );
      }
      return { kind: "data", key: "contact", value };
    }
    case "accessibility": {
      const value = spec.accessibility;
      if (!value) {
        throw new Error(
          "[sophie] compose evaluator: compose: ['accessibility'] declared but spec.accessibility is absent."
        );
      }
      return { kind: "data", key: "accessibility", value };
    }
    case "schedule_overview":
      throw new Error(
        "[sophie] compose evaluator: compose: ['schedule_overview'] is reserved for the iCal/schedule.yaml follow-up sprint (Anna's H6 decision, 2026-05-26). Drop this entry or wait for that sprint."
      );
    default:
      // Schema validation upstream should have caught this. Defensive
      // throw — schema and evaluator must agree on the data-key set.
      throw new Error(
        `[sophie] compose evaluator: unknown data key '${key}'. ` +
          `Known keys: ${KNOWN_DATA_KEYS.join(", ")}.`
      );
  }
}
