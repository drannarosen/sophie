import {
  MultiRepLayoutSchema,
  SerializedRepSchema,
  Slug,
} from "@sophie/core/schema";
import { z } from "zod";

/**
 * MultiRep parent component props per ADR 0043 + the 2026-05-17
 * design hardening.
 *
 * Authoring shape (MDX): `<MultiRep concept="x">` with Rep children.
 * The build-time `transformMultiRep` extractor (PR-γ) walks the
 * children and populates the `reps` array; runtime MultiRep dispatches
 * over `reps` and maps each entry to `<RepVerbal>` / `<RepEquation>` /
 * `<RepFigure>` per its `kind` discriminator.
 *
 * `conceptLabel` carries the registry concept's `verbal_label` for
 * the framed-card header ("orbital radius" rather than the
 * "orbital-radius" slug). PR-δ (the audit + registry-loader sprint)
 * will inject it via registry lookup at MDX-parse time; in Storybook
 * and tests it's passed directly. v1 (this sprint) renders the
 * `concept` slug as the header fallback when `conceptLabel` is
 * absent — the smoke fixture exercises that fallback path.
 */
export const MultiRepPropsSchema = z.object({
  /** Registered concept `id` from `notation-registry.yaml`. */
  concept: Slug,
  /**
   * The concept's human-readable label (registry `verbal_label`).
   * PR-δ's registry loader will inject; falls back to `concept` slug
   * when absent.
   */
  conceptLabel: z.string().min(1).optional(),
  /** Anchor id (defaults to `mr-<concept>` if omitted). */
  id: Slug.optional(),
  /** Reader UI hint (v1 renderer ignores; reserved for v2 modes). */
  layout: MultiRepLayoutSchema.optional(),
  /** Reserved for v2 alternative display modes; v1 renderer ignores. */
  display: z.string().optional(),
  /**
   * Serialized rep payloads. The extractor (`transformMultiRep`,
   * PR-γ) walks `<RepVerbal>` / `<RepEquation>` / `<RepFigure>`
   * children at MDX-parse time and produces this array. At v1 at
   * least one rep is required — the empty MultiRep is meaningless.
   */
  reps: z.array(SerializedRepSchema).min(1),
});

export type MultiRepProps = z.infer<typeof MultiRepPropsSchema>;
