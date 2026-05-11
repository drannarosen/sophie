import { useCallback, useEffect, useId, useState } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./Predict.module.css.js";
import type { PredictPrompt, PredictProps } from "./Predict.schema.ts";

/**
 * Persistence-bearing predict-then-discuss primitive. v1 is reflection-only:
 * each prompt renders its own <textarea>, persisted per-prompt via
 * `useInteractive`. When `children` are provided, a "Reveal" button gates
 * the children content until all prompts have non-empty answers.
 *
 * Per ADR 0027: course/chapter/id are required (per-instance hydration).
 * Per coding-standards "Persistence-bearing controls", textareas spread
 * `controlProps` so the disabled-while-loading hydration guard is the
 * default path. Self-assessment widgets (confidence, comprehension,
 * effort, reflection) are deferred to a separate component family.
 */
export function Predict({
  course,
  chapter,
  id,
  description,
  prompts,
  closing,
  heading = "Prediction Moment",
  children,
}: PredictProps) {
  // Lift per-prompt values into Predict so the reveal-gate can compute
  // "all filled?" without re-subscribing to each prompt's useInteractive.
  // PromptRow remains the owner of the persisted state via its own
  // useInteractive call; the lifted snapshot is for read-only orchestration.
  const [values, setValues] = useState<Record<string, string>>({});
  const updateValue = useCallback((promptId: string, value: string) => {
    setValues((prev) => {
      if (prev[promptId] === value) return prev;
      return { ...prev, [promptId]: value };
    });
  }, []);

  const allFilled = prompts.every(
    (p) => (values[p.id] ?? "").trim().length > 0
  );

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{heading}</h2>
      {description !== undefined && (
        <p className={styles.description}>{description}</p>
      )}
      {prompts.map((p) => (
        <PromptRow
          key={p.id}
          course={course}
          chapter={chapter}
          componentId={id}
          prompt={p}
          onValue={updateValue}
        />
      ))}
      {closing !== undefined && <p className={styles.closing}>{closing}</p>}
      {children !== undefined && (
        <RevealGate
          course={course}
          chapter={chapter}
          componentId={id}
          enabled={allFilled}
        >
          {children}
        </RevealGate>
      )}
    </section>
  );
}

function PromptRow({
  course,
  chapter,
  componentId,
  prompt,
  onValue,
}: {
  course: string;
  chapter: string;
  componentId: string;
  prompt: PredictPrompt;
  onValue: (id: string, value: string) => void;
}) {
  const textareaId = useId();
  const { value, setValue, controlProps } = useInteractive(
    course,
    chapter,
    `predict:${componentId}:${prompt.id}:answer`,
    ""
  );

  // Lift current value to parent so the RevealGate can decide enablement.
  useEffect(() => {
    onValue(prompt.id, value);
  }, [value, prompt.id, onValue]);

  return (
    <div className={styles.prompt}>
      <label htmlFor={textareaId} className={styles.label}>
        {prompt.label}
      </label>
      <textarea
        id={textareaId}
        className={styles.textarea}
        value={value}
        {...controlProps}
        onChange={(event) => setValue(event.target.value)}
      />
    </div>
  );
}

function RevealGate({
  course,
  chapter,
  componentId,
  enabled,
  children,
}: {
  course: string;
  chapter: string;
  componentId: string;
  enabled: boolean;
  children: React.ReactNode;
}) {
  const {
    value: revealed,
    setValue: setRevealed,
    controlProps,
  } = useInteractive(course, chapter, `predict:${componentId}:revealed`, false);

  // Two disable reasons must compose: (a) the hydration guard from
  // useInteractive's controlProps; (b) the business-logic gate
  // requiring all prompts to be filled. We thread `aria-busy` and
  // `disabled` explicitly rather than spreading `{...controlProps}`,
  // because spread-then-explicit-override depends on JSX attribute
  // order — a future maintainer alphabetizing attributes would
  // silently restore the spread overriding the explicit disable,
  // re-enabling the button while prompts are still empty.
  const gatedDisabled = controlProps.disabled || !enabled;

  return (
    <div className={styles.revealGate}>
      <button
        type='button'
        className={styles.revealButton}
        aria-busy={controlProps["aria-busy"]}
        disabled={gatedDisabled}
        onClick={() => setRevealed(true)}
      >
        Reveal
      </button>
      {revealed && <div className={styles.revealContent}>{children}</div>}
    </div>
  );
}
