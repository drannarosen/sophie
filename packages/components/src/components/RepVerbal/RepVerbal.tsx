import styles from "./RepVerbal.module.css.js";
import type { RepVerbalProps } from "./RepVerbal.schema.ts";

/**
 * RepVerbal — prose representation child of `<MultiRep>`.
 *
 * Two render modes:
 * - **Author mode** (used in MDX source): inline children rendered
 *   verbatim. The build-time `transformMultiRep` extractor (PR-γ)
 *   walks these and serializes the prose into a `body` string on
 *   the parent's `reps` array.
 * - **Extractor-fed mode** (used by `<MultiRep>` runtime + Storybook
 *   fixtures): `body` prop rendered as a paragraph. Either mode is
 *   valid; the renderer uses whichever is present.
 *
 * Per ADR 0058, RepVerbal carries no `epistemicRole` — role lives on
 * the bound concept's Notation Registry entry per the 2026-05-17
 * design hardening §D3 (registry as canonical concept-catalog).
 */
export function RepVerbal({ children, body }: RepVerbalProps) {
  return (
    <div className={styles.rep} data-rep-kind='verbal'>
      <span className={styles.pill}>verbal</span>
      <div className={styles.body}>{children ?? body}</div>
    </div>
  );
}
