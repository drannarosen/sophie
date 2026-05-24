import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `VoiceContractSchema` — instructor-level voice contract, sibling
 * artifact to `course.sophie.yaml`. Authoritative design:
 * [`docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md`](../../../../docs/plans/2026-05-25-course-spec-and-spec-driven-authoring-design.md)
 * §"Voice contract as separate artifact". Locked by ADR 0080.
 *
 * Voice belongs to the **instructor**, not the course — a single voice
 * file lives at `voices/<author-id>.yaml` in the consumer-course repo
 * and is referenced by the Course Spec's `voice:` + `voice_register:`
 * fields. This makes voice portable across the instructor's courses
 * (ASTR 201, ASTR 101, COMP 521 all share `anna-rosen.yaml`) and lets
 * the audit's `QB9` invariant verify drafted prose against this
 * contract.
 *
 * Two slots:
 *
 *   - `base_voice.rules`: invariant prose rules that apply across all
 *     of the instructor's courses (information-density, declarative
 *     claims, no hedging, etc.).
 *   - `registers`: per-course pitch overlays. Each register is a
 *     short prose statement of how the base voice adapts to a course's
 *     audience (sophomore quantitative vs. intro non-major vs.
 *     scientific computing). The Course Spec selects one via
 *     `voice_register:`.
 *
 * `.strict()` everywhere — typo `regiters:` should fail parse rather
 * than silently absorb.
 */

const BaseVoiceSchema = z
  .object({
    /**
     * Invariant voice rules. At least one rule required — an empty
     * base voice has no contract to enforce.
     */
    rules: z.array(NonEmptyString).min(1),
  })
  .strict();

const VoiceRegisterSchema = z
  .object({
    /** Slug used by the Course Spec's `voice_register:` reference. */
    id: Slug,
    /** Short prose statement of how the base voice adapts. */
    pitch: NonEmptyString,
  })
  .strict();

export type VoiceRegister = z.infer<typeof VoiceRegisterSchema>;

export const VoiceContractSchema = z
  .object({
    /** Slug matching the filename (`voices/<id>.yaml`). */
    id: Slug,
    /** Human-readable name (e.g., "Anna Rosen"). */
    display_name: NonEmptyString,
    base_voice: BaseVoiceSchema,
    /**
     * At least one register required — a voice contract with no
     * register has nothing for the Course Spec to select.
     */
    registers: z.array(VoiceRegisterSchema).min(1),
  })
  .strict();

export type VoiceContract = z.infer<typeof VoiceContractSchema>;
