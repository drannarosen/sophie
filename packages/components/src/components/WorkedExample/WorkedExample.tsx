import { useId } from "react";
import styles from "./WorkedExample.module.css.js";
import {
  WORKED_EXAMPLE_EPISTEMIC_ROLE,
  type WorkedExampleDimCheckProps,
  type WorkedExampleProblemProps,
  type WorkedExampleProps,
  type WorkedExampleResultProps,
  type WorkedExampleStepProps,
} from "./WorkedExample.schema.ts";

/**
 * `<WorkedExample.Problem>` — the question / givens slot.
 */
function Problem({ children }: WorkedExampleProblemProps) {
  return (
    <div className={styles.slot} data-worked-example-slot='problem'>
      <p className={styles.slotLabel}>Problem</p>
      <div className={styles.slotBody}>{children}</div>
    </div>
  );
}

/**
 * `<WorkedExample.Step>` — one solution step, optionally labeled. Mirrors
 * the `<DerivationStep>` "Step · label" header idiom.
 */
function Step({ label, children }: WorkedExampleStepProps) {
  return (
    <div
      className={styles.slot}
      data-worked-example-slot='step'
      data-step-label={label}
    >
      <p className={styles.slotLabel}>
        <span>Step</span>
        {label && (
          <>
            <span className={styles.separator} aria-hidden='true'>
              ·
            </span>
            <span className={styles.stepLabel}>{label}</span>
          </>
        )}
      </p>
      <div className={styles.slotBody}>{children}</div>
    </div>
  );
}

/**
 * `<WorkedExample.DimCheck>` — dimensional verification. Carries
 * `data-dim-check` as the auditable hook for QB6 (units at every step).
 */
function DimCheck({ children }: WorkedExampleDimCheckProps) {
  return (
    <div
      className={styles.slot}
      data-worked-example-slot='dim-check'
      data-dim-check='true'
    >
      <p className={styles.slotLabel}>Dimensional check</p>
      <div className={styles.slotBody}>{children}</div>
    </div>
  );
}

/**
 * `<WorkedExample.Result>` — the final answer + interpretation.
 */
function Result({ children }: WorkedExampleResultProps) {
  return (
    <div className={styles.slot} data-worked-example-slot='result'>
      <p className={styles.slotLabel}>Result</p>
      <div className={styles.slotBody}>{children}</div>
    </div>
  );
}

/**
 * Compound primitive for a worked example (ADR 0081). Renders as a
 * titled chapter-body region holding ordered slot children.
 *
 * Landmark: `<section aria-labelledby>` per R10 — a named region inside
 * the chapter layout's `<main>`, never `<main>`/`<article>`/bare `<div>`.
 * `data-epistemic-role="numerical"` surfaces the role to E2E hooks +
 * any future pedagogy-index extractor (Observable/Assumption precedent).
 */
export function WorkedExample({ title, number, children }: WorkedExampleProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={styles.workedExample}
      data-epistemic-role={WORKED_EXAMPLE_EPISTEMIC_ROLE}
    >
      <header id={titleId} className={styles.header}>
        <span className={styles.kicker}>
          Worked Example{number !== undefined ? ` ${number}` : ""}
        </span>
        <span className={styles.title}>{title}</span>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

WorkedExample.Problem = Problem;
WorkedExample.Step = Step;
WorkedExample.DimCheck = DimCheck;
WorkedExample.Result = Result;
