import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * Inline-ref pedagogy entries — kind discriminator + usage callsite.
 * Inline refs are the four chapter-side cross-reference components
 * (`<GlossaryTerm>`, `<EquationRef>`, `<FigureRef>`, `<ChapterRef>`);
 * the audit pass consumes the usage stream to detect undefined targets
 * (D4, E4, F2, C1) against the populated target collections.
 */

/**
 * Kind discriminator for inline-ref callsites. Originally mirrored the
 * four inline cross-ref components (`<GlossaryTerm>`, `<EquationRef>`,
 * `<FigureRef>`, `<ChapterRef>`). Extended for WS B+D
 * ([issue #191](https://github.com/drannarosen/sophie/issues/191)) to
 * also cover the two MultiRep child-mode cross-refs (`<RepFigure>`,
 * `<RepEquation>`) so MultiRep-only references count toward F4
 * (orphan figure) and R-series equation-citation invariants — at the
 * INDEX layer, not as an audit-layer special case. Audit consumers
 * filter on `kind` to attribute each finding.
 */
export const InlineRefKindSchema = z.enum([
  "glossary-term",
  "eq-ref",
  "figure-ref",
  "chapter-ref",
  /** MultiRep `<RepFigure refName="X">` — counts as a figure usage for F4. */
  "rep-figure",
  /** MultiRep `<RepEquation refKey="X">` — counts as an equation citation for R-series invariants. */
  "rep-equation",
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
 *   - `rep-figure`    → `<RepFigure refName="X">` (inside `<MultiRep>`) → `X`
 *   - `rep-equation`  → `<RepEquation refKey="X">` (inside `<MultiRep>`) → `X`
 */
export const InlineRefUsageEntrySchema = z.object({
  kind: InlineRefKindSchema,
  /** The looked-up name/slug; matched against the target collection. */
  refKey: NonEmptyString,
  /** Parent Unit id — where the callsite lives (W3 rename from `chapter`). */
  unit: Slug,
});
export type InlineRefUsageEntry = z.infer<typeof InlineRefUsageEntrySchema>;
