import { useId } from "react";
import styles from "./Observable.module.css.js";
import {
  OBSERVABLE_EPISTEMIC_ROLE,
  type ObservableProps,
} from "./Observable.schema.ts";

/**
 * Biography child of `<KeyEquation>` declaring the equation's observable
 * — the measured / observed phenomenon the equation models. Renders as
 * Tier-3 chrome (subordinate to the parent KeyEquation Tier-1 card)
 * with a leading "Observable" label and the body prose.
 *
 * `data-epistemic-role="observable"` on root surfaces the role to E2E
 * hooks + the PR-γ extractor's data-attribute path (mirrors
 * `<RepVerbal data-rep-kind>` precedent from MultiRep). The runtime
 * role const is exported from the schema file for the AI-authoring
 * ledger (ADR 0042) and the queryable-epistemic surface (design §F5).
 */
export function Observable({ children }: ObservableProps) {
  const labelId = useId();
  return (
    <aside
      role='note'
      aria-labelledby={labelId}
      className={styles.observable}
      data-epistemic-role={OBSERVABLE_EPISTEMIC_ROLE}
    >
      <header className={styles.label}>
        <span id={labelId}>Observable</span>
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
