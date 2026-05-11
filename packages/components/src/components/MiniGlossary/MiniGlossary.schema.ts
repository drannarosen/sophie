import { z } from "zod";

export const GlossaryTermSchema = z.object({
  term: z.string().min(1),
  definition: z.string().min(1),
});

export type GlossaryTerm = z.infer<typeof GlossaryTermSchema>;

/**
 * Chapter-level cluster of vocabulary terms with one-line definitions.
 * Renders as a `<dl>`/`<dt>`/`<dd>` definition list with per-term hash
 * anchors namespaced under the outer `id`.
 *
 * Content-only: no `course/chapter` props, no persistence, no
 * `client:load` directive in MDX — flows through Astro's static
 * `<Content components={...}>` map.
 *
 * The outer `id` doubles as the hash-anchor target for the section
 * and the namespace prefix for per-term `<dt>` ids
 * (`${id}-term-<slug>`).
 */
export const MiniGlossaryPropsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  lede: z.string().optional(),
  terms: z.array(GlossaryTermSchema).min(1),
});

export type MiniGlossaryProps = z.infer<typeof MiniGlossaryPropsSchema>;
