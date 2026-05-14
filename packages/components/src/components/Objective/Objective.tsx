import { useId } from "react";
import styles from "./Objective.module.css.js";
import type { ObjectiveProps } from "./Objective.schema.ts";

/**
 * `<Objective>` — pure-display primitive for one learning objective.
 *
 * Renders an `<li>` with `id="lo-${id}"`. When the parent
 * `<LearningObjectives>` injects `checked` + `onToggle` (via
 * `React.Children.map` + `cloneElement`), the row includes a checkbox
 * for student self-marking. When those props are absent (pure-display
 * callsites — e.g., the `/objectives` roll-up page), the checkbox is
 * omitted and only the verb + body render.
 *
 * Per ADR 0027: course/chapter persistence is the parent's
 * responsibility; this component is framework-pure display. The remark
 * pedagogy-index extractor walks `<Objective>` flow elements nested
 * inside `<LearningObjectives>` to populate `PedagogyIndex.objectives`.
 */
export function Objective({
  id,
  verb,
  children,
  checked,
  onToggle,
}: ObjectiveProps) {
  const checkboxId = useId();
  const interactive = typeof checked === "boolean" && onToggle !== undefined;

  return (
    <li
      id={`lo-${id}`}
      className={
        interactive
          ? styles.objective
          : `${styles.objective} ${styles.displayOnly}`
      }
    >
      {interactive ? (
        <input
          id={checkboxId}
          type='checkbox'
          className={styles.checkbox}
          checked={checked}
          onChange={() => onToggle?.()}
        />
      ) : null}
      <label
        htmlFor={interactive ? checkboxId : undefined}
        className={styles.content}
      >
        <strong className={styles.verb}>{verb}</strong>{" "}
        <span className={styles.body}>{children}</span>
      </label>
    </li>
  );
}
