import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * Course-level prerequisite. Distinct from `audience.prerequisites`
 * (which groups by required-vs-recommended courses + assumed/scaffolded
 * skills) — `prereqs` here is a flat list optimized for the syllabus
 * chrome layer. Each entry declares its kind (course / skill / topic)
 * so layouts can render them in separate sections.
 */
export const PrereqSchema = z
  .object({
    kind: z.enum(["course", "skill", "topic"]),
    ref: NonEmptyString,
    required: z.boolean(),
    note: z.string().optional(),
  })
  .strict();

export type Prereq = z.infer<typeof PrereqSchema>;
