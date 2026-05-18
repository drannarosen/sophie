import { useId } from "react";
import styles from "./DerivationStep.module.css.js";
import {
  DERIVATION_STEP_EPISTEMIC_ROLE,
  type DerivationStepProps,
} from "./DerivationStep.schema.ts";

/**
 * Biography child rendered inside an equation registry MDX body per
 * ADR 0046 §R9 (added by the ADR 0060 registry-ecosystem brainstorm).
 * Renders as Tier-3 chrome with a "Step" label, optional author-
 * supplied step title, and the body prose containing the math /
 * intuition for that step.
 *
 * `data-epistemic-role="model"` on root surfaces the role to E2E
 * hooks + the PR-γ extractor's data-attribute path (mirrors the
 * Observable / Assumption / BreaksWhen / CommonMisuse precedent).
 */
export function DerivationStep({ label, children }: DerivationStepProps) {
  const labelId = useId();
  return (
    <aside
      role='note'
      aria-labelledby={labelId}
      className={styles.derivationStep}
      data-epistemic-role={DERIVATION_STEP_EPISTEMIC_ROLE}
      data-derivation-label={label}
    >
      <header className={styles.label}>
        <span id={labelId}>Step</span>
        {label && (
          <>
            <span className={styles.separator} aria-hidden='true'>
              ·
            </span>
            <span className={styles.stepLabel}>{label}</span>
          </>
        )}
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
