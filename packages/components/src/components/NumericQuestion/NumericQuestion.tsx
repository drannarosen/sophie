import { useId } from "react";
import { useInteractive } from "../../runtime/useInteractive.ts";
import styles from "./NumericQuestion.module.css.js";
import {
  type NumericQuestionAnswerProps,
  type NumericQuestionPromptProps,
  type NumericQuestionProps,
  NumericQuestionPropsSchema,
} from "./NumericQuestion.schema.ts";

/**
 * `<NumericQuestion.Prompt>` — compound prompt slot. Renders inside the
 * parent section body; carries no landmark of its own (R10).
 */
function NumericQuestionPrompt({ children }: NumericQuestionPromptProps) {
  return <div className={styles.prompt}>{children}</div>;
}

/**
 * `<NumericQuestion.Answer>` — declarative, self-closing child that
 * renders nothing. It exists only as a carrier of the expected-answer
 * attributes the extractor reads at MDX compile time (value, tolerance,
 * toleranceKind, unit). v1 does not validate student input against it.
 */
function NumericQuestionAnswer(_props: NumericQuestionAnswerProps): null {
  return null;
}
NumericQuestionAnswer.displayName = "NumericQuestion.Answer";

/**
 * Numeric-answer formative parent — see NumericQuestion.schema.ts for
 * design rationale + author surface.
 *
 * Implementation notes:
 *
 * - A single native `<input type="text">` (not `number` — student
 *   answers may include units, commas, scientific notation; v1 doesn't
 *   validate). Raw input persists via `useInteractive` under
 *   `numeric:${id}:value`.
 *
 * - `<NumericQuestion.Answer>` renders nothing; it's a declarative
 *   attribute carrier for the extractor. No auto-grading in v1.
 *
 * - R10 landmark: `<section aria-labelledby={`${id}-label`}>`.
 */
export function NumericQuestion(props: NumericQuestionProps) {
  const { course, unit, id, children } =
    NumericQuestionPropsSchema.parse(props);
  const inputId = useId();
  const { value, setValue, controlProps } = useInteractive<string>(
    course,
    unit,
    `numeric:${id}:value`,
    ""
  );

  return (
    <section
      className={styles.root}
      data-pedagogy-role='numeric-question'
      data-formative-anchor={id}
      aria-labelledby={`${id}-label`}
    >
      <h3 id={`${id}-label`} className={styles.label}>
        Numeric answer
      </h3>
      {children}
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.fieldLabel}>
          Your answer
        </label>
        <input
          id={inputId}
          type='text'
          inputMode='decimal'
          className={styles.input}
          value={value}
          {...controlProps}
          onChange={(event) => setValue(event.target.value)}
        />
      </div>
    </section>
  );
}

NumericQuestion.Prompt = NumericQuestionPrompt;
NumericQuestion.Answer = NumericQuestionAnswer;
