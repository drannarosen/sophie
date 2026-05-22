import { z } from "zod";
import { NonEmptyString, Slug } from "./primitives.js";

/**
 * `ArtifactTypeSchema` — the typed kind of an `Artifact` (per
 * [ADR 0067](../../../docs/website/decisions/0067-section-level-artifacts.md)).
 *
 * **Unit-level** types (live inside a `Unit`):
 * - `reading`: long-form prose chapter for a lecture-shape Unit.
 * - `slides`: Reveal.js slide deck (per [ADR 0006](../../../docs/website/decisions/0006-slides-revealjs.md)).
 * - `spec`: project-shape Unit's prompt + deliverable spec.
 * - `rubric`: structured grading guide (also referenced from `Assessment`).
 * - `lab-notebook`: Pyodide-driven computational walkthrough.
 * - `media`: PDF, image, video link, or other reference asset.
 * - `practice`: Unit-level blocked practice problems.
 * - `worked-example`: step-by-step solution with epistemic-role annotations.
 * - `diagnostic`: course-start / mid-course / pre-exam screener content.
 * - `concept-review`: bridge-only explanation prose.
 *
 * **Section-level** types (live directly on a `Section`):
 * - `intro`: advance organizer; LOs + prior-knowledge connection + roadmap.
 * - `synthesis`: integrative recap; cross-Unit conceptual links.
 * - `equation-collection`: auto-pulled from Equation Registry; instructor-curated.
 * - `practice-set`: interleaved mixed-topic practice; FSRS-scheduled.
 * - `review-checklist`: LO self-check; entries link to diagnostics.
 * - `concept-map`: visual summary (React Flow per [ADR 0016](../../../docs/website/decisions/0016-react-flow-for-concept-maps.md)).
 * - `misconception-summary`: Module-level misconception bundle.
 * - `historical-context`: narrative thread for the Section's science.
 * - `further-reading`: annotated bibliography.
 * - `reference-tables`: Section-scoped reference; mirrors to Resources room.
 */
export const ArtifactTypeSchema = z.enum([
  // Unit-level
  "reading",
  "slides",
  "spec",
  "rubric",
  "lab-notebook",
  "media",
  "practice",
  "worked-example",
  "diagnostic",
  "concept-review",
  // Section-level
  "intro",
  "synthesis",
  "equation-collection",
  "practice-set",
  "review-checklist",
  "concept-map",
  "misconception-summary",
  "historical-context",
  "further-reading",
  "reference-tables",
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

/**
 * `ArtifactScopeSchema` — where in the hierarchy this Artifact attaches.
 * Section-scoped artifacts (`intro`, `synthesis`, etc.) live on a
 * `Section` directly; Unit-scoped artifacts live on a `Unit`.
 */
export const ArtifactScopeSchema = z.enum(["unit", "section"]);
export type ArtifactScope = z.infer<typeof ArtifactScopeSchema>;

/**
 * `ArtifactReferencesSchema` — typed cross-references this Artifact declares.
 * The pedagogy-index extractor ([ADR 0038](../../../docs/website/decisions/0038-pedagogy-index-pattern.md))
 * audits that referenced IDs exist + are appropriately typed.
 */
export const ArtifactReferencesSchema = z
  .object({
    units: z.array(NonEmptyString).default([]),
    equations: z.array(NonEmptyString).default([]),
    figures: z.array(NonEmptyString).default([]),
    skills: z.array(NonEmptyString).default([]),
    misconceptions: z.array(NonEmptyString).default([]),
    los: z.array(NonEmptyString).default([]),
  })
  .partial()
  .default({});
export type ArtifactReferences = z.infer<typeof ArtifactReferencesSchema>;

/**
 * `ArtifactSchema` — the discrete authored content unit. Each Artifact has
 * a stable `id`, declared `type`, `scope`, and source-file path.
 */
export const ArtifactSchema = z.object({
  id: Slug,
  type: ArtifactTypeSchema,
  scope: ArtifactScopeSchema,
  title: NonEmptyString,
  source_path: NonEmptyString,
  references: ArtifactReferencesSchema,
  order: z.number().int().nonnegative().optional(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;
