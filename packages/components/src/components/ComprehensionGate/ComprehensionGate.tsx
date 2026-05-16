import { Compass } from "lucide-react";
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

/**
 * Workstream 3 PR-8: Tier-1 card-strong chrome per
 * visual-polish-target.md. Compass Lucide icon left of the prompt in
 * the pale-brand-teal title bar; radio pills below in the white body.
 * Migrated from `<fieldset>/<legend>` to `<section role="radiogroup">`
 * so the title bar can render as a normal flex header without the
 * legend-in-fieldset positioning quirks.
 */
export function ComprehensionGate({
  course,
  chapter,
  id,
  prompt,
}: ComprehensionGateProps) {
  const groupName = useId();
  const labelId = useId();
  const { value, setValue, hydrated, controlProps } = useSelfAssessment<
    ComprehensionLevel | ""
  >(course, chapter, "comprehension", id, "");

  return (
    <div role='radiogroup' aria-labelledby={labelId} className={styles.section}>
      <header className={styles.titleBar}>
        <Compass className={styles.icon} size={20} aria-hidden />
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
      <HydrationAnnouncer
        hydrated={hydrated}
        label='Comprehension check ready'
      />
    </div>
  );
}
