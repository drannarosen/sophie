import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Persistence-bearing checkbox primitive. Wraps `useInteractive` +
 * the disabled-while-loading hydration guard
 * ([docs/website/contributing/coding-standards.md § Persistence-bearing controls])
 * so consumer components don't have to re-derive the pattern.
 *
 * Per ADR 0027: course/unit/id are required (per-instance hydration
 * across the Astro MDX render boundary). Use with `client:load` if
 * placed directly in MDX.
 */
export const InteractiveCheckboxPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  initial: z.boolean().optional(),
  /** Visible label content. Source of the accessible name. */
  children: z.custom<ReactNode>(),
  className: z.string().optional(),
});

export type InteractiveCheckboxProps = z.infer<
  typeof InteractiveCheckboxPropsSchema
>;
