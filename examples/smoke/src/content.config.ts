import { defineCollection } from "astro:content";
import {
  ChapterSchema,
  EquationRegistryEntrySchema,
  ModuleSchema,
} from "@sophie/core/schema";
import { glob } from "astro/loaders";

// Astro 6 Content Layer: glob loaders pull every chapter MDX + every
// module JSON + every equation MDX. The Zod schemas (from
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

// ADR 0060 registry ecosystem: per-equation MDX files at
// `src/content/equations/<id>.mdx`. Frontmatter validates against
// `EquationRegistryEntrySchema`; body holds the biography children
// (Observable, Assumption, BreaksWhen, CommonMisuse, DerivationStep)
// extracted by the pedagogy-index-extractor in Batch 4. Empty for now;
// populated in Batch 6 (PR-7's three equations migrate here).
const equations = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/equations" }),
  schema: EquationRegistryEntrySchema,
});

export const collections = { chapters, modules, equations };
