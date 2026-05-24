import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Chrome primitive — tabbed compound interface backed by Radix Tabs
 * (ADR 0019). Compound shape: `<Tabs>` wraps n × `<Tab label="…">`
 * children. Each child's `label` is slugified for the Radix `value`
 * identity; duplicate slugs throw at render (loud author feedback).
 *
 * Non-landmark by design (no inherent name to anchor a
 * `<section aria-labelledby>` to per R10). Renders as a plain `<div>`;
 * Radix supplies all ARIA semantics for the tablist + tabpanel
 * interaction.
 *
 * Strict chrome — no `epistemicRole` (ADR 0058 permits optional
 * omission for non-pedagogy components). No persistence: Tabs is a
 * pure view-state container; for persisted state use `<Dropdown>`.
 */
export const TabsPropsSchema = z.object({
  /**
   * Label of the tab open on first render. When omitted, Radix picks
   * the first tab. Slugified before being passed to Radix as the
   * `defaultValue`.
   */
  defaultLabel: z.string().optional(),
  /** Optional anchor id; lands on the root element. */
  id: z.string().optional(),
  /** Optional extra class — concatenated with the tabs root class. */
  className: z.string().optional(),
  /** One or more `<Tab>` compound children. */
  children: z.custom<ReactNode>(),
});

export type TabsProps = z.infer<typeof TabsPropsSchema>;

export const TabPropsSchema = z.object({
  /** Tab label — both trigger text AND the source of the slug identity. */
  label: z.string().min(1),
  /**
   * Optional explicit id (matches Card/Grid id semantics). Does NOT
   * influence the slug — slug always derives from `label`.
   */
  id: z.string().optional(),
  /** Panel body. */
  children: z.custom<ReactNode>(),
});

export type TabProps = z.infer<typeof TabPropsSchema>;
