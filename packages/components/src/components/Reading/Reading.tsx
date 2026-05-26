import styles from "./Reading.module.css.js";

export interface ReadingProps {
  /** Free-form citation — e.g. "Carroll & Ostlie §6.3". Prose-string-typed for v1 per YAGNI. */
  source: string;
  /** Page range — e.g. "247-260". Optional. */
  pages?: string;
}

/**
 * Inline chrome component citing a reading assignment. Authors drop
 * this into chapter MDX: `<Reading source="Carroll & Ostlie §6.3"
 * pages="247-260" />`.
 *
 * **Prose-string-typed for v1** per the design doc + AGENTS.md
 * YAGNI: structured `{ textbook_id, chapter, pages: { start, end } }`
 * has no second caller until a textbook-reading-list page exists.
 * Graduate to structured when a real consumer appears.
 *
 * Chrome (not pedagogy) per ADR 0058 — no epistemic role declared.
 */
export function Reading({ source, pages }: ReadingProps) {
  return (
    <span className={styles.reading} data-reading-source={source}>
      <span className={styles.icon}>Reading:</span>
      <span className={styles.source}>{source}</span>
      {pages && (
        <span className={styles.pages} data-reading-pages={pages}>
          pp. {pages}
        </span>
      )}
    </span>
  );
}
