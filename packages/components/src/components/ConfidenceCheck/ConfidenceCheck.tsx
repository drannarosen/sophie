import { useId } from "react";
import { useSelfAssessment } from "../../runtime/useSelfAssessment.ts";
import styles from "./ConfidenceCheck.module.css.js";
import type { ConfidenceCheckProps } from "./ConfidenceCheck.schema.ts";

/**
 * Self-assessment widget — Likert confidence scale (5- or 7-point).
 * Spreads `controlProps` per coding-standards "Persistence-bearing
 * controls" so radios are disabled-while-loading. No pre-selection
 * (sentinel value 0) so students aren't biased toward neutral.
 *
 * Persistence: `self-assessment:confidence:${id}` → number (1..scale)
 * or 0 (no choice yet).
 */
export function ConfidenceCheck({
  course,
  chapter,
  id,
  prompt,
  scale = 5,
}: ConfidenceCheckProps) {
  const groupName = useId();
  const { value, setValue, controlProps } = useSelfAssessment<number>(
    course,
    chapter,
    "confidence",
    id,
    0
  );
  const choices = Array.from({ length: scale }, (_, i) => i + 1);

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>{prompt}</legend>
      <div className={styles.scale}>
        {choices.map((n) => (
          <label key={n} className={styles.option}>
            <input
              type='radio'
              name={groupName}
              className={styles.radio}
              value={n}
              checked={value === n}
              {...controlProps}
              onChange={() => setValue(n)}
            />
            <span>{n}</span>
          </label>
        ))}
      </div>
      <div className={styles.endpointLabels}>
        <span>Not at all sure</span>
        <span>Very sure</span>
      </div>
    </fieldset>
  );
}
