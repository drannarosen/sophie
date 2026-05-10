import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Persistence-bearing disclosure widget. Owns the "Deep Dive" pattern —
 * collapsed on first read, expanded by student choice, open/closed
 * state persisted per-instance via `useInteractive`.
 *
 * Per ADR 0027: course/chapter/id are required (per-instance hydration
 * across the Astro MDX render boundary). Use with `client:load` if
 * placed directly in MDX.
 *
 * Implementation: Radix Collapsible primitive (ADR 0019) bound to
 * `useInteractive`'s controlled state.
 */
export const CollapsibleCardPropsSchema = z.object({
  course: z.string().min(1),
  chapter: z.string().min(1),
  id: z.string().min(1),
  /** Header text + accessible name of the disclosure trigger. */
  title: z.string().min(1),
  /**
   * First-visit open state. Default false ("skippable on first read"
   * is the defining feature). Only used as the initial value before
   * any persisted state exists. Defaulting happens in the component
   * (`defaultOpen = false`) rather than the schema, so the inferred
   * type stays `defaultOpen?: boolean` for ergonomic call sites.
   */
  defaultOpen: z.boolean().optional(),
  /** Body content revealed when expanded. */
  children: z.custom<ReactNode>(),
});

export type CollapsibleCardProps = z.infer<typeof CollapsibleCardPropsSchema>;
