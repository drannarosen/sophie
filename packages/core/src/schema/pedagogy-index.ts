import { z } from "zod";
import { AuditFindingSchema } from "./audit.ts";
import { InterventionEntrySchema } from "./intervention.ts";
import { MultiRepIndexEntrySchema } from "./multirep.ts";
import {
  ArtifactEntrySchema,
  CardEntrySchema,
  ContractValidationEntrySchema,
  DeepDiveEntrySchema,
  DefinitionEntrySchema,
  EquationCitationEntrySchema,
  EquationEntrySchema,
  FigureRegistryEntrySchema,
  FigureUsageEntrySchema,
  InlineRefUsageEntrySchema,
  KeyInsightEntrySchema,
  MisconceptionEntrySchema,
  ObjectiveEntrySchema,
  OMIFlowEntrySchema,
  RetrievalPromptEntrySchema,
  SectionEntrySchema,
  SkillReviewEntrySchema,
  SpacedReviewEntrySchema,
  TopicEntrySchema,
  UnitEntrySchema,
  WorkedExampleEntrySchema,
} from "./pedagogy-index-entries/index.ts";

/**
 * Pedagogy index — the build-time extraction surface declared by
 * ADR 0038. The individual entry shapes live under
 * `./pedagogy-index-entries/` (domain-grouped per ADR 0061 C4); this
 * file composes them into the umbrella `PedagogyIndexSchema`.
 *
 * Canonical anchor prefix convention.
 *
 * Author-supplied identifiers (definitions, equations) use the prefix
 * the author writes. Auto-generated anchors (key-insights, figures,
 * misconceptions) use these short prefixes:
 *
 * | Role             | Prefix  | Source                                                    |
 * |------------------|---------|-----------------------------------------------------------|
 * | Definition       | `def-`  | author-supplied via title/id slug                         |
 * | Equation         | `eq-`   | author-supplied via id slug                               |
 * | Key insight      | `ki-`   | auto: `ki-${counter}`                                     |
 * | Figure           | `fig-`  | auto: `fig-${slug(name)}-${counter}`                      |
 * | Misconception    | `misc-` | auto: `misc-${counter}` (auto only)                       |
 * | Deep dive        | `dd-`   | id > slug(title) > auto: `dd-${counter}`                  |
 * | OMI flow         | `omi-`  | id > `omi-${slug(concept)}` > auto: `omi-${counter}`      |
 * | Chapter          | `ch-`   | passthrough chapter slug                                  |
 * | Objective        | `lo-`   | passthrough author id                                     |
 * | Retrieval prompt | `rp-`   | auto: `rp-${counter}` (Wedge B1)                          |
 * | Spaced review    | `sp-`   | auto: `sp-${counter}` (Wedge B1)                          |
 * | Skill review     | `sk-`   | auto: `sk-${counter}` (Wedge B1)                          |
 *
 * Authors can override any auto-generated anchor via explicit `id`
 * props on the source component. The anchor uniqueness invariants
 * (M1, M2, F5, etc.) apply regardless of source.
 */

/**
 * The full pedagogy index — one per build. Consumers read it via
 * the `virtual:sophie/pedagogy-index` module exposed by
 * @sophie/astro's Vite plugin.
 */
