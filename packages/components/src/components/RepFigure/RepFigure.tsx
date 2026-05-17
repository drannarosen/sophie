import styles from "./RepFigure.module.css.js";
import type { RepFigureProps } from "./RepFigure.schema.ts";

/**
 * RepFigure — figure-reference representation child of `<MultiRep>`.
 *
 * Renders a labeled reference to a `<Figure>` declared elsewhere in
 * the chapter (by `refName`). The optional `symbolLabel` declares the
 * symbol that appears IN the figure (axis label, diagram annotation,
 * etc.); the MR4 INFO audit nudges authors when the figure's alt
 * text doesn't mention `verbal_label` or `canonical_symbol`.
 *
 * The on-page rendering is a *binding declaration* — the figure itself
 * is rendered by the original `<Figure>` block. Future PRs (γ
 * extractor; ε aggregator) may swap `refName` for the resolved figure
 * ordinal + caption via pedagogy-index lookup; v1 renders the raw
 * `refName` as the reference handle.
 *
 * Per ADR 0058, RepFigure carries no `epistemicRole` — role lives on
 * the bound concept's Notation Registry entry.
 */
export function RepFigure({ refName, symbolLabel }: RepFigureProps) {
  return (
    <div className={styles.rep} data-rep-kind='figure'>
      <span className={styles.pill}>figure</span>
      <div className={styles.refLine}>
        <span className={styles.refArrow} aria-hidden>
          →
        </span>
        <span className={styles.refLabel}>see Fig.</span>
        <code className={styles.refName}>{refName}</code>
        {symbolLabel && (
          <>
            <span className={styles.refLabel}>(</span>
            <span className={styles.symbolLabel}>{symbolLabel}</span>
            <span className={styles.refLabel}>)</span>
          </>
        )}
      </div>
    </div>
  );
}
