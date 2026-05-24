import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Chrome primitive — static card container with optional Header/Footer
 * slots. Composes via `<Card.Header>` / `<Card.Footer>` compound
 * children (Q6 lock from PR 5 design doc). When `title` or
 * `Card.Header` is present, the root becomes a
 * `<section aria-labelledby>` landmark per R10; titleless cards render
 * as a plain `<div>` (intentional non-landmark).
 *
 * Strict chrome — no `epistemicRole` (ADR 0058 permits optional
 * omission for non-pedagogy components). For pedagogical card-shaped
 * content use `<Aside>`, `<Callout>`, or `<KeyEquation>`.
 */
export const CardPropsSchema = z.object({
  /**
   * Shorthand for a default `<header>` element. When `<Card.Header>` is
   * also provided, the slot wins (Q3 lock) — `title` is ignored.
   */
  title: z.string().optional(),
  /** Optional anchor id; lands on the root element. */
  id: z.string().optional(),
  /** Optional extra class — concatenated with the card root class. */
  className: z.string().optional(),
  /** Body content + optional `<Card.Header>` / `<Card.Footer>` slots. */
  children: z.custom<ReactNode>(),
});

export type CardProps = z.infer<typeof CardPropsSchema>;
