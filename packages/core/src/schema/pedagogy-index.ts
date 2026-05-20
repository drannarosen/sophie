import { z } from "zod";
import { AuditFindingSchema } from "./audit.ts";
import { InterventionEntrySchema } from "./intervention.ts";
import { MultiRepIndexEntrySchema } from "./multirep.ts";
import {
  ChapterEntrySchema,
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
  ModuleEntrySchema,
  ObjectiveEntrySchema,
  OMIFlowEntrySchema,
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
 * | Role          | Prefix  | Source                                                    |
 * |---------------|---------|-----------------------------------------------------------|
 * | Definition    | `def-`  | author-supplied via title/id slug                         |
 * | Equation      | `eq-`   | author-supplied via id slug                               |
 * | Key insight   | `ki-`   | auto: `ki-${counter}`                                     |
 * | Figure        | `fig-`  | auto: `fig-${slug(name)}-${counter}`                      |
 * | Misconception | `misc-` | auto: `misc-${counter}` (auto only)                       |
 * | Deep dive     | `dd-`   | id > slug(title) > auto: `dd-${counter}`                  |
 * | OMI flow      | `omi-`  | id > `omi-${slug(concept)}` > auto: `omi-${counter}`      |
 * | Chapter       | `ch-`   | passthrough chapter slug                                  |
 * | Objective     | `lo-`   | passthrough author id                                     |
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
   * Per-chapter `<KeyEquation refId="..." />` citation entries per ADR 0060.
   * One entry per chapter-side callsite; the declaration data lives on
   * `equations[]`. Audit invariants R1 (dangling refId) and R2 (orphan
   * declaration) consume the citation/declaration cross-product. Defaults
   * to `[]` so consumer apps on the pre-registry path keep working through
   * the cutover.
   */
  equationCitations: z
    .array(EquationCitationEntrySchema)
    .readonly()
    .default([]),
  keyInsights: z.array(KeyInsightEntrySchema).readonly(),
  /** Consumer-app-owned asset data, forwarded into the index at SSR-merge time. */
  figureRegistry: z.array(FigureRegistryEntrySchema).readonly(),
  /** Per-chapter usage records, populated by the extractor (renamed from `figures` in PR-C3). */
  figureUsages: z.array(FigureUsageEntrySchema).readonly(),
  misconceptions: z.array(MisconceptionEntrySchema).readonly(),
  /**
   * Per-chapter `<Callout variant="deep-dive">` entries (ADR 0058
   * §R-deep-dive). Populated by `extractDeepDives`. Optional with
   * default `[]` so consumer apps on the pre-PR-B path keep working.
   * The-more-you-know callouts are intentionally NOT included here —
   * enrichment content sits outside the eight-role taxonomy.
   */
  deepDives: z.array(DeepDiveEntrySchema).readonly().default([]),
  /**
   * Per-chapter `<OMIFlow>` callsites (ADR 0063). Populated by
   * `extractOMIFlows`. Optional with default `[]` so consumer apps on
   * the pre-A8 path keep working. One entry per callsite carrying all
   * three slot bodies (observable / model / inference).
   */
  omiFlows: z.array(OMIFlowEntrySchema).readonly().default([]),
  /** Consumer-app-owned chapter metadata, forwarded from `getCollection('chapters')`. */
  chapters: z.array(ChapterEntrySchema).readonly(),
  /** Consumer-app-owned module metadata, forwarded from `getCollection('modules')`. */
  modules: z.array(ModuleEntrySchema).readonly(),
  /** Per-chapter learning objectives, populated by the extractor. */
  objectives: z.array(ObjectiveEntrySchema).readonly(),
  /** Per-chapter inline-ref callsites — populated by the extractor for the audit pass. */
  inlineRefUsages: z.array(InlineRefUsageEntrySchema).readonly(),
  /**
   * Per-chapter MultiRep concept-binding entries (ADR 0043 +
   * 2026-05-17 design hardening). Populated by `extractMultiReps`;
   * consumed by audit invariants MR1–MR4/MR6 (and NR1–NR4 via the
   * Notation Registry loader, PR-δ). Defaults to `[]` so consumer
   * apps that don't author MultiRep bindings yet keep working.
   */
  multiReps: z.array(MultiRepIndexEntrySchema).readonly().default([]),
  /**
   * Per-chapter `<Intervention>` callsite entries (ADR 0044 +
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
});
export type PedagogyIndex = z.infer<typeof PedagogyIndexSchema>;
