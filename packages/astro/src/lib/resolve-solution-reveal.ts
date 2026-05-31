import type { AssignmentRegistry } from "@sophie/core/schema";

/**
 * Resolve a chapter's solution reveal date, then decide visibility.
 *
 * **Fail-closed by construction** (ADR 0096): any non-concrete, absent, or
 * future date → hidden. A mistake here leaks assignment answers early, so the
 * default for every ambiguous branch is "hidden".
 *
 * `explicit` is the per-chapter `solutionsRevealDate` override:
 * - `"tbd"` → hidden (instructor hasn't set a date yet).
 * - a date string → use it verbatim.
 * - `null` / `undefined` → derive from the assignments registry: the latest
 *   concrete `dueDate` among assignments whose `problems[].unit` includes
 *   `unit` (ignoring `"tbd"` dueDates). No concrete date → hidden.
 *
 * `now` is INJECTED (the build wall-clock), never read inside the resolver,
 * so this function stays pure and fully testable.
 */
export function isChapterRevealed(
  unit: string,
  explicit: string | null | undefined,
  registry: AssignmentRegistry | null,
  now: Date
): boolean {
  const resolved = resolveRevealDate(unit, explicit, registry);
  if (resolved === null) return false; // fail-closed
  return now.getTime() >= resolved.getTime();
}

/**
 * Resolve a chapter's reveal date without deciding visibility. Returns the
 * concrete `Date` the solutions become visible, or `null` when no concrete
 * date applies (`"tbd"`, absent override + no matching assignment, etc.).
 * Exported so the Solutions route can surface the date to
 * `<SolutionsPlaceholder>` while `isChapterRevealed` makes the gate decision
 * off the same resolution.
 *
 * The reveal keys off `problems` PRESENCE, not on `kind` (ADR 0096
 * Amendment 1): an assignment without `problems` (a project, a memo) never
 * contributes a reveal date; one whose `problems[].unit` includes `unit`
 * does. The `problems?.some(...)` is optional-aware so the filter never
 * touches a missing `problems` array.
 */
export function resolveRevealDate(
  unit: string,
  explicit: string | null | undefined,
  registry: AssignmentRegistry | null
): Date | null {
  if (explicit === "tbd") return null;
  if (explicit) return new Date(explicit);
  if (!registry) return null;
  const due = registry.assignments
    .filter((a) => a.problems?.some((g) => g.unit === unit))
    .map((a) => a.dueDate)
    .filter((d): d is string => d !== "tbd");
  if (due.length === 0) return null; // no concrete date → hidden
  // ISO `YYYY-MM-DD` strings sort lexicographically == chronologically, so the
  // string max is the latest date without any timezone-dependent Date parsing.
  return new Date(due.reduce((a, b) => (a > b ? a : b)));
}
