import { InterventionDepthSchema, NonEmptyString } from "@sophie/core/schema";
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

const InterventionAddressesSchema = z.union([
  NonEmptyString,
  z.array(NonEmptyString).min(1),
]);

export const InterventionPropsSchema = z
  .object({
    /**
     * Optional anchor id (matches the pedagogy-index entry's
     * `anchor` field, e.g. `intervention-contrasting-cases-1`).
     * When supplied, the rendered `<aside>` carries the id so
     * `#anchor`-style hash navigation lands on this block and the
     * `:target` outline activates. The PR-γ extractor auto-derives
     * this id from `type+name+chapter-index` and threads it through
     * at render time; chapter authors typically omit it.
     */
    id: NonEmptyString.optional(),
    /**
     * Canonical-intervention slug from `intervention-index.ts` (e.g.,
     * "contrasting-cases", "bridging-analogy"), or the literal "custom"
     * for course-specific interventions outside the canonical taxonomy.
     * The runtime component looks the entry up at render time for the
     * citation chip; `type="custom"` skips the lookup.
     */
    type: NonEmptyString,
    /**
     * Required when `type === "custom"`; ignored otherwise. The
     * `.superRefine` below enforces this cross-field constraint —
     * `<Intervention type="custom">` without `name` is rejected at
     * schema validation rather than rendering two side-by-side
     * pills both reading "custom" (the type-pill falls back to the
     * type slug when `name` is absent). The renderer uses `name`
     * as the type-pill label (in place of the canonical
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
  })
  .superRefine((data, ctx) => {
    // type="custom" REQUIRES name. Without it, the type-pill falls back
    // to the type slug ("custom") AND the customAnnotation pill also
    // reads "custom" — two pills side-by-side both reading "custom".
    // Reject upfront rather than render the ambiguous state.
    if (data.type === "custom" && data.name === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message:
          '`name` is required when `type="custom"` — supply the course-specific intervention slug as the type-pill label.',
      });
    }
  });

export type InterventionProps = z.infer<typeof InterventionPropsSchema>;
