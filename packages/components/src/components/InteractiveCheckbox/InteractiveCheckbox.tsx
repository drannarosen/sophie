import { useId } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./InteractiveCheckbox.module.css.js";
import type { InteractiveCheckboxProps } from "./InteractiveCheckbox.schema.ts";

/**
 * Persistence-bearing checkbox primitive. Spreads `controlProps` from
 * `useInteractive` automatically so the disabled-while-loading
 * hydration guard is the default path. Use this rather than rolling
 * your own checkbox + useInteractive call when the layout is
 * a simple checkbox + label pair.
 */
export function InteractiveCheckbox({
  course,
  chapter,
  id,
  initial = false,
  children,
  className,
}: InteractiveCheckboxProps) {
  const checkboxId = useId();
  const {
    value: checked,
    setValue,
    controlProps,
  } = useInteractive(
    course,
    chapter,
    `interactive-checkbox:${id}:checked`,
    initial
  );

  const rowClass = className ? `${styles.row} ${className}`.trim() : styles.row;

  return (
    <span className={rowClass}>
      <input
        id={checkboxId}
        type='checkbox'
        className={styles.checkbox}
        checked={checked}
        {...controlProps}
        onChange={(event) => setValue(event.target.checked)}
      />
      <label htmlFor={checkboxId} className={styles.label}>
        {children}
      </label>
    </span>
  );
}
