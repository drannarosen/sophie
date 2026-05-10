import { useId } from "react";
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
  const { value, setValue, controlProps } = useSelfAssessment<string>(
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
    </div>
  );
}
