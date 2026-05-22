import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `UnitTypeSchema` — the discriminator for a `Unit`'s pedagogical kind
 * (per [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md)).
 *
 * - `lecture`: one class meeting; carries `slides` + `reading` artifacts.
 * - `project`: multi-week deliverable; carries `spec` + `rubric` + `lab-notebook`.
 * - `lab`: single-session lab; carries `lab-notebook` + optionally `spec`.
 * - `topic`: free-form content unit (e.g., supplementary modules).
 * - `skill`: bridge-only; one prerequisite topic (per [ADR 0068](../../../docs/website/decisions/0068-bridge-rooms-and-prereq-pedagogy.md)).
 */
export const UnitTypeSchema = z.enum([
  "lecture",
  "project",
  "lab",
  "topic",
  "skill",
]);
export type UnitType = z.infer<typeof UnitTypeSchema>;

/**
 * `UnitSchema` — an individual learning unit inside a `Section`. Each Unit
 * holds typed `Artifact`s appropriate to its `type`.
 *
 * `prereqs` declares the topic_ids this Unit's content depends on;
 * curriculum-CI ([ADR 0045](../../../docs/website/decisions/0045-pedagogical-diff.md))
 * verifies every declared prereq topic has at least one authored
 * bridge surface (room, section, or `<SkillReview>` component).
 *
 * `topic_id` applies to `type: "skill"` Units only (bridge content);
 * binds the Unit to a canonical prereq topic in the pedagogy graph.
 *
 * `estimated_duration_weeks` is optional metadata for Schedule
 * generation + AI co-author prompts.
 */
export const UnitSchema = z.object({
  id: Slug,
  type: UnitTypeSchema,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  prereqs: z.array(NonEmptyString).default([]),
  topic_id: NonEmptyString.optional(),
  estimated_duration_weeks: z.number().positive().optional(),
});

export type Unit = z.infer<typeof UnitSchema>;
