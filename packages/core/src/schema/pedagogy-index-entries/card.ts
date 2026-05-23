import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * A card entry — one per `<SkillReview.Card id="X">` JSX block in a
 * topic file's body (ADR 0079 §"Topic file shape", Design F). Derived
 * by the topic extractor at build time; the entry carries the
 * metadata declared in the parent topic's `cards: [{...}]` frontmatter
 * list, joined with the body block's id.
 *
 * Card body slots (`<SkillReview.Prompt>` + `<SkillReview.Answer>`)
 * are NOT stored on the entry — the SkillReview self-closing resolver
 * re-fetches them from the topic MDX file's AST at compile time.
 * Storing pre-rendered HTML on the entry would violate ADR 0038's
 * "data, not HTML" principle for the pedagogy index.
 *
 * Cards are scoped to their parent topic; the same card slug may
 * exist in two different topics without collision. The
 * `topic_id` field disambiguates.
 *
 * FSRS scheduling (ADR 0069) keys per-(course, topic_id, id);
 * `difficulty` informs initial scheduling weight.
 */
export const CardEntrySchema = z.object({
  id: Slug,
  topic_id: Slug,
  label: NonEmptyString,
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});
export type CardEntry = z.infer<typeof CardEntrySchema>;
