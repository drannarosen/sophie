import * as Checkbox from "@radix-ui/react-checkbox";
import { slugify } from "@sophie/core/schema";
import { Children, isValidElement, type ReactNode } from "react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./MultiSelect.module.css.js";
import {
  type MultiSelectChoiceProps,
  type MultiSelectPromptProps,
  type MultiSelectProps,
  MultiSelectPropsSchema,
} from "./MultiSelect.schema.ts";

/**
 * Concatenate the visible text of a ReactNode tree. Used to derive a
 * choice slug from its rendered label when no explicit `id` is given —
 * the runtime slug only needs to be deterministic + unique within the
 * block (the extractor reads slugs from the MDX AST independently).
 */
function nodeToText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join("");
  if (isValidElement(node)) {
    return nodeToText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/**
 * `<MultiSelect.Prompt>` — compound prompt slot. Renders inside the
 * parent section body; carries no landmark of its own (R10).
 */
function MultiSelectPrompt({ children }: MultiSelectPromptProps) {
  return <div className={styles.prompt}>{children}</div>;
}

/**
 * `<MultiSelect.Choice>` — declarative child. Renders nothing on its
 * own; the parent walks choices and emits the Radix Checkboxes.
 */
function MultiSelectChoice(_props: MultiSelectChoiceProps): null {
  return null;
}
MultiSelectChoice.displayName = "MultiSelect.Choice";

// Stable initial reference — a fresh `[]` literal on every render would
// retrigger `useInteractive`'s hydration effect (which lists `initial`
// in its dep array) on each render, causing an update loop.
const EMPTY_SELECTION: readonly string[] = [];

interface NormalizedChoice {
  slug: string;
  correct: boolean;
  body: ReactNode;
}

function normalizeChoices(children: ReactNode): NormalizedChoice[] {
  const choices: NormalizedChoice[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type !== MultiSelectChoice) continue;
    const {
      id,
      correct,
      children: body,
    } = child.props as MultiSelectChoiceProps;
    const slug = id ?? slugify(nodeToText(body));
    choices.push({ slug, correct: correct ?? false, body });
  }
  return choices;
}

/**
 * Multiple-answer formative parent — see MultiSelect.schema.ts for
 * design rationale + author surface.
 *
 * Implementation notes:
 *
 * - One Radix Checkbox per choice; the set of selected slugs persists
 *   via `useInteractive` under `multi-select:${id}:selected` (a
 *   `string[]`).
 *
 * - `useHydrated()` gates the interactive checkboxes so the SSR pass
 *   emits the labeled section + prompt + a static choice list.
 *
 * - v1 does NOT auto-grade: correct choices carry static
 *   `data-correct="true"` (CSS decorates on reveal). No cross-island
 *   state.
 *
 * - R10 landmark: `<section aria-labelledby={`${id}-label`}>`.
 */
export function MultiSelect(props: MultiSelectProps) {
  const { course, unit, id, children } = MultiSelectPropsSchema.parse(props);
  const hydrated = useHydrated();
  const {
    value: selected,
    setValue: setSelected,
    controlProps,
  } = useInteractive<readonly string[]>(
    course,
    unit,
    `multi-select:${id}:selected`,
    EMPTY_SELECTION
  );

  const choices = normalizeChoices(children);
  const seen = new Set<string>();
  for (const { slug } of choices) {
    if (seen.has(slug)) {
      throw new Error(
        `<MultiSelect> duplicate choice slug "${slug}". Two choices cannot slugify to the same value; supply a distinct \`id\` on one.`
      );
    }
    seen.add(slug);
  }

  const nonChoiceChildren = Children.toArray(children).filter(
    (child) => !(isValidElement(child) && child.type === MultiSelectChoice)
  );

  function toggle(slug: string, checked: boolean): void {
    setSelected(
      checked ? [...selected, slug] : selected.filter((s) => s !== slug)
    );
  }

  return (
    <section
      className={styles.root}
      data-pedagogy-role='multi-select'
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>
        Select all that apply
      </h3>
      {nonChoiceChildren}
      <ul className={styles.choices}>
        {choices.map(({ slug, correct, body }) => {
          const itemId = `${id}-choice-${slug}`;
          return (
            <li
              key={slug}
              className={styles.choice}
              data-correct={correct ? "true" : undefined}
            >
              {hydrated ? (
                <Checkbox.Root
                  id={itemId}
                  className={styles.checkbox}
                  checked={selected.includes(slug)}
                  onCheckedChange={(next) => toggle(slug, next === true)}
                  {...controlProps}
                >
                  <Checkbox.Indicator className={styles.indicator}>
                    ✓
                  </Checkbox.Indicator>
                </Checkbox.Root>
              ) : (
                <span className={styles.checkbox} aria-hidden='true' />
              )}
              <label className={styles.choiceLabel} htmlFor={itemId}>
                {body}
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

MultiSelect.Prompt = MultiSelectPrompt;
MultiSelect.Choice = MultiSelectChoice;
