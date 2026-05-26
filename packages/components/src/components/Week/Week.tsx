import styles from "./Week.module.css.js";

export interface WeekProps {
  /** Week number (1-indexed). */
  n: number;
}

/**
 * Inline chrome component declaring a week-of-term label. Authors
 * drop this into chapter MDX: `<Week n={4} />` → "Week 4".
 *
 * v0.2 requires explicit `n`. The original design also declared a
 * schema-lookup fallback (derive from schedule.yaml + today's date),
 * but schedule.yaml is deferred per Anna's H6. When ScheduleSchema
 * lands the schema-lookup branch ships additively — explicit `n`
 * stays the override path.
 *
 * Chrome (not pedagogy) per ADR 0058 — no epistemic role declared.
 */
export function Week({ n }: WeekProps) {
  if (!Number.isInteger(n)) {
    throw new Error(
      `[sophie] <Week n={${n}}>: n must be an integer (got ${n}).`
    );
  }
  if (n < 1) {
    throw new Error(
      `[sophie] <Week n={${n}}>: n must be a positive integer (got ${n}).`
    );
  }

  return (
    <span className={styles.week} data-week-n={n}>
      <span className={styles.label}>Week</span>
      <span className={styles.number}>{n}</span>
    </span>
  );
}
