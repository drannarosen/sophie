import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Card metadata as declared in a topic file's `cards: [{...}]`
 * frontmatter list (ADR 0079 §"Topic file shape", Design F). Each
 * card metadata entry must correspond 1:1 to a
 * `<SkillReview.Card id="X">` JSX block in the topic file body;
 * PRA-2 audit invariant enforces consistency at build time.
 *
 * `difficulty` is a hint for FSRS scheduling (ADR 0069) and adaptive
 * `<SkillReview>` prominence (Wedge E BKT mastery). Optional in v1.
 */
export const TopicCardMetadataSchema = z.object({
  id: Slug,
  label: NonEmptyString,
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type TopicCardMetadata = z.infer<typeof TopicCardMetadataSchema>;

/**
 * A topic entry — one per `src/content/topics/<category>/<topic-id>.mdx`
 * file. Frontmatter declares topic identity, summary, cross-references
 * to other registries (equations, misconceptions, prereq topics), and
 * a flat list of card metadata. Body holds `<SkillReview.Card id="X">`
 * JSX blocks each containing `<SkillReview.Prompt>` +
 * `<SkillReview.Answer>` slot children. Per ADR 0079 (Design F).
 *
 * Category sub-grouping (the `<category>/` directory level) is
 * organizational only — topics share a flat ID namespace and
 * `/library/topics/<topic-id>/` URL shape regardless of which
 * sub-directory the file lives in.
 *
 * Cross-references inherit ADR 0060's registry-ecosystem
 * bidirectionality: `linked_equation_ids` references resolve against
 * the equations registry; future ADRs (0044 misconception
 * interventions, 0046 equation biographies) can reverse-index via
 * these arrays.
 */
export const TopicEntrySchema = z.object({
  id: Slug,
  label: NonEmptyString,
  summary: NonEmptyString,
  prereq_topic_ids: z.array(Slug).default([]),
  linked_equation_ids: z.array(Slug).default([]),
  linked_misconception_ids: z.array(Slug).default([]),
  cards: z.array(TopicCardMetadataSchema).default([]),
});
export type TopicEntry = z.infer<typeof TopicEntrySchema>;
