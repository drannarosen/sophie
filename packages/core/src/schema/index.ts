export {
  type Artifact,
  type ArtifactReferences,
  ArtifactReferencesSchema,
  ArtifactSchema,
  type ArtifactScope,
  ArtifactScopeSchema,
  type ArtifactType,
  ArtifactTypeSchema,
} from "./artifact.js";
export {
  type AsideAnchorKind,
  type DeriveAsideAnchorInput,
  deriveAsideAnchor,
} from "./aside-anchor.js";
export {
  type Assessment,
  type AssessmentItem,
  AssessmentItemSchema,
  type AssessmentItemType,
  AssessmentItemTypeSchema,
  AssessmentSchema,
  type AssessmentType,
  AssessmentTypeSchema,
} from "./assessment.js";
export {
  type AuditFinding,
  AuditFindingSchema,
  type AuditSeverity,
  AuditSeveritySchema,
} from "./audit.js";
export {
  type AuditOverride,
  AuditOverrideSchema,
} from "./audit-override.js";
export { type BaseRecord, BaseRecordSchema } from "./base-record.js";
export { type BKTState, BKTStateSchema } from "./bkt-state.js";
export { type Chapter, ChapterSchema, ChapterStatus } from "./chapter.js";
export {
  type ChapterSection,
  ChapterSectionSchema,
} from "./chapter-section.js";
// v0.2 chrome cluster types (course-info projection, ADR 0080 v0.2
// amendment + docs/plans/2026-05-26-course-info-projection-design.md).
export {
  type CourseInfoFragment,
  CourseInfoFragmentSchema,
} from "./course-info-fragment.js";
export {
  COURSE_SPEC_SCHEMA_ID,
  COURSE_SPEC_VERSION,
  type CourseSpec,
  CourseSpecSchema,
  type PedagogyPattern,
  PedagogyPatternSchema,
  validateCourseSpec,
} from "./course-spec.js";
export {
  type Accessibility,
  AccessibilitySchema,
} from "./course-spec-v02-accessibility.js";
export {
  type Contact,
  ContactSchema,
} from "./course-spec-v02-contact.js";
export {
  type Grading,
  type GradingCategory,
  GradingCategorySchema,
  GradingSchema,
  type LetterScaleEntry,
  LetterScaleEntrySchema,
} from "./course-spec-v02-grading.js";
export {
  type ComposeEntry,
  ComposeEntrySchema,
  INFO_PAGE_LAYOUTS,
  type InfoPageDeclaration,
  InfoPageDeclarationSchema,
  type InfoPageLayout,
  InfoPageLayoutSchema,
  type InfoPages,
  InfoPagesSchema,
} from "./course-spec-v02-info-pages.js";
export {
  type Landing,
  LandingSchema,
} from "./course-spec-v02-landing.js";
export {
  type Objective,
  ObjectiveSchema,
} from "./course-spec-v02-objectives.js";
export {
  type OfficeHour,
  OfficeHourSchema,
} from "./course-spec-v02-office-hours.js";
export {
  type Prereq,
  PrereqSchema,
} from "./course-spec-v02-prereqs.js";
export {
  EPISTEMIC_ROLES,
  type EpistemicRole,
  EpistemicRoleSchema,
} from "./epistemic-role.js";
export {
  type AssumptionEntry,
  AssumptionEntrySchema,
  type Biography,
  BiographySchema,
  type BreaksWhenEntry,
  BreaksWhenEntrySchema,
  type CommonMisuseEntry,
  CommonMisuseEntrySchema,
  type DerivationStepEntry,
  DerivationStepEntrySchema,
  type ObservableEntry,
  ObservableEntrySchema,
  type UnitsEntry,
  UnitsEntrySchema,
} from "./equation-biography.js";
export {
  type EquationConstant,
  EquationConstantSchema,
  type EquationRegistryEntry,
  EquationRegistryEntrySchema,
  type RearrangedForm,
  RearrangedFormSchema,
  type RelatedEquation,
  type RelatedEquationKind,
  RelatedEquationKindSchema,
  RelatedEquationSchema,
} from "./equation-registry.js";
export { type Figure, FigureSchema } from "./figure.js";
export {
  type FSRSRecord,
  FSRSRecordSchema,
  type FSRSTargetType,
  FSRSTargetTypeSchema,
} from "./fsrs-record.js";
export {
  type InterventionDepth,
  InterventionDepthSchema,
  type InterventionEntry,
  InterventionEntrySchema,
  type InterventionFamily,
  InterventionFamilySchema,
  type InterventionLibraryEntry,
  InterventionLibraryEntrySchema,
} from "./intervention.js";
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
export { type PageStatus, PageStatusSchema } from "./page-status.js";
export { type PedagogyIndex, PedagogyIndexSchema } from "./pedagogy-index.js";
export {
  type ArtifactEntry,
  ArtifactEntrySchema,
  type CardEntry,
  CardEntrySchema,
  type ContractValidationEntry,
  ContractValidationEntrySchema,
  type DeepDiveEntry,
  DeepDiveEntrySchema,
  type DefinitionEntry,
  DefinitionEntrySchema,
  type EquationCitationEntry,
  EquationCitationEntrySchema,
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
  type ObjectiveEntry,
  ObjectiveEntrySchema,
  type OMIFlowEntry,
  OMIFlowEntrySchema,
  type OMIFlowSlot,
  type RetrievalPromptEntry,
  RetrievalPromptEntrySchema,
  type SectionEntry,
  SectionEntrySchema,
  type SkillReviewEntry,
  SkillReviewEntrySchema,
  type SpacedReviewEntry,
  SpacedReviewEntrySchema,
  type TopicCardMetadata,
  TopicCardMetadataSchema,
  type TopicEntry,
  TopicEntrySchema,
  type UnitEntry,
  UnitEntrySchema,
  type WorkedExampleEntry,
  WorkedExampleEntrySchema,
} from "./pedagogy-index-entries/index.js";
export {
  type PracticeAttempt,
  PracticeAttemptSchema,
} from "./practice-attempt.js";
export { LangTag, NonEmptyString, Slug } from "./primitives.js";
export { type RegistryBase, RegistryBaseSchema } from "./registry-base.js";
export {
  type Rubric,
  type RubricCriterion,
  RubricCriterionSchema,
  type RubricScaleLevel,
  RubricScaleLevelSchema,
  RubricSchema,
} from "./rubric.js";
export type { EntityType } from "./search-facet.js";
export {
  type Section,
  type SectionBridgeVariant,
  SectionBridgeVariantSchema,
  type SectionModuleVariant,
  SectionModuleVariantSchema,
  type SectionPhaseVariant,
  SectionPhaseVariantSchema,
  SectionSchema,
  type SectionTrackVariant,
  SectionTrackVariantSchema,
  type SectionType,
  SectionTypeSchema,
  type SectionUnitBlockVariant,
  SectionUnitBlockVariantSchema,
} from "./section.js";
export { slugify } from "./slugify.js";
export {
  type Subsection,
  type SubsectionAutoGrouped,
  SubsectionAutoGroupedSchema,
  type SubsectionExplicit,
  SubsectionExplicitSchema,
  SubsectionSchema,
} from "./subsection.js";
export {
  type Unit,
  UnitSchema,
  type UnitType,
  UnitTypeSchema,
} from "./unit.js";
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
export {
  type VoiceContract,
  VoiceContractSchema,
  type VoiceRegister,
} from "./voice-contract.js";
