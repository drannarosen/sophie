import { z } from "zod";
import { NonEmptyString, Slug } from "../primitives.ts";

/**
 * A single `<WorkedExample>` callsite (ADR 0081). Captures the slot-
 * coverage shape needed by the WE-1 / WE-2 audit invariants and
 * provides the entry shape for future Library "Worked Examples"
 * rollups.
 *
 * Eight-role contract (ADR 0058): `role: "numerical"` is fixed on
 * the component itself; this entry doesn't re-declare it.
 *
 * Anchor precedence (mirrors OMIFlow):
 *   1. explicit `id=` attr (slugified) wins
 *   2. else `we-${slug(title)}` when `title=` is present
 *   3. else positional fallback `we-${counter}` (chapter-scoped)
 *
 * `slots` is a presence + count summary; the audit consumes it
 * directly. Full slot bodies (Problem prose, Step contents, etc.)
 * are NOT serialized into the index — they live in the rendered
 * MDX, and a future Library rollup would re-read the source MDX
 * rather than rely on the index for full content (per the
 * `<EquationBiography>` precedent at ADR 0046).
 *
 * `slots.problem` and `slots.result` are booleans because exactly
 * one of each is required (WE-2 ERROR if 0 or >1). `slots.steps`
 * and `slots.dimChecks` are counts because the author may legitimately
 * author 0 or more of each — WE-1 WARNINGS when `steps ≥ 1 AND
 * dimChecks === 0` (the QB6 "units shown at every step" hook
 * coverage gap).
 */
export const WorkedExampleEntrySchema = z.object({
  /** Parent Unit id. */
  unit: Slug,
  anchor: NonEmptyString,
  /** Optional author-supplied title. */
  title: z.string().optional(),
  /** Per-unit positional number (1-indexed, source order). */
  number: z.number().int().min(1),
  /** Slot-presence + count summary for WE-1 / WE-2. */
  slots: z.object({
    /** Exactly-one required (WE-2). */
    problem: z.boolean(),
    /** Author may author 0..N steps. */
    steps: z.number().int().min(0),
    /** Author may author 0..N dim-checks (WE-1 warns if 0 with ≥1 step). */
    dimChecks: z.number().int().min(0),
    /** Exactly-one required (WE-2). */
    result: z.boolean(),
  }),
});
export type WorkedExampleEntry = z.infer<typeof WorkedExampleEntrySchema>;
