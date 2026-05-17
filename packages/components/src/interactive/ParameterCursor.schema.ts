import { z } from "zod";

/**
 * Per-cursor definition props for `<ParameterCursor>`. Per ADR 0058,
 * cursors are chrome — no `epistemicRole` field. Per ADR 0059, the
 * three scope semantics are encoded:
 *
 * - `scope: "section"` (default) — auto-prefix with the nearest
 *   `[id]` on `<section>`, `<article>`, `<main>`, or `<details>`
 *   ancestor, resolved at mount time.
 * - `scope: "page"` — no auto-prefix; the raw `name` is the store key.
 * - `cursorGroup: "..."` — explicit opt-in to cross-section sharing;
 *   overrides section scope.
 */
export const ParameterCursorPropsSchema = z
  .object({
    name: z.string().min(1),
    min: z.number(),
    max: z.number(),
    default: z.number(),
    unit: z.string().optional(),
    step: z.union([z.number().positive(), z.literal("log")]).optional(),
    scope: z.enum(["section", "page"]).optional(),
    cursorGroup: z.string().min(1).optional(),
  })
  .refine((props) => props.min < props.max, {
    message: "min must be < max",
    path: ["min"],
  })
  .refine((props) => props.default >= props.min && props.default <= props.max, {
    message: "default must be within [min, max]",
    path: ["default"],
  });

export type ParameterCursorProps = z.infer<typeof ParameterCursorPropsSchema>;
