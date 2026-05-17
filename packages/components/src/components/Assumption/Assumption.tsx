import { useId } from "react";
import styles from "./Assumption.module.css.js";
import {
  ASSUMPTION_EPISTEMIC_ROLE,
  type AssumptionProps,
} from "./Assumption.schema.ts";

/**
 * Biography child of `<KeyEquation>` declaring an explicit precondition on
 * the equation's validity per ADR 0046. Renders as Tier-3 chrome with a
 * leading "Assumption" label; when `type` is supplied, the slug is
 * rendered next to the label (e.g. "Assumption · thermal-equilibrium")
 * so the assumption-catalog binding is visible to readers and reviewers.
 *
 * `data-epistemic-role="assumption"` on root for E2E + extractor paths;
 * `data-assumption-type` exposed when `type` supplied for audit hooks
 * (mirrors `<RepEquation data-rep-kind>` pattern).
 */
export function Assumption({ type, children }: AssumptionProps) {
  const labelId = useId();
  return (
    <aside
      role='note'
      aria-labelledby={labelId}
      className={styles.assumption}
      data-epistemic-role={ASSUMPTION_EPISTEMIC_ROLE}
      data-assumption-type={type}
    >
      <header className={styles.label}>
        <span id={labelId}>Assumption</span>
        {type && (
          <>
            <span className={styles.separator} aria-hidden='true'>
              ·
            </span>
            <span className={styles.typeSlug}>{type}</span>
          </>
        )}
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
