import { useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useSelfAssessment } from "../../runtime/useSelfAssessment.ts";
import styles from "./EffortLog.module.css.js";
import type { EffortLevel, EffortLogProps } from "./EffortLog.schema.ts";

const OPTIONS: ReadonlyArray<{ value: EffortLevel; label: string }> = [
  { value: "skimmed", label: "Skimmed" },
  { value: "read", label: "Read" },
  { value: "studied", label: "Studied" },
];

export function EffortLog({ course, chapter, id, prompt }: EffortLogProps) {
  const groupName = useId();
  const { value, setValue, hydrated, controlProps } = useSelfAssessment<
    EffortLevel | ""
  >(course, chapter, "effort", id, "");

  return (
    <fieldset className={styles.section}>
      <legend className={styles.legend}>{prompt}</legend>
      <div className={styles.options}>
        {OPTIONS.map((opt) => (
          <label key={opt.value} className={styles.option}>
            <input
              type='radio'
              name={groupName}
              className={styles.radio}
              value={opt.value}
              checked={value === opt.value}
              {...controlProps}
              onChange={() => setValue(opt.value)}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
      <HydrationAnnouncer hydrated={hydrated} label='Effort log ready' />
    </fieldset>
  );
}
