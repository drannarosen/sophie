import { defineCollection } from "astro:content";
import { ChapterSchema, ModuleSchema } from "@sophie/core/schema";
import { glob } from "astro/loaders";

// Astro 6 Content Layer: glob loaders pull every chapter MDX + every
// module JSON. ChapterSchema and ModuleSchema (Zod, from
// @sophie/core/schema) are the source of truth for frontmatter;
// failures surface as build errors and dev-server warnings.
const chapters = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/chapters" }),
  schema: ChapterSchema,
});

const modules = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/modules" }),
  schema: ModuleSchema,
});

export const collections = { chapters, modules };
