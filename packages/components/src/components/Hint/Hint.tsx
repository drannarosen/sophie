import * as Accordion from "@radix-ui/react-accordion";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Hint.module.css.js";
import { type HintProps, HintPropsSchema } from "./Hint.schema.ts";

const HINT_SLUG = "hint";

/**
 * Reveal-child for the formative family — see Hint.schema.ts for the
 * design rationale + author-surface example.
 *
 * Implementation notes:
 *
 * - Radix Accordion single-item form parallel to `<Solution>`; the
 *   `number` prop is part of the persistence-key identity so two
 *   `<Hint>` siblings with `number={1}` and `number={2}` get
 *   independent IDB entries.
 *
 * - `course`/`unit`/`parentId` are explicit props injected by the
 *   Sophie remark plugin at MDX compile time from the wrapping
 *   formative parent's attributes (parallel to `<Solution>`). React
 *   Context cannot thread these in Astro's MDX island model.
 *
 * - `useHydrated()` gates the Accordion machinery so the SSR pass
 *   emits an empty container with the print-mode hook + epistemic
 *   data attribute. Authors must opt this into hydration via
 *   `client:load` on the wrapping formative parent.
 *
 * - The `sophie-reveal` global class is the print-mode contract hook
 *   shared with `<Solution>` (textbook-layout.css). Handouts print
 *   all hints expanded.
 */
export function Hint(props: HintProps) {
  const { course, unit, parentId, number, label, children } =
    HintPropsSchema.parse(props);
  const hydrated = useHydrated();
  const {
    value: openSlugs,
    setValue: setOpenSlugs,
    controlProps,
  } = useInteractive<string[]>(
    course,
    unit,
    `hint:${parentId}:${number}:open`,
    []
  );

  if (!hydrated) {
    return (
      <div
        className={`${styles.root} sophie-reveal`}
        data-pedagogy-role='hint'
      />
    );
  }

  const triggerLabel = label ?? `Hint ${number}`;

  return (
    <Accordion.Root
      type='multiple'
      value={openSlugs}
      onValueChange={(next) => setOpenSlugs(next)}
      className={`${styles.root} sophie-reveal`}
      data-pedagogy-role='hint'
    >
      <Accordion.Item value={HINT_SLUG} className={styles.item}>
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
