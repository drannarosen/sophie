import { useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useSelfAssessment } from "../../runtime/useSelfAssessment.ts";
import styles from "./ComprehensionGate.module.css.js";
import type {
  ComprehensionGateProps,
  ComprehensionLevel,
} from "./ComprehensionGate.schema.ts";

const OPTIONS: ReadonlyArray<{ value: ComprehensionLevel; label: string }> = [
  { value: "got-it", label: "I got it" },
  { value: "revisit", label: "I need to revisit" },
  { value: "stuck", label: "I'm stuck" },
];

export function ComprehensionGate({
  course,
  chapter,
  id,
  prompt,
}: ComprehensionGateProps) {
  const groupName = useId();
  const { value, setValue, hydrated, controlProps } = useSelfAssessment<
    ComprehensionLevel | ""
  >(course, chapter, "comprehension", id, "");

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
      <HydrationAnnouncer
        hydrated={hydrated}
        label='Comprehension check ready'
      />
    </fieldset>
  );
}
