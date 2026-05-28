import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Fill-in-the-blank formative parent (ADR 0073 Amendment 1 §2).
 * `<FillBlank>` renders prose containing one or more inline
 * `<FillBlank.Slot>` text inputs. Each slot's value persists via
 * `useInteractive` under `fillblank:${id}:${slotId}:value`. v1 does NOT
 * auto-grade (ADR 0073 Amendment 1 §10) — the slot's `correct` prop is
 * read by the extractor (AS-3); the runtime just persists raw input.
 *
 * Like every formative parent, `<FillBlank>` declares `course`/`unit`/
 * `id`; the `sophieAutoImportsRemarkPlugin` threads `course`/`unit`/
 * `parentId` onto nested `<Solution>` / `<Hint>` at MDX compile time.
 * The inline `<FillBlank.Slot>` markers render nothing; the parent
 * `<FillBlank>` reads them and renders a controlled input in place,
 * passing its namespace as props (the shipped `<Tabs>`/`<MCQ>`
 * declarative-child pattern). Props — not React context — because
 * Astro re-renders a `client:load` island's children as light DOM for
 * hydration, where a runtime context provider is absent (the same
 * constraint the compile-time threading addresses for reveals).
 *
 * Authoring surface:
 *
 * ```mdx
 * <FillBlank course="astr201" unit="m1-l2" id="hr-axes">
 *   <FillBlank.Prompt>
 *     The HR diagram plots <FillBlank.Slot id="x" correct="temperature" />
 *     against <FillBlank.Slot id="y" correct="luminosity" />.
 *   </FillBlank.Prompt>
 *   <Solution>Temperature (x, reversed) vs. luminosity (y).</Solution>
 * </FillBlank>
 * ```
 */
export const FillBlankPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  id: z.string().min(1),
  children: z.custom<ReactNode>(),
});
export type FillBlankProps = z.infer<typeof FillBlankPropsSchema>;

/**
 * `<FillBlank.Prompt>` — compound prompt slot. Renders inline prose
 * (with embedded `<FillBlank.Slot>` inputs) inside the section body.
 */
export const FillBlankPromptPropsSchema = z.object({
  children: z.custom<ReactNode>(),
});
export type FillBlankPromptProps = z.infer<typeof FillBlankPromptPropsSchema>;

/**
 * `<FillBlank.Slot>` — a declarative marker for an inline blank. The
 * author writes `id` (unique within the block; collision throws) and
 * `correct` (expected answer, read by the extractor for AS-3; not
 * enforced at runtime in v1). The slot renders nothing itself; the
 * parent `<FillBlank>` reads these props and renders the controlled
 * input in place with the threaded namespace.
 */
export const FillBlankSlotPropsSchema = z.object({
  id: z.string().min(1),
  correct: z.string().min(1),
});
export type FillBlankSlotProps = z.infer<typeof FillBlankSlotPropsSchema>;
