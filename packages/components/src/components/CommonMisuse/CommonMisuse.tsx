import { useId } from "react";
import styles from "./CommonMisuse.module.css.js";
import type { CommonMisuseProps } from "./CommonMisuse.schema.ts";

/**
 * Biography child of `<KeyEquation>` declaring a common student misuse
 * of the equation per ADR 0046. Renders as Tier-3 chrome with a
 * leading "Common misuse" label; when `misconception` is supplied,
 * the slug is rendered next to the label (e.g. "Common misuse · wiens-
 * law-absorption-spectra") so the cross-ref to the misconception
 * graph (ADR 0044) is visible to readers and reviewers.
 *
 * NO own `epistemicRole` — the linked misconception node carries
 * `"misconception"` per ADR 0058. This entry inherits the role
 * indirectly via the cross-ref rather than duplicating it.
 * `data-misconception-ref` exposed when `misconception` supplied so
 * audit (PR-δ E9) + future cross-link rendering can resolve the link
 * without re-parsing the label.
 */
export function CommonMisuse({ misconception, children }: CommonMisuseProps) {
  const labelId = useId();
  return (
    <aside
      role='note'
      aria-labelledby={labelId}
      className={styles.commonMisuse}
      data-misconception-ref={misconception}
    >
      <header className={styles.label}>
        <span id={labelId}>Common misuse</span>
        {misconception && (
          <>
            <span className={styles.separator} aria-hidden='true'>
              ·
            </span>
            <span className={styles.misconceptionSlug}>{misconception}</span>
          </>
        )}
      </header>
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
