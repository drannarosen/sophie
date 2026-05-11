import { useId } from "react";
import styles from "./MiniGlossary.module.css.js";
import type { MiniGlossaryProps } from "./MiniGlossary.schema.ts";
import { slugifyTerm } from "./slugifyTerm.ts";

export function MiniGlossary({ id, title, lede, terms }: MiniGlossaryProps) {
  const titleId = useId();
  const seen = new Map<string, number>();
  return (
    <section id={id} aria-labelledby={titleId} className={styles.section}>
      <h3 id={titleId} className={styles.title}>
        {title}
      </h3>
      {lede !== undefined && <p className={styles.lede}>{lede}</p>}
      <dl className={styles.list}>
        {terms.map(({ term, definition }) => {
          const slug = slugifyTerm(term, seen);
          const termId = `${id}-term-${slug}`;
          return (
            <div key={termId} className={styles.row}>
              <dt id={termId} className={styles.term}>
                {term}
              </dt>
              <dd className={styles.definition}>{definition}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
