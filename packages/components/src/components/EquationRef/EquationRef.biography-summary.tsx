import type { Biography } from "@sophie/core/schema";
import styles from "./EquationRef.module.css.js";

/**
 * Compact-biography summary line for the `<EquationRef>` hover popover
 * per ADR 0046 design §"Surface 1: hover (compact summary)".
 *
 * Rendered shape (varies by what's populated):
 *   "2 assumptions · 1 misuse"
 *   "1 assumption · 3 misuses · valid in: thermal-equilibrium"
 *   "valid in: thermal-equilibrium"
 *
 * Returns `null` when the biography is empty / undefined — keeps the
 * popover lean when no biography is authored (per-equation opt-in per
 * ADR 0046). Extracted to its own module so the conditional rendering
 * branches are unit-testable; Radix HoverCard popover content isn't
 * reachable in jsdom (see EqRef.test.tsx file-level comment).
 */
export function BiographySummary({
  biography,
}: {
  biography: Biography | undefined;
}) {
  if (!biography) return null;
  const assumptionCount = biography.assumptions.length;
  const misuseCount = biography.common_misuses.length;
  const firstAssumptionType = biography.assumptions.find(
    (a) => a.type !== undefined
  )?.type;

  const countParts: string[] = [];
  if (assumptionCount > 0) {
    countParts.push(
      `${assumptionCount} ${assumptionCount === 1 ? "assumption" : "assumptions"}`
    );
  }
  if (misuseCount > 0) {
    countParts.push(
      `${misuseCount} ${misuseCount === 1 ? "misuse" : "misuses"}`
    );
  }

  if (countParts.length === 0 && !firstAssumptionType) return null;

  return (
    <div className={styles.biography} data-sophie-equation-biography=''>
      {countParts.length > 0 && (
        <span className={styles.biographyCounts}>{countParts.join(" · ")}</span>
      )}
      {firstAssumptionType && (
        <span className={styles.biographyValid}>
          {countParts.length > 0 && " · "}valid in:{" "}
          <span className={styles.biographyValidSlug}>
            {firstAssumptionType}
          </span>
        </span>
      )}
    </div>
  );
}
