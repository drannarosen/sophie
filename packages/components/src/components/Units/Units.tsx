import styles from "./Units.module.css.js";
import type { UnitsProps } from "./Units.schema.ts";

/**
 * Biography child of `<KeyEquation>` declaring the unit attached to one
 * of the equation's symbols per ADR 0046 + 2026-05-17 design §D1. NOT
 * a Tier-3 chrome card — this is structured metadata rendered inline
 * (each Units child is a compact `symbol [unit]` pair) so multiple
 * Units children stack into a horizontal "units strip" below the
 * equation body.
 *
 * No epistemicRole — ADR 0058 §"chrome": <Units> is descriptive
 * metadata, not epistemic content. The audit (PR-δ NR1/NR3/NR4) uses
 * the (symbol, unit) pair to align against the NotationRegistry
 * declared in `notation-registry.yaml`; the binding lives in registry,
 * not on this entry.
 *
 * Symbol is a raw TeX string (e.g., `\lambda_{peak}`); the renderer
 * displays it in monospace. KaTeX rendering of the symbol is deferred
 * to a future enhancement — at v1 the symbol surfaces as authored so
 * the (symbol → registry) audit join is exact-match.
 */
export function Units({ symbol, unit }: UnitsProps) {
  return (
    <span
      className={styles.units}
      data-units-symbol={symbol}
      data-units-unit={unit}
    >
      <span className={styles.symbol}>{symbol}</span>
      <span className={styles.bracket} aria-hidden='true'>
        [
      </span>
      <span className={styles.unit}>{unit}</span>
      <span className={styles.bracket} aria-hidden='true'>
        ]
      </span>
    </span>
  );
}
