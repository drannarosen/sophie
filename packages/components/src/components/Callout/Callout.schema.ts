import type { ReactNode } from "react";
import { z } from "zod";

export const CalloutVariant = z.enum([
  // Generic admonitions (Phase 0).
  "info",
  "warning",
  "tip",
  "caution",
  // In-chapter section markers (Trio 2 expansion, 2026-05-10).
  // Each shipped because the smoke chapter already uses the pattern;
  // additional pedagogical variants (misconception, prediction,
  // worked-example, etc.) follow when their consuming components ship.
  "roadmap",
  "summary",
  "key-insight",
]);
export type CalloutVariant = z.infer<typeof CalloutVariant>;

/** Props for the static `<Callout>` component. */
export const CalloutPropsSchema = z.object({
  variant: CalloutVariant.optional(),
  title: z.string().optional(),
  children: z.custom<ReactNode>(),
});

export type CalloutProps = z.infer<typeof CalloutPropsSchema>;

/**
 * Props for `<InteractiveCallout>` — the persistence-bearing variant.
 *
 * Per ADR 0027: course, chapter, and id are required props (formerly
 * read from `SophieConfigContext` which proved unreachable across
 * Astro's MDX render boundary). Each interactive instance is its own
 * client island via `client:load`.
 */
export const InteractiveCalloutPropsSchema = z.object({
  course: z.string().min(1),
  chapter: z.string().min(1),
  id: z.string().min(1),
  variant: CalloutVariant.optional(),
  title: z.string().optional(),
  children: z.custom<ReactNode>(),
});

export type InteractiveCalloutProps = z.infer<
  typeof InteractiveCalloutPropsSchema
>;
