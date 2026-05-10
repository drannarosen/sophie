import { type UseInteractiveResult, useInteractive } from "./useInteractive.ts";

/**
 * Names of self-assessment widget types in the family. Each widget's
 * persistence is keyed under `self-assessment:${widget}:${id}` so the
 * Phase 5 instructor dashboard can query the IDB by key range.
 */
export type SelfAssessmentWidget =
  | "confidence"
  | "comprehension"
  | "effort"
  | "reflection";

/**
 * Persistence-bearing hook for the self-assessment family. Thin wrapper
 * over `useInteractive` that enforces the standardized key prefix
 * `self-assessment:${widget}:${id}`. Returns the same `{value, setValue,
 * status, error, hydrated, controlProps}` shape so consumers can spread
 * `controlProps` per the coding-standards "Persistence-bearing controls"
 * rule.
 *
 * Per ADR 0027: course/chapter/id thread per-instance hydration across
 * the Astro MDX render boundary.
 */
export function useSelfAssessment<T>(
  course: string,
  chapter: string,
  widget: SelfAssessmentWidget,
  id: string,
  initial: T
): UseInteractiveResult<T> {
  return useInteractive(
    course,
    chapter,
    `self-assessment:${widget}:${id}`,
    initial
  );
}
