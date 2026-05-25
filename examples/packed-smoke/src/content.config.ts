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

// PR-D1 packed-smoke content.config.ts — minimum viable mirror of
// examples/smoke/src/content.config.ts (which is the canonical shape
// per ADR 0067). One reading-shape artifact is enough to exercise the
// injected route + the 5 store-backed components.

const sections = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/sections" }),
  schema: SectionSchema,
});

const units = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/units" }),
  schema: UnitEntrySchema,
});

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

const equations = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/equations" }),
  schema: EquationRegistryEntrySchema,
});

const topics = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/topics" }),
  schema: TopicEntrySchema,
});

export const collections = { sections, units, artifacts, equations, topics };
