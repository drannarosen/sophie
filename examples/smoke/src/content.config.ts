import { defineCollection } from "astro:content";
import {
  ChapterSchema,
  EquationRegistryEntrySchema,
  SectionModuleVariantSchema,
  SectionSchema,
  UnitEntrySchema,
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

// Wedge A.5 (ADR 0067): the previous `ModuleSchema` is now the
// `module`-variant of the new SectionSchema discriminated union.
// Collection name stays "modules" (content-collection rename is a
// separate concern, not coupled to the schema-rename PR). Each
// module JSON now carries `"type": "module"` to satisfy the
// discriminator.
const modules = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/modules" }),
  schema: SectionModuleVariantSchema,
});

// Wedge B-followup (W1) per ADR 0067: top-level Section content per
// the new hierarchy. The full discriminated union accepts
// module / phase / track / unit-block / bridge variants. For W1 these
// COEXIST with the legacy `modules` collection (each module has a
// twin Section[type=module] with the same slug); W2 deletes
// `modules`/`chapters` in favor of `sections`/`units` exclusively.
const sections = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/sections" }),
  schema: SectionSchema,
});

// Wedge B-followup (W1) per ADR 0067 + design doc D7: per-Unit
// content metadata. Each unit binds to its containing Section
// (`section_id`) and to its reading artifact (`chapter`); the optional
// `lecture` field binds to the slides artifact (slides extraction
// lands post-W2). One unit per existing chapter in the W1 fixture.
const units = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/units" }),
  schema: UnitEntrySchema,
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

export const collections = { chapters, modules, sections, units, equations };
