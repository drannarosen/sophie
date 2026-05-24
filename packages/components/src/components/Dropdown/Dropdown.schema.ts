import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Chrome primitive — persistence-bearing disclosure widget. Backed by
 * Radix Accordion (ADR 0019); single- and multi-item forms share the
 * same render path. Per-instance open/closed state persists via
 * `useInteractive` (ADRs 0004, 0007) — open-item slugs are stored as
 * a `string[]` under the key `dropdown:${id}:open`.
 *
 * Two authoring forms:
 *   - Single-item shorthand: `<Dropdown label="…">body</Dropdown>`.
 *   - Multi-item: `<Dropdown>` wrapping n × `<Dropdown.Item label="…">`.
 *
 * Per ADR 0027: course/unit/id are required (per-instance hydration
 * across the Astro MDX render boundary). Use with `client:load` if
 * placed directly in MDX.
 *
 * Replaces the former `<CollapsibleCard>`; the chrome shape moved from
 * a 1-item Collapsible to an n-item Accordion as Sophie's authoring
 * needs broadened (Phase B chrome consolidation). No back-compat
 * shim — pre-launch hard rename.
 */
export const DropdownPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  /**
   * Single-item shorthand. When set, the `children` become the body of
   * a single `Dropdown.Item` whose label equals `label`. Mutually
   * exclusive with passing `<Dropdown.Item>` children (validated at
   * render — author error surfaces immediately).
   */
  label: z.string().min(1).optional(),
  /** Slugs of items open on first visit, before any persisted state. */
  defaultOpen: z.array(z.string()).optional(),
  /**
   * When true, multiple items may be open simultaneously. Default
   * false (Radix Accordion `type="single"`).
   */
  allowMultiple: z.boolean().optional(),
  /** Item children (multi-item) OR body content (single-item shorthand). */
  children: z.custom<ReactNode>(),
});

export type DropdownProps = z.infer<typeof DropdownPropsSchema>;

export const DropdownItemPropsSchema = z.object({
  /** Item label — both trigger text AND the source of the slug identity. */
  label: z.string().min(1),
  /** Optional explicit anchor id (matches Card/Tabs id semantics). */
  id: z.string().optional(),
  /** Item body, revealed when the item is open. */
  children: z.custom<ReactNode>(),
});

export type DropdownItemProps = z.infer<typeof DropdownItemPropsSchema>;
