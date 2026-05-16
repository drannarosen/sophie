import { ClipboardList } from "lucide-react";
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

/**
 * Workstream 3 PR-8: Tier-1 card-strong chrome per
 * visual-polish-target.md. ClipboardList Lucide icon left of the
 * prompt in the pale-brand-teal title bar; radio pills below.
 * Same shape as ComprehensionGate; same Tier-1 anatomy.
 */
export function EffortLog({ course, chapter, id, prompt }: EffortLogProps) {
  const groupName = useId();
  const labelId = useId();
  const { value, setValue, hydrated, controlProps } = useSelfAssessment<
    EffortLevel | ""
  >(course, chapter, "effort", id, "");

  return (
    <div role='radiogroup' aria-labelledby={labelId} className={styles.section}>
      <header className={styles.titleBar}>
        <ClipboardList className={styles.icon} size={20} aria-hidden />
        <span id={labelId} className={styles.title}>
          {prompt}
        </span>
      </header>
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
    </div>
  );
}
