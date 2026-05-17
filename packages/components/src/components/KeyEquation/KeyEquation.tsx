import { Sigma } from "lucide-react";
import { useId } from "react";
import styles from "./KeyEquation.module.css.js";
import type { KeyEquationProps } from "./KeyEquation.schema.ts";

/**
 * Named-equation content block. Wraps framing prose + an MDX-rendered
 * `$$...$$` KaTeX equation + variable definitions + insights in a
 * styled `<section role="region">` landmark with a stable DOM id.
 *
 * Workstream 3 PR-7: Tier-1 card-strong chrome per
 * visual-polish-target.md — 4px violet left rule, pale-violet
 * title-bar tint with the Sigma Lucide icon, drop shadow, 5px radius.
 * Reuses the Callout anatomy with Tier-1 differentiators (heavier
 * rule, drop shadow, 20px icon).
 *
 * Content-only: no persistence, no `client:load` directive in MDX.
 * The required `id` prop is the outer DOM id (for hash anchors like
 * `#wiens-law` and future cross-references); a separate `useId()`
 * generates the internal aria-labelledby wiring so it doesn't collide
 * across multiple instances on the same page.
 */
export function KeyEquation({ id, title, children }: KeyEquationProps) {
  // `symbols` is intentionally NOT destructured into the render — it's
  // author-declared metadata consumed by the PR-γ extractor + PR-δ NR
  // audit invariants. Surfacing it in the rendered DOM would duplicate
  // the (symbol → registry) source of truth without a render-side use.
  const titleId = useId();
  return (
    <section id={id} aria-labelledby={titleId} className={styles.section}>
      <header className={styles.titleBar}>
        <Sigma className={styles.icon} size={20} aria-hidden />
        <span id={titleId} className={styles.title}>
          {title}
        </span>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
