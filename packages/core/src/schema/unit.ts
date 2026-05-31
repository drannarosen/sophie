import { z } from "zod";
import { AuditOverrideSchema } from "./audit-override.ts";
import { ChapterFraming, ChapterStatus } from "./chapter.js";
import { DateOrTbd, NonEmptyString, Slug } from "./primitives.js";

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
 *
 * `status` (W2/D2) — Unit maturity. Reuses the `ChapterStatus` enum
 * (`draft` | `review` | `stable`) per ADR 0051; the CS2 audit invariant
 * surfaces `draft` Units in the audit report and the student-build
 * filter (W2 graduation of `getStudentChapters`) excludes them. Required
 * so authors always declare maturity (CS1's intent at the schema layer).
 *
 * `framing` (W2/D2) — optional Unit-level pedagogical framing
 * declaration (per ADR 0063 §OF-2). When `"OMI"`, the OF-2 audit
 * invariant requires the Unit's reading artifact to render at least
 * one `<OMIFlow>` callsite. Reuses the `ChapterFraming` enum.
 *
 * `description` (W2/D2) — optional one-paragraph Unit summary;
 * surfaces in `<ChapterRef>` hover-preview and Unit roll-up cards.
 *
 * `solutionsRevealDate` (ADR 0096) — optional per-Unit override for the
 * build-time gated-solutions reveal date. A zero-padded ISO date or the
 * literal `"tbd"` (shared `DateOrTbd` union with the homework registry).
 * When absent, the reveal date derives from the homework registry; when
 * `"tbd"`, solutions stay hidden (fail-closed). This schema — not the
 * permissive `new Date()` in the resolver — is the real guard against
 * malformed dates reaching the gate.
 */
export const UnitSchema = z.object({
  id: Slug,
  type: UnitTypeSchema,
  title: NonEmptyString,
  order: z.number().int().nonnegative(),
  prereqs: z.array(NonEmptyString).default([]),
  topic_id: NonEmptyString.optional(),
  estimated_duration_weeks: z.number().positive().optional(),
  status: ChapterStatus,
  framing: ChapterFraming.optional(),
  description: z.string().optional(),
  solutionsRevealDate: DateOrTbd.optional(),
  /**
   * Per-Unit audit-invariant exceptions per ADR 0053. PRA-1 (W4b)
   * is the first invariant to honor these. Each override declares
   * `invariant`, optional `anchor` (for grain-2/3 specificity),
   * mandatory `tdr` (CF2 ERROR otherwise), and `reason`.
   *
   * Optional rather than `.default([])` so existing fixtures
   * (stories, tests, smoke unit JSONs that haven't been updated)
   * don't require the field. PRA-1 reads via `?? []`.
   */
  audit_overrides: z.array(AuditOverrideSchema).optional(),
});

export type Unit = z.infer<typeof UnitSchema>;
