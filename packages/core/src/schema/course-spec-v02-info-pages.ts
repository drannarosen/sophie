import { z } from "zod";
import { NonEmptyString } from "./primitives.js";

/**
 * `info_pages` drives route injection at `astro:config:setup`. Each
 * key becomes its own static route (e.g. `info_pages.syllabus` →
 * injected `/syllabus/`). The dispatcher `info-page.astro` reads the
 * URL pathname at render time to look up the declaration.
 *
 * **`compose:` is a strict union** per Anna's H4/B5 decision —
 * known data keys (resolved from spec) OR `prose/<slug>` (resolved
 * from the course-info content collection). Typos surface at schema-
 * validate time per ADR 0080 §5 strict-by-default.
 */

const KNOWN_COMPOSE_DATA_KEYS = [
  "objectives",
  "prereqs",
  "grading",
  "office_hours",
  "accessibility",
  "contact",
  "schedule_overview",
] as const;

export const ComposeEntrySchema = z.union([
  z.enum(KNOWN_COMPOSE_DATA_KEYS),
  z
    .string()
    .regex(
      /^prose\/[a-z][a-z0-9-]*$/,
      "compose entry must be a known data key or a 'prose/<kebab-slug>' fragment ref"
    ),
]);

export type ComposeEntry = z.infer<typeof ComposeEntrySchema>;

export const InfoPageDeclarationSchema = z
  .object({
    /** Component name resolved by info-page.astro's LAYOUTS lookup. */
    layout: NonEmptyString,
    /** Ordered composition of structural data + prose fragments. */
    compose: z.array(ComposeEntrySchema).optional(),
    /** Single-prose-fragment layouts (InstructorPage, PoliciesPage). */
    prose: z
      .string()
      .regex(/^prose\//, "prose ref must be 'prose/<slug>'")
      .optional(),
  })
  .strict();

export type InfoPageDeclaration = z.infer<typeof InfoPageDeclarationSchema>;

/**
 * Reserved-slug set defends the slug-collision class at the schema
 * layer per AGENTS.md "structural fixes over targeted patches."
 * Includes Sophie-injected routes (`units`, `sections`), Astro
 * internals (`_astro`, `_server`, `_image`), Pagefind output dir, and
 * `library` (reserved for future ADR 0068 bridge-room work).
 */
const RESERVED_SLUGS = [
  "units",
  "sections",
  "library",
  "_astro",
  "_server",
  "_image",
  "pagefind",
] as const;

export const InfoPagesSchema = z
  .record(
    z
      .string()
      .regex(
        /^[a-z][a-z0-9-]*$/,
        "info_pages key must be lowercase-kebab-case slug"
      ),
    InfoPageDeclarationSchema
  )
  .refine(
    (pages) =>
      Object.keys(pages).every(
        (slug) => !(RESERVED_SLUGS as readonly string[]).includes(slug)
      ),
    {
      message: `info_pages slug is reserved (${RESERVED_SLUGS.join(", ")})`,
    }
  );

export type InfoPages = z.infer<typeof InfoPagesSchema>;
