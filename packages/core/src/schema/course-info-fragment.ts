import { z } from "zod";

/**
 * Frontmatter schema for prose fragments in
 * `<consumer>/src/content/course-info/<slug>.mdx` per the course-info-
 * projection design (2026-05-26). The **filename slug is the id** —
 * no `id:` field. Validated at build time by the Astro content
 * collection (`@sophie/astro` wires this schema into a
 * `defineCollection` call so consumers don't redeclare it).
 *
 * `ai_contribution` mirrors ADR 0042 (visibility / models / review_depth)
 * — same provenance shape as chapter MDX, so chrome fragments and
 * chapter content carry identical AI-authoring metadata.
 *
 * `.strict()` per ADR 0080 §5 — unknown keys fail parse to catch
 * `descritpion:` typos rather than silently absorbing them.
 *
 * Lives in @sophie/core/schema (not @sophie/astro) so all Sophie Zod
 * schemas share one home (the existing 30+ schema cluster) and
 * @sophie/astro doesn't take a direct zod dep.
 */
const AiContributionSchema = z
  .object({
    visibility: z.enum(["public", "private"]),
    models: z.array(z.string()).optional(),
    review_depth: z.string().optional(),
  })
  .strict();

export const CourseInfoFragmentSchema = z
  .object({
    title: z.string().min(1, "title is required"),
    description: z.string().optional(),
    last_revised: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date YYYY-MM-DD")
      .optional(),
    ai_contribution: AiContributionSchema.optional(),
  })
  .strict();

export type CourseInfoFragment = z.infer<typeof CourseInfoFragmentSchema>;
