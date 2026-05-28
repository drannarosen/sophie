import { z } from "zod";

/**
 * Props for `<MultiSelectController>` — the childless interactivity
 * island that `sophieCompoundExpandRemarkPlugin` emits when it lowers an
 * authored `<MultiSelect>` into a static `<fieldset>` of native
 * checkboxes (Task 4 of the compound-island transform; ADR 0073
 * Amendment 1).
 *
 * `course` / `unit` / `id` mirror the parent `<MultiSelect>`'s
 * namespace; the controller reaches into the static checkbox group by
 * `name="multiselect-${id}"` and persists the set of selected choice
 * slugs via `useInteractive` under `multi-select:${id}:selected` (a
 * `string[]`). All three are non-empty strings (ADR 0003 — Zod is the
 * source of truth), matching the `(course, unit, id)` triple every
 * formative parent declares.
 */
export const MultiSelectControllerPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
});

export type MultiSelectControllerProps = z.infer<
  typeof MultiSelectControllerPropsSchema
>;
