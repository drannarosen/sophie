/**
 * Barrel for the pedagogy-index-entries cluster (ADR 0061 C4).
 *
 * Domain-grouped per the audit's C4 plan (six groups mirroring C1's
 * extractor categories):
 *
 *   - `chapter-meta.ts`        — Chapter / Module / Objective entries.
 *   - `inline-content.ts`      — Definition / KeyInsight / Misconception.
 *   - `figure.ts`              — FigureRegistry + FigureUsage (two-tier).
 *   - `equation.ts`            — Equation declaration + EquationCitation.
 *   - `inline-ref.ts`          — InlineRefKind + InlineRefUsage.
 *   - `contract-validation.ts` — ContractValidation.
 *
 * The umbrella `PedagogyIndexSchema` (sibling at `../pedagogy-index.ts`)
 * composes from this barrel. External consumers import via the
 * package-level barrel `@sophie/core/schema`, which re-exports through
 * this one.
 */

export {
  type ChapterEntry,
  ChapterEntrySchema,
  type ModuleEntry,
  ModuleEntrySchema,
  type ObjectiveEntry,
  ObjectiveEntrySchema,
} from "./chapter-meta.ts";
export {
  type ContractValidationEntry,
  ContractValidationEntrySchema,
} from "./contract-validation.ts";
export {
  type EquationCitationEntry,
  EquationCitationEntrySchema,
  type EquationEntry,
  EquationEntrySchema,
} from "./equation.ts";
export {
  type FigureRegistryEntry,
  FigureRegistryEntrySchema,
  type FigureUsageEntry,
  FigureUsageEntrySchema,
} from "./figure.ts";
export {
  type DeepDiveEntry,
  DeepDiveEntrySchema,
  type DefinitionEntry,
  DefinitionEntrySchema,
  type KeyInsightEntry,
  KeyInsightEntrySchema,
  type MisconceptionEntry,
  MisconceptionEntrySchema,
} from "./inline-content.ts";
export {
  type InlineRefKind,
  InlineRefKindSchema,
  type InlineRefUsageEntry,
  InlineRefUsageEntrySchema,
} from "./inline-ref.ts";
export {
  type OMIFlowEntry,
  OMIFlowEntrySchema,
  type OMIFlowSlot,
} from "./omi-flow.ts";
