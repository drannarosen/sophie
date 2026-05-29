import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";
import { RegistryBaseSchema } from "./registry-base.js";

/**
 * Equation registry entry schema per ADR 0060 + ADR 0046 §R8/R9.
 *
 * Frontmatter shape for `src/content/equations/<id>.mdx` files. The
 * body of each MDX file holds the biography children (Observable,
 * Assumption, BreaksWhen, CommonMisuse, DerivationStep) — extracted
 * by the pedagogy-index-extractor walking the MDX AST. This file
 * codifies only the *frontmatter* shape; body extraction lives in
 * `@sophie/astro`.
 *
 * Four "multiple parts" beyond the original ADR 0046 biography
 * children (per ADR 0046 §R9):
 *
 * - **constants** — per-equation physical constants (Wien's b,
 *   gravity's G, Planck's h); equation-specific, NOT registered as
 *   concepts in `notation-registry.yaml`.
 * - **rearranged_forms** — sibling forms of the primary equation
 *   (e.g., `d = sqrt(L / 4πF)` alongside `F = L / 4πd²`); each form
 *   gets its own KaTeX render.
 * - **related** — structured cross-refs to prerequisite / see-also /
 *   derives-from equations elsewhere in the registry. Enables a
 *   course-wide equation graph.
 * - **derivation steps** — collapsible-by-default step list authored
 *   in the body as `<DerivationStep>` children; NOT in frontmatter.
 *   Extraction lives in the body-walker.
 *
 * Symbol units are NOT declared here. They come from the notation
 * registry concept that each symbol resolves to (per ADR 0046 §R10).
 * The equation file declares `symbols`; the loader cross-references
 * each symbol with `notation-registry.yaml` to pull units. Eliminates
 * the duplication PR-7 surfaced and resolves the JSX-attribute-vs-
 * expression escaping mismatch.
 */

export const EquationConstantSchema = z
  .object({
    symbol: NonEmptyString,
    value: NonEmptyString,
    unit: NonEmptyString.optional(),
    name: NonEmptyString.optional(),
    /** Build-time prerendered KaTeX HTML for `symbol` (ADR 0090). */
    symbol_html: NonEmptyString.optional(),
    /** Build-time prerendered KaTeX HTML for `value` (ADR 0090). */
    value_html: NonEmptyString.optional(),
    /** Build-time prerendered KaTeX HTML for `unit` (ADR 0090). */
    unit_html: NonEmptyString.optional(),
  })
  .strict();

export type EquationConstant = z.infer<typeof EquationConstantSchema>;

export const RearrangedFormSchema = z
  .object({
    tex: NonEmptyString,
    solves_for: NonEmptyString,
    label: NonEmptyString.optional(),
    /** Build-time prerendered KaTeX HTML for `tex` (ADR 0090). */
    html: NonEmptyString.optional(),
  })
  .strict();

export type RearrangedForm = z.infer<typeof RearrangedFormSchema>;

export const RelatedEquationKindSchema = z.enum([
  "see-also",
  "prereq",
  "derives-from",
]);

export type RelatedEquationKind = z.infer<typeof RelatedEquationKindSchema>;

export const RelatedEquationSchema = z
  .object({
    refId: Slug,
    kind: RelatedEquationKindSchema,
    description: NonEmptyString.optional(),
  })
  .strict();

export type RelatedEquation = z.infer<typeof RelatedEquationSchema>;

export const EquationRegistryEntrySchema = RegistryBaseSchema.extend({
  /** The primary LaTeX form, rendered as `$$tex$$`. */
  tex: NonEmptyString,
  /** Author-declared canonical TeX symbols per ADR 0043 §R5. */
  symbols: z.array(NonEmptyString).min(1),
  /** Equation-specific physical constants. */
  constants: z.array(EquationConstantSchema).optional(),
  /** Sibling forms of the primary equation. */
  rearranged_forms: z.array(RearrangedFormSchema).optional(),
  /** Structured cross-refs to related equations. */
  related: z.array(RelatedEquationSchema).optional(),
  /** Build-time prerendered KaTeX HTML for the primary `tex` (ADR 0090). */
  html: NonEmptyString.optional(),
  /**
   * Build-time SRE ClearSpeak speech for the primary `tex` (ADR 0089).
   * Consumed as a plain `aria-label` string by `@sophie/components`
   * (which never imports SRE — framework purity, ADR 0001). PRIMARY
   * equation only; `rearranged_forms` / `constants` speech is the
   * deferred tail the math-speech audit reports.
   */
  speech: NonEmptyString.optional(),
}).strict();

export type EquationRegistryEntry = z.infer<typeof EquationRegistryEntrySchema>;
