import styles from "./PracticeProblem.module.css.js";
import {
  type PracticeProblemPromptProps,
  type PracticeProblemProps,
  PracticeProblemPropsSchema,
} from "./PracticeProblem.schema.ts";

/**
 * `<PracticeProblem.Prompt>` — compound prompt slot. Renders inside
 * the parent section body; carries no landmark of its own (the parent
 * section already labels the region per R10).
 */
function PracticeProblemPrompt({ children }: PracticeProblemPromptProps) {
  return <div className={styles.prompt}>{children}</div>;
}

/**
 * Formative shell — see PracticeProblem.schema.ts for the design
 * rationale + author-surface example.
 *
 * Implementation notes:
 *
 * - The shell owns no IDB key itself and sets up no React Context;
 *   its `course`/`unit`/`id` props are the source-of-truth that the
 *   Sophie remark plugin reads at MDX compile time, then threads down
 *   to nested `<Solution>` and `<Hint>` children as their explicit
 *   `course`/`unit`/`parentId` props. Compile-time threading is the
 *   only shape that survives Astro's MDX island model (each top-level
 *   JSX SSRs as its own React tree; Context cannot span siblings).
 *
 * - R10 landmark: `<section aria-labelledby={`${id}-label`}>` (the
 *   labeled-region pattern; never `<main>` which would collide with
 *   the chapter layout). The label `<h3>` is visible — it doubles as
 *   the section's accessible name and as a visual pedagogy header.
 *
 * - Schema is parsed at render entry — missing `course`/`unit`/`id`
 *   throws a curated Zod error immediately. Matches the loud-fail
 *   contract from `<Video>` (provider/src refine) and `<Dropdown>`
 *   (slug collision throw).
 */
export function PracticeProblem(props: PracticeProblemProps) {
  const { id, children } = PracticeProblemPropsSchema.parse(props);
  return (
    <section
      className={styles.root}
      data-pedagogy-role='practice-problem'
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>
        Practice problem
      </h3>
      {children}
    </section>
  );
}

PracticeProblem.Prompt = PracticeProblemPrompt;
