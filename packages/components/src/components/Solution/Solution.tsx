import * as Accordion from "@radix-ui/react-accordion";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Solution.module.css.js";
import { type SolutionProps, SolutionPropsSchema } from "./Solution.schema.ts";

const SOLUTION_SLUG = "solution";

/**
 * Reveal-child for the formative family — see Solution.schema.ts for
 * the design rationale + author-surface example.
 *
 * Implementation notes:
 *
 * - Radix Accordion is the shared chrome shape (parallel to
 *   `<Dropdown>`); single-item form with the slug `"solution"`. State
 *   storage is `string[]` ([] closed / ["solution"] open) — the
 *   multi-shape carried through even with one item keeps the same
 *   serialization story as the rest of the formative family.
 *
 * - `course`/`unit`/`parentId` are explicit props injected by the
 *   Sophie remark plugin at MDX compile time from the wrapping
 *   formative parent's attributes. React Context cannot thread these
 *   in Astro's MDX island model (each top-level JSX SSRs as its own
 *   React tree); compile-time prop threading is the only shape that
 *   works.
 *
 * - `useHydrated()` gates the Accordion machinery so the SSR pass
 *   emits an empty container with the print-mode hook (`sophie-reveal`)
 *   + epistemic data attribute. Authors must opt this into hydration
 *   via `client:load` on the parent — `<PracticeProblem>` shell or the
 *   wrapping formative parent. Without hydration the reveal is print-
 *   only (still useful for handouts).
 *
 * - The `sophie-reveal` global class is the print-mode contract hook
 *   — `textbook-layout.css` force-expands any element under
 *   `.sophie-reveal [data-state]` so handouts print open.
 */
export function Solution(props: SolutionProps) {
  const { course, unit, parentId, label, children } =
    SolutionPropsSchema.parse(props);
  const hydrated = useHydrated();
  const {
    value: openSlugs,
    setValue: setOpenSlugs,
    controlProps,
  } = useInteractive<string[]>(course, unit, `solution:${parentId}:open`, []);

  if (!hydrated) {
    // SSR fallback: empty container with the print-mode hook +
    // epistemic data attribute. Hydration mounts the full Accordion.
    return (
      <div
        className={`${styles.root} sophie-reveal`}
        data-pedagogy-role='solution'
      />
    );
  }

  const isOpen = openSlugs.includes(SOLUTION_SLUG);
  const triggerLabel = label ?? (isOpen ? "Hide solution" : "Show solution");

  return (
    <Accordion.Root
      type='multiple'
      value={openSlugs}
      onValueChange={(next) => setOpenSlugs(next)}
      className={`${styles.root} sophie-reveal`}
      data-pedagogy-role='solution'
    >
      <Accordion.Item value={SOLUTION_SLUG} className={styles.item}>
        <Accordion.Header className={styles.header}>
          <Accordion.Trigger {...controlProps} className={styles.trigger}>
            <span className={styles.chevron} aria-hidden='true' />
            <span className={styles.label}>{triggerLabel}</span>
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Content className={styles.content}>
          {children}
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>
  );
}
