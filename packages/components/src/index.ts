// Components

export type { AsideProps } from "./components/Aside/Aside.schema.ts";
export {
  Aside,
  AsideKind,
  AsidePropsSchema,
  asideContract,
} from "./components/Aside/index.ts";
export type { AssumptionProps } from "./components/Assumption/index.ts";
export {
  ASSUMPTION_EPISTEMIC_ROLE,
  Assumption,
  AssumptionPropsSchema,
  assumptionContract,
} from "./components/Assumption/index.ts";
export type { BreaksWhenProps } from "./components/BreaksWhen/index.ts";
export {
  BREAKS_WHEN_EPISTEMIC_ROLE,
  BreaksWhen,
  BreaksWhenPropsSchema,
  breaksWhenContract,
} from "./components/BreaksWhen/index.ts";
export type {
  CalloutProps,
  CalloutVariant,
  InteractiveCalloutProps,
} from "./components/Callout/Callout.schema.ts";
export {
  Callout,
  CalloutPropsSchema,
  calloutContract,
  InteractiveCallout,
  InteractiveCalloutPropsSchema,
  interactiveCalloutContract,
} from "./components/Callout/index.ts";
export type { ChapterRefProps } from "./components/ChapterRef/ChapterRef.schema.ts";
// Internal-use store-hydration setters (__setChapters, __setModules,
// __setEquations, __setFigureRegistry, __setFigureUsages,
// __setGlossaryDefinitions, __setObjectives) live at
// `@sophie/components/internal/store-hydration` per ADR 0061 Rule 4 +
// 2026-05-19 architecture audit P2 #3. TextbookLayout is the only
// consumer; consumer apps should never import these directly.
export {
  ChapterRef,
  ChapterRefPropsSchema,
  chapterRefContract,
} from "./components/ChapterRef/index.ts";
export type { CollapsibleCardProps } from "./components/CollapsibleCard/index.ts";
export {
  CollapsibleCard,
  CollapsibleCardPropsSchema,
  collapsibleCardContract,
} from "./components/CollapsibleCard/index.ts";
export type { CommonMisuseProps } from "./components/CommonMisuse/index.ts";
export {
  CommonMisuse,
  CommonMisusePropsSchema,
  commonMisuseContract,
} from "./components/CommonMisuse/index.ts";
export type {
  ComprehensionGateProps,
  ComprehensionLevel,
} from "./components/ComprehensionGate/index.ts";
export {
  ComprehensionGate,
  ComprehensionGatePropsSchema,
  comprehensionGateContract,
} from "./components/ComprehensionGate/index.ts";
export type {
  ConfidenceCheckProps,
  ConfidenceScale,
} from "./components/ConfidenceCheck/index.ts";
export {
  ConfidenceCheck,
  ConfidenceCheckPropsSchema,
  confidenceCheckContract,
} from "./components/ConfidenceCheck/index.ts";
export type { DerivationStepProps } from "./components/DerivationStep/index.ts";
export {
  DERIVATION_STEP_EPISTEMIC_ROLE,
  DerivationStep,
  DerivationStepPropsSchema,
  derivationStepContract,
} from "./components/DerivationStep/index.ts";
export type {
  EffortLevel,
  EffortLogProps,
} from "./components/EffortLog/index.ts";
export {
  EffortLog,
  EffortLogPropsSchema,
  effortLogContract,
} from "./components/EffortLog/index.ts";
export type { EquationRefProps } from "./components/EquationRef/EquationRef.schema.ts";
export {
  EquationRef,
  EquationRefPropsSchema,
  equationRefContract,
} from "./components/EquationRef/index.ts";
export type { FigureProps } from "./components/Figure/Figure.schema.ts";
export {
  Figure,
  FigurePropsSchema,
  figureInlineContract,
  figureRegistryContract,
} from "./components/Figure/index.ts";
export type { FigureRefProps } from "./components/FigureRef/FigureRef.schema.ts";
export {
  FigureRef,
  FigureRefPropsSchema,
  figureRefContract,
} from "./components/FigureRef/index.ts";
export type { GlossaryTermProps } from "./components/GlossaryTerm/index.ts";
export {
  GlossaryTerm,
  GlossaryTermPropsSchema,
  glossaryTermContract,
} from "./components/GlossaryTerm/index.ts";
export type { InteractiveCheckboxProps } from "./components/InteractiveCheckbox/InteractiveCheckbox.schema.ts";
export {
  InteractiveCheckbox,
  InteractiveCheckboxPropsSchema,
  interactiveCheckboxContract,
} from "./components/InteractiveCheckbox/index.ts";
export type { InterventionProps } from "./components/Intervention/index.ts";
export {
  Intervention,
  InterventionPropsSchema,
  interventionContract,
} from "./components/Intervention/index.ts";
export type { KeyEquationProps } from "./components/KeyEquation/index.ts";
export {
  KeyEquation,
  KeyEquationPropsSchema,
  keyEquationContract,
} from "./components/KeyEquation/index.ts";
export type {
  LearningObjectivesProps,
  LearningObjectivesState,
} from "./components/LearningObjectives/index.ts";
export {
  LearningObjectives,
  LearningObjectivesPropsSchema,
  learningObjectivesContract,
} from "./components/LearningObjectives/index.ts";
export type { MultiRepProps } from "./components/MultiRep/index.ts";
export {
  MultiRep,
  MultiRepPropsSchema,
  multiRepContract,
} from "./components/MultiRep/index.ts";
export type { ObjectiveProps } from "./components/Objective/index.ts";
export {
  Objective,
  ObjectivePropsSchema,
} from "./components/Objective/index.ts";
export type { ObservableProps } from "./components/Observable/index.ts";
export {
  OBSERVABLE_EPISTEMIC_ROLE,
  Observable,
  ObservablePropsSchema,
  observableContract,
} from "./components/Observable/index.ts";
export type {
  OMIFlowProps,
  OMIFlowSlotProps,
} from "./components/OMIFlow/index.ts";
export {
  OMIFlow,
  OMIFlowPropsSchema,
  OMIFlowSlotPropsSchema,
  omiFlowContract,
} from "./components/OMIFlow/index.ts";
export type {
  PredictPrompt,
  PredictProps,
  PredictState,
} from "./components/Predict/index.ts";
export {
  Predict,
  PredictPromptSchema,
  PredictPropsSchema,
  predictContract,
} from "./components/Predict/index.ts";
export type { ReflectionProps } from "./components/Reflection/index.ts";
export {
  Reflection,
  ReflectionPropsSchema,
  reflectionContract,
} from "./components/Reflection/index.ts";
export type { RepEquationProps } from "./components/RepEquation/index.ts";
export {
  RepEquation,
  RepEquationPropsSchema,
  repEquationContract,
} from "./components/RepEquation/index.ts";
export type { RepFigureProps } from "./components/RepFigure/index.ts";
export {
  RepFigure,
  RepFigurePropsSchema,
  repFigureContract,
} from "./components/RepFigure/index.ts";
export type { RepVerbalProps } from "./components/RepVerbal/index.ts";
export {
  RepVerbal,
  RepVerbalPropsSchema,
  repVerbalContract,
} from "./components/RepVerbal/index.ts";
export type { RetrievalPromptProps } from "./components/RetrievalPrompt/index.ts";
export {
  RetrievalPrompt,
  RetrievalPromptPropsSchema,
  retrievalPromptContract,
} from "./components/RetrievalPrompt/index.ts";
export type { SearchResult } from "./components/Search/index.ts";
export { SearchModal } from "./components/Search/index.ts";
export type { SkillReviewProps } from "./components/SkillReview/index.ts";
export {
  SkillReview,
  SkillReviewPropsSchema,
  skillReviewContract,
} from "./components/SkillReview/index.ts";
export type { SpacedReviewProps } from "./components/SpacedReview/index.ts";
export {
  SpacedReview,
  SpacedReviewPropsSchema,
  spacedReviewContract,
} from "./components/SpacedReview/index.ts";
export type { UnitsProps } from "./components/Units/index.ts";
export {
  Units,
  UnitsPropsSchema,
  unitsContract,
} from "./components/Units/index.ts";
// Contract
export type {
  ComponentAuditFinding,
  ComponentContract,
  SerializedNode,
} from "./contract/index.ts";
export {
  getRegistered,
  listRegistered,
  registerComponent,
} from "./contract/index.ts";
// Figures — domain-specific interactive figures. v1 ships
// <BlackbodyExplorer> here as the canonical Reasoning-OS contract
// demonstration; long-term, astronomy-specific figures graduate to
// a Sophie Astro sub-brand package per ADR 0001.
export type { BlackbodyExplorerProps } from "./figures/BlackbodyExplorer/index.ts";
export {
  BlackbodyExplorer,
  BlackbodyExplorerPropsSchema,
  blackbodyExplorerContract,
} from "./figures/BlackbodyExplorer/index.ts";
// Interactive — A11 linked-representation primitive (per ADR 0059)
export type {
  ParameterCursorProps,
  ParameterDefinition,
  ParameterSliderProps,
  ParameterStoreState,
} from "./interactive/index.ts";
export {
  ParameterCursor,
  ParameterCursorPropsSchema,
  ParameterSlider,
  ParameterSliderPropsSchema,
  parameterCursorContract,
  parameterSliderContract,
  useLinkedParameter,
  useParameterStore,
} from "./interactive/index.ts";
export {
  getInterventionByName,
  getInterventionLibrary,
} from "./intervention/intervention-index.ts";
// Primitives — shared layout primitives reused across pedagogy
// components. Per ADR 0061 Rule 4 (filename-as-discovery), primitives
// live in src/primitives/<Name>/ and export through this barrel so
// AI authors can find them via a single import surface.
export type {
  ChromeTitleBarAccent,
  ChromeTitleBarProps,
} from "./primitives/ChromeTitleBar/index.ts";
export { ChromeTitleBar } from "./primitives/ChromeTitleBar/index.ts";
// Runtime — public surface re-exported from runtime/index.ts
export type {
  BroadcastChannelLayer,
  BroadcastMessage,
  FigureRegistry,
  FigureRegistryEntry,
  InteractiveControlProps,
  InteractiveStatus,
  Profile,
  ResponseStore,
  SelfAssessmentWidget,
  SyncedResponseStore,
  UseInteractiveResult,
} from "./runtime/index.ts";
export {
  IndexedDBResponseStore,
  ProfileProvider,
  useHydrated,
  useInteractive,
  useProfile,
  useSelfAssessment,
} from "./runtime/index.ts";
