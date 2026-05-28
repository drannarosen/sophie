import { z } from "zod";

/**
 * Props for `<FillBlankController>` — the childless interactivity island
 * that `sophieCompoundExpandRemarkPlugin` emits when it lowers an
 * authored `<FillBlank>` into transformed prompt prose whose inline
 * `<FillBlank.Slot>` markers have become static
 * `<input type="text" data-fb-slot data-slot-id>` fields (Task 5 of the
 * compound-island transform; ADR 0073 Amendment 1).
 *
 * `course` / `unit` / `id` mirror the parent `<FillBlank>`'s namespace.
 * The controller scopes to its own `<section data-formative-anchor=
 * "${id}">`, discovers every `input[data-fb-slot]` inside it, and
 * persists each slot's raw value via `useInteractive` under
 * `fillblank:${id}:${slotId}:value` (a `string`). All three are
 * non-empty strings (ADR 0003 — Zod is the source of truth), matching
 * the `(course, unit, id)` triple every formative parent declares.
 */
export const FillBlankControllerPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
});

export type FillBlankControllerProps = z.infer<
  typeof FillBlankControllerPropsSchema
>;
