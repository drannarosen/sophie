import { PauseCircle } from "lucide-react";
import { useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useSelfAssessment } from "../../runtime/useSelfAssessment.ts";
import styles from "./Reflection.module.css.js";
import type { ReflectionProps } from "./Reflection.schema.ts";

/**
 * Workstream 3 PR-9: Tier-1 card-strong chrome per
 * visual-polish-target.md. PauseCircle Lucide icon reads as "stop and
 * think" — the pedagogical verb for reflection. Brand-rose accent
 * pairs with Predict in the elicitation family (self-disclosure).
 */
export function Reflection({
  course,
  chapter,
  id,
  prompt,
  placeholder,
}: ReflectionProps) {
  const textareaId = useId();
  const { value, setValue, hydrated, controlProps } = useSelfAssessment<string>(
    course,
    chapter,
    "reflection",
    id,
    ""
  );

  return (
    <div className={styles.section}>
      <header className={styles.titleBar}>
        <PauseCircle className={styles.icon} size={20} aria-hidden />
        <label htmlFor={textareaId} className={styles.title}>
          {prompt}
        </label>
      </header>
      <div className={styles.body}>
        <textarea
          id={textareaId}
          className={styles.textarea}
          value={value}
          placeholder={placeholder}
          {...controlProps}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
      <HydrationAnnouncer hydrated={hydrated} label='Reflection ready' />
    </div>
  );
}
