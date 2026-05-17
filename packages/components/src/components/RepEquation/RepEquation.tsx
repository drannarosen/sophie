import styles from "./RepEquation.module.css.js";
import type { RepEquationProps } from "./RepEquation.schema.ts";

/**
 * RepEquation — equation-reference representation child of `<MultiRep>`.
 *
 * Renders a labeled reference to a `<KeyEquation>` declared elsewhere
 * in the chapter (by `refKey`) along with the symbol that represents
 * the bound concept. The MR2 WARNING audit checks `symbol` against
 * the registry concept's `canonical_symbol`; the MR6 INFO audit
 * checks `equivalent_to` resolves to a `<KeyEquation>` in chapter
 * scope (or another `<RepEquation>` in the same MultiRep).
 *
 * The on-page rendering is a *binding declaration* — the equation
 * itself is rendered by the original `<KeyEquation>` block. Future
 * PRs (γ extractor; ε aggregator) may swap `refKey` for the
 * resolved equation title via pedagogy-index lookup; v1 renders the
 * raw `refKey` as the reference handle.
 *
 * Per ADR 0058, RepEquation carries no `epistemicRole` — role lives
 * on the bound concept's Notation Registry entry.
 */
export function RepEquation({
  refKey,
  symbol,
  equivalent_to,
  via,
}: RepEquationProps) {
  return (
    <div className={styles.rep} data-rep-kind='equation'>
      <span className={styles.pill}>equation</span>
      <div className={styles.refLine}>
        <span className={styles.refArrow} aria-hidden>
          →
        </span>
        <span className={styles.symbolLabel}>see</span>
        <code className={styles.refKey}>{refKey}</code>
        <span className={styles.symbolLabel}>(</span>
        <span className={styles.symbol}>{symbol}</span>
        <span className={styles.symbolLabel}>)</span>
      </div>
      {equivalent_to && (
        <div className={styles.equivLine}>
          equivalent to <code className={styles.refKey}>{equivalent_to}</code>
          {via && (
            <>
              {" "}
              via <code className={styles.equivVia}>{via}</code>
            </>
          )}
        </div>
      )}
    </div>
  );
}
