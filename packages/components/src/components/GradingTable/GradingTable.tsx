import type { Grading } from "@sophie/core/schema";
import styles from "./GradingTable.module.css.js";

export interface GradingTableProps {
  grading: Grading;
  title?: string;
}

/**
 * Renders the course grading scheme: category weights (sum to 1.0)
 * + letter-grade scale. Two adjacent tables share one named-region
 * landmark per R10 (nested under page <main>).
 *
 * Percentages render as `Math.round(weight * 100)%` to match how
 * students read grading rubrics — fractional weights are spec-
 * internal, percentages are the consumer-facing render. Sum-to-1.0
 * is invariant-checked at schema parse time so we don't re-validate.
 *
 * `drop_lowest` is an inline annotation per category, not a separate
 * column — keeps the primary table scannable; the annotation
 * surfaces only when the category opts in.
 */
export function GradingTable({
  grading,
  title = "Grading",
}: GradingTableProps) {
  const headingId = "grading-section-heading";

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.title}>
        {title}
      </h2>

      <table className={styles.table}>
        <caption>Grade categories</caption>
        <thead>
          <tr>
            <th scope='col'>Category</th>
            <th scope='col' className={styles.weight}>
              Weight
            </th>
          </tr>
        </thead>
        <tbody>
          {grading.categories.map((cat) => (
            <tr key={cat.id}>
              <td>
                {cat.name}
                {cat.drop_lowest !== undefined && cat.drop_lowest > 0 && (
                  <span className={styles.note}>
                    {" "}
                    (drop lowest {cat.drop_lowest})
                  </span>
                )}
              </td>
              <td className={styles.weight}>{Math.round(cat.weight * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className={styles.subTitle}>Letter scale</h3>
      <table className={styles.table}>
        <caption>Minimum percentage for each letter grade</caption>
        <thead>
          <tr>
            <th scope='col'>Grade</th>
            <th scope='col' className={styles.weight}>
              Minimum %
            </th>
          </tr>
        </thead>
        <tbody>
          {grading.letter_scale.map((entry) => (
            <tr key={entry.grade}>
              <td>{entry.grade}</td>
              <td className={styles.weight}>{entry.min}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
