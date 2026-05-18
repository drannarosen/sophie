import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * Base schema for all registry-pattern content entries per ADR 0060.
 *
 * Every per-registry schema (equation, figure, future
 * misconception / definition / worked-example) extends this with
 * type-specific fields. The shared base carries the four fields
 * every registry entry needs:
 *
 * - `id` — kebab-case slug; the stable identifier chapters reference
 * - `title` — human-readable name rendered to readers
 * - `tags` — optional discoverability hints
 * - `version` — optional schema version (default "1"); future-proofs
 *   entries across schema evolutions
 *
 * Per ADR 0060 §convention 2, every registry's frontmatter Zod schema
 * extends this base. The shared loader, audit primitives, and
 * `<RegistryRef>` reference primitive all key on the `id` field.
 */
export const RegistryBaseSchema = z.object({
  id: Slug,
  title: NonEmptyString,
  tags: z.array(NonEmptyString).optional(),
  version: NonEmptyString.optional(),
});

export type RegistryBase = z.infer<typeof RegistryBaseSchema>;
