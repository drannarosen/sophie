import { useId } from "react";
import { BuildTimeHtml } from "../../runtime/BuildTimeHtml.tsx";
import styles from "./Objective.module.css.js";
import type { ObjectiveProps } from "./Objective.schema.ts";

/**
 * `<Objective>` — pure-display primitive for one learning objective.
 *
 * Renders an `<li>` with `id="lo-${id}"`. When the parent
 * `<LearningObjectives>` injects `checked` + `onToggle` via the
 * `objectives` prop (populated by the remark transform that harvests
 * authored `<Objective>` MDX nodes), the row includes a checkbox for
 * student self-marking. When those props are absent (pure-display
 * callsites — e.g., the `/library/objectives` roll-up page), the checkbox is
 * omitted and only the verb + body render.
 *
 * `body` is an HTML string produced by `renderChildrenToHtml` at build
 * time from the authored MDX children. It originates from author-trusted
 * source (same trust boundary as MDX prose generally) and is injected
 * via the `<BuildTimeHtml>` chokepoint (ADR 0093) so inline emphasis,
 * links, and other markdown nodes survive the round-trip.
 */
export function Objective({
  id,
  verb,
  body,
  checked,
  onToggle,
}: ObjectiveProps) {
  const checkboxId = useId();
  const interactive = typeof checked === "boolean" && onToggle !== undefined;

  return (
    <li
      id={`lo-${id}`}
      className={
        interactive
          ? styles.objective
          : `${styles.objective} ${styles.displayOnly}`
      }
    >
      {interactive ? (
        <input
          id={checkboxId}
          type='checkbox'
          className={styles.checkbox}
          checked={checked}
          onChange={() => onToggle?.()}
        />
      ) : null}
      <label
        htmlFor={interactive ? checkboxId : undefined}
        className={styles.content}
      >
        <strong className={styles.verb}>{verb}</strong>{" "}
        {/* `<div>` rather than `<span>` so the HTML5 parser sees a
            flow-content container when `body` contains a wrapping
            `<p>` (the common mdast→html output for one-line prose).
            CSS sets `display: inline` to preserve the verb + body
            visual line. Without `<div>`, a `<p>` opening inside a
            `<span>` is structurally invalid; we avoid that even
            though it's not Bug 1's reproduction shape here (the
            parent is `<li>`, not chapter prose `<p>`). */}
        {/* body is build-time-serialized author MDX, never runtime
            input — same trust as MDX prose. */}
        <BuildTimeHtml
          as='div'
          className={styles.body}
          html={body}
          trust='mdx-serialized'
        />
      </label>
    </li>
  );
}
