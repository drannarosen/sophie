import type { Objective } from "@sophie/core/schema";
import { useId } from "react";
import styles from "./ObjectivesSection.module.css.js";

export interface ObjectivesSectionProps {
  objectives: ReadonlyArray<Objective>;
  title?: string;
}

/**
 * Course-level objectives section. Composes inside SyllabusPage and
 * other info-page layouts that declare `compose: ['objectives', ...]`.
 *
 * R10 landmark choice: `<section aria-labelledby>` — this is a
 * NESTED region under the page-level `<main>` (which the .astro
 * layout owns). Per the post-W4c R10 doctrine: when a component
 * lives inside another landmark, declare it as a named-region
 * `<section>`, not `<main>` or `<article>`.
 *
 * `assessed_by` badges reference `grading.categories[*].id`. The
 * cross-refine on `CourseSpecSchema` (added per Phase 1-4 review I3)
 * rejects any objective whose `assessed_by` entry doesn't exist in
 * the declared grading categories, so this component renders without
 * runtime referential checks — schema parse is the gate.
 */
export function ObjectivesSection({
  objectives,
  title = "Course Objectives",
}: ObjectivesSectionProps) {
  const headingId = useId();

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>
      <ul className={styles.list}>
        {objectives.map((obj) => (
          <li key={obj.id} className={styles.item}>
            <p>
              <span className={styles.verb}>{obj.verb}</span>
              <span className={styles.body}>{obj.body}</span>
            </p>
            {obj.assessed_by && obj.assessed_by.length > 0 && (
              <div className={styles.assessedBy}>
                <span>Assessed by:</span>
                {obj.assessed_by.map((ref) => (
                  <span key={ref} className={styles.badge}>
                    {ref}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
