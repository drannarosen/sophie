import type { AssignmentRegistry } from "@sophie/core/schema";

/**
 * ADR 0080 Amendment 3 — cross-file membership check for assignment kinds.
 *
 * When a consumer declares an `assignment_kinds` map in `course.sophie.yaml`,
 * every `kind` in `assignments.sophie.yaml` must be a declared key. This is a
 * convention, not a constraint: declaring the map opts into typo protection +
 * AI-authoring legibility (ADR 0030). Absent map → free slugs with humanized
 * fallback (no check).
 *
 * The check lives in `@sophie/astro` (called from `astro:config:setup`), NOT
 * `@sophie/core` (ADR 0001 framework-purity): `@sophie/core` validates the
 * map's *shape* only; the cross-FILE membership check needs both files, which
 * are visible only at config-setup. Mirrors ADR 0096's deferred `unit`/`id`
 * cross-refine — same machinery, not a new concept.
 *
 * This helper itself stays framework-pure (no fs, no Astro imports — two typed
 * inputs) so it's unit-testable without the integration harness.
 *
 * @param assignments parsed assignments registry, or `null` when absent.
 * @param declared the course-spec `assignment_kinds` map, or `undefined` when
 *   the consumer didn't declare one.
 * @throws Error naming every offending kind + its assignment id (collected, not
 *   first-only, for a better author experience) when any kind is undeclared.
 */
export function assertAssignmentKindsDeclared(
  assignments: AssignmentRegistry | null,
  declared: Readonly<Record<string, string>> | undefined
): void {
  if (declared === undefined) return;
  if (assignments === null) return;

  const offenders = assignments.assignments.filter(
    (a) => !Object.hasOwn(declared, a.kind)
  );
  if (offenders.length === 0) return;

  const declaredList = Object.keys(declared).join(", ");
  const offenderList = offenders
    .map((a) => `assignment "${a.id}" has kind "${a.kind}"`)
    .join("; ");
  throw new Error(
    `[sophie] assignments.sophie.yaml: ${offenderList} which is not declared ` +
      `in course.sophie.yaml assignment_kinds (declared: ${declaredList}). ` +
      "Add it there or remove the typo."
  );
}
