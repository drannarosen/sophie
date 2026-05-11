import { useId } from "react";
import { HydrationAnnouncer } from "../../runtime/HydrationAnnouncer.tsx";
import { useSelfAssessment } from "../../runtime/useSelfAssessment.ts";
import styles from "./Reflection.module.css.js";
import type { ReflectionProps } from "./Reflection.schema.ts";

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
      <label htmlFor={textareaId} className={styles.label}>
        {prompt}
      </label>
      <textarea
        id={textareaId}
        className={styles.textarea}
        value={value}
        placeholder={placeholder}
        {...controlProps}
        onChange={(event) => setValue(event.target.value)}
      />
      <HydrationAnnouncer hydrated={hydrated} label='Reflection ready' />
    </div>
  );
}
