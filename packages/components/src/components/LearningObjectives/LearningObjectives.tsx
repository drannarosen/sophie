import { useId } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./LearningObjectives.module.css.js";
import type {
  LearningObjectivesProps,
  Objective,
} from "./LearningObjectives.schema.ts";

/**
 * Persistence-bearing chapter primitive. Renders the standard "By the
 * end of this lecture..." block as a checkable list — students can mark
 * objectives they feel confident about and the state persists across
 * reloads. Per ADR 0027, must be used with `client:load` in MDX so each
 * instance becomes its own React island. course/chapter/id thread the
 * state into per-course IndexedDB.
 */
export function LearningObjectives({
  course,
  chapter,
  id,
  objectives,
  heading = "Learning Objectives",
}: LearningObjectivesProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{heading}</h2>
      <ol className={styles.list}>
        {objectives.map((o) => (
          <ObjectiveRow
            key={o.id}
            course={course}
            chapter={chapter}
            componentId={id}
            objective={o}
          />
        ))}
      </ol>
    </section>
  );
}

function ObjectiveRow({
  course,
  chapter,
  componentId,
  objective,
}: {
  course: string;
  chapter: string;
  componentId: string;
  objective: Objective;
}) {
  const checkboxId = useId();
  const {
    value: checked,
    setValue: setChecked,
    status,
  } = useInteractive(
    course,
    chapter,
    `learning-objectives:${componentId}:${objective.id}:checked`,
    false
  );
  // Disable + signal busy until the IDB-hydrated value lands. Otherwise a
  // user click that lands between mount and IDB-fetch completion would be
  // overwritten by the fetch's `setLocalValue(persisted ?? initial)` call,
  // silently losing the click. Also gives screen readers an honest "this
  // control is updating" signal.
  const loading = status === "loading";

  return (
    <li className={styles.row}>
      <input
        id={checkboxId}
        className={styles.checkbox}
        type='checkbox'
        checked={checked}
        disabled={loading}
        aria-busy={loading}
        onChange={(event) => setChecked(event.target.checked)}
      />
      <label htmlFor={checkboxId} className={styles.label}>
        <strong className={styles.verb}>{objective.verb}</strong>{" "}
        {objective.body}
      </label>
    </li>
  );
}
