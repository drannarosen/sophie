import { defineCollection } from "astro:content";
import { ChapterSchema } from "@sophie/core/schema";
import { glob } from "astro/loaders";

// Astro 6 Content Layer: glob loader pulls every .mdx under
// src/content/chapters/. ChapterSchema (Zod, from @sophie/core/schema)
// is the source of truth for chapter frontmatter; failures surface as
// build errors and dev-server warnings.
const chapters = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/chapters" }),
  schema: ChapterSchema,
});

export const collections = { chapters };
