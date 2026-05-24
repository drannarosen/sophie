import { defineCollection } from "astro:content";
import {
  ArtifactReferencesSchema,
  EquationRegistryEntrySchema,
  NonEmptyString,
  SectionSchema,
  TopicEntrySchema,
  UnitEntrySchema,
} from "@sophie/core/schema";
import { glob } from "astro/loaders";
import { z } from "zod";

// Astro 6 Content Layer: glob loaders pull every section JSON, every
// unit JSON, every equation MDX, and (W2) every artifact MDX from the
// new `sections/<sec>/units/<unit>/<artifact>.mdx` (+ future
// `sections/<sec>/<artifact>.mdx`) layout per ADR 0067. The Zod schemas
// (from @sophie/core/schema) are the source of truth for frontmatter;
// failures surface as build errors and dev-server warnings.

// Wedge B-followup (W1) per ADR 0067: top-level Section content per
// the new hierarchy. The full discriminated union accepts
// module / phase / track / unit-block / bridge variants.
const sections = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/sections" }),
  schema: SectionSchema,
});

// Wedge B-followup (W1) per ADR 0067 + design doc D7: per-Unit
// content metadata. Each unit binds to its containing Section
// (`section_id`) and to its reading artifact (`chapter`); the optional
// `lecture` field binds to the slides artifact (slides extraction
// lands post-W2). W2/D2: status (required) + framing? + description?
// surfaced through UnitSchema.
const units = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/units" }),
  schema: UnitEntrySchema,
});

// Wedge B-followup (W2/D1) per ADR 0067 (Path A): typed Artifact MDX
// content. Glob walks `sections/<sec>/units/<unit>/*.mdx` (unit-scope)
// and `sections/<sec>/*.mdx` (section-scope, future). Frontmatter
// carries only what's NOT path-derivable: id, title, references, plus
// optional chapter-display fields (subtitle, chapter-number,
// reading-time, track, authors, updated, ai_contribution) that flow
// through via .passthrough() until a richer schema lands.
//
// Path-derivation of type/scope/unit_id/section_id/source_path happens
// at consumer time in @sophie/astro's TextbookLayout (Task 13). The
// per-entry result is shaped into ArtifactEntry before pushing into the
// pedagogy index via indexAccumulator.setArtifacts.
const artifacts = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/sections" }),
  schema: z
    .object({
      id: NonEmptyString,
      title: NonEmptyString,
      references: ArtifactReferencesSchema.optional().default({}),
    })
    .loose(),
});

// ADR 0060 registry ecosystem: per-equation MDX files at
// `src/content/equations/<id>.mdx`. Frontmatter validates against
// `EquationRegistryEntrySchema`; body holds the biography children
// (Observable, Assumption, BreaksWhen, CommonMisuse, DerivationStep).
const equations = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/equations" }),
  schema: EquationRegistryEntrySchema,
});

// ADR 0079 (W4b) topic registry: per-topic MDX files at
// `src/content/topics/<category>/<topic-id>.mdx` (Design F sub-grouped
// flat). Frontmatter validates against `TopicEntrySchema`; body holds
// `<SkillReview.Card id="X">` JSX blocks each containing
// `<SkillReview.Prompt>` + `<SkillReview.Answer>` slot children.
// Category subdirectory (`math/`, `physics/`, etc.) is organizational
// only — topics share a flat ID namespace and `/library/topics/<id>/`
// URL shape regardless of file path. `**/*.mdx` glob catches subdirs.
const topics = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/topics" }),
  schema: TopicEntrySchema,
});

export const collections = { sections, units, artifacts, equations, topics };
