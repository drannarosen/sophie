import { BuildTimeHtml } from "../../runtime/BuildTimeHtml.tsx";
import styles from "./RepVerbal.module.css.js";
import type { RepVerbalProps } from "./RepVerbal.schema.ts";

/**
 * RepVerbal — prose representation child of `<MultiRep>`.
 *
 * Two render modes:
 * - **Author mode** (used in MDX source + author-side Storybook):
 *   inline `children` rendered verbatim as React nodes. The build-time
 *   `transformMultiRep` extractor walks these and serializes the prose
 *   into a `body` HTML string on the parent's `reps` array.
 * - **Extractor-fed mode** (used at runtime after `transformMultiRep`
 *   mutates the AST): `body` is the HTML string `renderChildrenToHtml`
 *   produced from the authored MDX children — inline emphasis, links,
 *   code spans already serialized. Injected via the `<BuildTimeHtml>`
 *   chokepoint (ADR 0093)
 *   so the markup survives the round-trip; matches the `<Objective>`
 *   precedent (`Objective.tsx`'s body rendering). Without this, React
 *   escapes the HTML string and the reader sees literal `<em>m</em>`
 *   text instead of italicized *m*.
 *
 * Per ADR 0058, RepVerbal carries no `epistemicRole` — role lives on
 * the bound concept's Notation Registry entry per the 2026-05-17
 * design hardening §D3 (registry as canonical concept-catalog).
 */
export function RepVerbal({ children, body }: RepVerbalProps) {
  return (
    <div className={styles.rep} data-rep-kind='verbal'>
      <span className={styles.pill}>verbal</span>
      {children !== undefined ? (
        <div className={styles.body}>{children}</div>
      ) : body !== undefined ? (
        // body is build-time-serialized author MDX from
        // renderChildrenToHtml (same trust boundary as <Objective>'s
        // body) — never runtime input.
        <BuildTimeHtml
          as='div'
          className={styles.body}
          html={body}
          trust='mdx-serialized'
        />
      ) : (
        <div className={styles.body} />
      )}
    </div>
  );
}
