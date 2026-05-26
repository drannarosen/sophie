import { useCourseSpec } from "../../runtime/course-spec-store.ts";
import styles from "./Points.module.css.js";

export interface PointsProps {
  /** Refs `grading.categories[*].id` in course.sophie.yaml. */
  category: string;
  /** Optional per-instance point value. */
  value?: number;
}

/**
 * Inline chrome component surfacing an assessment's points + grading
 * category. Authors drop this into chapter MDX on assignments,
 * exams, in-line problems — e.g. `<Points value={20} category="homework" />`.
 *
 * Hybrid props-or-schema per the design doc § "Course-management
 * chrome components": the `category` ref looks up
 * `grading.categories[id]` to render the category name + weight; the
 * `value` prop is an explicit per-instance override. Schema-default
 * is the universal path; explicit form is for edge cases.
 *
 * Chrome (not pedagogy) per ADR 0058 — no epistemic role declared.
 * Inline element (no landmark); axe-clean via no a11y violations on
 * the rendered span.
 */
export function Points({ category, value }: PointsProps) {
  const spec = useCourseSpec();
  const cat = spec.grading.categories.find((c) => c.id === category);
  if (!cat) {
    throw new Error(
      `[sophie] <Points category="${category}">: category not declared in ` +
        `course.sophie.yaml's grading.categories. Known: ` +
        `${spec.grading.categories.map((c) => c.id).join(", ")}.`
    );
  }

  const percent = Math.round(cat.weight * 100);

  return (
    <span
      className={styles.points}
      data-points-category={category}
      data-points-value={value}
    >
      {value !== undefined && (
        <>
          <span className={styles.value}>{value} pts</span>
          <span className={styles.divider} aria-hidden='true'>
            ·
          </span>
        </>
      )}
      <span className={styles.category}>{cat.name}</span>
      <span className={styles.weight}>{percent}%</span>
    </span>
  );
}
