import { InteractiveCheckbox } from "../InteractiveCheckbox/InteractiveCheckbox.tsx";
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
 *
 * Each row is an `<InteractiveCheckbox>` so the disabled-while-loading
 * hydration guard is the default path (per
 * [coding-standards.md § Persistence-bearing controls]).
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
  return (
    <li className={styles.row}>
      <InteractiveCheckbox
        course={course}
        chapter={chapter}
        id={`${componentId}:${objective.id}`}
      >
        <strong className={styles.verb}>{objective.verb}</strong>{" "}
        {objective.body}
      </InteractiveCheckbox>
    </li>
  );
}
