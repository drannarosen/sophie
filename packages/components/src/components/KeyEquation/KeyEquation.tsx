import { useId } from "react";
import styles from "./KeyEquation.module.css.js";
import type { KeyEquationProps } from "./KeyEquation.schema.ts";

/**
 * Named-equation content block. Wraps framing prose + an MDX-rendered
 * `$$...$$` KaTeX equation + variable definitions + insights in a
 * styled `<section role="region">` landmark with a stable DOM id.
 *
 * Content-only: no persistence, no `client:load` directive in MDX.
 * The required `id` prop is the outer DOM id (for hash anchors like
 * `#wiens-law` and future cross-references); a separate `useId()`
 * generates the internal aria-labelledby wiring so it doesn't collide
 * across multiple instances on the same page.
 */
export function KeyEquation({ id, title, children }: KeyEquationProps) {
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId} className={styles.section}>
      <p id={titleId} className={styles.title}>
        {title}
      </p>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
