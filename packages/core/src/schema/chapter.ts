import { z } from "zod";
import { FigureSchema } from "./figure.js";
import { LangTag, NonEmptyString, Slug } from "./primitives.js";

export const ChapterSchema = z.object({
  title: NonEmptyString,
  slug: Slug,
  lang: LangTag.optional(),
  description: z.string().optional(),
  tags: z.array(NonEmptyString).optional(),
  figures: z.record(Slug, FigureSchema).optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;
