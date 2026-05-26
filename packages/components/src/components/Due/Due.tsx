import styles from "./Due.module.css.js";

export interface DueProps {
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** Optional kind label — "reading" / "homework" / "exam" / etc. */
  of?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inline chrome component declaring a due date. Authors drop this
 * into chapter MDX: `<Due date="2026-09-15" of="homework" />`.
 *
 * v0.2 requires the explicit `date` prop. The original design also
 * declared a schema-lookup fallback (`<Due />` reads chapter context
 * + schedule.yaml), but schedule.yaml is deferred per Anna's H6 to
 * a follow-up sprint. When ScheduleSchema ships, the schema-lookup
 * branch lands additively — the prop API stays the same so existing
 * call sites keep working.
 *
 * Rendered as `<time datetime>` for semantic markup. Chrome (not
 * pedagogy) per ADR 0058 — no epistemic role declared.
 */
export function Due({ date, of }: DueProps) {
  if (!ISO_DATE_RE.test(date)) {
    throw new Error(
      `[sophie] <Due date="${date}">: date must be ISO YYYY-MM-DD (e.g. "2026-09-15"). ` +
        `Schema-lookup fallback (no date prop) ships with the schedule.yaml + iCal sprint.`
    );
  }

  // Parse as UTC to avoid TZ-shift surprises when the date is rendered
  // in a different TZ at SSR vs client. Then format using browser/Node
  // locale.
  const [y, m, d] = date.split("-").map(Number);
  const parsed = new Date(
    Date.UTC(y as number, (m as number) - 1, d as number)
  );
  const formatted = parsed.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <span className={styles.due} data-due-date={date}>
      <span className={styles.label}>Due</span>
      <time dateTime={date}>{formatted}</time>
      {of && (
        <span className={styles.of} data-due-of={of}>
          · {of}
        </span>
      )}
    </span>
  );
}
