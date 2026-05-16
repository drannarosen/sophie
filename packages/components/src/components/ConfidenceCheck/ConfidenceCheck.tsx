import { Gauge } from "lucide-react";
import { useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useSelfAssessment } from "../../runtime/useSelfAssessment.ts";
import styles from "./ConfidenceCheck.module.css.js";
import type { ConfidenceCheckProps } from "./ConfidenceCheck.schema.ts";

/**
 * Self-assessment widget — Likert confidence scale (5- or 7-point).
 *
 * Workstream 3 PR-8: Tier-1 card-strong chrome per visual-polish-target.md.
 * Gauge Lucide icon maps directly onto the Likert-dial metaphor (1→N =
 * needle position). Brand-violet accent — same family as KeyEquation's
 * "formal measurement" tone, vs the brand-teal "check" pedagogy.
 *
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
  const labelId = useId();
  const { value, setValue, hydrated, controlProps } = useSelfAssessment<number>(
    course,
    chapter,
    "confidence",
    id,
    0
  );
  const choices = Array.from({ length: scale }, (_, i) => i + 1);

  return (
    <div role='radiogroup' aria-labelledby={labelId} className={styles.section}>
      <header className={styles.titleBar}>
        <Gauge className={styles.icon} size={20} aria-hidden />
        <span id={labelId} className={styles.title}>
          {prompt}
        </span>
      </header>
      <div className={styles.body}>
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
      </div>
      <HydrationAnnouncer hydrated={hydrated} label='Confidence check ready' />
    </div>
  );
}