export const PedagogyIndexSchema = z.object({
  definitions: z.array(DefinitionEntrySchema).readonly(),
  equations: z.array(EquationEntrySchema).readonly(),
  /**
   * Per-unit `<KeyEquation refId="..." />` citation entries per ADR 0060.
   * One entry per unit-side callsite (W3 rename from chapter-side); the
   * declaration data lives on `equations[]`. Audit invariants R1 (dangling
   * refId) and R2 (orphan declaration) consume the citation/declaration
   * cross-product. Defaults to `[]` so consumer apps on the pre-registry
   * path keep working through the cutover.
   */
  equationCitations: z
    .array(EquationCitationEntrySchema)
    .readonly()
    .default([]),
  keyInsights: z.array(KeyInsightEntrySchema).readonly(),
  /** Consumer-app-owned asset data, forwarded into the index at SSR-merge time. */
  figureRegistry: z.array(FigureRegistryEntrySchema).readonly(),
  /** Per-unit usage records, populated by the extractor (renamed from `figures` in PR-C3; field key renamed `chapter → unit` in W3). */
  figureUsages: z.array(FigureUsageEntrySchema).readonly(),
  misconceptions: z.array(MisconceptionEntrySchema).readonly(),
  /**
   * Per-unit `<Callout variant="deep-dive">` entries (ADR 0058
   * §R-deep-dive). Populated by `extractDeepDives`. Optional with
   * default `[]` so consumer apps on the pre-PR-B path keep working.
   * The-more-you-know callouts are intentionally NOT included here —
   * enrichment content sits outside the eight-role taxonomy.
   */
  deepDives: z.array(DeepDiveEntrySchema).readonly().default([]),
  /**
   * Per-unit `<OMIFlow>` callsites (ADR 0063). Populated by
   * `extractOMIFlows`. Optional with default `[]` so consumer apps on
   * the pre-A8 path keep working. One entry per callsite carrying all
   * three slot bodies (observable / model / inference).
   */
  omiFlows: z.array(OMIFlowEntrySchema).readonly().default([]),
  /**
   * Per-unit `<WorkedExample>` callsites (ADR 0081). Populated by
   * `extractWorkedExamples`. The audit invariants WE-1 (units-at-every-
   * step / QB6 coverage) + WE-2 (Problem + Result completeness) consume
   * the per-entry `slots` summary. Defaults to `[]` so consumer apps
   * authored before the WS B+D extractor shipped keep working.
   */
  workedExamples: z.array(WorkedExampleEntrySchema).readonly().default([]),
  /** Per-unit learning objectives, populated by the extractor. */
  objectives: z.array(ObjectiveEntrySchema).readonly(),
  /** Per-unit inline-ref callsites — populated by the extractor for the audit pass. */
  inlineRefUsages: z.array(InlineRefUsageEntrySchema).readonly(),
  /**
   * Per-unit MultiRep concept-binding entries (ADR 0043 +
   * 2026-05-17 design hardening). Populated by `extractMultiReps`;
   * consumed by audit invariants MR1–MR4/MR6 (and NR1–NR4 via the
   * Notation Registry loader, PR-δ). Defaults to `[]` so consumer
   * apps that don't author MultiRep bindings yet keep working.
   */
  multiReps: z.array(MultiRepIndexEntrySchema).readonly().default([]),
  /**
   * Per-unit `<Intervention>` callsite entries (ADR 0044 +
   * 2026-05-17 design hardening). Populated by `extractInterventions`;
   * consumed by audit invariants MG3/MG4/I1/I2/I3 (PR-δ). Defaults to
   * `[]` so consumer apps that don't pair misconceptions with
   * interventions yet keep working unchanged.
   */
  interventions: z.array(InterventionEntrySchema).readonly().default([]),
  /**
   * Per-contract validation entries (ADR 0056). One entry per ADR
   * (`docs/website/decisions/*.md`) and per reference doc
   * (`docs/website/reference/*.md`). Powers audit invariants V1–V7
   * and the validation-status index page (PR 5). Defaults to `[]`
   * so consumer apps that don't wire the contract-validations
   * extractor keep working unchanged.
   */
  contractValidations: z
    .array(ContractValidationEntrySchema)
    .readonly()
    .default([]),
  /**
   * Findings surfaced by the contract-validations extractor itself —
   * specifically V0 (schema parse failure of a `validation:` block,
   * ERROR) and V8 (unknown key inside the `validation:` block, INFO).
   * Distinct from V1–V7 (audit-layer invariants on typed `Validation`)
   * because the extractor has access to the *raw* frontmatter shape
   * before schema-parsing, whereas the audit only sees already-typed
   * inputs. Flow into the audit report at the top of `runPedagogyAudit`
   * so all findings surface in one place. Defaults to `[]`.
   */
  extractorFindings: z.array(AuditFindingSchema).readonly().default([]),
  /**
   * Per-unit `<RetrievalPrompt>` callsites (Wedge B1). Populated by
   * `extractRetrievalPrompts`. Defaults to `[]` so consumer apps on the
   * pre-Wedge-B1 path keep working. Consumed by RET-1 (retrieval-
   * coverage invariant) and the Cockpit's per-unit coverage view.
   */
  retrievalPrompts: z.array(RetrievalPromptEntrySchema).readonly().default([]),
  /**
   * Per-unit `<SpacedReview>` callsites (Wedge B1). Populated by
   * `extractSpacedReviews`. Defaults to `[]`. Consumed by SR-1
   * (target_id / section_id ref-validity invariant).
   */
  spacedReviews: z.array(SpacedReviewEntrySchema).readonly().default([]),
  /**
   * Per-unit `<SkillReview>` callsites (Wedge B1). Populated by
   * `extractSkillReviews`. Defaults to `[]`. Consumed by PRA-1
   * (prereq-activation invariant) and the Library room's Wedge C
   * registry-resolution pass.
   */
  skillReviews: z.array(SkillReviewEntrySchema).readonly().default([]),
  /**
   * Per-topic-file entries (ADR 0079 §"Topic file shape", Design F).
   * One entry per `src/content/topics/<category>/<topic-id>.mdx`.
   * Populated by the topic extractor at MDX-compile time from
   * frontmatter; `cards: [{...}]` frontmatter list mirrored 1:1
   * to body `<SkillReview.Card>` blocks (PRA-2 audit enforces).
   * Consumed by PRA-1 (prereq coverage) + the SkillReview self-
   * closing resolver. Defaults to `[]` so consumer apps on the
   * pre-W4b path keep working.
   */
  topics: z.array(TopicEntrySchema).readonly().default([]),
  /**
   * Per-card entries (ADR 0079). One entry per `<SkillReview.Card
   * id="X">` JSX block in a topic file body. Derived by the topic
   * extractor; metadata mirrors the parent topic's `cards: [{...}]`
   * frontmatter entry joined with `topic_id`. FSRS scheduling
   * (ADR 0069) keys per-(course, topic_id, id). Body slots NOT
   * stored on entry (resolver re-fetches from topic MDX at compile
   * time, per ADR 0038's "data, not HTML" principle).
   */
  cards: z.array(CardEntrySchema).readonly().default([]),
  /**
   * Consumer-app-owned section metadata, forwarded from
   * `getCollection('sections')` per ADR 0067. Wedge B-followup (W1)
   * introduces this collection; consumers on the pre-W1 path see `[]`.
   * Powers PRA-1's "same Section or prior Section" prereq lookup and
   * `<SpacedReview section="…">` rendering's section→units traversal.
   * `SectionEntry` is a verbatim alias of `SectionSchema`
   * (5 typed variants: module / phase / track / unit-block / bridge).
   */
  sections: z.array(SectionEntrySchema).readonly().default([]),
  /**
   * Consumer-app-owned unit metadata, forwarded from
   * `getCollection('units')` per ADR 0067. Wedge B-followup (W1)
   * introduces this collection; consumers on the pre-W1 path see `[]`.
   * `UnitEntry.section_id` binds to a `SectionEntry.slug` (parent ref);
   * `UnitEntry.chapter` binds to the reading artifact (the "chapter")
   * and `UnitEntry.lecture?` binds to the slides artifact (the
   * "lecture") per design doc D7. The `chapter` + `lecture` field
   * NAMES are permanent across W1/W2/W3 (D7 vocabulary lock — distinct
   * from W3's per-callsite `chapter → unit` parent-ref rename).
   */
  units: z.array(UnitEntrySchema).readonly().default([]),
  /**
   * Consumer-app-owned artifact metadata, forwarded from
   * `getCollection('artifacts')` per ADR 0067. Wedge B-followup (W2)
   * introduces this collection; consumers on the pre-W2 path see `[]`.
   * `ArtifactEntry` is a discriminated union over `scope`
   * (`unit` | `section`): unit-scope variants carry `unit_id` +
   * `section_id`; section-scope variants carry `section_id` only.
   * Authored content (reading.mdx, slides.mdx, intro.mdx, etc.) flows
   * through here; consumed by `<ChapterRef>` hover-preview lookup +
   * the post-W2 audit invariants that iterate per-artifact.
   */
  artifacts: z.array(ArtifactEntrySchema).readonly().default([]),
});
export type PedagogyIndex = z.infer<typeof PedagogyIndexSchema>;
