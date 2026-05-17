import { InterventionDepthSchema } from "@sophie/core/schema";
import type { ReactNode } from "react";
import { z } from "zod";

/**
 * Component-side props schema for `<Intervention>` per ADR 0044 +
 * 2026-05-17 design hardening §D4–§D5. Lives next to the component
 * (mirrors `KeyEquation.schema.ts` precedent) since `@sophie/core` is
 * framework-pure per ADR 0001 — anything that references `ReactNode`
 * stays in `@sophie/components`.
 *
 * The pedagogy-index entry shape (`InterventionEntrySchema`) and the
 * library catalog entry (`InterventionLibraryEntrySchema`) live in
 * `@sophie/core/schema` — they're plain-data shapes.
 *
 * Authoring shape (nested in misconception Aside, default):
 *
 * ```mdx
 * <Aside kind="misconception" name="universe-with-a-center" ...>
 *   ...prose framing the misconception...
 *
 *   <Intervention type="contrasting-cases" addresses="this">
 *     Body prose for the intervention move.
 *   </Intervention>
 *
 *   <Intervention type="bridging-analogy" addresses="this" limits="Bread has an outside; the universe doesn't.">
 *     Bread baking with raisins...
 *   </Intervention>
 * </Aside>
 * ```
 *
 * Standalone (course-level intervention, outside Aside):
 *
 * ```mdx
 * <Intervention type="refutation-text" addresses="universe-with-a-center">
 *   Despite the everyday intuition that any expansion needs a center
 *   point, ...
 * </Intervention>
 * ```
 *
 * Custom (course-specific name; no canonical-library lookup, no citation chip):
 *
 * ```mdx
 * <Intervention type="custom" name="scale-comparison" addresses="this">
 *   Compare 10^21 m to 10^23 m...
 * </Intervention>
 * ```
 */

const NonEmptyString = z.string().min(1);

const InterventionAddressesSchema = z.union([
  NonEmptyString,
  z.array(NonEmptyString).min(1),
]);

export const InterventionPropsSchema = z.object({
  /**
   * Canonical-intervention slug from `intervention-index.ts` (e.g.,
   * "contrasting-cases", "bridging-analogy"), or the literal "custom"
   * for course-specific interventions outside the canonical taxonomy.
   * The runtime component looks the entry up at render time for the
   * citation chip; `type="custom"` skips the lookup.
   */
  type: NonEmptyString,
  /**
   * Required when `type === "custom"`; ignored otherwise. The renderer
   * uses `name` as the type-pill label (in place of the canonical
   * intervention's slug) and omits the citation chip.
   */
  name: NonEmptyString.optional(),
  /**
   * Misconception slug(s) this intervention addresses. The literal
   * `"this"` (only valid when nested inside an enclosing
   * `<Aside kind="misconception" name="X">`) is rewritten to `"X"`
   * by the PR-γ extractor; the audit's I1 invariant flags `"this"`
   * outside an enclosing misconception parent.
   *
   * Single-target (`string`) is the v1 default; multi-target
   * (`string[]`) is the v2 evolution path locked in design §F2 —
   * accepted from v1 so the schema bump never breaks consumers. The
   * runtime renderer treats both forms uniformly.
   */
  addresses: InterventionAddressesSchema,
  /**
   * Optional explicit limits (Clement 1993 "explicit limits" pattern
   * for bridging analogies). Renders as a labelled sub-section
   * ("Limits: ...") inside the intervention sub-card when present.
   * Audit invariant I3 (PR-δ) emits an INFO nudge when
   * `type === "bridging-analogy"` lacks `limits`.
   */
  limits: NonEmptyString.optional(),
  /**
   * Audit-only metadata, NOT visualized to readers. Aggregated by
   * the MG4 depth-coverage summary at audit time per design §D3.
   * Defaults to `"light"` (set by the component on the JS side) —
   * explicit `"substantial"` is the chapter author's commitment
   * marker for full Clement / Bransford-and-Schwartz-style
   * interventions vs short refutation-text style.
   *
   * Why `.optional()` here, not `.default("light")`: the React
   * component is consumed as JSX, where omitted props are
   * type-`undefined`, not the schema's default. The PR-γ extractor
   * uses the same schema to validate the parsed MDX attributes and
   * pulls the default at extract time before emitting the pedagogy-
   * index entry (which uses `InterventionEntrySchema` from
   * `@sophie/core` — that schema's `depth` IS required and never
   * undefined post-extraction).
   */
  depth: InterventionDepthSchema.optional(),
  /** Body prose: the intervention content itself (rendered inside the sub-card). */
  children: z.custom<ReactNode>(),
});

export type InterventionProps = z.infer<typeof InterventionPropsSchema>;
