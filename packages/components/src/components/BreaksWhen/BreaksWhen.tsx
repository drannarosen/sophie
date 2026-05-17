import { useId } from "react";
import styles from "./BreaksWhen.module.css.js";
import {
  BREAKS_WHEN_EPISTEMIC_ROLE,
  type BreaksWhenProps,
} from "./BreaksWhen.schema.ts";

/**
 * Biography child of `<KeyEquation>` declaring the equation's
 * validity-domain boundary per ADR 0046. Renders as Tier-3 chrome with
 * a leading "Breaks when" label and the body prose naming the
 * conditions under which the equation is no longer a useful
 * approximation.
 *
 * Role `"approximation"` per ADR 0058 — the equation is an idealization
 * that holds within named conditions; `<BreaksWhen>` is the canonical
 * marker for that contract.
 */
export function BreaksWhen({ children }: BreaksWhenProps) {
  const labelId = useId();
  return (
    <aside
      role='note'
      aria-labelledby={labelId}
      className={styles.breaksWhen}
      data-epistemic-role={BREAKS_WHEN_EPISTEMIC_ROLE}
    >
      <header className={styles.label}>
        <span id={labelId}>Breaks when</span>
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
