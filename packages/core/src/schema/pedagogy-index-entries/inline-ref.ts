import { z } from "zod";
import { NonEmptyString } from "../primitives.ts";

/**
 * Inline-ref pedagogy entries — kind discriminator + usage callsite.
 * Inline refs are the four chapter-side cross-reference components
 * (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`);
 * the audit pass consumes the usage stream to detect undefined targets
 * (D4, E4, F2, C1) against the populated target collections.
 */

/**
 * Kind discriminator for inline-ref callsites. Mirrors the four
 * inline cross-ref components: `<GlossaryTerm>`, `<EquationRef>`,
 * `<FigureRef>`, `<ChapterRef>`. The audit pass uses these to
 * detect undefined targets (D4, E4, F2, C1).
 */
export const InlineRefKindSchema = z.enum([
  "glossary-term",
  "eq-ref",
  "figure-ref",
  "chapter-ref",
]);
export type InlineRefKind = z.infer<typeof InlineRefKindSchema>;

/**
 * An inline-ref callsite — one record per occurrence of an inline
 * cross-ref in a chapter MDX source. Populated by the extractor so
 * the build-time audit pass can detect undefined targets (D4, E4,
 * F2, C1). Append-only by design: the same `refKey` referenced N
 * times yields N entries (useful for usage-count facets later).
 *
 * `refKey` is the looked-up identifier:
 *   - `glossary-term` → `<GlossaryTerm name="X">` → `X`
 *   - `eq-ref`        → `<EquationRef refId="X">` → `X`
 *   - `figure-ref`    → `<FigureRef name="X">`   → `X`
 *   - `chapter-ref`   → `<ChapterRef slug="X">`  → `X`
 */
export const InlineRefUsageEntrySchema = z.object({
  kind: InlineRefKindSchema,
  /** The looked-up name/slug; matched against the target collection. */
  refKey: NonEmptyString,
  /** Origin chapter slug — where the callsite lives. */
  chapter: NonEmptyString,
});
export type InlineRefUsageEntry = z.infer<typeof InlineRefUsageEntrySchema>;
