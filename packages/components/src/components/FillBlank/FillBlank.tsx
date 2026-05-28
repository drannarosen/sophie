import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./FillBlank.module.css.js";
import {
  type FillBlankPromptProps,
  type FillBlankProps,
  FillBlankPropsSchema,
  type FillBlankSlotProps,
} from "./FillBlank.schema.ts";

interface FillBlankScope {
  course: string;
  unit: string;
  parentId: string;
}

/**
 * `<FillBlank.Prompt>` — inline prose slot. Renders as a `<div>` inside
 * the section body; embedded slot inputs flow inline.
 */
function FillBlankPrompt({ children }: FillBlankPromptProps) {
  return <div className={styles.prompt}>{children}</div>;
}

/**
 * `<FillBlank.Slot>` — a declarative data-carrier that renders NOTHING
 * on its own (mirrors `<MCQ.Choice>` / `<Tab>`). The parent
 * `<FillBlank>` reads its `id` / `correct` props and renders the real
 * input in place via `FillBlankInput`. Rendering null is load-bearing:
 * Astro re-renders a `client:load` island's children as light DOM for
 * hydration (`await-children`), and a data-carrier that tried to render
 * a real input there — outside the parent's namespace — would crash
 * that pass. The extractor reads `id` / `correct` from the MDX AST
 * independently (AS-3).
 */
function FillBlankSlot(_props: FillBlankSlotProps): null {
  return null;
}
FillBlankSlot.displayName = "FillBlank.Slot";

/**
 * Internal controlled input the parent renders at each slot position.
 * Receives its namespace as PROPS from `<FillBlank>` (never context):
 * props survive Astro's separate island-children render pass, a runtime
 * context provider would not. Persists raw input under
 * `fillblank:${parentId}:${slotId}:value`; v1 does not grade.
 */
function FillBlankInput({
  course,
  unit,
  parentId,
  slotId,
}: FillBlankScope & { slotId: string }) {
  const inputId = useId();
  const { value, setValue, controlProps } = useInteractive<string>(
    course,
    unit,
    `fillblank:${parentId}:${slotId}:value`,
    ""
  );

  return (
    <input
      id={inputId}
      type='text'
      className={styles.slot}
      value={value}
      aria-label={`blank ${slotId}`}
      {...controlProps}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

/**
 * Recursively rebuild the prompt tree, replacing each declarative
 * `<FillBlank.Slot>` with a `FillBlankInput` carrying the parent scope,
 * and throwing on a duplicate slot id. The parent owns this rewrite —
 * the shipped `<Tabs>`/`<MCQ>` pattern (declarative null child + parent
 * emits the rendered tree) — so the inputs render inside `<FillBlank>`'s
 * own output with their namespace as props.
 */
function renderScopedPrompt(
  node: ReactNode,
  scope: FillBlankScope,
  seenSlotIds: Set<string>
): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<{ children?: ReactNode }>;
    if (element.type === FillBlankSlot) {
      const { id } = element.props as unknown as FillBlankSlotProps;
      if (seenSlotIds.has(id)) {
        throw new Error(
          `<FillBlank> duplicate slot id "${id}". Slot ids must be unique within a single <FillBlank>.`
        );
      }
      seenSlotIds.add(id);
      return <FillBlankInput {...scope} slotId={id} />;
    }
    const grandchildren = element.props.children;
    if (grandchildren === undefined) return element;
    return cloneElement(
      element,
      undefined,
      renderScopedPrompt(grandchildren, scope, seenSlotIds)
    );
  });
}

/**
 * Fill-in-the-blank formative parent — see FillBlank.schema.ts for
 * design rationale + author surface.
 *
 * R10 landmark: `<section aria-labelledby={`${id}-label`}>`. The prompt
 * is rebuilt by `renderScopedPrompt` (declarative `<FillBlank.Slot>` →
 * controlled input, namespace threaded as props); duplicate slot ids
 * throw during that single rewrite pass.
 */
export function FillBlank(props: FillBlankProps) {
  const { course, unit, id, children } = FillBlankPropsSchema.parse(props);
  const scoped = renderScopedPrompt(
    children,
    { course, unit, parentId: id },
    new Set<string>()
  );

  return (
    <section
      className={styles.root}
      data-pedagogy-role='fill-blank'
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>
        Fill in the blank
      </h3>
      {scoped}
    </section>
  );
}

FillBlank.Prompt = FillBlankPrompt;
FillBlank.Slot = FillBlankSlot;
