import styles from "./QuickCheck.module.css.js";
import {
  type QuickCheckPromptProps,
  type QuickCheckProps,
  QuickCheckPropsSchema,
} from "./QuickCheck.schema.ts";

/**
 * `<QuickCheck.Prompt>` — compound prompt slot. Renders inside the
 * parent section body; carries no landmark of its own (the parent
 * section already labels the region per R10).
 */
function QuickCheckPrompt({ children }: QuickCheckPromptProps) {
  return <div className={styles.prompt}>{children}</div>;
}

/**
 * Free-response formative shell — see QuickCheck.schema.ts for the
 * design rationale + author-surface example.
 *
 * Implementation notes:
 *
 * - The shell owns no IDB key itself and sets up no React Context; its
 *   `course`/`unit`/`id` props are the source-of-truth that the Sophie
 *   remark plugin reads at MDX compile time, then threads down to
 *   nested `<Solution>` / `<Hint>` children as their explicit
 *   `course`/`unit`/`parentId` props.
 *
 * - R10 landmark: `<section aria-labelledby={`${id}-label`}>` (the
 *   labeled-region pattern; never `<main>` which would collide with
 *   the chapter layout). The label `<h3>` is visible.
 *
 * - Schema is parsed at render entry — missing `course`/`unit`/`id`
 *   throws a curated Zod error immediately.
 */
export function QuickCheck(props: QuickCheckProps) {
  const { id, children } = QuickCheckPropsSchema.parse(props);
  return (
    <section
      className={styles.root}
      data-pedagogy-role='quickcheck'
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>
        Quick check
      </h3>
      {children}
    </section>
  );
}

QuickCheck.Prompt = QuickCheckPrompt;
