import { useId } from "react";
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
 * callsites — e.g., the `/objectives` roll-up page), the checkbox is
 * omitted and only the verb + body render.
 *
 * `body` is an HTML string produced by `renderChildrenToHtml` at build
 * time from the authored MDX children. It originates from author-trusted
 * source (same trust boundary as MDX prose generally) and is injected
 * via `dangerouslySetInnerHTML` so inline emphasis, links, and other
 * markdown nodes survive the round-trip.
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
        <span
          className={styles.body}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: body is build-time-serialized author MDX, never runtime input — same trust as MDX prose
          dangerouslySetInnerHTML={{ __html: body }}
        />
      </label>
    </li>
  );
}
