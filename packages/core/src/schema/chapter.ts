import { z } from "zod";
import { FigureSchema } from "./figure.js";
import { LangTag, NonEmptyString, Slug } from "./primitives.js";

export const ChapterSchema = z.object({
  title: NonEmptyString,
  slug: Slug,
  // Every chapter belongs to exactly one module (PR 3 design doc).
  module: Slug,
  // Within-module ordering. When omitted, chapters fall back to
  // `title.localeCompare` (see `chaptersForModule`).
  order: z.number().int().nonnegative().optional(),
  lang: LangTag.optional(),
  description: z.string().optional(),
  tags: z.array(NonEmptyString).optional(),
  figures: z.record(Slug, FigureSchema).optional(),
});

export type Chapter = z.infer<typeof ChapterSchema>;
