import type { EpistemicRole } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props for `<WorkedExample>` — a chapter-body compound
 * primitive for step-by-step applied quantitative reasoning. Locked by
 * ADR 0081 as the path-1 resolution of the `<WorkedExample>` gap that
 * the M2-L3 and ASTR 201 M1-L2 migration pilots both surfaced (ADR 0064
 * §3): worked examples MUST use this component, never a
 * `<Callout variant="deep-dive">` approximation, which loses the
 * structural-role signal.
 *
 * Compound shape (slot sub-components rendered as children, in order):
 *
 * ```mdx
 * <WorkedExample title="How Many Earths Fit in the Sun?" number={1}>
 *   <WorkedExample.Problem>
 *     The Sun's radius is 109× Earth's. How many Earths fit inside?
 *   </WorkedExample.Problem>
 *   <WorkedExample.Step label="Volume scales as R³">
 *     $V_\odot / V_\oplus = 109^3$.
 *   </WorkedExample.Step>
 *   <WorkedExample.DimCheck>
 *     $[R^3] = [L^3]$ → the ratio is dimensionless ✓
 *   </WorkedExample.DimCheck>
 *   <WorkedExample.Result>
 *     $\approx 1.3 \times 10^6$ — over a million Earths.
 *   </WorkedExample.Result>
 * </WorkedExample>
 * ```
 *
 * Slots are identified by component identity (the `<OMIFlow>` precedent),
 * not by an author `role` prop. `Step` is repeatable and mirrors the
 * `<DerivationStep>` labeled-step idiom. `DimCheck` is optional but
 * first-class: it carries `data-dim-check` so the audit can enforce
 * `QB6` (units shown at every step) / principle P1 structurally.
 */
export const WorkedExamplePropsSchema = z.object({
  /** Worked-example title (e.g. "How Many Earths Fit in the Sun?"). */
  title: z.string().min(1),
  /** Optional display number ("Worked Example 1"). */
  number: z.number().int().positive().optional(),
  children: z.custom<ReactNode>(),
});
export type WorkedExampleProps = z.infer<typeof WorkedExamplePropsSchema>;

/** `<WorkedExample.Problem>` — the question / givens. One per example. */
export const WorkedExampleProblemPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type WorkedExampleProblemProps = z.infer<
  typeof WorkedExampleProblemPropsSchema
>;

/** `<WorkedExample.Step>` — one solution step; repeatable, optional label. */
export const WorkedExampleStepPropsSchema = z.object({
  /** Optional short step title rendered next to the "Step" marker. */
  label: z.string().min(1).optional(),
  children: z.custom<ReactNode>(),
});
export type WorkedExampleStepProps = z.infer<
  typeof WorkedExampleStepPropsSchema
>;

/** `<WorkedExample.DimCheck>` — dimensional verification (QB6 hook). */
export const WorkedExampleDimCheckPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type WorkedExampleDimCheckProps = z.infer<
  typeof WorkedExampleDimCheckPropsSchema
>;

/** `<WorkedExample.Result>` — the final answer + interpretation. */
export const WorkedExampleResultPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type WorkedExampleResultProps = z.infer<
  typeof WorkedExampleResultPropsSchema
>;

/**
 * Hardcoded epistemic role per ADR 0058 §2 + ADR 0081. A worked example
 * is applied quantitative reasoning → `"numerical"`. Locked via
 * `as const satisfies EpistemicRole` so a taxonomy edit that drops the
 * value fails type-check before the build. (Finer per-slot roles — e.g.
 * `Result` as `inference` — are deferred until an audit needs them.)
 */
export const WORKED_EXAMPLE_EPISTEMIC_ROLE =
  "numerical" as const satisfies EpistemicRole;
