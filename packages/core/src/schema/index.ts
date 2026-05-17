export {
  type AuditFinding,
  AuditFindingSchema,
  type AuditSeverity,
  AuditSeveritySchema,
} from "./audit.js";
export { type Chapter, ChapterSchema, ChapterStatus } from "./chapter.js";
export {
  EPISTEMIC_ROLES,
  type EpistemicRole,
  EpistemicRoleSchema,
} from "./epistemic-role.js";
export { type Figure, FigureSchema } from "./figure.js";
export { type Module, ModuleSchema } from "./module.js";
export { chaptersForModule } from "./module-nav.js";
export {
  type MultiRep,
  type MultiRepIndexEntry,
  MultiRepIndexEntrySchema,
  MultiRepLayoutSchema,
  MultiRepSchema,
  type SerializedRep,
  SerializedRepSchema,
} from "./multirep.js";
export {
  type CommonConfusion,
  CommonConfusionSchema,
  type Concept,
  ConceptSchema,
  type NotationRegistry,
  NotationRegistrySchema,
} from "./notation-registry.js";
export {
  type ChapterEntry,
  ChapterEntrySchema,
  type ContractValidationEntry,
  ContractValidationEntrySchema,
  type DefinitionEntry,
  DefinitionEntrySchema,
  type EquationEntry,
  EquationEntrySchema,
  type FigureRegistryEntry,
  FigureRegistryEntrySchema,
  type FigureUsageEntry,
  FigureUsageEntrySchema,
  type InlineRefKind,
  InlineRefKindSchema,
  type InlineRefUsageEntry,
  InlineRefUsageEntrySchema,
  type KeyInsightEntry,
  KeyInsightEntrySchema,
  type MisconceptionEntry,
  MisconceptionEntrySchema,
  type ModuleEntry,
  ModuleEntrySchema,
  type ObjectiveEntry,
  ObjectiveEntrySchema,
  type PedagogyIndex,
  PedagogyIndexSchema,
} from "./pedagogy-index.js";
export { LangTag, NonEmptyString, Slug } from "./primitives.js";
export type { EntityType } from "./search-facet.js";
export { type Section, SectionSchema } from "./section.js";
export { slugify } from "./slugify.js";
export {
  type Validation,
  type ValidationEvidence,
  ValidationEvidenceSchema,
  type ValidationKind,
  ValidationKindSchema,
  ValidationSchema,
  type ValidationStatus,
  ValidationStatusSchema,
} from "./validation.js";
