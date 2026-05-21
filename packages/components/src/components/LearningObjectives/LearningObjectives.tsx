import { Target } from "lucide-react";
import { MathText } from "../../runtime/MathText.tsx";
import { useInteractive } from "../../runtime/useInteractive.ts";
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
 * end of this lecture..." block as a checkable list of objectives.
 * Students mark objectives they feel confident about; state persists
 * across reloads.
 *
 * Per ADR 0027, must be used with `client:load` in MDX so each
 * instance becomes its own React island. `course`/`chapter`/`id`
 * thread the state into per-course IndexedDB; the context-from-parent
 * alternative does not work across the MDX render boundary.
 *
 * The `objectives` array is the runtime contract. Authors write
 * `<Objective>` children in MDX; the build-time remark transform
 * (`transformLearningObjectives` in `@sophie/astro`) harvests those
 * children into the prop before the React island hydrates. The
 * previous `Children.map` + `cloneElement` shape was abandoned because
 * Astro's island boundary serves children as server-rendered HTML
 * inside an `<astro-slot>` — the cloneElement guard fell open in
 * production and zero checkboxes rendered. Per ADR 0027, data crosses
 * the MDX render boundary as props, not as React children.
 *
 * Per-objective state shape: one IDB record per (course, chapter, id),
 * value is `Record<objectiveId, boolean>`. Centralizing state in the
 * parent lets the parent own the shared `useInteractive` call (and
 * its hydration-loading gate); `<Objective>` stays a pure-display
 * primitive that also serves the `/objectives` roll-up route.
 */
export function LearningObjectives({
  course,
  chapter,
  id,
  heading = "Learning Objectives",
  objectives,
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

  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <header className={styles.titleBar}>
        {/* Icon size matched to the smaller-label heading set in
            LearningObjectives.module.css (Sprint K). 16px target reads
            as inline-label glyph rather than card avatar. */}
        <Target className={styles.icon} size={16} aria-hidden />
        <MathText as='h2' id={`${id}-heading`} className={styles.heading}>
          {heading}
        </MathText>
      </header>
      <ul
        className={styles.list}
        aria-busy={controlProps["aria-busy"]}
        data-sophie-write-pending={controlProps["data-sophie-write-pending"]}
      >
        {objectives.map((o) => {
          const checked = stateRecord[o.id] ?? false;
          return (
            <Objective
              key={o.id}
              id={o.id}
              verb={o.verb}
              body={o.body}
              checked={checked}
              onToggle={() => {
                // Gate writes while loading so a click in the hydration
                // window doesn't get silently overwritten by the IDB
                // fetch's setLocalValue(initial). Mirrors the
                // `<InteractiveCheckbox>` convention; this is the
                // parent-aggregated equivalent.
                if (controlProps.disabled) return;
                setValue({ ...stateRecord, [o.id]: !checked });
              }}
            />
          );
        })}
      </ul>
    </section>
  );
}
