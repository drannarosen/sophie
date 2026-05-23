import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Primary in-flow recall prompt (Wedge B1 retrieval family). Author
 * provides a target ref + a `<Prompt>` slot + an `<Answer>` slot;
 * self-assess buttons render automatically below the revealed answer.
 *
 * Per ADR 0027: course/chapter are required (per-instance IDB
 * hydration). The `target` is the persistence key — one attempt array
 * per (course, chapter, target). Use with `client:load` in MDX.
 *
 * `target` carries a prefix-typed pedagogy-graph ref:
 * `eq:` (equation), `gl:` (glossary), `misc:` (misconception),
 * `lo:` (learning objective), `ki:` (key insight), `topic:` (topic).
 * Unprefixed targets render but a curriculum-CI invariant flags them
 * (per Wedge B1 design doc §6).
 */
export const RetrievalPromptPropsSchema = z.object({
  course: z.string().min(1),
  unit: z.string().min(1),
  target: z.string().min(1),
  children: z.custom<ReactNode>(),
});

export type RetrievalPromptProps = z.infer<typeof RetrievalPromptPropsSchema>;
