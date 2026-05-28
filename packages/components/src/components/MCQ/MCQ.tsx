import * as RadioGroup from "@radix-ui/react-radio-group";
import { slugify } from "@sophie/core/schema";
import { Children, isValidElement, type ReactNode } from "react";
import { useHydrated } from "../../runtime/useHydrated.ts";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./MCQ.module.css.js";
import {
  type MCQChoiceProps,
  type MCQPromptProps,
  type MCQProps,
  MCQPropsSchema,
} from "./MCQ.schema.ts";

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
 * `<MCQ.Prompt>` — compound prompt slot. Renders inside the parent
 * section body; carries no landmark of its own (the parent section
 * already labels the region per R10).
 */
function MCQPrompt({ children }: MCQPromptProps) {
  return <div className={styles.prompt}>{children}</div>;
}

/**
 * `<MCQChoice>` — standalone declarative child. Renders nothing on its
 * own; the parent `<MCQ>` walks choices and emits the Radix RadioGroup
 * items. Standalone (not `MCQ.Choice` member-access) so it stays an
 * introspectable React element when Astro passes island children —
 * member-access children collapse into an opaque `<astro-slot>` that
 * `Children.toArray` cannot read (mirrors the shipped `<Tab>` pattern).
 */
export function MCQChoice(_props: MCQChoiceProps): null {
  return null;
}
MCQChoice.displayName = "MCQChoice";

interface NormalizedChoice {
  slug: string;
  correct: boolean;
  body: ReactNode;
}

function normalizeChoices(children: ReactNode): NormalizedChoice[] {
  const choices: NormalizedChoice[] = [];
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue;
    if (child.type !== MCQChoice) continue;
    const { id, correct, children: body } = child.props as MCQChoiceProps;
    const slug = id ?? slugify(nodeToText(body));
    choices.push({ slug, correct: correct ?? false, body });
  }
  return choices;
}

/**
 * Single-answer multiple-choice formative parent — see MCQ.schema.ts
 * for design rationale + author surface.
 *
 * Implementation notes:
 *
 * - Radix RadioGroup provides roving-focus keyboard ergonomics (arrow
 *   keys move + select, automatic focus management). The selected
 *   choice slug persists via `useInteractive` under
 *   `mcq:${id}:selected`.
 *
 * - `useHydrated()` gates the interactive RadioGroup so the SSR pass
 *   emits the labeled section + prompt only. After hydration the
 *   RadioGroup mounts with its persisted value.
 *
 * - v1 does NOT auto-grade: correct choices carry a static
 *   `data-correct="true"` attribute (CSS decorates it on reveal). No
 *   cross-island state — the component never reads the Solution's
 *   open-state.
 *
 * - R10 landmark: `<section aria-labelledby={`${id}-label`}>`.
 */
export function MCQ(props: MCQProps) {
  const { course, unit, id, children } = MCQPropsSchema.parse(props);
  const hydrated = useHydrated();
  const {
    value: selected,
    setValue: setSelected,
    controlProps,
  } = useInteractive<string>(course, unit, `mcq:${id}:selected`, "");

  const choices = normalizeChoices(children);
  const seen = new Set<string>();
  for (const { slug } of choices) {
    if (seen.has(slug)) {
      throw new Error(
        `<MCQ> duplicate choice slug "${slug}". Two choices cannot slugify to the same value; supply a distinct \`id\` on one.`
      );
    }
    seen.add(slug);
  }

  // Non-choice children (prompt, Solution, Hint) render in document
  // order around the RadioGroup; the RadioGroup itself replaces the
  // declarative <MCQChoice> placeholders.
  const nonChoiceChildren = Children.toArray(children).filter(
    (child) => !(isValidElement(child) && child.type === MCQChoice)
  );

  return (
    <section
      className={styles.root}
      data-pedagogy-role='mcq'
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>
        Multiple choice
      </h3>
      {nonChoiceChildren}
      {hydrated ? (
        <RadioGroup.Root
          className={styles.choices}
          value={selected}
          onValueChange={(next) => setSelected(next)}
          aria-labelledby={`${id}-label`}
        >
          {choices.map(({ slug, correct, body }) => {
            const itemId = `${id}-choice-${slug}`;
            return (
              <label key={slug} className={styles.choice} htmlFor={itemId}>
                <RadioGroup.Item
                  id={itemId}
                  value={slug}
                  className={styles.radio}
                  data-correct={correct ? "true" : undefined}
                  {...controlProps}
                >
                  <RadioGroup.Indicator className={styles.indicator} />
                </RadioGroup.Item>
                <span className={styles.choiceLabel}>{body}</span>
              </label>
            );
          })}
        </RadioGroup.Root>
      ) : (
        <ul className={styles.choices}>
          {choices.map(({ slug, correct, body }) => (
            <li
              key={slug}
              className={styles.choice}
              data-correct={correct ? "true" : undefined}
            >
              <span className={styles.radio} aria-hidden='true' />
              <span className={styles.choiceLabel}>{body}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

MCQ.Prompt = MCQPrompt;
