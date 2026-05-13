import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * A textbook module — a named group of chapters with explicit
 * ordering. Per PR 3 design doc (2026-05-12), every chapter
 * belongs to exactly one module via `Chapter.module`.
 */
export const ModuleSchema = z.object({
  slug: Slug,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  description: z.string().optional(),
});

export type Module = z.infer<typeof ModuleSchema>;
