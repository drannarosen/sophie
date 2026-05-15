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
  // additional pedagogical variants (prediction, worked-example, etc.)
  // follow when their consuming components ship.
  "roadmap",
  "summary",
  "key-insight",
  // PR-C3 (2026-05-14): long-form misconception alert. Per decision
  // #2, ADDED alongside the existing generic "caution" (NOT a rename).
  // Pairs with `<Aside kind="misconception">` (short-form) — the
  // pedagogy index discriminator is component-name + variant/kind.
  "misconception",
]);
export type CalloutVariant = z.infer<typeof CalloutVariant>;

/**
 * Props for the static `<Callout>` component.
 *
 *   - `variant` selects the visual + semantic kind (defaults to "info"
 *     at render time).
 *   - `title` is shown as a leading bold label when provided;
 *     `aria-label` falls back to the variant default otherwise.
 *   - `id` (PR-C3 decision #8) is an optional anchor that lands on
 *     the root `<aside>` element. Symmetric with `Aside.id?` so
 *     `<Callout variant="misconception" id="...">` and
 *     `<Aside kind="misconception" id="...">` both contribute
 *     stable in-chapter anchors to the pedagogy index.
 */
export const CalloutPropsSchema = z.object({
  variant: CalloutVariant.optional(),
  title: z.string().optional(),
  id: z.string().optional(),
  children: z.custom<ReactNode>(),
  /**
   * ADR 0044 misconception-graph fields. Only meaningful when
   * `variant === "misconception"`; ignored on other variants.
   * Mirrors `<Aside kind="misconception">`'s prop surface — both
   * source primitives feed the same `MisconceptionEntry` shape in
   * the pedagogy index (ADR 0038 role-aggregation).
   */
  prerequisite_misconceptions: z.array(z.string().min(1)).optional(),
  related_misconceptions: z.array(z.string().min(1)).optional(),
  concept_refs: z.array(z.string().min(1)).optional(),
  discipline_scope: z.array(z.string().min(1)).optional(),
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
