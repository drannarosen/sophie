import { PauseCircle } from "lucide-react";
import { useId } from "react";
import { ChromeTitleBar } from "../../primitives/ChromeTitleBar/ChromeTitleBar.tsx";
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
      <ChromeTitleBar
        accent='rose'
        icon={PauseCircle}
        heading={prompt}
        headingAs='label'
        headingFor={textareaId}
      />
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
