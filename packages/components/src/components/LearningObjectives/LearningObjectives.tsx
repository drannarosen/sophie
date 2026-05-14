import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
} from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import type { ObjectiveProps } from "../Objective/Objective.schema.ts";
import { Objective } from "../Objective/Objective.tsx";
import styles from "./LearningObjectives.module.css.js";
import type { LearningObjectivesProps } from "./LearningObjectives.schema.ts";

/**
 * Stable reference for the initial state passed to `useInteractive`.
 * `useInteractive`'s hydration `useEffect` includes `initial` in its
 * dependency array; passing a fresh `{}` literal each render would
 * retrigger hydration on every render and leave the component
 * permanently in `loading`. Module-scoped so every instance shares
 * one reference. Treated as readonly at the type level — `setValue`
 * always passes a fresh object.
 */
const EMPTY_RECORD: Record<string, boolean> = Object.freeze({});

/**
 * Persistence-bearing chapter primitive. Renders the standard "By the
 * end of this lecture..." block as a checkable list of `<Objective>`
 * children. Students mark objectives they feel confident about; state
 * persists across reloads.
 *
 * Per ADR 0027, must be used with `client:load` in MDX so each
 * instance becomes its own React island. `course`/`chapter`/`id`
 * thread the state into per-course IndexedDB; the context-from-parent
 * alternative does not work across the MDX render boundary.
 *
 * Per-objective state shape: one IDB record per (course, chapter, id),
 * value is `Record<objectiveId, boolean>`. The PR-C3 children-mode
 * refactor centralizes state in the parent so the parent owns the
 * shared `useInteractive` call (and its hydration-loading gate),
 * injecting `checked` + `onToggle` into each `<Objective>` child via
 * `React.Children.map` + `cloneElement`. Pure-display `<Objective>`
 * callsites (e.g., the `/objectives` roll-up page) omit the injection
 * and render without a checkbox.
 */
export function LearningObjectives({
  course,
  chapter,
  id,
  heading = "Learning Objectives",
  children,
}: LearningObjectivesProps) {
  const {
    value: stateRecord,
    setValue,
    controlProps,
  } = useInteractive<Record<string, boolean>>(
    course,
    chapter,
    `learning-objectives:${id}:checked`,
    EMPTY_RECORD
  );

  const wrappedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type !== Objective) return child;
    const objectiveChild = child as ReactElement<ObjectiveProps>;
    const objectiveId = objectiveChild.props.id;
    if (objectiveId === undefined || objectiveId === "") return child;
    const checked = stateRecord[objectiveId] ?? false;
    return cloneElement<ObjectiveProps>(objectiveChild, {
      checked,
      onToggle: () => {
        // Gate writes while loading so a click in the hydration window
        // doesn't get silently overwritten by the IDB fetch's
        // setLocalValue(initial). The `controlProps` flag mirrors
        // `<InteractiveCheckbox>`'s convention; this is the parent-
        // aggregated equivalent.
        if (controlProps.disabled) return;
        setValue({ ...stateRecord, [objectiveId]: !checked });
      },
    });
  });

  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        {heading}
      </h2>
      <ul
        className={styles.list}
        aria-busy={controlProps["aria-busy"] ? "true" : "false"}
      >
        {wrappedChildren}
      </ul>
    </section>
  );
}
