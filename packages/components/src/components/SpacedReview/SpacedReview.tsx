import type { PracticeAttempt } from "@sophie/core/schema";
import { Children, isValidElement, type ReactNode, useMemo } from "react";
import { useInteractiveRange } from "../../runtime/useInteractiveRange.ts";
import { humanLabelFromTarget } from "../retrieval/humanLabel.ts";
import { selectLeastRecentlyAttempted } from "../retrieval/lruScheduler.ts";
import styles from "./SpacedReview.module.css.js";
import type { SpacedReviewProps } from "./SpacedReview.schema.ts";

const EMPTY_SLOT = "SpacedReview.Empty";
const DEFAULT_MAX = 3;
const PRACTICE_ATTEMPT_PREFIX = "practice-attempt:";

function EmptySlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
EmptySlot.displayName = EMPTY_SLOT;

/**
 * `<SpacedReview>` — queued review surface (Wedge B1).
 *
 * @example
 * ```mdx
 * {/* End-of-reading review for one pedagogy-graph node *\/}
 * <SpacedReview
 *   client:load
 *   course="astr201"
 *   chapter="spoiler-alerts"
 *   target="topic:logarithms"
 *   max={3}
 * />
 *
 * {/* Author-overridden empty state *\/}
 * <SpacedReview course="astr201" chapter="ch1" target="topic:logs">
 *   <SpacedReview.Empty>Practice ahead on logarithms?</SpacedReview.Empty>
 * </SpacedReview>
 * ```
 *
 * Composes `useInteractiveRange` to read all `practice-attempt:*`
 * records persisted in (course, chapter), runs the LRU stub scheduler
 * over them (replaced by FSRS in Wedge D), and renders up to `max`
 * "Review: <target>" items per Wedge B1 design doc §1 option (1).
 *
 * `section`-scope is stubbed for Wedge B1; it currently returns no
 * items pending the Section/pedagogy-index lookup wire-up.
 */
export function SpacedReview({
  course,
  chapter,
  target,
  section,
  max = DEFAULT_MAX,
  children,
}: SpacedReviewProps) {
  const { values: rawValues } = useInteractiveRange<readonly PracticeAttempt[]>(
    course,
    chapter,
    PRACTICE_ATTEMPT_PREFIX
  );

  // Flatten the per-target attempt arrays into a single list for the
  // scheduler; only `target_id` + `updated_at` are needed.
  const flatAttempts = useMemo(() => {
    const out: Array<{ target_id: string; updated_at: string }> = [];
    for (const list of Object.values(rawValues)) {
      for (const attempt of list) {
        out.push({
          target_id: attempt.target_id,
          updated_at: attempt.updated_at,
        });
      }
    }
    return out;
  }, [rawValues]);

  const dueTargets = useMemo(() => {
    if (target !== undefined) {
      // Single-target scope: render one "Review: <target>" card iff the
      // student has attempted this exact target at least once. `max`
      // applies to multi-target scopes (section=) where distinct
      // target_ids would compete for slots; for a single target, the
      // surface is at most 1 row regardless of `max`.
      //
      // Running the LRU over a prefix-scoped queue and then filtering to
      // the exact target would silently hide the target when it's not in
      // the top-`max` least-recently-attempted of its prefix — a real
      // correctness bug caught in the 2026-05-22 quality audit.
      const hit = selectLeastRecentlyAttempted({
        attempts: flatAttempts.filter((a) => a.target_id === target),
        max: 1,
      });
      return hit;
    }
    if (section !== undefined) {
      // TODO Wedge B-follow-up: pedagogy-index lookup for section scope
      // will resolve `section` to its constituent target_ids, then run
      // `selectLeastRecentlyAttempted` with the supplied `max` over the
      // resolved attempt set. For B1, the lookup is stubbed and `max` is
      // unused on this path; surface no items so the empty-state
      // placeholder renders.
      void max;
      return [];
    }
    return [];
  }, [flatAttempts, target, section, max]);

  const emptyChild = useMemo(() => {
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) continue;
      const displayName = (child.type as { displayName?: string }).displayName;
      if (displayName === EMPTY_SLOT) return child;
    }
    return null;
  }, [children]);

  if (dueTargets.length === 0) {
    return (
      <section
        className={`${styles.region} sophie-spaced-review`}
        aria-label='Spaced review'
      >
        {emptyChild ?? (
          <p className={styles.emptyDefault}>
            No items due for review yet — they'll appear as you work through the
            prompts above.
          </p>
        )}
      </section>
    );
  }

  return (
    <section
      className={`${styles.region} sophie-spaced-review`}
      aria-label='Spaced review'
    >
      <h3 className={styles.heading}>Spaced review</h3>
      <ul className={styles.list}>
        {dueTargets.map((targetId) => (
          <li
            key={targetId}
            data-testid='spaced-review-item'
            className={styles.item}
          >
            <span className={styles.itemLabel}>
              Review: {humanLabelFromTarget(targetId)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

SpacedReview.Empty = EmptySlot;
